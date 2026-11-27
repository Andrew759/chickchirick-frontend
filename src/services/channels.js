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
/**
 * Каналы, где текущий пользователь — owner.
 * @returns {Promise<ChannelChat[]>}
 */
export async function listOwnedChannels() {
  const res = await fetch(`${API}/channels/owned`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `list owned channels failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Пересылка текста в группы/каналы (REST).
 * @param {string} text
 * @param {Array<{ type: 'group'|'channel', uuid: string }>} targets
 */
export async function forwardMessages(text, targets) {
  const res = await fetch(`${API}/messages/forward`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targets })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `forward failed: ${res.status}`)
  }
  return data
}

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
/**
 * История сообщений канала (только для участников).
 * @param {string} channelUuid
 * @param {{ limit?: number, offset?: number }} [params]
 * @returns {Promise<Array<{ id:number, senderId:number, channelId:string, text:string, createdAt:string }>>}
 */
export async function listChannelMessages(channelUuid, params = {}) {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const q = qs.toString()
  const res = await fetch(
    `${API}/channels/${encodeURIComponent(channelUuid)}/messages${q ? `?${q}` : ''}`,
    { credentials: 'include' }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `list channel messages failed: ${res.status}`)
  }
  return res.json()
}

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

/**
 * Удаление поста в канале.
 * DELETE /channels/{uuid}/messages/{id}
 */
export async function deleteChannelMessage(channelUuid, messageId) {
  const id = encodeURIComponent(String(messageId))
  const res = await fetch(
    `${API}/channels/${encodeURIComponent(channelUuid)}/messages/${id}`,
    { method: 'DELETE', credentials: 'include' }
  )
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}))
    const msg = data.error || data.errors?.[0]?.message || `delete channel message failed: ${res.status}`
    throw new Error(msg)
  }
  return true
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

/** Редактирование собственного сообщения. */
export async function editChannelMessage(chatUuid, messageId, payload) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(chatUuid)}/messages/${encodeURIComponent(String(messageId))}`, {
    method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || data.errors?.[0]?.message || `edit message failed: ${res.status}`)
  }
  return res.status === 204 ? true : res.json().catch(() => true)
}


/** Общая музыка канала, доступная всем его участникам/читателям. */
export async function listChannelMedia(channelUuid) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/media`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `list channel media failed: ${res.status}`)
  }
  return res.json()
}

export async function addChannelMedia(channelUuid, media) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/media`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_uuid: media.fileUuid, file_name: media.fileName || '', kind: media.kind || 'audio' })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `add channel media failed: ${res.status}`)
  }
  return res.json()
}

export async function removeChannelMedia(channelUuid, fileUuid) {
  const res = await fetch(`${API}/channels/${encodeURIComponent(channelUuid)}/media/${encodeURIComponent(fileUuid)}`, {
    method: 'DELETE', credentials: 'include'
  })
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `remove channel media failed: ${res.status}`)
  }
}
