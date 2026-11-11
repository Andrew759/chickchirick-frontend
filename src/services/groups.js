/**
 * API групповых чатов (messages-сервис).
 * Прокси: /api/messages → messages HTTP
 */

const API = '/api/messages'

/**
 * @typedef {{ id: number, group_uuid: string, title: string, avatar_file_uuid?: string|null, created_by: number, member_count?: number }} GroupChat
 */

/**
 * @returns {Promise<GroupChat[]>}
 */
export async function listMyGroups() {
  const res = await fetch(`${API}/group-chats`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `list groups failed: ${res.status}`)
  }
  return res.json()
}

/**
 * @param {{ title: string, avatar_file_uuid?: string|null, member_user_ids?: number[] }} payload
 * @returns {Promise<GroupChat>}
 */
export async function createGroup(payload) {
  const res = await fetch(`${API}/group-chats`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `create group failed: ${res.status}`)
  }
  return res.json()
}

/**
 * @param {string} groupUuid
 * @returns {Promise<GroupChat>}
 */
export async function getGroup(groupUuid) {
  const res = await fetch(`${API}/group-chats/${encodeURIComponent(groupUuid)}`, {
    credentials: 'include'
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `get group failed: ${res.status}`)
  }
  return res.json()
}

/**
 * @param {string} groupUuid
 * @param {{ title?: string, avatar_file_uuid?: string|null }} payload
 * @returns {Promise<GroupChat>}
 */
export async function updateGroup(groupUuid, payload) {
  const res = await fetch(`${API}/group-chats/${encodeURIComponent(groupUuid)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `update group failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Отправка сообщения в группу (realtime уходит через Redis → WS).
 * @param {string} groupUuid
 * @param {{ text: string, respond_message_id?: number }} payload
 */
export async function sendGroupMessage(groupUuid, payload) {
  const res = await fetch(`${API}/group-chats/${encodeURIComponent(groupUuid)}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `send group message failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Стабильный id чата на фронте для группы.
 * @param {string} groupUuid
 */
export function groupChatId(groupUuid) {
  return `group:${groupUuid}`
}

/**
 * @param {string|number} chatId
 * @returns {string|null}
 */
export function parseGroupUuid(chatId) {
  const s = String(chatId || '')
  if (s.startsWith('group:')) return s.slice(6)
  return null
}

export function isGroupChatId(chatId) {
  return Boolean(parseGroupUuid(chatId))
}
