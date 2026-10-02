/**
 * Клиентское E2EE (подобие сквозного шифрования) для ChickChirick.
 *
 * Схема:
 *  - У каждого клиента ECDH P-256 identity keypair (private только в localStorage).
 *  - Публичные ключи собеседников кэшируются локально и обмениваются
 *    спец-сообщениями `__E2EE_KEY__:<spki-base64>`.
 *  - Текст шифруется AES-GCM; на сервере лежит только ciphertext с префиксом
 *    `🔒e2ee:v1:<base64(iv||ct)>`.
 *
 * Сервер НЕ имеет приватных ключей → не может прочитать переписку.
 * Это не Signal Protocol (нет ratchet / forward secrecy), но уже настоящее
 * client-side E2EE для 1:1 чатов.
 */

const STORAGE_PRIV = 'chickchirick_e2ee_priv_jwk'
const STORAGE_PUB = 'chickchirick_e2ee_pub_spki'
const PEER_PREFIX = 'chickchirick_e2ee_peer_'

export const E2EE_PREFIX = '🔒e2ee:v1:'
export const KEY_ANNOUNCE_PREFIX = '__E2EE_KEY__:'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

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

/** Есть ли Web Crypto */
export function isCryptoAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

/**
 * Гарантирует наличие identity keypair. Возвращает { publicKeySpkiB64 }.
 */
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

/** Сохранить публичный ключ собеседника (messages-local id) */
export function storePeerPublicKey(peerId, spkiB64) {
  if (!peerId || !spkiB64) return
  localStorage.setItem(PEER_PREFIX + String(peerId), spkiB64)
}

export function getPeerPublicKey(peerId) {
  if (!peerId) return null
  return localStorage.getItem(PEER_PREFIX + String(peerId))
}

/**
 * ECDH → raw bits → HKDF → AES-GCM key
 */
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

/**
 * Шифрует plaintext для peerId.
 * @returns {Promise<string>} строка с префиксом E2EE_PREFIX
 */
export async function encryptForPeer(peerId, plaintext) {
  const peerPub = getPeerPublicKey(peerId)
  if (!peerPub) {
    throw new Error('Нет публичного ключа собеседника — сначала обменяйтесь ключами')
  }

  await ensureIdentity()
  const aesKey = await deriveAesKey(peerPub)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    textEncoder.encode(plaintext)
  )

  // iv (12) || ciphertext+tag
  const combined = new Uint8Array(iv.length + ct.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ct), iv.length)

  return E2EE_PREFIX + bufToB64(combined)
}

/**
 * Расшифровывает сообщение от peerId (отправитель).
 * Если текст не зашифрован — возвращает как есть.
 * При ошибке расшифровки возвращает плейсхолдер.
 */
export async function decryptFromPeer(peerId, text) {
  if (!text || typeof text !== 'string') return text || ''
  if (!text.startsWith(E2EE_PREFIX)) return text

  const peerPub = getPeerPublicKey(peerId)
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

/** Текст спец-сообщения с нашим публичным ключом */
export async function buildKeyAnnounceMessage() {
  const { publicKeySpkiB64 } = await ensureIdentity()
  return KEY_ANNOUNCE_PREFIX + publicKeySpkiB64
}

/**
 * Обработать входящее сообщение: если это анонс ключа — сохранить и вернуть null
 * (сообщение не показывать). Иначе вернуть текст (возможно ciphertext).
 */
export function tryConsumeKeyAnnounce(senderId, text) {
  const key = parseKeyAnnounce(text)
  if (!key) return false
  storePeerPublicKey(senderId, key)
  return true
}

/**
 * Есть ли у нас ключ собеседника и можем ли шифровать.
 */
export function canEncryptFor(peerId) {
  return !!getPeerPublicKey(peerId) && isCryptoAvailable()
}
