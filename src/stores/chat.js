import { defineStore } from 'pinia'
import { parseFileMessageText } from '../services/fileMarker'
import { isImageFilename, isAudioFilename, isVideoFilename, isVoiceFilename } from '../services/files'
import {
  tryConsumeKeyAnnounce,
  decryptFromPeer,
  isEncryptedText,
  isKeyAnnounce
} from '../services/crypto'

/**
 * Приводим createdAt к ISO-строке.
 */
export function normalizeCreatedAt(value) {
  if (value == null || value === '') return null

  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (typeof value === 'object') {
    if (value.seconds != null || value.Seconds != null) {
      const sec = Number(value.seconds ?? value.Seconds)
      const nanos = Number(value.nanos ?? value.Nanos ?? 0)
      const d = new Date(sec * 1000 + Math.floor(nanos / 1e6))
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
    if (typeof value.Time === 'string') return normalizeCreatedAt(value.Time)
    if (typeof value.time === 'string') return normalizeCreatedAt(value.time)
  }

  return null
}

/**
 * Форматирует время сообщения для отображения в пузырьке.
 * Сегодня — только «ЧЧ:ММ», вчера — «Вчера, ЧЧ:ММ»,
 * в этом году — «ДД.ММ, ЧЧ:ММ», иначе — «ДД.ММ.ГГГГ, ЧЧ:ММ».
 */
export function formatMessageTime(value) {
  const iso = normalizeCreatedAt(value)
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const time = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(d, now)) {
    return time
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (sameDay(d, yesterday)) {
    return `Вчера, ${time}`
  }

  if (d.getFullYear() === now.getFullYear()) {
    const dayMonth = d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    })
    return `${dayMonth}, ${time}`
  }

  const fullDate = d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  return `${fullDate}, ${time}`
}

/**
 * Сравнивает два сообщения по createdAt (возрастание: старые сверху, новые снизу).
 * Сообщения без даты идут в конец; при равном времени — по id.
 */
function compareMessagesByTime(a, b) {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : NaN
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : NaN
  const aValid = !Number.isNaN(ta)
  const bValid = !Number.isNaN(tb)

  if (aValid && bValid) {
    if (ta !== tb) return ta - tb
    return (Number(a.id) || 0) - (Number(b.id) || 0)
  }
  if (aValid) return -1
  if (bValid) return 1
  return (Number(a.id) || 0) - (Number(b.id) || 0)
}

function sortChatMessages(chat) {
  if (chat?.messages?.length > 1) {
    chat.messages.sort(compareMessagesByTime)
  }
}

