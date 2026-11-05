/**
 * Клиент сервиса стикеров (chickchirick-stickers).
 * Прокси: /api/stickers → http://127.0.0.1:8087
 * Мутации — под cookie access_token.
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
    const msg = data.error || data.details || `Stickers request failed: ${res.status}`
    throw new Error(msg)
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  return data.payload !== undefined ? data.payload : data
}

export function fetchStickerPacks() {
  return request('/sticker-packs')
}

export function fetchStickerPack(id) {
  return request(`/sticker-packs/${encodeURIComponent(id)}`)
}

export function fetchPackStickers(packId) {
  return request(`/sticker-packs/${encodeURIComponent(packId)}/stickers`)
}

export function fetchInstalledPacks() {
  return request('/me/sticker-packs')
}

export function installPack(packId) {
  return request(`/sticker-packs/${encodeURIComponent(packId)}/install`, { method: 'POST' })
}

export function uninstallPack(packId) {
  return request(`/sticker-packs/${encodeURIComponent(packId)}/install`, { method: 'DELETE' })
}

export function createPack(body) {
  return request('/sticker-packs', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/** Обновить набор (обложка, title, публикация…). */
export function updatePack(id, body) {
  return request(`/sticker-packs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

export function createSticker(packId, body) {
  return request(`/sticker-packs/${encodeURIComponent(packId)}/stickers`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/** Обновить стикер (emoji, title…). */
export function updateSticker(id, body) {
  return request(`/stickers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

export function deleteSticker(id) {
  return request(`/stickers/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

export function stickerFileName(sticker) {
  const slug = (sticker?.slug || 'sticker').replace(/[^\w.-]+/g, '_')
  return `sticker-${slug}.webp`
}

export function slugify(text) {
  return (
    String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `pack-${Date.now()}`
  )
}
