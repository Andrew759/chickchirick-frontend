/**
 * ChickChirick E2EE v3 — ephemeral ECDH + AES-256-GCM + plaintext cache.
 *
 * encrypt: EK ephemeral, shared=ECDH(EK, peerIK), AES-GCM → 🔒e2ee:v3:...
 * decrypt in: ECDH(myIK, EK_pub)
 * decrypt own: localStorage plaintext cache (как локальная БД в Signal)
 */

const MESSAGES_API = '/api/messages'
export const E2EE_PREFIX = 'e2ee:v1:'
export const E2EE_PREFIX_V2 = 'e2ee:v2:'
export const E2EE_PREFIX_V3 = 'e2ee:v3:'
// legacy (эмодзи мог обрезаться в БД/протоколе)
const E2EE_PREFIX_LEGACY = '🔒e2ee:v1:'
const E2EE_PREFIX_V2_LEGACY = '🔒e2ee:v2:'
const E2EE_PREFIX_V3_LEGACY = '🔒e2ee:v3:'
export const KEY_ANNOUNCE_PREFIX = '__E2EE_KEY__:'
export const E2EE_GROUP_PREFIX = 'e2ee:gv1:'
const E2EE_GROUP_PREFIX_LEGACY = '🔒e2ee:gv1:'
export const GROUP_KEY_MSG_PREFIX = '__GROUP_KEY__:'
const LS_GROUP_KEYS = 'cc_e2ee_group_keys'

const LS_IK_PRIV = 'cc_e2ee_ik_priv_jwk'
const LS_IK_PUB = 'cc_e2ee_ik_pub_spki'
const LS_IK_SIGN_PRIV = 'cc_e2ee_ik_sign_priv_jwk'
const LS_IK_SIGN_PUB = 'cc_e2ee_ik_sign_pub_spki'
const LS_SPK_PRIV = 'cc_e2ee_spk_priv_jwk'
const LS_SPK_PUB = 'cc_e2ee_spk_pub_spki'
const LS_SPK_ID = 'cc_e2ee_spk_id'
const LS_SPK_SIG = 'cc_e2ee_spk_sig'
const LS_OPK = 'cc_e2ee_opk_map'
const LS_OPK_PUB = 'cc_e2ee_opk_pub_map'
const LS_PEER_KEYS = 'cc_e2ee_peer_keys'
const LS_PLAIN_CACHE = 'cc_e2ee_plain_cache'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const peerFetchInflight = new Map()
const OPK_TARGET = 20
const PLAIN_CACHE_MAX = 500

function bufToB64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64ToBuf(b64) {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes.buffer
}

function b64ToBytes(b64) {
  return new Uint8Array(b64ToBuf(b64))
}

function concatBytes(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function isCryptoAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

async function hkdf(ikm, salt, info, length = 32) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt instanceof Uint8Array ? salt : new Uint8Array(salt),
      info: typeof info === 'string' ? textEncoder.encode(info) : info
    },
    key,
    length * 8
  )
  return new Uint8Array(bits)
}

async function ecdh(privKey, pubKey) {
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pubKey }, privKey, 256)
  return new Uint8Array(bits)
}

async function importEcdhPriv(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
}

async function importEcdhPub(spkiB64) {
  return crypto.subtle.importKey('spki', b64ToBuf(spkiB64), { name: 'ECDH', namedCurve: 'P-256' }, true, [])
}

async function generateEcdhPair() {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
}

async function generateEcdsaPair() {
  return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
}

async function exportSpkiB64(pub) {
  return bufToB64(await crypto.subtle.exportKey('spki', pub))
}

async function exportJwk(priv) {
  return crypto.subtle.exportKey('jwk', priv)
}

async function aesGcmEncrypt(messageKey, plaintext) {
  const key = await crypto.subtle.importKey('raw', messageKey, 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintext)))
  return concatBytes(iv, ct)
}

async function aesGcmDecrypt(messageKey, payload) {
  const iv = payload.slice(0, 12)
  const ct = payload.slice(12)
  const key = await crypto.subtle.importKey('raw', messageKey, 'AES-GCM', false, ['decrypt'])
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return textDecoder.decode(pt)
}

