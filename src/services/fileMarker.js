/**
 * Маркер вложения в тексте сообщения.
 *
 * Формат первой строки:
 *   [[ccfile|<uuid>|<filename>]]
 * дальше опционально подпись (caption).
 *
 * Так вложение переживает историю и realtime без правок proto.
 */

const MARKER_RE = /^\[\[ccfile\|([^|\]]+)\|([^\]]*)\]\]\n?/

/**
 * @param {string} fileUuid
 * @param {string} filename
 * @param {string} [caption]
 * @returns {string}
 */
export function buildFileMessageText(fileUuid, filename, caption = '') {
  const safeName = String(filename || 'file').replace(/[\[\]|]/g, '_')
  const head = `[[ccfile|${fileUuid}|${safeName}]]`
  const body = (caption || '').trim()
  return body ? `${head}\n${body}` : head
}

/**
 * @param {string} text
 * @returns {{ fileUuid: string|null, fileName: string|null, caption: string }}
 */
export function parseFileMessageText(text) {
  const raw = text == null ? '' : String(text)
  const m = raw.match(MARKER_RE)
  if (!m) {
    return { fileUuid: null, fileName: null, caption: raw }
  }
  return {
    fileUuid: m[1] || null,
    fileName: m[2] || 'file',
    caption: raw.slice(m[0].length)
  }
}
