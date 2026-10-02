<template>
  <div
    v-if="store.isAuthenticated"
    class="app-shell"
    :class="{
      'mobile-chat-open': !!store.activeChat,
      'mobile-profile-open': store.myProfileOpen || !!store.viewedProfile
    }"
  >
    <div class="layout">
      <ChatList class="panel-list" />

      <div class="main-column panel-chat">
        <MiniPlayer />
        <ChatWindow
          v-if="store.activeChat"
          @open-profile="store.openUserProfile"
          @back="store.setActiveChat(null)"
        />
        <div v-else class="empty">Выберите чат</div>
      </div>
      <UserProfile v-if="store.myProfileOpen" class="panel-profile" />
      <PublicUserProfile
        v-else-if="store.viewedProfile"
        class="panel-profile"
        :user="store.viewedProfile"
        @close="store.closeUserProfile"
      />
    </div>
  </div>

  <div v-else class="auth-wrapper">
    <LoginForm
      v-if="authView === 'login'"
      ref="loginFormRef"
      @login-success="handleLoginSuccess"
      @switch-to-register="authView = 'register'"
    />
    <RegisterForm
      v-else
      @register-success="handleRegisterSuccess"
      @switch-to-login="authView = 'login'"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { connectSocket, subscribe, sendMessage } from './services/socket'
import {
  resolveChatUsers,
  fetchUserByUuid,
  fetchUserAvatarFileUuid
} from './services/users'
import { useChatStore } from './stores/chat'
import {
  ensureIdentity,
  isKeyAnnounce,
  tryConsumeKeyAnnounce,
  buildKeyAnnounceMessage,
  getPeerPublicKey
} from './services/crypto'

import ChatList from './components/ChatList.vue'
import UserProfile from './components/UserProfile.vue'
import PublicUserProfile from './components/PublicUserProfile.vue'
import ChatWindow from './components/ChatWindow.vue'
import MiniPlayer from './components/MiniPlayer.vue'
import RegisterForm from './components/RegisterForm.vue'
import LoginForm from './components/LoginForm.vue'

const authView = ref('login')
const loginFormRef = ref(null)

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
      await Promise.all([loadChatNames(), loadMyProfileAvatar(result)])
    } else {
      store.setAuthenticated(false)
    }
  } catch (error) {
    console.error('Ошибка проверки токенов:', error.message)
    store.setAuthenticated(false)
  }
}

/** Аватар текущего пользователя для шапки списка чатов */
async function loadMyProfileAvatar(meResult) {
  try {
    const p = meResult?.payload || meResult || {}
    const nested = p.Payload || p.payload || p
    const uuid =
      nested.user_uuid ||
      nested.userUuid ||
      p.user_uuid ||
      p.userUuid ||
      null
    if (!uuid) return

    const brief = await fetchUserByUuid(uuid)
    if (!brief?.id) {
      store.setMyProfile({ userUuid: uuid })
      return
    }

    const fileUuid = await fetchUserAvatarFileUuid(brief.id)
    store.setMyProfile({
      userUuid: uuid,
      userServiceId: brief.id,
      name: brief.name,
      surname: brief.surname,
      login: brief.login,
      avatarFileUuid: fileUuid
    })
  } catch (e) {
    console.warn('Не удалось загрузить свой аватар:', e)
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
  // Генерируем / поднимаем identity keypair при входе в сессию
  ensureIdentity().catch((e) => console.warn('E2EE ensureIdentity:', e))
}


async function handleLoginSuccess(credentials) {
  try {
    if (loginFormRef.value) loginFormRef.value.setLoading(true)

    const response = await fetch(`${USER_API_PREFIX}/frontend/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const msg = errorData.error
        || errorData.message
        || errorData.errors?.[0]?.message
        || `Ошибка сервера: ${response.status}`
      if (loginFormRef.value) loginFormRef.value.setError(msg)
      return
    }

    const result = await response.json().catch(() => ({}))
    store.setAuthenticated(true)

    await loadMessageHistory()
    await Promise.all([loadChatNames(), loadMyProfileAvatar(result)])

    const socketToken = result.accessToken || result.access_token || result.payload?.accessToken || null
    initChatSession(socketToken)
  } catch (error) {
    console.error('Ошибка входа:', error.message)
    if (loginFormRef.value) {
      loginFormRef.value.setError(`Не удалось войти: ${error.message}`)
    } else {
      alert(`Не удалось войти: ${error.message}`)
    }
  }
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
    await Promise.all([loadChatNames(), loadMyProfileAvatar(result)])

    const socketToken = result.accessToken || result.access_token || result.payload?.accessToken || null
    initChatSession(socketToken)
  } catch (error) {
    console.error('Ошибка регистрации на бэкенде:', error.message)
    alert(`Не удалось завершить регистрацию: ${error.message}`)
  }
}

function handleEvent(event) {
  if (event.message) {
    const sid = Number(event.message.senderId)
    const rid = Number(event.message.recipientId)
    const text = event.message.text || ''
    const isMine = sid === store.myUserId
    const peerId = isMine ? rid : sid

    // Входящий анонс ключа: сохраняем; если ключа раньше не было — отвечаем своим
    if (!isMine && isKeyAnnounce(text)) {
      const hadKey = !!getPeerPublicKey(sid)
      tryConsumeKeyAnnounce(sid, text)
      if (!hadKey) {
        buildKeyAnnounceMessage()
          .then((announce) => {
            sendMessage({ recipientId: sid, text: announce })
          })
          .catch((e) => console.warn('E2EE reply announce failed:', e))
      }
      store.upsertMessage(event.message)
      return
    }

    store.upsertMessage(event.message)
    // если появился новый чат без имени — догрузим
    if (peerId && !store.usersById[peerId]) {
      loadChatNames()
    }
  }
  if (event.deletedMessageId) store.deleteMessage(event.deletedMessageId)
  if (event.typing) {
    store.setTyping(event.typing.senderId, event.typing.typing)
  }
}
</script>

<style>
.app-shell {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}
.layout {
  display: flex;
  height: 100%;
  background: #eef8ff;
  position: relative;
}
.main-column {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.main-column > .global-player {
  flex: 0 0 auto;
  margin: 8px 10px 0;
  border-radius: 14px;
}
.main-column > .chat-window {
  min-height: 0;
  flex: 1;
}
.empty {
  flex: 1;
  display: grid;
  place-items: center;
  color: gray;
  padding: 24px;
  text-align: center;
}
.auth-wrapper {
  background: #f0f2f5;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* —— Mobile: один экран за раз (список / чат / профиль) —— */
@media (max-width: 768px) {
  .layout {
    display: block;
  }

  .panel-list {
    width: 100% !important;
    max-width: none !important;
    height: 100%;
    border-right: none !important;
  }

  .panel-chat {
    display: none;
    position: absolute;
    inset: 0;
    z-index: 20;
    background: #eef8ff;
    width: 100%;
    height: 100%;
  }

  .app-shell.mobile-chat-open .panel-list {
    display: none;
  }

  .app-shell.mobile-chat-open .panel-chat {
    display: flex;
  }

  .app-shell.mobile-chat-open .empty {
    display: none;
  }

  /* Профиль поверх всего на весь экран */
  .panel-profile {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: none !important;
    height: 100% !important;
    height: 100dvh !important;
    z-index: 40 !important;
    border-right: none !important;
    box-shadow: none !important;
  }

  .main-column > .global-player {
    margin: 6px 8px 0;
  }
}

/* Чуть уже планшет: список компактнее */
@media (min-width: 769px) and (max-width: 1024px) {
  .panel-list {
    width: 280px !important;
  }
}
</style>