function loadPlainCache() {
  try { return JSON.parse(localStorage.getItem(LS_PLAIN_CACHE) || '{}') } catch { return {} }
}

function savePlainCache(map) {
  const keys = Object.keys(map)
  if (keys.length > PLAIN_CACHE_MAX) {
    for (const k of keys.slice(0, keys.length - PLAIN_CACHE_MAX)) delete map[k]
  }
  localStorage.setItem(LS_PLAIN_CACHE, JSON.stringify(map))
}

function cachePlaintext(ciphertext, plaintext) {
  if (!ciphertext || plaintext == null) return
  const map = loadPlainCache()
  map[ciphertext] = plaintext
  savePlainCache(map)
}

function getCachedPlaintext(ciphertext) {
  if (!ciphertext) return null
  const v = loadPlainCache()[ciphertext]
  if (v == null) return null
  // не возвращаем закэшированный фейл
  if (v === 'Зашифрованное сообщение') return null
  return v
}

export async function ensureIdentity() {
  if (!isCryptoAvailable()) throw new Error('Web Crypto API недоступен')

  const legacyPub = localStorage.getItem('chickchirick_e2ee_pub_spki')
  const legacyPriv = localStorage.getItem('chickchirick_e2ee_priv_jwk')
  if (legacyPub && legacyPriv && !localStorage.getItem(LS_IK_PUB)) {
    localStorage.setItem(LS_IK_PUB, legacyPub)
    localStorage.setItem(LS_IK_PRIV, legacyPriv)
  }

  let pub = localStorage.getItem(LS_IK_PUB)
  let priv = localStorage.getItem(LS_IK_PRIV)
  if (!pub || !priv) {
    const pair = await generateEcdhPair()
    pub = await exportSpkiB64(pair.publicKey)
    priv = JSON.stringify(await exportJwk(pair.privateKey))
    localStorage.setItem(LS_IK_PUB, pub)
    localStorage.setItem(LS_IK_PRIV, priv)
  }

  if (!localStorage.getItem(LS_IK_SIGN_PUB) || !localStorage.getItem(LS_IK_SIGN_PRIV)) {
    const pair = await generateEcdsaPair()
    localStorage.setItem(LS_IK_SIGN_PUB, await exportSpkiB64(pair.publicKey))
    localStorage.setItem(LS_IK_SIGN_PRIV, JSON.stringify(await exportJwk(pair.privateKey)))
  }

  if (!localStorage.getItem(LS_SPK_PUB) || !localStorage.getItem(LS_SPK_PRIV)) {
    const pair = await generateEcdhPair()
    const spkPub = await exportSpkiB64(pair.publicKey)
    const spkPriv = JSON.stringify(await exportJwk(pair.privateKey))
    const spkId = Number(localStorage.getItem(LS_SPK_ID) || '0') + 1
    const signPriv = await crypto.subtle.importKey(
      'jwk', JSON.parse(localStorage.getItem(LS_IK_SIGN_PRIV)),
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signPriv, b64ToBuf(spkPub))
    localStorage.setItem(LS_SPK_PUB, spkPub)
    localStorage.setItem(LS_SPK_PRIV, spkPriv)
    localStorage.setItem(LS_SPK_ID, String(spkId))
    localStorage.setItem(LS_SPK_SIG, bufToB64(sig))
  }

  await ensureOpkPubs()
  return { publicKeySpkiB64: pub }
}

export function getMyPublicKeySpkiB64() {
  return localStorage.getItem(LS_IK_PUB) || localStorage.getItem('chickchirick_e2ee_pub_spki') || null
}

