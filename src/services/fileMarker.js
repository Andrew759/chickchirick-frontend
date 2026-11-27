/**
 * Маркер вложения в тексте сообщения.
 *
 * Формат первой строки:
 *   [[ccfile|<uuid>|<filename>]]
 *   [[ccfile|<uuid>|<filename>|<audio_uuid>]]  — стикер со звуком
 * дальше опционально подпись (caption).
 */

const MARKER_RE = /^\[\[ccfile\|([^|\]]+)\|([^|\]]*)(?:\|([^|\]]*))?\]\]\n?/

/**
 * @param {string} fileUuid
 * @param {string} filename
 * @param {string} [caption]
 * @param {string} [audioUuid]
 * @returns {string}
 */
export function buildFileMessageText(fileUuid, filename, caption = '', audioUuid = '') {
  const safeName = String(filename || 'file').replace(/[\[\]|]/g, '_')
  const safeAudio = String(audioUuid || '').replace(/[\[\]|]/g, '')
  const head = safeAudio
    ? `[[ccfile|${fileUuid}|${safeName}|${safeAudio}]]`
    : `[[ccfile|${fileUuid}|${safeName}]]`
  const body = (caption || '').trim()
  return body ? `${head}\n${body}` : head
}

/**
 * @param {string} text
 * @returns {{ fileUuid: string|null, fileName: string|null, audioUuid: string|null, caption: string }}
 */
export function parseFileMessageText(text) {
  const raw = text == null ? '' : String(text)
  const m = raw.match(MARKER_RE)
  if (!m) {
    return { fileUuid: null, fileName: null, audioUuid: null, caption: raw }
  }
  return {
    fileUuid: m[1] || null,
    fileName: m[2] || 'file',
    audioUuid: m[3] || null,
    caption: raw.slice(m[0].length)
  }
}


/**
 * Маркер пересылки:
 *   [[ccfwd|<senderId>|<name>]]
 * далее тело сообщения (в т.ч. [[ccfile|...]]).
 */
const FORWARD_RE = /^[\uFEFF\s]*\[\[ccfwd\|(\d+)\|([^\]]*)\]\][ \t]*(?:\r?\n)?/
const FORWARD_CHANNEL_RE = /^[\uFEFF\s]*\[\[ccfwdc\|([^|\]]+)\|([^\]]*)\]\][ \t]*(?:\r?\n)?/

/**
 * @param {number|string} senderId
 * @param {string} senderName
 * @param {string} body
 */
export function buildForwardMessageText(senderId, senderName, body = '') {
  const id = String(senderId || '').replace(/[^0-9]/g, '')
  const safeName = String(senderName || 'Пользователь').replace(/[\[\]|]/g, ' ').trim() || 'Пользователь'
  const head = `[[ccfwd|${id || '0'}|${safeName}]]`
  const rest = body == null ? '' : String(body)
  return rest ? `${head}\n${rest}` : head
}

/** Маркер исходного канала; UUID и название сохраняются даже после пересылки дальше. */
export function buildForwardChannelMessageText(channelUuid, channelName, body = '') {
  const uuid = String(channelUuid || '').replace(/[\[\]|]/g, '').trim()
  const name = String(channelName || 'Канал').replace(/[\[\]|]/g, ' ').trim() || 'Канал'
  const head = `[[ccfwdc|${uuid}|${name}]]`
  const rest = body == null ? '' : String(body)
  return rest ? `${head}\n${rest}` : head
}

/**
 * @param {string} text
 * @returns {{ forwardedFromSenderId: number|null, forwardedFromName: string|null, forwardedFromChannelId: string|null, forwardedFromChannelName: string|null, forwardedFromType: string|null, body: string }}
 */
export function parseForwardMessageText(text) {
  const raw = text == null ? '' : String(text)
  const channel = raw.match(FORWARD_CHANNEL_RE)
  if (channel) {
    return { forwardedFromSenderId: null, forwardedFromName: null, forwardedFromChannelId: channel[1] || null, forwardedFromChannelName: (channel[2] || '').trim() || 'Канал', forwardedFromType: 'channel', body: raw.slice(channel[0].length) }
  }
  const m = raw.match(FORWARD_RE)
  if (!m) {
    return { forwardedFromSenderId: null, forwardedFromName: null, forwardedFromChannelId: null, forwardedFromChannelName: null, forwardedFromType: null, body: raw }
  }
  return {
    forwardedFromSenderId: Number(m[1]) || null,
    forwardedFromName: (m[2] || '').trim() || null,
    forwardedFromChannelId: null,
    forwardedFromChannelName: null,
    forwardedFromType: 'user',
    body: raw.slice(m[0].length)
  }
}
