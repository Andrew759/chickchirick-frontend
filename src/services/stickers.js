/**
 * Клиент сервиса стикеров (chickchirick-stickers).
 *
 * Прокси Vite: /api/stickers → http://127.0.0.1:8087
 * Картинки стикеров лежат в files-сервисе (image_uuid).
 */

const PREFIX = '/api/stickers'

async function request(path, options = {}) {
  const res = await fetch(`${PREFIX}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data.error || `Stickers request failed: ${res.status}`
    throw new Error(msg)
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  return data.payload !== undefined ? data.payload : data
}

/** Каталог опубликованных паков со стикерами. */
export function fetchStickerPacks() {
  return request('/sticker-packs')
}

/** Один опубликованный пак. */
export function fetchStickerPack(id) {
  return request(`/sticker-packs/${encodeURIComponent(id)}`)
}

/** Стикеры пака. */
export function fetchPackStickers(packId) {
  return request(`/sticker-packs/${encodeURIComponent(packId)}/stickers`)
}

/** Установленные пользователем паки (нужна cookie access_token). */
export function fetchInstalledPacks() {
  return request('/me/sticker-packs')
}

/** Установить пак себе. */
export function installPack(packId) {
  return request(`/sticker-packs/${encodeURIComponent(packId)}/install`, {
    method: 'POST'
  })
}

/** Убрать пак. */
export function uninstallPack(packId) {
  return request(`/sticker-packs/${encodeURIComponent(packId)}/install`, {
    method: 'DELETE'
  })
}

/** Имя файла-маркера, чтобы UI показал стикер как картинку. */
export function stickerFileName(sticker) {
  const slug = (sticker?.slug || 'sticker').replace(/[^\w.-]+/g, '_')
  return `sticker-${slug}.webp`
}
