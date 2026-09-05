import { defineStore } from 'pinia'

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

export function formatMessageTime(value) {
  const iso = normalizeCreatedAt(value)
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function displayName(user) {
  if (!user || typeof user !== 'object') return null
  const name = (user.name || user.firstName || user.first_name || '').trim()
  const surname = (user.surname || user.lastName || user.last_name || '').trim()
  const full = `${name} ${surname}`.trim()
  if (full) return full
  if (user.login) return `@${user.login}`
  return null
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    chats: [],
    activeChatId: null,
    myUserId: null,
    isAuthenticated: false,
    currentView: 'chats',
    /** id → { name, surname, login, ... } */
    usersById: {}
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

    setView(view) {
      this.currentView = view
    },

    setHistory(history) {
      this.myUserId = Number(history.userId)
      this.chats = []

      for (const message of history.messages || []) {
        this.upsertMessage(message)
      }

      if (this.activeChatId === null && this.chats.length > 0) {
        this.activeChatId = this.chats[0].id
      }
    },

    upsertMessage(msg) {
      const senderId = Number(msg.senderId)
      const recipientId = Number(msg.recipientId)
      const isMine = senderId === this.myUserId
      const chatId = isMine ? recipientId : senderId

      if (!chatId) return

      let chat = this.chats.find(c => c.id === chatId)

      if (!chat) {
        const known = this.usersById[chatId]
        const name = displayName(known) || `User ${chatId}`
        chat = {
          id: chatId,
          name,
          messages: []
        }
        this.chats.push(chat)
      }

      if (chat.messages.some(m => m.id === msg.id)) return

      chat.messages.push({
        id: msg.id,
        text: msg.text,
        fromMe: isMine,
        senderId,
        recipientId,
        createdAt: normalizeCreatedAt(msg.createdAt)
      })
    },

    setUserInfo(userId, user) {
      const id = Number(userId)
      if (!id || !user) return
      this.usersById[id] = { ...(this.usersById[id] || {}), ...user }

      const chat = this.chats.find(c => c.id === id)
      if (chat) {
        const name = displayName(this.usersById[id])
        if (name) chat.name = name
      }
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
    },

    setActiveChat(id) {
      this.activeChatId = id
    }
  }
})
