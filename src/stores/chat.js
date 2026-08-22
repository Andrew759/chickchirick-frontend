import { defineStore } from 'pinia'

export const useChatStore = defineStore('chat', {
    state: () => ({
        chats: [],
        activeChatId: null,
        myUserId: null,
        isAuthenticated: false,
        currentView: 'chats'
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
                chat = {
                    id: chatId,
                    name: `User ${chatId}`,
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
                createdAt: msg.createdAt
            })
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