async function ensureOpkPubs() {
  let opkMap = {}, pubMap = {}
  try { opkMap = JSON.parse(localStorage.getItem(LS_OPK) || '{}') } catch {}
  try { pubMap = JSON.parse(localStorage.getItem(LS_OPK_PUB) || '{}') } catch {}
  let nextId = Object.keys(opkMap).length ? Math.max(...Object.keys(opkMap).map(Number), 0) + 1 : 1
  while (Object.keys(opkMap).length < OPK_TARGET) {
    const pair = await generateEcdhPair()
    const id = nextId++
    opkMap[id] = await exportJwk(pair.privateKey)
    pubMap[id] = await exportSpkiB64(pair.publicKey)
  }
  for (const id of Object.keys(opkMap)) {
    if (!pubMap[id]) {
      const pair = await generateEcdhPair()
      opkMap[id] = await exportJwk(pair.privateKey)
      pubMap[id] = await exportSpkiB64(pair.publicKey)
    }
  }
  localStorage.setItem(LS_OPK, JSON.stringify(opkMap))
  localStorage.setItem(LS_OPK_PUB, JSON.stringify(pubMap))
  return { opkMap, pubMap }
}

export async function publishMyPublicKey() {
  await ensureIdentity()
  const { pubMap } = await ensureOpkPubs()
  const body = {
    publicKey: localStorage.getItem(LS_IK_PUB),
    identityKey: localStorage.getItem(LS_IK_PUB),
    signedPreKey: localStorage.getItem(LS_SPK_PUB),
    signedPreKeyId: Number(localStorage.getItem(LS_SPK_ID) || 1),
    signedPreKeySig: localStorage.getItem(LS_SPK_SIG) || 'legacy',
    oneTimePreKeys: Object.entries(pubMap).map(([keyId, publicKey]) => ({
      keyId: Number(keyId), publicKey
    }))
  }
  const res = await fetch(`${MESSAGES_API}/e2ee/public-key`, {
    method: 'PUT', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.error || `publish public key failed: ${res.status}`)
    err.status = res.status
    console.warn('publishMyPublicKey:', err.message)
    throw err
  }
  return body.identityKey
}

export function storePeerPublicKey(peerId, spkiB64) {
  if (!peerId || !spkiB64) return
  const map = JSON.parse(localStorage.getItem(LS_PEER_KEYS) || '{}')
  const key = String(peerId)
  const list = Array.isArray(map[key]) ? map[key] : []
  if (!list.includes(spkiB64)) {
    list.unshift(spkiB64)
    map[key] = list.slice(0, 5)
    localStorage.setItem(LS_PEER_KEYS, JSON.stringify(map))
  }
}

export function getPeerPublicKeyList(peerId) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_PEER_KEYS) || '{}')
    const list = map[String(peerId)]
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

export function getPeerPublicKey(peerId) {
  return getPeerPublicKeyList(peerId)[0] || null
}

export async function fetchPeerPublicKey(peerId) {
  const id = Number(peerId)
  if (!id) return null
  if (peerFetchInflight.has(id)) return peerFetchInflight.get(id)
  const p = (async () => {
    try {
      const res = await fetch(`${MESSAGES_API}/e2ee/public-key/${id}`, { method: 'GET', credentials: 'include' })
      if (!res.ok) return null
      const data = await res.json().catch(() => ({}))
      const key = (data.identityKey || data.publicKey || data.public_key || '').trim()
      if (key) storePeerPublicKey(id, key)
      return key || null
    } catch (e) {
      console.warn('fetchPeerPublicKey:', e)
      return null
    } finally {
      peerFetchInflight.delete(id)
    }
  })()
  peerFetchInflight.set(id, p)
  return p
}

export async function prepareE2eeForPeer(peerId) {
  try {
    await ensureIdentity()
    try { await publishMyPublicKey() } catch (e) { console.warn('publishMyPublicKey:', e) }
    const key = await fetchPeerPublicKey(peerId)
    return !!key
  } catch (e) {
    console.warn('prepareE2eeForPeer:', e)
    return false
  }
}

export function canEncryptFor(peerId) {
  return !!getPeerPublicKey(peerId) && isCryptoAvailable()
}

