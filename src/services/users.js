/**
 * Интеграция с user-сервисом (chickchirick):
 *
 * Messages знает только локальный user_id + user_uuid.
 * Имя/фамилия — в user DB, связь по UUID.
 *
 * 1) GET /api/messages/user-relations  → [{ id, user_uuid }, ...]
 * 2) GET /api/user/frontend/users/by-uuids?uuids=...  → { payload: [{ userUuid, name, surname, login }, ...] }
 */

const USER_API = '/api/user'
const MESSAGES_API = '/api/messages'

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

/**
 * id (messages) → uuid
 */
export async function fetchUserRelations() {
  const res = await fetch(`${MESSAGES_API}/user-relations`, {
    method: 'GET',
    credentials: 'include'
  })
  if (!res.ok) {
    console.warn('user-relations:', res.status)
    return []
  }
  const data = await safeJson(res)
  const list = Array.isArray(data) ? data : []
  return list
    .map((r) => ({
      id: Number(r.id ?? r.userId ?? r.user_id),
      // json tag в messages model: user_uuid
      uuid: String(r.user_uuid || r.userUuid || r.uuid || '')
    }))
    .filter((r) => r.id && r.uuid)
}

/**
 * @param {string[]} uuids
 * @returns {Promise<Array<{ id, userUuid, name, surname, login }>>}
 */
export async function fetchUsersByUuids(uuids) {
  const unique = [...new Set((uuids || []).map(String).filter(Boolean))]
  if (unique.length === 0) return []

  const qs = encodeURIComponent(unique.join(','))
  const res = await fetch(`${USER_API}/frontend/users/by-uuids?uuids=${qs}`, {
    method: 'GET',
    credentials: 'include'
  })
  if (!res.ok) {
    console.warn('users/by-uuids:', res.status)
    return []
  }
  const data = await safeJson(res)
  // c_http.SendSuccess → { payload: [...] }
  const list = Array.isArray(data?.payload) ? data.payload : Array.isArray(data) ? data : []
  return list.map((u) => ({
    id: Number(u.id),
    userUuid: String(u.userUuid || u.user_uuid || ''),
    name: u.name || '',
    surname: u.surname || '',
    login: u.login || ''
  }))
}

/**
 * @param {number[]} chatIds — messages-local user ids (собеседники)
 * @returns {Record<number, { name, surname, login }>}
 */
export async function resolveChatUsers(chatIds) {
  const ids = [...new Set((chatIds || []).map(Number).filter(Boolean))]
  if (ids.length === 0) return {}

  const relations = await fetchUserRelations()
  const uuidByMessagesId = {}
  for (const r of relations) {
    uuidByMessagesId[r.id] = r.uuid
  }

  const neededUuids = ids
    .map((id) => uuidByMessagesId[id])
    .filter(Boolean)

  const users = await fetchUsersByUuids(neededUuids)
  const byUuid = {}
  for (const u of users) {
    if (u.userUuid) byUuid[u.userUuid] = u
  }

  /** messagesId → user fields */
  const result = {}
  for (const id of ids) {
    const uuid = uuidByMessagesId[id]
    const u = uuid ? byUuid[uuid] : null
    if (u) {
      result[id] = {
        name: u.name,
        surname: u.surname,
        login: u.login
      }
    }
  }
  return result
}
