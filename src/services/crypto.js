/**
 * Клиентское E2EE для ChickChirick.
 *
 * Ключи:
 *  - identity ECDH P-256 в localStorage
 *  - публичные ключи собеседников: localStorage + REST /api/messages/e2ee/public-key
 *
 * Сообщения:
 *  - AES-GCM, префикс 🔒e2ee:v1:
 *  - служебные __E2EE_KEY__: больше не шлём в ленту (бэк их игнорирует)
 */

const STORAGE_PRIV = 'chickchirick_e2ee_priv_jwk'
const STORAGE_PUB = 'chickchirick_e2ee_pub_spki'
const PEER_PREFIX = 'chickchirick_e2ee_peer_'
const MESSAGES_API = '/api/messages'

export const E2EE_PREFIX = '🔒e2ee:v1:'
export const KEY_ANNOUNCE_PREFIX = '__E2EE_KEY__:'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** peerId -> Promise (in-flight fetch) */
const peerFetchInflight = new Map()

function bufToB64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
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

export function isCryptoAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

export async function ensureIdentity() {
  if (!isCryptoAvailable()) throw new Error('Web Crypto API недоступен')

  const existingPub = localStorage.getItem(STORAGE_PUB)
  const existingPriv = localStorage.getItem(STORAGE_PRIV)
  if (existingPub && existingPriv) {
    return { publicKeySpkiB64: existingPub }
  }

  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const spki = await crypto.subtle.exportKey('spki', pair.publicKey)
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

  const pubB64 = bufToB64(spki)
  localStorage.setItem(STORAGE_PUB, pubB64)
  localStorage.setItem(STORAGE_PRIV, JSON.stringify(jwk))

  return { publicKeySpkiB64: pubB64 }
}

export function getMyPublicKeySpkiB64() {
  return localStorage.getItem(STORAGE_PUB) || null
}

async function importMyPrivateKey() {
  const raw = localStorage.getItem(STORAGE_PRIV)
  if (!raw) throw new Error('Нет приватного ключа E2EE — вызовите ensureIdentity()')
  const jwk = JSON.parse(raw)
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  )
}

async function importPeerPublicKey(spkiB64) {
  return crypto.subtle.importKey(
    'spki',
    b64ToBuf(spkiB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
}

export function storePeerPublicKey(peerId, spkiB64) {
  if (!peerId || !spkiB64) return
  localStorage.setItem(PEER_PREFIX + String(peerId), spkiB64)
}

export function getPeerPublicKey(peerId) {
  if (!peerId) return null
  return localStorage.getItem(PEER_PREFIX + String(peerId))
}

/**
 * Опубликовать свой публичный ключ на messages-сервис.
 */
export async function publishMyPublicKey() {
  const { publicKeySpkiB64 } = await ensureIdentity()
  const res = await fetch(`${MESSAGES_API}/e2ee/public-key`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: publicKeySpkiB64 })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `publish public key failed: ${res.status}`)
  }
  return publicKeySpkiB64
}

/**
 * Загрузить публичный ключ собеседника (кэш → API).
 * @returns {Promise<string|null>}
 */
export async function fetchPeerPublicKey(peerId) {
  const id = Number(peerId)
  if (!id) return null

  const cached = getPeerPublicKey(id)
  if (cached) return cached

  if (peerFetchInflight.has(id)) {
    return peerFetchInflight.get(id)
  }

  const p = (async () => {
    try {
      const res = await fetch(`${MESSAGES_API}/e2ee/public-key/${id}`, {
        method: 'GET',
        credentials: 'include'
      })
      if (!res.ok) return null
      const data = await res.json().catch(() => ({}))
      const key = (data.publicKey || data.public_key || '').trim()
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

async function deriveAesKey(peerSpkiB64) {
  const myPriv = await importMyPrivateKey()
  const peerPub = await importPeerPublicKey(peerSpkiB64)

  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: peerPub },
    myPriv,
    256
  )

  const baseKey = await crypto.subtle.importKey(
    'raw',
    bits,
    'HKDF',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: textEncoder.encode('chickchirick-e2ee-v1'),
      info: textEncoder.encode('msg-aes-gcm')
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptForPeer(peerId, plaintext) {
  let peerPub = getPeerPublicKey(peerId)
  if (!peerPub) {
    peerPub = await fetchPeerPublicKey(peerId)
  }
  if (!peerPub) {
    throw new Error('Нет публичного ключа собеседника')
  }

  await ensureIdentity()
  const aesKey = await deriveAesKey(peerPub)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    textEncoder.encode(plaintext)
  )

  const combined = new Uint8Array(iv.length + ct.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ct), iv.length)

  return E2EE_PREFIX + bufToB64(combined)
}

export async function decryptFromPeer(peerId, text) {
  if (!text || typeof text !== 'string') return text || ''
  if (!text.startsWith(E2EE_PREFIX)) return text

  let peerPub = getPeerPublicKey(peerId)
  if (!peerPub) {
    peerPub = await fetchPeerPublicKey(peerId)
  }
  if (!peerPub) {
    return '🔒 Зашифрованное сообщение (нет ключа собеседника)'
  }

  try {
    await ensureIdentity()
    const payload = text.slice(E2EE_PREFIX.length)
    const combined = new Uint8Array(b64ToBuf(payload))
    if (combined.length < 13) {
      return '🔒 Повреждённое зашифрованное сообщение'
    }

    const iv = combined.slice(0, 12)
    const ct = combined.slice(12)
    const aesKey = await deriveAesKey(peerPub)

    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      ct
    )
    return textDecoder.decode(pt)
  } catch (e) {
    console.warn('E2EE decrypt failed:', e)
    return '🔒 Не удалось расшифровать'
  }
}

export function isEncryptedText(text) {
  return typeof text === 'string' && text.startsWith(E2EE_PREFIX)
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

export function canEncryptFor(peerId) {
  return !!getPeerPublicKey(peerId) && isCryptoAvailable()
}

/**
 * Подготовить E2EE к чату: identity + publish + fetch peer key.
 * Не шлёт сообщения в ленту.
 * @returns {Promise<boolean>} true если можно шифровать
 */
export async function prepareE2eeForPeer(peerId) {
  try {
    await ensureIdentity()
    try {
      await publishMyPublicKey()
    } catch (e) {
      console.warn('publishMyPublicKey:', e)
    }
    const key = await fetchPeerPublicKey(peerId)
    return !!key
  } catch (e) {
    console.warn('prepareE2eeForPeer:', e)
    return false
  }
}