export async function encryptForPeer(peerId, plainText, opts = {}) {
  await ensureIdentity()
  const forceRefresh = Boolean(opts.forceRefreshKey)
  let peerPubB64 = forceRefresh ? null : getPeerPublicKey(peerId)
  if (!peerPubB64 || forceRefresh) {
    const fresh = await fetchPeerPublicKey(peerId)
    if (fresh) peerPubB64 = fresh
    else if (!peerPubB64) peerPubB64 = getPeerPublicKey(peerId)
  }
  if (!peerPubB64) throw new Error('E2EE: нет публичного ключа собеседника')

  const eph = await generateEcdhPair()
  const theirPub = await importEcdhPub(peerPubB64)
  const shared = await ecdh(eph.privateKey, theirPub)
  const mk = await hkdf(shared, new Uint8Array(32), 'ChickChirick-E2EE-v3', 32)
  const payload = await aesGcmEncrypt(mk, plainText)
  const ephPubSpki = new Uint8Array(await crypto.subtle.exportKey('spki', eph.publicKey))
  const spkiLen = new Uint8Array(2)
  spkiLen[0] = (ephPubSpki.length >> 8) & 0xff
  spkiLen[1] = ephPubSpki.length & 0xff
  const packed = concatBytes(spkiLen, ephPubSpki, payload)
  const wire = E2EE_PREFIX_V3 + bufToB64(packed)
  cachePlaintext(wire, plainText)
  return wire
}

export async function decryptFromPeer(peerId, text) {
  if (!text || typeof text !== 'string') return text || ''

  const cached = getCachedPlaintext(text)
  if (cached != null) return cached

  if (text.startsWith(E2EE_PREFIX_V3) || text.startsWith(E2EE_PREFIX_V3_LEGACY)) {
    return decryptV3(text)
  }
  if (text.startsWith(E2EE_PREFIX_V2) || text.startsWith(E2EE_PREFIX_V2_LEGACY)) {
    return 'Зашифрованное сообщение'
  }
  if (text.startsWith(E2EE_PREFIX) || text.startsWith(E2EE_PREFIX_LEGACY)) {
    return decryptV1(peerId, text)
  }
  return text
}

async function decryptV3(text) {
  await ensureIdentity()
  try {
    const prefixLen = text.startsWith(E2EE_PREFIX_V3_LEGACY)
      ? E2EE_PREFIX_V3_LEGACY.length
      : E2EE_PREFIX_V3.length
    const packed = b64ToBytes(text.slice(prefixLen))
    if (packed.length < 3) return 'Зашифрованное сообщение'
    const spkiLen = (packed[0] << 8) | packed[1]
    if (spkiLen < 50 || 2 + spkiLen + 13 > packed.length) return 'Зашифрованное сообщение'
    const ephSpki = packed.slice(2, 2 + spkiLen)
    const payload = packed.slice(2 + spkiLen)
    const ephPub = await crypto.subtle.importKey(
      'spki', ephSpki, { name: 'ECDH', namedCurve: 'P-256' }, true, []
    )
    const myPriv = await importEcdhPriv(JSON.parse(localStorage.getItem(LS_IK_PRIV)))
    const shared = await ecdh(myPriv, ephPub)
    const mk = await hkdf(shared, new Uint8Array(32), 'ChickChirick-E2EE-v3', 32)
    const plain = await aesGcmDecrypt(mk, payload)
    if (plain && plain !== 'Зашифрованное сообщение') cachePlaintext(text, plain)
    return plain
  } catch (e) {
    console.warn('decryptV3 failed:', e)
    return 'Зашифрованное сообщение'
  }
}

async function decryptV1(peerId, text) {
  await ensureIdentity()
  try { await fetchPeerPublicKey(peerId) } catch (_) {}
  const keys = getPeerPublicKeyList(peerId)
  const legacy = localStorage.getItem('chickchirick_e2ee_peer_' + peerId)
  if (legacy && !keys.includes(legacy)) keys.push(legacy)
  if (keys.length === 0) return 'Зашифрованное сообщение'
  const prefixLen = text.startsWith(E2EE_PREFIX_LEGACY) ? E2EE_PREFIX_LEGACY.length : E2EE_PREFIX.length
  const payload = b64ToBytes(text.slice(prefixLen))
  const ikPrivJwk = localStorage.getItem(LS_IK_PRIV) || localStorage.getItem('chickchirick_e2ee_priv_jwk')
  if (!ikPrivJwk) return 'Зашифрованное сообщение'
  const ikPriv = await importEcdhPriv(JSON.parse(ikPrivJwk))
  for (const peerPub of keys) {
    try {
      const theirPub = await importEcdhPub(peerPub)
      const shared = await ecdh(ikPriv, theirPub)
      const mk = await hkdf(shared, textEncoder.encode('chickchirick-e2ee-v1'), 'msg', 32)
      const plain = await aesGcmDecrypt(mk, payload)
      cachePlaintext(text, plain)
      return plain
    } catch (_) {}
  }
  return 'Зашифрованное сообщение'
}

