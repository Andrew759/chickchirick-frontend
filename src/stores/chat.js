import { defineStore } from 'pinia'

export const useChatStore = defineStore('chat', {
    state: () => ({
        chats: [],
        activeChatId: null,
        myUserId: 1 // ⚠️ заменить на реальный ID из auth
    }),

    getters: {
        activeChat(state) {
            return state.chats.find(c => c.id === state.activeChatId)
        }
    },

    actions: {
        upsertMessage(msg) {
            const isMine = msg.senderId === this.myUserId

            const chatId = isMine ? msg.recipientId : msg.senderId

            let chat = this.chats.find(c => c.id === chatId)

            if (!chat) {
                chat = {
                    id: chatId,
                    name: 'User ' + chatId,
                    messages: []
                }
                this.chats.push(chat)
            }

            // защита от дублей
            if (chat.messages.find(m => m.id === msg.id)) return

            chat.messages.push({
                id: msg.id,
                text: msg.text,
                fromMe: isMine
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