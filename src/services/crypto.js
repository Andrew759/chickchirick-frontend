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
  return loadPlainCache()[ciphertext] ?? null
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

export async function encryptForPeer(peerId, plainText) {
  await ensureIdentity()
  let peerPubB64 = getPeerPublicKey(peerId)
  if (!peerPubB64) peerPubB64 = await fetchPeerPublicKey(peerId)
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
    cachePlaintext(text, plain)
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
    text.startsWith(E2EE_PREFIX) || text.startsWith(E2EE_PREFIX_LEGACY)
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