export function isEncryptedText(text) {
  if (typeof text !== 'string') return false
  return (
    text.startsWith(E2EE_PREFIX_V3) || text.startsWith(E2EE_PREFIX_V3_LEGACY) ||
    text.startsWith(E2EE_PREFIX_V2) || text.startsWith(E2EE_PREFIX_V2_LEGACY) ||
    text.startsWith(E2EE_PREFIX) || text.startsWith(E2EE_PREFIX_LEGACY) ||
    text.startsWith(E2EE_GROUP_PREFIX) || text.startsWith(E2EE_GROUP_PREFIX_LEGACY)
  )
}

export function isKeyAnnounce(text) {
  return typeof text === 'string' && text.startsWith(KEY_ANNOUNCE_PREFIX)
}

export function parseKeyAnnounce(text) {
  if (!isKeyAnnounce(text)) return null
  return text.slice(KEY_ANNOUNCE_PREFIX.length).trim() || null
}

export async function buildKeyAnnounceMessage() {
  const { publicKeySpkiB64 } = await ensureIdentity()
  return KEY_ANNOUNCE_PREFIX + publicKeySpkiB64
}

export function tryConsumeKeyAnnounce(senderId, text) {
  const key = parseKeyAnnounce(text)
  if (!key) return false
  storePeerPublicKey(senderId, key)
  return true
}

/**
 * Всегда возвращает текст для UI: plaintext либо «Зашифрованное сообщение».
 * Никогда не отдаёт сырой e2ee:* в интерфейс.
 */
export async function resolveE2eeDisplayText(peerId, rawText) {
  if (rawText == null || rawText === '') return ''
  if (!isEncryptedText(rawText)) {
    // на всякий случай: похоже на ciphertext без распознанного префикса
    if (typeof rawText === 'string' && /^e2ee:v\d+:/i.test(rawText.trim())) {
      return 'Зашифрованное сообщение'
    }
    return rawText
  }
  try {
    const plain = await decryptFromPeer(peerId, rawText)
    if (plain == null || plain === '') return 'Зашифрованное сообщение'
    if (isEncryptedText(plain) || /^e2ee:v\d+:/i.test(String(plain).trim())) {
      return 'Зашифрованное сообщение'
    }
    return plain
  } catch (e) {
    console.warn('resolveE2eeDisplayText:', e)
    return 'Зашифрованное сообщение'
  }
}


// ─── Group E2EE (sender key / shared group key) ─────────────────────────────

function loadGroupKeyMap() {
  try {
    return JSON.parse(localStorage.getItem(LS_GROUP_KEYS) || '{}') || {}
  } catch {
    return {}
  }
}

function saveGroupKeyMap(map) {
  localStorage.setItem(LS_GROUP_KEYS, JSON.stringify(map))
}

/**
 * @returns {{ keyB64: string, epoch: number }|null}
 */
export function getGroupKey(groupUuid) {
  const id = String(groupUuid || '').trim()
  if (!id) return null
  const row = loadGroupKeyMap()[id]
  if (!row?.keyB64) return null
  return { keyB64: row.keyB64, epoch: Number(row.epoch) || 1 }
}

export function hasGroupKey(groupUuid) {
  return !!getGroupKey(groupUuid)
}

export function storeGroupKey(groupUuid, keyB64, epoch = 1) {
  const id = String(groupUuid || '').trim()
  if (!id || !keyB64) return
  const map = loadGroupKeyMap()
  const prev = map[id]
  // не затирать более новый epoch более старым
  if (prev && Number(prev.epoch) > Number(epoch)) return
  map[id] = { keyB64, epoch: Number(epoch) || 1 }
  saveGroupKeyMap(map)
}

