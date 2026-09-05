<template>
  <div v-if="store.isAuthenticated" class="layout">
    <ChatList v-if="store.currentView === 'chats'" />
    <UserProfile v-else-if="store.currentView === 'profile'" />

    <ChatWindow v-if="store.activeChat" />
    <div v-else class="empty">Выберите чат</div>
  </div>

  <div v-else class="auth-wrapper">
    <RegisterForm @register-success="handleRegisterSuccess" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { connectSocket, subscribe } from './services/socket'
import { resolveChatUsers } from './services/users'
import { useChatStore } from './stores/chat'

import ChatList from './components/ChatList.vue'
import UserProfile from './components/UserProfile.vue'
import ChatWindow from './components/ChatWindow.vue'
import RegisterForm from './components/RegisterForm.vue'

//TODO Настройки перенаправления на порты :8081 и :8083 задаются в vite.config.js или Nginx.
const USER_API_PREFIX = '/api/user'
const MESSAGES_API_PREFIX = '/api/messages'

const store = useChatStore()

onMounted(async () => {
  await checkAuth()
})

async function checkAuth() {
  try {
    const response = await fetch(`${USER_API_PREFIX}/frontend/user/me`, {
      method: 'GET',
      credentials: 'include'
    })

    if (response.ok) {
      const result = await response.json().catch(() => ({}))
      store.setAuthenticated(true)

      const socketToken = result.accessToken || result.access_token || result.payload?.accessToken || null
      initChatSession(socketToken)

      await loadMessageHistory()
      await loadChatNames()
    } else {
      store.setAuthenticated(false)
    }
  } catch (error) {
    console.error('Ошибка проверки токенов:', error.message)
    store.setAuthenticated(false)
  }
}

async function loadMessageHistory() {
  const response = await fetch(`${MESSAGES_API_PREFIX}/messages/history`, {
    method: 'GET',
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`Messages API: ${response.status}`)
  }

  const history = await response.json()
  store.setHistory(history)
}

/** Подтянуть имя + фамилию собеседников в список чатов */
async function loadChatNames() {
  try {
    const ids = store.chats.map((c) => c.id)
    const users = await resolveChatUsers(ids)
    store.setUsersInfo(users)
  } catch (e) {
    console.warn('Не удалось загрузить имена чатов:', e)
  }
}

function initChatSession(token) {
  connectSocket(token)
  subscribe(handleEvent)
}

async function handleRegisterSuccess(userData) {
  try {
    const response = await fetch(`${USER_API_PREFIX}/frontend/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Ошибка сервера: ${response.status}`)
    }

    const result = await response.json().catch(() => ({}))
    store.setAuthenticated(true)

    await loadMessageHistory()
    await loadChatNames()

    const socketToken = result.accessToken || result.access_token || result.payload?.accessToken || null
    initChatSession(socketToken)
  } catch (error) {
    console.error('Ошибка регистрации на бэкенде:', error.message)
    alert(`Не удалось завершить регистрацию: ${error.message}`)
  }
}

function handleEvent(event) {
  if (event.message) {
    store.upsertMessage(event.message)
    // если появился новый чат без имени — догрузим
    const sid = Number(event.message.senderId)
    const rid = Number(event.message.recipientId)
    const peerId = sid === store.myUserId ? rid : sid
    if (peerId && !store.usersById[peerId]) {
      loadChatNames()
    }
  }
  if (event.deletedMessageId) store.deleteMessage(event.deletedMessageId)
}
</script>

<style>
.layout {
  display: flex;
  height: 100vh;
  background: #e5ddd5;
}
.empty {
  margin: auto;
  color: gray;
}
.auth-wrapper {
  background: #f0f2f5;
  height: 100vh;
  width: 100vw;
}
</style>