/** Время последнего сообщения в чате (мс), 0 если сообщений нет. */
function lastMessageTime(chat) {
  const msgs = chat?.messages
  if (!msgs?.length) return 0
  // сообщения отсортированы по возрастанию → последнее = самое новое
  const last = msgs[msgs.length - 1]
  if (!last?.createdAt) return 0
  const t = new Date(last.createdAt).getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * Сортирует список чатов: с самой свежей активностью — выше.
 */
function sortChatsByLastMessage(chats) {
  if (!chats || chats.length < 2) return
  chats.sort((a, b) => lastMessageTime(b) - lastMessageTime(a))
}

function displayName(user) {
  if (!user || typeof user !== 'object') return null

  const name = (user.name || user.firstName || user.first_name || '').trim()
  const surname = (user.surname || user.lastName || user.last_name || '').trim()
  const full = `${name} ${surname}`.trim()
  if (full) return full

  if (user.login) return `@${user.login}`

  // Дефолтная заглушка вместо системного ID
  return 'Пользователь'
}
/**
 * Нормализуем входящее сообщение: вытаскиваем fileUuid из маркера в тексте
 * или из явных полей (на будущее).
 */
function normalizeMessageFields(msg) {
  const rawText = msg.text ?? msg.Text ?? ''
  const explicitUuid = msg.fileUuid || msg.file_uuid || null
  const explicitName = msg.fileName || msg.file_name || null

  const parsed = parseFileMessageText(rawText)
  const fileUuid = explicitUuid || parsed.fileUuid
  const fileName = explicitName || parsed.fileName
  const text = fileUuid ? parsed.caption : rawText

  const isVoiceMessage = fileUuid ? isVoiceFilename(fileName) : false

  return {
    fileUuid: fileUuid || null,
    fileName: fileName || null,
    isImage: fileUuid ? isImageFilename(fileName) : false,
    isAudio: fileUuid ? isAudioFilename(fileName) : false,
    isVideo: fileUuid ? (isVideoFilename(fileName) && !isVoiceMessage) : false,
    isVideoNote: fileUuid ? /^video-note-[^/\\]+\.(webm|mp4|mov|m4v)$/i.test(fileName || '') : false,
    isVoiceMessage,
    text: text || ''
  }
}

const typingTimers = new Map()

export const useChatStore = defineStore('chat', {
  state: () => ({
    chats: [],
    activeChatId: null,
    myUserId: null,
    isAuthenticated: false,
    currentView: 'chats',
    /** Открыт ли профиль текущего пользователя поверх списка/чата */
    myProfileOpen: false,
    /** id → { name, surname, login, avatarFileUuid, userServiceId, ... } */
    usersById: {},
    /** Профиль текущего пользователя (user-service) */
    myProfile: null,
    viewedProfile: null,
    /** messages-local user id -> whether the peer is currently typing */
    typingByChatId: {}
  }),

  getters: {
    activeChat(state) {
      return state.chats.find(c => c.id === state.activeChatId)
    }
  },

  actions: {
    setAuthenticated(value) {
      this.isAuthenticated = value
    },

    /** Полный сброс клиентского состояния после логаута */
    resetSession() {
      this.isAuthenticated = false
      this.chats = []
      this.activeChatId = null
      this.myUserId = null
      this.currentView = 'chats'
      this.myProfileOpen = false
      this.usersById = {}
      this.myProfile = null
      this.viewedProfile = null
      this.typingByChatId = {}
      typingTimers.forEach((timer) => clearTimeout(timer))
      typingTimers.clear()
    },

    setView(view) {
      this.currentView = view
    },

    openMyProfile() {
      this.viewedProfile = null
      this.myProfileOpen = true
      this.currentView = 'chats'
    },

    closeMyProfile() {
      this.myProfileOpen = false
    },

    openUserProfile(user) {
      if (!user || !user.id) return
      this.myProfileOpen = false
      this.viewedProfile = { ...user }
      this.currentView = 'chats'
    },

    closeUserProfile() {
      this.viewedProfile = null
    },

    setHistory(history) {
      this.myUserId = Number(history.userId)
      this.chats = []

      for (const message of history.messages || []) {
        this.upsertMessage(message)
      }

      // Финальная сортировка сообщений в каждом чате и порядка чатов
      for (const chat of this.chats) {
        sortChatMessages(chat)
      }
      sortChatsByLastMessage(this.chats)

      // На десктопе сразу открываем первый чат; на мобилке оставляем список
      if (this.activeChatId === null && this.chats.length > 0) {
        const isMobile =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(max-width: 768px)').matches
        if (!isMobile) {
          this.activeChatId = this.chats[0].id
        }
      }
    },

    upsertMessage(msg) {
      const senderId = Number(msg.senderId)
      const recipientId = Number(msg.recipientId)
      const isMine = senderId === this.myUserId
      const chatId = isMine ? recipientId : senderId

      if (!chatId) return

      const rawText = msg.text ?? msg.Text ?? ''

      // Спец-сообщение с публичным ключом — сохраняем ключ, в UI не показываем
      if (isKeyAnnounce(rawText)) {
        if (!isMine) {
          tryConsumeKeyAnnounce(senderId, rawText)
        }
        return
      }

      let chat = this.chats.find(c => c.id === chatId)

      if (!chat) {
        const known = this.usersById[chatId]
        const name = displayName(known) || 'Пользователь'
        chat = {
          id: chatId,
          name,
          messages: []
        }
        this.chats.push(chat)
      }

      if (chat.messages.some(m => m.id === msg.id)) return

      const extra = normalizeMessageFields(msg)
      const encrypted = isEncryptedText(rawText)

      const entry = {
        id: msg.id,
        text: encrypted ? (isMine ? '🔒 …' : '🔒 Расшифровка…') : extra.text,
        fileUuid: extra.fileUuid,
        fileName: extra.fileName,
        isImage: extra.isImage,
        isAudio: extra.isAudio,
        isVideo: extra.isVideo,
        isVideoNote: extra.isVideoNote,
        isVoiceMessage: extra.isVoiceMessage,
        isEncrypted: encrypted,
        fromMe: isMine,
        senderId,
        recipientId,
        createdAt: normalizeCreatedAt(msg.createdAt)
      }

      chat.messages.push(entry)
      sortChatMessages(chat)
      sortChatsByLastMessage(this.chats)

      // Асинхронная расшифровка: ключ собеседника (для исходящих — peer = recipient)
      if (encrypted) {
        const peerId = isMine ? recipientId : senderId
        decryptFromPeer(peerId, rawText).then((plain) => {
          const c = this.chats.find((ch) => ch.id === chatId)
          if (!c) return
          const m = c.messages.find((x) => x.id === msg.id)
          if (!m) return

          // После расшифровки заново разбираем file-marker (если есть вложение)
          const reparsed = normalizeMessageFields({ text: plain })
          m.text = reparsed.text
          m.fileUuid = reparsed.fileUuid
          m.fileName = reparsed.fileName
          m.isImage = reparsed.isImage
          m.isAudio = reparsed.isAudio
          m.isVideo = reparsed.isVideo
          m.isVideoNote = reparsed.isVideoNote
          m.isVoiceMessage = reparsed.isVoiceMessage
          m.isEncrypted = true
        })
      }
    },

    setUserInfo(userId, user) {
      const id = Number(userId)
      if (!id || !user) return
      this.usersById[id] = { ...(this.usersById[id] || {}), ...user }

      const chat = this.chats.find(c => c.id === id)
      if (chat) {
        const merged = this.usersById[id]
        const name = displayName(merged)
        if (name) chat.name = name
        if (merged.avatarFileUuid) chat.avatarFileUuid = merged.avatarFileUuid
        if (merged.userServiceId) chat.userServiceId = merged.userServiceId
      }
    },

    /**
     * Аватар текущего пользователя (messages-local id = myUserId не подходит —
     * храним отдельно по user-service).
     */
    setMyProfile(profile) {
      if (!profile || typeof profile !== 'object') return
      this.myProfile = { ...(this.myProfile || {}), ...profile }
    },

    setUsersInfo(map) {
      if (!map || typeof map !== 'object') return
      for (const [id, user] of Object.entries(map)) {
        this.setUserInfo(id, user)
      }
    },

    deleteMessage(id) {
      this.chats.forEach(chat => {
        chat.messages = chat.messages.filter(m => m.id !== id)
      })
      sortChatsByLastMessage(this.chats)
    },

    setActiveChat(id) {
      this.activeChatId = id
    },

    setTyping(userId, active) {
      const id = Number(userId)
      if (!id || id === Number(this.myUserId)) return

      this.typingByChatId[id] = Boolean(active)

      const previousTimer = typingTimers.get(id)
      if (previousTimer) clearTimeout(previousTimer)

      if (active) {
        // Даже если stop-событие потеряется при обрыве WS, индикатор
        // автоматически исчезнет через 2.5 секунды.
        const timer = setTimeout(() => {
          this.typingByChatId[id] = false
          typingTimers.delete(id)
        }, 2500)
        typingTimers.set(id, timer)
      } else {
        typingTimers.delete(id)
      }
    },

    /**
     * Открыть (или создать пустой) чат с пользователем из user-сервиса.
     * Важно: chat.id и recipientId — это messages-local id, не users.id.
     * @param {{ id: number, userUuid?: string, name?: string, surname?: string, login?: string }} user
     * @param {number} messagesUserId — id собеседника в messages-сервисе
     */
    openChatWithUser(user, messagesUserId) {
      const id = Number(messagesUserId)
      if (!id) {
        console.error('openChatWithUser: messagesUserId is required')
        return
      }

      this.setUserInfo(id, user)

      let chat = this.chats.find(c => c.id === id)
      if (!chat) {
        chat = {
          id,
          name: displayName(user) || `User ${id}`,
          messages: []
        }
        this.chats.push(chat)
      }
      this.activeChatId = id
      this.currentView = 'chats'
    }
  }
})
