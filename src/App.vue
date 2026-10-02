<template>
  <div
    v-if="store.isAuthenticated"
    class="app-shell"
    :class="{
      'is-mobile': isMobile,
      'mobile-profile-open': store.myProfileOpen || !!store.viewedProfile
    }"
  >
    <div class="layout">
      <!-- На мобилке список и чат не живут в DOM одновременно -->
      <ChatList v-if="showChatList" class="panel-list" />

      <div v-if="showChatColumn" class="main-column panel-chat">
        <MiniPlayer />
        <ChatWindow
          v-if="store.activeChat"
          :key="'cw-' + store.activeChatId"
          @open-profile="store.openUserProfile"
          @back="onBackToList"
        />
        <div v-else class="empty">Выберите чат</div>
      </div>
    </div>

    <!-- Профили вне layout — не участвуют в patch keyed children списка/чата -->
    <Teleport to="body">
      <UserProfile v-if="store.myProfileOpen" class="panel-profile profile-overlay" />
    </Teleport>
    <Teleport to="body">
      <PublicUserProfile
        v-if="store.viewedProfile"
        class="panel-profile profile-overlay"
        :user="store.viewedProfile"
        @close="store.closeUserProfile"
      />
    </Teleport>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { connectSocket, subscribe } from './services/socket'
import {
  resolveChatUsers,
  fetchUserByUuid,
  fetchUserAvatarFileUuid
} from './services/users'
import { useChatStore } from './stores/chat'
import {
  ensureIdentity,
  publishMyPublicKey,
  isKeyAnnounce,
  tryConsumeKeyAnnounce
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

const isMobile = ref(false)
function syncMobile() {
  isMobile.value =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px)').matches
}
const showChatList = computed(() => !isMobile.value || store.activeChatId == null)
const showChatColumn = computed(() => !isMobile.value || store.activeChatId != null)

function onBackToList() {
  store.setActiveChat(null)
}


onMounted(async () => {
  syncMobile()
  window.addEventListener('resize', syncMobile)
  await checkAuth()
})

onUnmounted(() => {
  window.removeEventListener('resize', syncMobile)
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
  await store.setHistory(history)
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
  // Identity + публикация публичного ключа на messages API (не в ленту)
  ensureIdentity()
    .then(() => publishMyPublicKey())
    .catch((e) => console.warn('E2EE init:', e))
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

    // Legacy: старые __E2EE_KEY__ в WS — только сохранить ключ, не отвечать сообщением
    if (!isMine && isKeyAnnounce(text)) {
      tryConsumeKeyAnnounce(sid, text)
      store.upsertMessage(event.message)
      return
    }

    store.upsertMessage(event.message)
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
.profile-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  box-shadow: -8px 0 32px rgba(15, 23, 42, .12);
}
.auth-wrapper {
  background: #f0f2f5;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* —— Mobile: один экран (v-if в шаблоне, без display:none) —— */
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
    position: absolute;
    inset: 0;
    z-index: 20;
    background: #eef8ff;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

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