/** Создать новый GroupKey (AES-256 raw → base64) */
export async function createGroupKey(groupUuid) {
  if (!isCryptoAvailable()) throw new Error('WebCrypto недоступен')
  const raw = crypto.getRandomValues(new Uint8Array(32))
  const keyB64 = bufToB64(raw)
  storeGroupKey(groupUuid, keyB64, 1)
  return { keyB64, epoch: 1 }
}

/**
 * Ротация ключа (после kick/leave в будущем).
 * @returns {{ keyB64: string, epoch: number }}
 */
export async function rotateGroupKey(groupUuid) {
  const prev = getGroupKey(groupUuid)
  const epoch = (prev?.epoch || 0) + 1
  const raw = crypto.getRandomValues(new Uint8Array(32))
  const keyB64 = bufToB64(raw)
  storeGroupKey(groupUuid, keyB64, epoch)
  return { keyB64, epoch }
}

/**
 * Зашифровать текст ключом группы → e2ee:gv1:<b64(iv+ct)>
 */
export async function encryptForGroup(groupUuid, plainText) {
  const row = getGroupKey(groupUuid)
  if (!row?.keyB64) throw new Error('E2EE: нет ключа группы')
  if (!isCryptoAvailable()) throw new Error('WebCrypto недоступен')
  const mk = b64ToBytes(row.keyB64)
  if (mk.length !== 32) throw new Error('E2EE: повреждённый ключ группы')
  const payload = await aesGcmEncrypt(mk, plainText)
  const wire = E2EE_GROUP_PREFIX + bufToB64(payload)
  cachePlaintext(wire, plainText)
  return wire
}

/**
 * Расшифровать group ciphertext. peerId не нужен.
 */
export async function decryptFromGroup(groupUuid, text) {
  if (!text || typeof text !== 'string') return text || ''
  const cached = getCachedPlaintext(text)
  if (cached != null) return cached

  if (!text.startsWith(E2EE_GROUP_PREFIX) && !text.startsWith(E2EE_GROUP_PREFIX_LEGACY)) {
    return text
  }
  const row = getGroupKey(groupUuid)
  if (!row?.keyB64) return 'Зашифрованное сообщение'
  try {
    const prefixLen = text.startsWith(E2EE_GROUP_PREFIX_LEGACY)
      ? E2EE_GROUP_PREFIX_LEGACY.length
      : E2EE_GROUP_PREFIX.length
    const payload = b64ToBytes(text.slice(prefixLen))
    const mk = b64ToBytes(row.keyB64)
    const plain = await aesGcmDecrypt(mk, payload)
    cachePlaintext(text, plain)
    return plain
  } catch (e) {
    console.warn('decryptFromGroup failed:', e)
    return 'Зашифрованное сообщение'
  }
}

export function isGroupEncryptedText(text) {
  return typeof text === 'string' && (
    text.startsWith(E2EE_GROUP_PREFIX) || text.startsWith(E2EE_GROUP_PREFIX_LEGACY)
  )
}

export function isGroupKeyMessage(text) {
  return typeof text === 'string' && text.startsWith(GROUP_KEY_MSG_PREFIX)
}

/**
 * Собрать control-message с пакетами ключа для участников.
 * packages[userId] = encryptForPeer(userId, JSON.stringify({ groupUuid, keyB64, epoch }))
 *
 * @param {string} groupUuid
 * @param {number[]} memberUserIds messages-local ids
 * @param {number} myUserId
 * @returns {Promise<string>} wire text for sendGroupMessage
 */
