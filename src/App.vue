<template>
  <!-- Показываем чат, если пользователь авторизован -->
  <div v-if="store.isAuthenticated" class="layout">
    <ChatList />

    <ChatWindow v-if="store.activeChat" />
    <div v-else class="empty">Выберите чат</div>
  </div>

  <!-- Если токенов в куках нет, показываем форму регистрации -->
  <div v-else class="auth-wrapper">
    <RegisterForm @register-success="handleRegisterSuccess" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { connectSocket, subscribe } from './services/socket'
import { useChatStore } from './stores/chat'

import ChatList from './components/ChatList.vue'
import ChatWindow from './components/ChatWindow.vue'
import RegisterForm from './components/RegisterForm.vue'

const store = useChatStore()

onMounted(async () => {
  await checkAuth()
})
//TODO: удалить хардкод
async function checkAuth() {
  try {
    const response = await fetch('http://localhost:8081/health', {
      method: 'GET',
      credentials: 'include'
    })

    if (response.ok) {
      const result = await response.json().catch(() => ({}))
      store.setAuthenticated(true)

      const socketToken = result.payload?.id || 'cookie-session'
      initChatSession(socketToken)
    } else {
      store.setAuthenticated(false)
    }
  } catch (error) {
    console.error('Ошибка проверки токенов:', error.message)
    store.setAuthenticated(false)
  }
}

function initChatSession(token) {
  connectSocket(token)
  subscribe(handleEvent)
}

//TODO: удалить хардкод
// Обработка успешной регистрации и отправка данных на Go-бэкенд
async function handleRegisterSuccess(userData) {
  try {
    const response = await fetch('http://127.0.0.0:8081/frontend/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Ошибка сервера: ${response.status}`)
    }

    const result = await response.json().catch(() => ({}))
    store.setAuthenticated(true)

    const sessionToken = result.payload?.id || 'cookie-session'
    initChatSession(sessionToken)

  } catch (error) {
    console.error('Ошибка регистрации на бэкенде:', error.message)
    alert(`Не удалось завершить регистрацию: ${error.message}`)
  }
}

function handleEvent(event) {
  if (event.message) {
    store.upsertMessage(event.message)
  }

  if (event.deletedMessageId) {
    store.deleteMessage(event.deletedMessageId)
  }
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
