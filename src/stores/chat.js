import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import { parseFileMessageText } from '../services/fileMarker'
import { isImageFilename, isAudioFilename, isVideoFilename, isVoiceFilename } from '../services/files'
import {
  isKeyAnnounce,
  tryConsumeKeyAnnounce,
  isEncryptedText,
  isCryptoAvailable,
  resolveE2eeDisplayText,
  isGroupKeyMessage,
  isGroupEncryptedText,
  isChannelKeyMessage,
  isChannelEncryptedText,
  resolveChannelE2eeDisplayText,
  resolveGroupE2eeDisplayText,
  resolveChatE2eeDisplayText,
  consumeGroupKeyMessage
} from '../services/crypto'
import { getGroup } from '../services/groups'
import { getChannel } from '../services/channels'

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
  if (msgs?.length) {
    const last = msgs[msgs.length - 1]
    if (last?.createdAt) {
      const t = new Date(last.createdAt).getTime()
      if (!Number.isNaN(t)) return t
    }
  }
  // пустая только что созданная группа
  if (chat?.lastActivityAt) {
    const t = new Date(chat.lastActivityAt).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  return 0
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
  const audioUuid = msg.audioUuid || msg.audio_uuid || parsed.audioUuid || null
  const text = fileUuid ? parsed.caption : rawText

  const isVoiceMessage = fileUuid ? isVoiceFilename(fileName) : false

  return {
    fileUuid: fileUuid || null,
    fileName: fileName || null,
    audioUuid: audioUuid || null,
    isSticker: fileUuid ? /^sticker-/i.test(fileName || '') : false,
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
    /** Открытая панель свойств группы */
    viewedGroup: null,
    viewedChannel: null,
    /** ids сообщений, которые сейчас обрабатывает upsert (антигонка) */
    pendingMessageIds: {},
    /** Очередь ответов, пока WS не прислал respondMessageId: [{respondMessageId, rawText, chatKey, at}] */
    pendingOutgoingReplies: [],
    /** messages-local user id -> whether the peer is currently typing */
    typingByChatId: {}
  }),

  getters: {
    activeChat(state) {
      return state.chats.find(c => c.id === state.activeChatId)
    }
  },

  actions: {
    /**
     * Текст сообщения для отображения в превью (цитаты/закреплённые) —
     * прогоняет rawText через тот же E2EE-пайплайн дешифровки, что и лента.
     * Если сообщение ещё не расшифровано в сторе (raw e2ee:*), дешифруем на лету.
     */
    async resolveDisplayTextFor(m) {
      if (!m) return ''
      const raw = m.text ?? ''
      const encrypted =
        isEncryptedText(raw) ||
        isGroupEncryptedText(raw) ||
        (typeof raw === 'string' && /^e2ee:v\d+:/i.test(raw.trim()))
      if (!encrypted) return raw
      // уже есть расшифрованная версия в ленте того же чата — берём её
      const chatId = m.channelId || m.groupId || String(m.recipientId ?? m.senderId ?? '')
      const chat = this.chats.find((c) => String(c.id) === String(chatId))
      const decrypted = chat?.messages?.find(
        (x) => (Number(x.id) === Number(m.id) || String(x.id) === String(m.id)) && !isEncryptedText(x.text ?? '')
      )
      if (decrypted) return decrypted.text
      const ctx = m.channelId
        ? { chatType: 'channel', chatId: m.channelId }
        : m.groupId
          ? { chatType: 'group', chatId: m.groupId }
          : { chatType: 'direct', chatId: null }
      return resolveChatE2eeDisplayText(
        { ...ctx, senderId: m.senderId, myUserId: this.myUserId },
        raw
      )
    },
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
      this.viewedGroup = null
      this.viewedChannel = null
      this.typingByChatId = {}
      typingTimers.forEach((timer) => clearTimeout(timer))
      typingTimers.clear()
    },

    setView(view) {
      this.currentView = view
    },

    async openMyProfile() {
      this.viewedProfile = null
      this.viewedGroup = null
      this.viewedChannel = null
      this.currentView = 'chats'
      await nextTick()
      this.myProfileOpen = true
    },

    closeMyProfile() {
      this.myProfileOpen = false
    },

    async openUserProfile(user) {
      if (!user || !user.id) return
      this.myProfileOpen = false
      this.viewedGroup = null
      this.viewedChannel = null
      this.currentView = 'chats'
      await nextTick()
      this.viewedProfile = { ...user }
    },

    closeUserProfile() {
      this.viewedProfile = null
    },

    async openGroupProfile(group) {
      let uuid = group?.group_uuid || group?.groupUuid || group?.groupId || null
      if (uuid && String(uuid).startsWith('group:')) {
        uuid = String(uuid).slice(6)
      }
      if (!uuid) {
        console.warn('openGroupProfile: missing uuid', group)
        return
      }
      this.myProfileOpen = false
      this.viewedProfile = null
      this.viewedChannel = null
      this.currentView = 'chats'
      await nextTick()
      this.viewedGroup = {
        group_uuid: String(uuid),
        title: group?.title || group?.name || 'Группа',
        avatar_file_uuid: group?.avatar_file_uuid || group?.avatarFileUuid || null,
        member_count: group?.member_count || group?.memberCount || 0,
        created_by: group?.created_by || group?.createdBy || null
      }
    },

    closeGroupProfile() {
      this.viewedGroup = null
    },

    async openChannelProfile(channel) {
      let uuid = channel?.channel_uuid || channel?.channelUuid || channel?.channelId || null
      if (uuid && String(uuid).startsWith('channel:')) {
        uuid = String(uuid).slice(8)
      }
      if (!uuid) {
        console.warn('openChannelProfile: missing uuid', channel)
        return
      }
      this.myProfileOpen = false
      this.viewedProfile = null
      this.viewedGroup = null
      this.currentView = 'chats'
      await nextTick()
      this.viewedChannel = {
        channel_uuid: String(uuid),
        title: channel?.title || channel?.name || 'Канал',
        description: channel?.description || '',
        avatar_file_uuid: channel?.avatar_file_uuid || channel?.avatarFileUuid || null,
        member_count: channel?.member_count || channel?.memberCount || 0,
        created_by: channel?.created_by || channel?.createdBy || null,
        is_public: channel?.is_public ?? channel?.isPublic ?? false,
        e2ee_enabled: channel?.e2ee_enabled ?? channel?.e2eeEnabled ?? true,
        my_role: channel?.my_role || channel?.myRole || ''
      }
    },

    closeChannelProfile() {
      this.viewedChannel = null
    },

    async setHistory(history) {
      this.myUserId = Number(history.userId)

      const messages = history.messages || []

      // 1) Ключи E2EE из истории (legacy __E2EE_KEY__ и кэш)
      for (const message of messages) {
        const rawText = message.text ?? message.Text ?? ''
        if (!isKeyAnnounce(rawText)) continue
        const sid = Number(message.senderId)
        if (sid && sid !== this.myUserId) {
          tryConsumeKeyAnnounce(sid, rawText)
        }
      }

      // 2) Собираем чаты «офлайн», один раз пишем в state — меньше patch'ей Vue
      const chatMap = new Map()

      for (const message of messages) {
        const senderId = Number(message.senderId)
        const recipientId = Number(message.recipientId)
        const isMine = senderId === this.myUserId
        const groupId = message.groupId || message.group_id || null
        const channelId = message.channelId || message.channel_id || null
        const chatId = channelId
          ? `channel:${channelId}`
          : (groupId ? `group:${groupId}` : (isMine ? recipientId : senderId))
        if (!chatId) continue

        let rawText = message.text ?? message.Text ?? ''
        if (!groupId && !channelId && isKeyAnnounce(rawText)) continue

        if (!chatMap.has(chatId)) {
          if (channelId) {
            const prev = this.chats.find((c) => c.id === chatId)
            chatMap.set(chatId, {
              id: chatId,
              channelId,
              type: 'channel',
              isChannel: true,
              is_channel: true,
              name: prev?.name && prev.name !== 'Канал' ? prev.name : (prev?.name || 'Канал'),
              avatarFileUuid: prev?.avatarFileUuid || null,
              memberCount: prev?.memberCount || 0,
              myRole: prev?.myRole || '',
              e2eeEnabled: prev?.e2eeEnabled ?? true,
              messages: []
            })
          } else if (groupId) {
            // сохраняем title/avatar, если уже были в state (или подтянутся loadGroupChats)
            const prev = this.chats.find((c) => c.id === chatId)
            chatMap.set(chatId, {
              id: chatId,
              groupId,
              type: 'group',
              isGroup: true,
              name: prev?.name && prev.name !== 'Группа' ? prev.name : (prev?.name || 'Группа'),
              avatarFileUuid: prev?.avatarFileUuid || null,
              memberCount: prev?.memberCount || 0,
              messages: []
            })
          } else {
            const known = this.usersById[chatId]
            chatMap.set(chatId, {
              id: chatId,
              name: displayName(known) || 'Пользователь',
              messages: []
            })
          }
        }
        const chat = chatMap.get(chatId)
        if (message.id != null && chat.messages.some((m) => m.id === message.id)) continue

        let extra = normalizeMessageFields(message)
        // control: раздача group key — съесть и не показывать
        if ((groupId || channelId) && isGroupKeyMessage(rawText)) {
          try {
            await consumeGroupKeyMessage(senderId, rawText, this.myUserId)
          } catch (e) {
            console.warn('group/channel key in history:', e)
          }
          continue
        }

        const encrypted = isEncryptedText(rawText) || isGroupEncryptedText(rawText)
        if (channelId && (isGroupEncryptedText(rawText) || isEncryptedText(rawText))) {
          try {
            const plain = await resolveChannelE2eeDisplayText(channelId, rawText, senderId, this.myUserId)
            if (plain === '' && isGroupKeyMessage(rawText)) continue
            extra = { ...extra, ...normalizeMessageFields({ ...message, text: plain }) }
          } catch (_) {}
        } else if (groupId && (isGroupEncryptedText(rawText) || isEncryptedText(rawText))) {
          try {
            const plain = await resolveGroupE2eeDisplayText(groupId, rawText, senderId, this.myUserId)
            if (plain === '' && isGroupKeyMessage(rawText)) continue
            extra = normalizeMessageFields({ text: plain })
          } catch (e) {
            console.warn('decrypt group in setHistory:', e)
            extra = { ...extra, text: 'Зашифрованное сообщение' }
          }
        } else if (!groupId && !channelId && (encrypted || (typeof rawText === 'string' && /^e2ee:v\d+:/i.test(rawText.trim())))) {
          const peerId = isMine ? recipientId : senderId
          try {
            const plain = await resolveE2eeDisplayText(peerId, rawText)
            extra = normalizeMessageFields({ text: plain })
          } catch (e) {
            console.warn('decrypt in setHistory:', e)
            extra = { ...extra, text: 'Зашифрованное сообщение' }
          }
        }

        chat.messages.push({
          id: message.id,
          text: extra.text,
          fileUuid: extra.fileUuid,
          fileName: extra.fileName,
          audioUuid: extra.audioUuid || null,
          isSticker: !!extra.isSticker,
          isImage: extra.isImage,
          isAudio: extra.isAudio,
          isVideo: extra.isVideo,
          isVideoNote: extra.isVideoNote,
          isVoiceMessage: extra.isVoiceMessage,
          isEncrypted: !!encrypted,
          fromMe: isMine,
          senderId,
          recipientId,
          groupId: groupId || undefined,
          channelId: channelId || undefined,
          respondMessageId:
            message.respondMessageId ??
            message.respond_message_id ??
            message.RespondMessageID ??
            null,
          reactions: Array.isArray(message.reactions) ? message.reactions : [],
          createdAt: normalizeCreatedAt(message.createdAt)
        })
      }

      const nextChats = Array.from(chatMap.values())

      // группы без сообщений в history, но уже известные в state — не теряем
      for (const prev of this.chats) {
        if (!prev?.isGroup && !prev?.isChannel && !String(prev?.id || '').startsWith('group:') && !String(prev?.id || '').startsWith('channel:')) continue
        if (chatMap.has(prev.id)) continue
        nextChats.push({
          ...prev,
          messages: prev.messages || []
        })
      }

      for (const chat of nextChats) {
        sortChatMessages(chat)
      }
      sortChatsByLastMessage(nextChats)

      this.chats = nextChats

      // Откладываем смену activeChatId на следующий тик —
      // чтобы Vue успел стабилизировать список чатов.
      await nextTick()

      if (this.activeChatId === null && nextChats.length > 0) {
        const isMobile =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(max-width: 768px)').matches
        if (!isMobile) {
          this.activeChatId = nextChats[0].id
        }
      } else if (
        this.activeChatId != null &&
        !nextChats.some((c) => c.id === this.activeChatId)
      ) {
        this.activeChatId = null
      }
    },

    setMessageReactions(messageId, reactions) {
      const mid = Number(messageId)
      if (!mid) return
      const next = Array.isArray(reactions) ? reactions.map((r) => ({ ...r })) : []
      for (const chat of this.chats) {
        const msgs = chat.messages || []
        const idx = msgs.findIndex((x) => Number(x.id) === mid)
        if (idx >= 0) {
          msgs[idx] = { ...msgs[idx], reactions: next }
        }
      }
    },

    applyReactionsMap(map) {
      if (!map || typeof map !== 'object') return
      for (const [id, reactions] of Object.entries(map)) {
        this.setMessageReactions(id, reactions)
      }
    },

    noteOutgoingReply({ respondMessageId, rawText, chatKey }) {
      const rid = respondMessageId != null ? Number(respondMessageId) : NaN
      if (Number.isNaN(rid) || rid <= 0) return
      this.pendingOutgoingReplies.push({
        respondMessageId: rid,
        rawText: rawText != null ? String(rawText) : '',
        chatKey: chatKey != null ? String(chatKey) : '',
        at: Date.now()
      })
      // не копим бесконечно
      const cutoff = Date.now() - 60000
      this.pendingOutgoingReplies = this.pendingOutgoingReplies.filter((p) => p.at >= cutoff).slice(-30)
    },

    consumeOutgoingReply({ rawText, chatKey }) {
      const key = chatKey != null ? String(chatKey) : ''
      const raw = rawText != null ? String(rawText) : ''
      const now = Date.now()
      // сначала точное совпадение текста в том же чате
      let idx = this.pendingOutgoingReplies.findIndex(
        (p) => p.chatKey === key && p.rawText === raw && now - p.at < 60000
      )
      // fallback: тот же чат, самый свежий
      if (idx < 0) {
        for (let i = this.pendingOutgoingReplies.length - 1; i >= 0; i--) {
          const p = this.pendingOutgoingReplies[i]
          if (p.chatKey === key && now - p.at < 60000) {
            idx = i
            break
          }
        }
      }
      if (idx < 0) return null
      const [p] = this.pendingOutgoingReplies.splice(idx, 1)
      return p.respondMessageId
    },

    async upsertMessage(msg) {
      const senderId = Number(msg.senderId)
      const recipientId = Number(msg.recipientId)
      const isMine = senderId === this.myUserId
      const groupId = msg.groupId || msg.group_id || null
      const channelId = msg.channelId || msg.channel_id || null
      const chatId = channelId
        ? `channel:${channelId}`
        : groupId
        ? `group:${groupId}`
        : (isMine ? recipientId : senderId)

      if (!chatId) return

      const rawText = msg.text ?? msg.Text ?? ''

      if (!groupId && !channelId && isKeyAnnounce(rawText)) {
        if (!isMine) {
          tryConsumeKeyAnnounce(senderId, rawText)
        }
        return
      }

      let chat = this.chats.find((c) => c.id === chatId)

      if (!chat) {
        if (channelId) {
          chat = {
            id: chatId,
            channelId,
            type: 'channel',
            isChannel: true,
            is_channel: true,
            name: 'Канал',
            messages: []
          }
          this.chats.push(chat)
          getChannel(channelId)
            .then((ch) => {
              if (ch) this.ensureChannelChat(ch)
            })
            .catch(() => {})
        } else if (groupId) {
          chat = {
            id: chatId,
            groupId,
            type: 'group',
            isGroup: true,
            name: 'Группа',
            messages: []
          }
          this.chats.push(chat)
          getGroup(groupId)
            .then((g) => {
              if (g) this.ensureGroupChat(g)
            })
            .catch(() => {})
        } else {
          const known = this.usersById[chatId]
          const name = displayName(known) || 'Пользователь'
          chat = {
            id: chatId,
            name,
            messages: []
          }
          this.chats.push(chat)
        }
      }

      const mid = msg.id != null ? Number(msg.id) : null
      if (mid != null && !Number.isNaN(mid)) {
        const existing = chat.messages.find((m) => Number(m.id) === mid)
        if (existing) {
          const incomingRid =
            msg.respondMessageId ?? msg.respond_message_id ?? msg.RespondMessageID ?? null
          if (
            (existing.respondMessageId == null || existing.respondMessageId === '') &&
            incomingRid != null &&
            incomingRid !== ''
          ) {
            existing.respondMessageId = Number(incomingRid) || incomingRid
          }
          return
        }
        if (this.pendingMessageIds[mid]) return
        this.pendingMessageIds[mid] = true
      }

      try {
        // control: group/channel key distribution
        if ((groupId || channelId) && isGroupKeyMessage(rawText)) {
          try {
            await consumeGroupKeyMessage(senderId, rawText, this.myUserId)
          } catch (e) {
            console.warn('group/channel key in upsert:', e)
          }
          return
        }

        let extra = normalizeMessageFields(msg)
        const encrypted =
          isEncryptedText(rawText) ||
          isGroupEncryptedText(rawText) ||
          (typeof rawText === 'string' && /^e2ee:v\d+:/i.test(rawText.trim()))

        if (channelId && (isGroupEncryptedText(rawText) || isEncryptedText(rawText))) {
          try {
            const plain = await resolveChannelE2eeDisplayText(channelId, rawText, senderId, this.myUserId)
            if (plain === '' && isGroupKeyMessage(rawText)) return
            extra = normalizeMessageFields({ text: plain })
          } catch (e) {
            console.warn('decrypt channel in upsert:', e)
            extra = { ...extra, text: 'Зашифрованное сообщение' }
          }
        } else if (groupId && (isGroupEncryptedText(rawText) || isEncryptedText(rawText))) {
          try {
            const plain = await resolveGroupE2eeDisplayText(groupId, rawText, senderId, this.myUserId)
            if (plain === '' && isGroupKeyMessage(rawText)) return
            extra = normalizeMessageFields({ text: plain })
          } catch (e) {
            console.warn('decrypt group in upsert:', e)
            extra = { ...extra, text: 'Зашифрованное сообщение' }
          }
        } else if (!groupId && !channelId && encrypted) {
          const peerId = isMine ? recipientId : senderId
          try {
            const plain = await resolveE2eeDisplayText(peerId, rawText)
            extra = normalizeMessageFields({ text: plain })
          } catch (e) {
            console.warn('decrypt in upsertMessage:', e)
            extra = { ...extra, text: 'Зашифрованное сообщение' }
          }
        }

        // повторная проверка после await (гонка двух WS-кадров)
        if (mid != null && chat.messages.some((m) => Number(m.id) === mid)) return

        // мягкий дедуп без id
        if (mid == null || Number.isNaN(mid)) {
          const createdAt = normalizeCreatedAt(msg.createdAt)
          const dup = chat.messages.some((m) => {
            if (Number(m.senderId) !== senderId) return false
            if ((m.text || '') !== (extra.text || '')) return false
            if ((m.groupId || null) !== (groupId || null)) return false
            if ((m.channelId || null) !== (channelId || null)) return false
            const t1 = new Date(m.createdAt || 0).getTime()
            const t2 = new Date(createdAt || 0).getTime()
            return Math.abs(t1 - t2) < 3000
          })
          if (dup) return
        }

        chat.messages.push({
          id: mid != null && !Number.isNaN(mid) ? mid : msg.id,
          text: extra.text,
          fileUuid: extra.fileUuid,
          fileName: extra.fileName,
          audioUuid: extra.audioUuid || null,
          isSticker: !!extra.isSticker,
          isImage: extra.isImage,
          isAudio: extra.isAudio,
          isVideo: extra.isVideo,
          isVideoNote: extra.isVideoNote,
          isVoiceMessage: extra.isVoiceMessage,
          isEncrypted: encrypted,
          fromMe: isMine,
          senderId,
          recipientId,
          groupId: groupId || undefined,
          channelId: channelId || undefined,
          respondMessageId: (() => {
            let rid =
              msg.respondMessageId ??
              msg.respond_message_id ??
              msg.RespondMessageID ??
              null
            if ((rid == null || rid === '') && isMine) {
              rid = this.consumeOutgoingReply({
                rawText: rawText,
                chatKey: channelId || groupId || chatId
              })
            }
            return rid != null && rid !== '' ? rid : null
          })(),
          reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
          createdAt: normalizeCreatedAt(msg.createdAt)
        })

        sortChatMessages(chat)
        sortChatsByLastMessage(this.chats)
      } finally {
        if (mid != null && !Number.isNaN(mid)) {
          delete this.pendingMessageIds[mid]
        }
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
      if (id == null || id === '') {
        this.activeChatId = null
        return
      }
      // group chats use string ids like "group:<uuid>"
      if (typeof id === 'string' && (id.startsWith('group:') || id.startsWith('channel:'))) {
        if (id === this.activeChatId) return
        this.activeChatId = id
        return
      }
      const next = Number(id)
      if (Number.isNaN(next)) return
      if (next === this.activeChatId) return
      this.activeChatId = next
    },

    setTyping(userId, active, groupId = null, channelId = null) {
      const sid = Number(userId)
      if (!sid || sid === Number(this.myUserId)) return

      // group/channel: string key; direct: peer user id
      const chatKey = channelId
        ? `channel:${channelId}`
        : (groupId ? `group:${groupId}` : sid)
      const timerKey = (groupId || channelId) ? `${chatKey}:${sid}` : String(sid)

      if (groupId || channelId) {
        const cur = this.typingByChatId[chatKey]
        const map = cur && typeof cur === 'object' ? { ...cur } : {}
        if (active) map[sid] = true
        else delete map[sid]
        const keys = Object.keys(map)
        // новый объект целиком — чтобы Pinia/Vue гарантированно перерисовали
        this.typingByChatId = {
          ...this.typingByChatId,
          [chatKey]: keys.length ? map : false
        }
      } else {
        this.typingByChatId = {
          ...this.typingByChatId,
          [chatKey]: Boolean(active)
        }
      }

      const previousTimer = typingTimers.get(timerKey)
      if (previousTimer) clearTimeout(previousTimer)

      if (active) {
        const timer = setTimeout(() => {
          if (groupId || channelId) {
            const cur = this.typingByChatId[chatKey]
            if (cur && typeof cur === 'object') {
              const map = { ...cur }
              delete map[sid]
              this.typingByChatId = {
                ...this.typingByChatId,
                [chatKey]: Object.keys(map).length ? map : false
              }
            }
          } else {
            this.typingByChatId = {
              ...this.typingByChatId,
              [chatKey]: false
            }
          }
          typingTimers.delete(timerKey)
        }, 2500)
        typingTimers.set(timerKey, timer)
      } else {
        typingTimers.delete(timerKey)
      }
    },

    /** Имена тех, кто печатает в чате (для группы). */
    typingLabel(chatId) {
      const v = this.typingByChatId[chatId]
      if (!v) return ''
      if (v === true) return 'печатает...'
      if (typeof v === 'object') {
        const ids = Object.keys(v).map(Number).filter(Boolean)
        if (!ids.length) return ''
        const names = ids.map((id) => {
          const u = this.usersById[id]
          if (!u) return 'Кто-то'
          const n = [u.name, u.surname].filter(Boolean).join(' ').trim()
          return n || u.login || 'Кто-то'
        })
        if (names.length === 1) return `${names[0]} печатает...`
        if (names.length === 2) return `${names[0]} и ${names[1]} печатают...`
        return `${names[0]} и ещё ${names.length - 1} печатают...`
      }
      return ''
    },

    /**
     * Зарегистрировать/обновить групповой чат в списке.
     * @param {{ group_uuid: string, title?: string, avatar_file_uuid?: string|null, member_count?: number }} group
     */
    ensureGroupChat(group) {
      const uuid = group?.group_uuid || group?.groupUuid || group?.groupId
      if (!uuid) return null
      const id = `group:${uuid}`
      let chat = this.chats.find((c) => c.id === id)
      if (!chat) {
        chat = {
          id,
          groupId: uuid,
          type: 'group',
          isGroup: true,
          name: group.title || 'Группа',
          avatarFileUuid: group.avatar_file_uuid || group.avatarFileUuid || null,
          memberCount: group.member_count || group.memberCount || 0,
          createdBy: group.created_by || group.createdBy || null,
          messages: [],
          // чтобы пустая группа поднималась в списке сразу после создания
          lastActivityAt: new Date().toISOString()
        }
        this.chats.push(chat)
      } else {
        if (group.title) chat.name = group.title
        if (group.avatar_file_uuid || group.avatarFileUuid) {
          chat.avatarFileUuid = group.avatar_file_uuid || group.avatarFileUuid
        }
        if (group.member_count != null || group.memberCount != null) {
          chat.memberCount = group.member_count ?? group.memberCount
        }
        if (group.created_by != null || group.createdBy != null) {
          chat.createdBy = group.created_by ?? group.createdBy
        }
        chat.lastActivityAt = new Date().toISOString()
      }
      sortChatsByLastMessage(this.chats)
      return chat
    },

    openGroupChat(group) {
      const chat = this.ensureGroupChat(group)
      if (!chat) return
      this.activeChatId = chat.id
      this.currentView = 'chats'
    },

    /**
     * @param {{ channel_uuid?: string, channelUuid?: string, channelId?: string, title?: string, description?: string, avatar_file_uuid?: string, is_public?: boolean, e2ee_enabled?: boolean, member_count?: number, created_by?: number, my_role?: string }} channel
     */
    ensureChannelChat(channel) {
      const uuid = channel?.channel_uuid || channel?.channelUuid || channel?.channelId
      if (!uuid) return null
      const id = `channel:${uuid}`
      let chat = this.chats.find((c) => c.id === id)
      if (!chat) {
        chat = {
          id,
          channelId: uuid,
          type: 'channel',
          isChannel: true,
          is_channel: true,
          name: channel.title || 'Канал',
          description: channel.description || '',
          avatarFileUuid: channel.avatar_file_uuid || channel.avatarFileUuid || null,
          memberCount: channel.member_count || channel.memberCount || 0,
          createdBy: channel.created_by || channel.createdBy || null,
          isPublic: channel.is_public ?? channel.isPublic ?? false,
          e2eeEnabled: channel.e2ee_enabled ?? channel.e2eeEnabled ?? true,
          myRole: channel.my_role || channel.myRole || '',
          messages: [],
          lastActivityAt: new Date().toISOString()
        }
        this.chats.push(chat)
      } else {
        if (channel.title) chat.name = channel.title
        if (channel.description != null) chat.description = channel.description
        if (channel.avatar_file_uuid || channel.avatarFileUuid) {
          chat.avatarFileUuid = channel.avatar_file_uuid || channel.avatarFileUuid
        }
        if (channel.member_count != null || channel.memberCount != null) {
          chat.memberCount = channel.member_count ?? channel.memberCount
        }
        if (channel.created_by != null || channel.createdBy != null) {
          chat.createdBy = channel.created_by ?? channel.createdBy
        }
        if (channel.my_role || channel.myRole) {
          chat.myRole = channel.my_role || channel.myRole
        }
        if (channel.is_public != null || channel.isPublic != null) {
          chat.isPublic = channel.is_public ?? channel.isPublic
        }
        if (channel.e2ee_enabled != null || channel.e2eeEnabled != null) {
          chat.e2eeEnabled = channel.e2ee_enabled ?? channel.e2eeEnabled
        }
        chat.lastActivityAt = new Date().toISOString()
      }
      sortChatsByLastMessage(this.chats)
      return chat
    },

    openChannelChat(channel) {
      const chat = this.ensureChannelChat(channel)
      if (!chat) return
      this.activeChatId = chat.id
      this.currentView = 'chats'
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
