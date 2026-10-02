/**
 * Интеграция с user-сервисом (chickchirick):
 *
 * Messages знает только локальный user_id + user_uuid.
 * Имя/фамилия — в user DB, связь по UUID.
 *
 * 1) GET /api/messages/user-relations  → [{ id, user_uuid }, ...]
 * 2) GET /api/user/frontend/users/by-uuids?uuids=...  → { payload: [{ userUuid, name, surname, login }, ...] }
 */

import { probeFileMeta, detectMediaKind } from './files.js'

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
 * Извлекает file uuid из объекта фото (разные варианты JSON-полей).
 */
function extractPhotoFileUuid(photo) {
  if (!photo) return null
  const raw = photo.file_uuid || photo.FileUuid || photo.fileUuid || null
  const uuid = raw && typeof raw === 'object' ? (raw.String || raw.string || null) : raw
  if (!uuid || String(uuid) === '00000000-0000-0000-0000-000000000000') return null
  return String(uuid)
}

/**
 * Все медиа пользователя (фото + музыка), привязанные через /photo.
 * Тип определяется по Content-Type / имени файла в files-сервисе.
 * @param {number} userServiceId
 * @returns {Promise<Array<{ id: number, fileUuid: string, kind: 'image'|'audio'|'file', fileName: string }>>}
 */
export async function fetchUserMedia(userServiceId) {
  const id = Number(userServiceId)
  if (!id) return []

  try {
    const res = await fetch(`${USER_API}/user/${id}/photos`, {
      method: 'GET',
      credentials: 'include'
    })
    if (!res.ok) return []
    const data = await safeJson(res)
    const list = Array.isArray(data?.payload) ? data.payload : Array.isArray(data) ? data : []

    const base = list
      .map((p) => ({
        id: Number(p.id) || 0,
        fileUuid: extractPhotoFileUuid(p)
      }))
      .filter((p) => p.fileUuid)
      .sort((a, b) => (b.id || 0) - (a.id || 0))

    // параллельно узнаём тип каждого файла
    const enriched = await Promise.all(
      base.map(async (item) => {
        const meta = await probeFileMeta(item.fileUuid)
        const kind = detectMediaKind(meta)
        return {
          ...item,
          kind,
          fileName: meta.fileName || ''
        }
      })
    )
    return enriched
  } catch (e) {
    console.warn('fetchUserMedia failed:', e)
    return []
  }
}

/**
 * @deprecated используйте fetchUserMedia
 * @param {number} userServiceId
 */
export async function fetchUserPhotos(userServiceId) {
  const all = await fetchUserMedia(userServiceId)
  return all.filter((m) => m.kind === 'image')
}

/**
 * Фото пользователя из user-сервиса.
 * GET /user/{id}/photos → fileUuid самой новой фотографии (для аватара).
 * @param {number} userServiceId — id в user-сервисе (не messages)
 * @returns {Promise<string|null>}
 */
export async function fetchUserAvatarFileUuid(userServiceId) {
  const media = await fetchUserMedia(userServiceId)
  const img = media.find((m) => m.kind === 'image')
  return img?.fileUuid || null
}

/**
 * Удалить запись фото в user-сервисе.
 * @param {number} photoId
 */
export async function deleteUserPhoto(photoId) {
  const id = Number(photoId)
  if (!id) return
  const res = await fetch(`${USER_API}/photo/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok && res.status !== 204) {
    const data = await safeJson(res)
    throw new Error(data?.error || `Delete photo failed: ${res.status}`)
  }
}

/**
 * Привязать фото к пользователю (метаданные в user-сервисе).
 * Файл уже должен быть загружен в files-сервис.
 * @param {number} userServiceId
 * @param {string} fileUuid
 */
export async function createUserPhoto(userServiceId, fileUuid) {
  const id = Number(userServiceId)
  if (!id || !fileUuid) throw new Error('userServiceId and fileUuid are required')

  const res = await fetch(`${USER_API}/photo`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_uuid: fileUuid,
      FileUuid: fileUuid,
      user_id: id
    })
  })

  if (!res.ok) {
    const data = await safeJson(res)
    const msg = data?.error || data?.errors?.[0]?.message || `Create photo failed: ${res.status}`
    throw new Error(msg)
  }

  return safeJson(res)
}

/**
 * Найти user-service id по UUID (через by-uuids).
 * @param {string} userUuid
 * @returns {Promise<{ id: number, userUuid: string, name: string, surname: string, login: string }|null>}
 */
export async function fetchUserByUuid(userUuid) {
  const uuid = String(userUuid || '').trim()
  if (!uuid) return null
  const list = await fetchUsersByUuids([uuid])
  return list[0] || null
}

/**
 * @param {number[]} chatIds — messages-local user ids (собеседники)
 * @returns {Record<number, { name, surname, login, userServiceId?, avatarFileUuid? }>}
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
  const avatarJobs = []

  for (const id of ids) {
    const uuid = uuidByMessagesId[id]
    const u = uuid ? byUuid[uuid] : null
    if (u) {
      result[id] = {
        userUuid: u.userUuid || null,
        name: u.name,
        surname: u.surname,
        login: u.login,
        userServiceId: u.id || null,
        avatarFileUuid: null
      }
      if (u.id) {
        avatarJobs.push(
          fetchUserAvatarFileUuid(u.id).then((fileUuid) => {
            if (fileUuid) result[id].avatarFileUuid = fileUuid
          })
        )
      }
    }
  }

  await Promise.all(avatarJobs)
  return result
}

/**
 * Поиск пользователей по логину или телефону.
 * @param {string} query
 * @returns {Promise<Array<{id:number,name:string,surname:string,login:string,userUuid?:string}>>}
 */
export async function searchUsers(query) {
  const q = (query || '').trim()
  if (q.length < 2) return []

  const response = await fetch(`/api/user/frontend/users/search?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    credentials: 'include'
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.errors?.[0]?.message || err.error || `Search failed: ${response.status}`)
  }

  const data = await response.json().catch(() => ({}))
  const list = data.payload ?? data ?? []
  if (!Array.isArray(list)) return []
  return list.map((u) => ({
    id: Number(u.id),
    userUuid: String(u.userUuid || u.user_uuid || ''),
    name: u.name || '',
    surname: u.surname || '',
    login: u.login || ''
  }))
}

/**
 * Находит messages-local id пользователя по его UUID.
 * @param {string} userUuid
 * @returns {Promise<number|null>}
 */
export async function resolveMessagesIdByUuid(userUuid) {
  const uuid = String(userUuid || '').trim()
  if (!uuid) return null

  const relations = await fetchUserRelations()
  const found = relations.find((r) => r.uuid === uuid)
  return found ? found.id : null
}

