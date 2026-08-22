<template>
  <div v-if="store.isAuthenticated" class="layout">
    <!-- Динамическое переключение левой панели -->
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

      // Извлекаем токен для веб-сокетов, если он используется
      const socketToken = result.payload?.id || 'cookie-session'
      initChatSession(socketToken)

      // Куки на этот запрос прикрепятся автоматически, так как домен для браузера один и тот же
      await loadMessageHistory()
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

    const sessionToken = result.payload?.id || 'cookie-session'
    initChatSession(sessionToken)
  } catch (error) {
    console.error('Ошибка регистрации на бэкенде:', error.message)
    alert(`Не удалось завершить регистрацию: ${error.message}`)
  }
}

function handleEvent(event) {
  if (event.message) store.upsertMessage(event.message)
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
