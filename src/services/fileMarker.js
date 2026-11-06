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
