/**
 * Клиент файлового сервиса (chickchirick-files).
 *
 * Бинарники хранятся в SeaweedFS/S3 по UUID.
 * Messages-сервис хранит только связку message_id ↔ file_uuid.
 *
 * Прокси Vite: /api/files → http://127.0.0.1:8085
 */

const FILES_PREFIX = '/api/files'

/**
 * URL для скачивания/отображения файла по UUID.
 * @param {string} fileUuid
 * @returns {string}
 */
export function getFileUrl(fileUuid) {
  if (!fileUuid) return ''
  return `${FILES_PREFIX}/file/${encodeURIComponent(fileUuid)}`
}

/**
 * Загрузить файл в файловый сервис под заданным UUID.
 * @param {string} fileUuid — клиентский UUID (crypto.randomUUID())
 * @param {File|Blob} file
 * @returns {Promise<{ filename: string }>}
 */
export async function uploadFile(fileUuid, file) {
  if (!fileUuid) throw new Error('fileUuid is required')
  if (!file) throw new Error('file is required')

  const form = new FormData()
  form.append('file', file, file.name || 'file')

  const res = await fetch(`${FILES_PREFIX}/file/${encodeURIComponent(fileUuid)}`, {
    method: 'POST',
    credentials: 'include',
    body: form
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data.error || data.errors?.[0]?.message || `Upload failed: ${res.status}`
    throw new Error(msg)
  }

  const data = await res.json().catch(() => ({}))
  return {
    filename: data.filename || file.name || 'file'
  }
}

/**
 * Удалить файл из файлового сервиса.
 * @param {string} fileUuid
 */
export async function deleteFile(fileUuid) {
  if (!fileUuid) return
  const res = await fetch(`${FILES_PREFIX}/file/${encodeURIComponent(fileUuid)}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Delete file failed: ${res.status}`)
  }
}

/**
 * Привязать UUID файла к сообщению в messages-сервисе (метаданные).
 * @param {number} messageId
 * @param {string} fileUuid
 */
export async function linkFileToMessage(messageId, fileUuid) {
  const id = Number(messageId)
  if (!id || !fileUuid) return

  const res = await fetch('/api/messages/file', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message_id: id,
      file_uuid: fileUuid
    })
  })

  if (!res.ok) {
    // не критично для UI — файл уже в files-сервисе и маркер в тексте
    console.warn('linkFileToMessage failed', res.status)
  }
}

/** Расширения, которые показываем как картинку */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i

/** Расширения видео */
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv|ogv|3gp)$/i

/** Расширения аудио */
const AUDIO_EXT = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)$/i

/** Имена голосовых сообщений, записанных прямо в мессенджере */
const VOICE_EXT = /^voice-message-[^/\\]+\.(webm|ogg|mp3|m4a|wav)$/i

/**
 * @param {string} [filename]
 * @returns {boolean}
 */
export function isImageFilename(filename) {
  return IMAGE_EXT.test(filename || '')
}

/**
 * @param {string} [filename]
 * @returns {boolean}
 */
export function isAudioFilename(filename) {
  return AUDIO_EXT.test(filename || '')
}

/**
 * @param {string} [filename]
 * @returns {boolean}
 */
export function isVideoFilename(filename) {
  return VIDEO_EXT.test(filename || '')
}

/**
 * @param {string} [filename]
 * @returns {boolean}
 */
export function isVoiceFilename(filename) {
  return VOICE_EXT.test(filename || '')
}

/**
 * Определяет тип файла по имени или MIME.
 * @param {{ fileName?: string, contentType?: string }} meta
 * @returns {'image'|'video'|'audio'|'file'}
 */
export function detectMediaKind(meta = {}) {
  const name = meta.fileName || ''
  const ct = (meta.contentType || '').toLowerCase()
  // MIME от files-сервиса имеет приоритет над расширением. Это важно для
  // WebM: один и тот же .webm может быть как аудио, так и видео.
  if (ct.startsWith('image/')) return 'image'
  if (ct.startsWith('video/')) return 'video'
  if (ct.startsWith('audio/')) return 'audio'

  // Встроенные голосовые сообщения всегда считаем аудио.
  if (isVoiceFilename(name)) return 'audio'
  if (isImageFilename(name)) return 'image'

  // При отсутствии MIME отдаём .webm в аудио-ветку, чтобы профиль не
  // терял музыку из-за конфликта AUDIO_EXT/VIDEO_EXT. Для видео WebM
  // нормальный content-type video/webm придёт из files-сервиса.
  if (isAudioFilename(name)) return 'audio'
  if (isVideoFilename(name)) return 'video'
  return 'file'
}

/**
 * HEAD/GET метаданные файла (Content-Type, имя из Content-Disposition).
 * @param {string} fileUuid
 * @returns {Promise<{ contentType: string, fileName: string }>}
 */
export async function probeFileMeta(fileUuid) {
  if (!fileUuid) return { contentType: '', fileName: '' }
  try {
    let res = await fetch(getFileUrl(fileUuid), {
      method: 'HEAD',
      credentials: 'include'
    })
    if (!res.ok || res.status === 405) {
      res = await fetch(getFileUrl(fileUuid), {
        method: 'GET',
        credentials: 'include',
        headers: { Range: 'bytes=0-0' }
      })
    }
    const contentType = res.headers.get('content-type') || ''
    const cd = res.headers.get('content-disposition') || ''
    let fileName = ''
    const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd)
    if (m) {
      try {
        fileName = decodeURIComponent(m[1].replace(/"/g, '').trim())
      } catch {
        fileName = m[1].replace(/"/g, '').trim()
      }
    }
    return { contentType, fileName }
  } catch {
    return { contentType: '', fileName: '' }
  }
}
