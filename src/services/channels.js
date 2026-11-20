/**
 * API каналов (messages-сервис).
 * Прокси: /api/messages → messages HTTP
 * E2EE: ciphertext в text; ключ канала = тот же механизм, что GroupKey (uuid канала).
 */

const API = '/api/messages'

/**
 * @typedef {{
 *   id: number,
 *   channel_uuid: string,
 *   title: string,
 *   description?: string,
 *   avatar_file_uuid?: string|null,
 *   is_public: boolean,
 *   e2ee_enabled: boolean,
 *   is_channel?: boolean,
 *   created_by: number,
 *   member_count?: number,
 *   my_role?: string
 * }} ChannelChat
 */

/** @returns {Promise<ChannelChat[]>} */
export async function listMyChannels() {
  const res = await fetch(`${API}/channels`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `list channels failed: ${res.status}`)
  }
  return res.json()
}

/**
 * @param {{ q?: string, limit?: number, offset?: number }} [params]
 * @returns {Promise<ChannelChat[]>}
 */
export async function listPublicChannels(params = {}) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const q = qs.toString()
  const res = await fetch(`${API}/channels/public${q ? `?${q}` : ''}`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `list public channels failed: ${res.status}`)
  }
  return res.json()
}

/**
 * @param {{
 *   title: string,
 *   description?: string,
 *   avatar_file_uuid?: string|null,
 *   is_public?: boolean,
 *   e2ee_enabled?: boolean,
 *   member_user_ids?: number[]
 * }} payload
 * @returns {Promise<ChannelChat>}
 */
export async function createChannel(payload) {
  const res = await fetch(`${API}/channels`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `create channel failed: ${res.status}`)
  }
  return res.json()
}

/** @param {string} channelUuid @returns {Promise<ChannelChat>} */
export async function getChannel(channelUuid) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}`, {
    credentials: 'include'
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `get channel failed: ${res.status}`)
  }
  return res.json()
}

/**
 * @param {string} channelUuid
 * @param {{ title?: string, description?: string, avatar_file_uuid?: string|null, is_public?: boolean }} payload
 */
export async function updateChannel(channelUuid, payload) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `update channel failed: ${res.status}`)
  }
  return res.json()
}

export async function deleteChannel(channelUuid) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `delete channel failed: ${res.status}`)
  }
}

/**
 * @param {string} channelUuid
 * @param {{ text: string, respond_message_id?: number }} payload
 */
export async function sendChannelMessage(channelUuid, payload) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `send channel message failed: ${res.status}`)
  }
  return res.json()
}

export async function listChannelMembers(channelUuid) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/members`, {
    credentials: 'include'
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `list channel members failed: ${res.status}`)
  }
  return res.json()
}

/**
 * @param {string} channelUuid
 * @param {number[]} memberUserIds
 * @param {string} [role]
 */
export async function addChannelMembers(channelUuid, memberUserIds, role = 'subscriber') {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/members`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member_user_ids: memberUserIds || [], role })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `add channel members failed: ${res.status}`)
  }
  return res.json()
}

export async function subscribeChannel(channelUuid) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/subscribe`, {
    method: 'POST',
    credentials: 'include'
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `subscribe failed: ${res.status}`)
  }
  return res.json()
}

export async function unsubscribeChannel(channelUuid) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/subscribe`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `unsubscribe failed: ${res.status}`)
  }
}

export async function sendChannelTyping(channelUuid, typing) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/typing`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ typing: Boolean(typing) })
  })
  if (!res.ok && res.status !== 204) {
    console.warn('channel typing failed', res.status)
  }
}

/** @param {string} channelUuid */
export function channelChatId(channelUuid) {
  return `channel:${channelUuid}`
}

/** @param {string|number} chatId @returns {string|null} */
export function parseChannelUuid(chatId) {
  const s = String(chatId || '')
  if (s.startsWith('channel:')) return s.slice(8)
  return null
}

export function isChannelChatId(chatId) {
  return Boolean(parseChannelUuid(chatId))
}