export async function buildGroupKeyDistributionMessage(groupUuid, memberUserIds, myUserId) {
  const row = getGroupKey(groupUuid)
  if (!row?.keyB64) throw new Error('E2EE: нет ключа группы для раздачи')

  const payload = JSON.stringify({
    groupUuid: String(groupUuid),
    keyB64: row.keyB64,
    epoch: row.epoch
  })

  const packages = {}
  const ids = [...new Set((memberUserIds || []).map(Number).filter(Boolean))]
  for (const uid of ids) {
    if (uid === Number(myUserId)) continue
    try {
      await ensureIdentity()
      try { await publishMyPublicKey() } catch (_) {}
      // всегда свежий ключ с API — иначе package не откроется после ротации IK
      const peerKey = await fetchPeerPublicKey(uid)
      if (!peerKey) {
        console.warn('group key package: no public key for', uid)
        continue
      }
      packages[String(uid)] = await encryptForPeer(uid, payload, { forceRefreshKey: true })
    } catch (e) {
      console.warn('group key package for', uid, e)
    }
  }

  const body = {
    v: 1,
    groupUuid: String(groupUuid),
    epoch: row.epoch,
    packages
  }
  return GROUP_KEY_MSG_PREFIX + bufToB64(textEncoder.encode(JSON.stringify(body)))
}

/**
 * Принять control-message раздачи ключа.
 * @returns {Promise<boolean>} true если ключ сохранён
 */
export async function consumeGroupKeyMessage(senderId, text, myUserId) {
  if (!isGroupKeyMessage(text)) return false
  try {
    await ensureIdentity()
    const raw = text.slice(GROUP_KEY_MSG_PREFIX.length)
    let body
    try {
      body = JSON.parse(textDecoder.decode(b64ToBytes(raw)))
    } catch (e) {
      console.warn('consumeGroupKeyMessage: bad envelope', e)
      return false
    }
    const packs = body?.packages && typeof body.packages === 'object' ? body.packages : {}
    const candidates = []
    const my = myUserId != null ? String(myUserId) : ''
    if (my && packs[my]) candidates.push(packs[my])
    // fallback: перебор всех packages (рассинхрон messages-local id)
    for (const [k, v] of Object.entries(packs)) {
      if (k === my) continue
      if (typeof v === 'string' && v) candidates.push(v)
    }
    if (!candidates.length) return false

    for (const pack of candidates) {
      try {
        // не используем кэш «Зашифрованное сообщение»
        const plain = await decryptFromPeer(senderId, pack)
        if (!plain || typeof plain !== 'string') continue
        if (plain === 'Зашифрованное сообщение') continue
        if (isEncryptedText(plain) || isGroupEncryptedText(plain)) continue
        if (!(plain.startsWith('{') || plain.startsWith('['))) continue
        let data
        try {
          data = JSON.parse(plain)
        } catch {
          continue
        }
        if (!data?.keyB64 || !data?.groupUuid) continue
        storeGroupKey(data.groupUuid, data.keyB64, data.epoch || body.epoch || 1)
        return true
      } catch (e) {
        console.warn('consumeGroupKeyMessage pack try failed', e)
      }
    }
    console.warn('consumeGroupKeyMessage: no package decrypted for user', myUserId)
    return false
  } catch (e) {
    console.warn('consumeGroupKeyMessage:', e)
    return false
  }
}

/**
 * UI-текст для group-сообщений (учитывает group ciphertext и control).
 */
export async function resolveGroupE2eeDisplayText(groupUuid, rawText, senderId, myUserId) {
  if (rawText == null || rawText === '') return ''
  if (isGroupKeyMessage(rawText)) {
    await consumeGroupKeyMessage(senderId, rawText, myUserId)
    return '' // не показывать в ленте
  }
  if (isGroupEncryptedText(rawText)) {
    return decryptFromGroup(groupUuid, rawText)
  }
  // pairwise e2ee случайно попал в группу
  if (isEncryptedText(rawText)) {
    return resolveE2eeDisplayText(senderId, rawText)
  }
  return rawText
}


/**
 * Если у нас есть GroupKey — пересобрать packages и вернуть wire для sendGroupMessage.
 * При removedUserIds — сначала rotateGroupKey.
 */
export async function redistributeGroupKey(groupUuid, memberUserIds, myUserId, { rotate = false } = {}) {
  const uuid = String(groupUuid || '').trim()
  if (!uuid) throw new Error('no group uuid')
  if (rotate || !hasGroupKey(uuid)) {
    if (rotate) await rotateGroupKey(uuid)
    else await createGroupKey(uuid)
  }
  return buildGroupKeyDistributionMessage(uuid, memberUserIds, myUserId)
}
