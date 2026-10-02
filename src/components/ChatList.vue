<template>
  <div class="sidebar">
    <!-- Шапка в стиле Telegram -->
    <div class="header">
      <button
        class="btn-profile"
        type="button"
        title="Профиль"
        @click="store.openMyProfile()"
      >
        <AvatarEqualizer :size="48" :gap="3">
          <img
            v-if="myAvatarUrl"
            :src="myAvatarUrl"
            alt=""
            class="profile-avatar-img"
          />
          <span v-else class="profile-avatar">{{ profileLetter }}</span>
        </AvatarEqualizer>
      </button>
      <span class="header-title">Чаты</span>
    </div>


    <!-- Поиск всегда сверху -->
    <div class="search-bar" @click="showSearch = true">
      <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
        />
      </svg>
      <span class="search-placeholder">Поиск</span>
    </div>

    <UserSearch v-if="showSearch" @close="showSearch = false" />

    <PhotoViewer
      v-if="viewerOpen"
      :open="viewerOpen"
      :items="viewerItems"
      :start-index="0"
      @close="viewerOpen = false"
    />

    <div class="chat-list">
      <div v-if="chats.length === 0" class="no-chats">Нет активных чатов</div>

      <div
        v-for="chat in chats"
        :key="'chat-' + chat.id"
        class="chat"
        :class="{ active: chat.id === store.activeChatId }"
        @click="store.setActiveChat(chat.id)"
      >
        <div
          class="avatar"
          :class="{ 'has-photo': !!chatAvatarUrl(chat) }"
          @click.stop="openChatAvatar(chat)"
        >
          <img
            v-if="chatAvatarUrl(chat)"
            :src="chatAvatarUrl(chat)"
            alt=""
            class="avatar-img"
          />
          <template v-else>{{ avatarLetter(chat) }}</template>
        </div>

        <div class="info">
          <div class="row">
            <div class="name-wrap">
              <div class="name">{{ chat.name }}</div>
              <span v-if="store.typingByChatId[chat.id]" class="typing-dots" aria-label="печатает">
                <span></span><span></span><span></span>
              </span>
            </div>
            <div class="time" v-if="formatMessageTime(lastMessage(chat)?.createdAt)">
              {{ formatMessageTime(lastMessage(chat)?.createdAt) }}
            </div>
          </div>
          <div class="last">
            {{ lastMessage(chat)?.text || 'Нет сообщений' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useChatStore, formatMessageTime } from '../stores/chat'
import { getFileUrl } from '../services/files'
import UserSearch from './UserSearch.vue'
import PhotoViewer from './PhotoViewer.vue'
import AvatarEqualizer from './AvatarEqualizer.vue'

const store = useChatStore()
const chats = computed(() => store.chats)
const showSearch = ref(false)
const viewerOpen = ref(false)
const viewerItems = ref([])

const myAvatarUrl = computed(() => {
  const uuid = store.myProfile?.avatarFileUuid
  return uuid ? getFileUrl(uuid) : ''
})

const profileLetter = computed(() => {
  const p = store.myProfile
  if (p) {
    const n = (p.name || p.login || '').trim()
    if (n) return n[0].toUpperCase()
  }
  const me = store.usersById[store.myUserId]
  if (me) {
    const n = (me.name || me.login || '').trim()
    if (n) return n[0].toUpperCase()
  }
  return 'Я'
})

function lastMessage(chat) {
  return chat.messages?.at(-1) ?? null
}

function avatarLetter(chat) {
  const n = (chat.name || '').trim()
  if (!n || n.startsWith('User ')) return '?'
  return n[0].toUpperCase()
}

function chatAvatarUrl(chat) {
  const uuid = chat.avatarFileUuid || store.usersById[chat.id]?.avatarFileUuid
  return uuid ? getFileUrl(uuid) : ''
}

function openChatAvatar(chat) {
  const url = chatAvatarUrl(chat)
  if (!url) return
  viewerItems.value = [{
    src: url,
    alt: chat.name || 'avatar',
    fileName: 'avatar.jpg'
  }]
  viewerOpen.value = true
}
</script>

<style scoped>
.sidebar {
  width: 300px;
  background: #fff;
  border-right: 1px solid #e7e7e7;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

/* —— Шапка —— */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  padding-top: max(10px, env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.btn-profile {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.btn-profile:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 2px rgba(0, 136, 204, 0.25);
}

.btn-profile:active {
  transform: scale(0.97);
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(145deg, #54a9eb, #2aabee);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  user-select: none;
}

.profile-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.btn-profile :deep(.eq-wrap) {
  /* эквалайзер чуть больше кнопки */
  margin: -2px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  letter-spacing: -0.2px;
}

/* —— Поиск сверху —— */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 12px 10px;
  padding: 9px 14px;
  background: #f2f9fd;
  border-radius: 22px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.search-bar:hover {
  background: #e9f7ff;
}

.search-icon {
  color: #8e8e93;
  flex-shrink: 0;
}

.search-placeholder {
  color: #8e8e93;
  font-size: 15px;
  user-select: none;
}

/* —— Список чатов —— */
.chat-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.chat {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.chat:hover {
  background: #f2f9fd;
}

.chat.active {
  background: linear-gradient(90deg, rgba(42, 171, 238, .13), rgba(125, 211, 252, .05));
  box-shadow: inset 3px 0 0 #2aabee;
}

.chat.active .name {
  color: #168dcc;
}

.chat.active .time {
  color: #2aabee;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(145deg, #54a9eb, #2aabee);
  color: white;
  font-weight: 600;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar.has-photo {
  cursor: zoom-in;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.info {
  margin-left: 12px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.name-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}

.name {
  font-weight: 600;
  font-size: 15px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  height: 14px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #2aabee;
  opacity: .35;
  animation: typing-dot 1.2s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: .15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: .3s;
}

@keyframes typing-dot {
  0%, 60%, 100% {
    opacity: .35;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.time {
  font-size: 12px;
  color: #8e8e93;
  flex-shrink: 0;
}

.last {
  font-size: 14px;
  color: #8e8e93;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-chats {
  padding: 32px 20px;
  text-align: center;
  color: #8e8e93;
  font-size: 14px;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    border-right: none;
  }

  .chat {
    padding: 12px 14px;
    /* удобнее тапать */
    min-height: 64px;
  }

  .chat:active {
    background: #eef8ff;
  }

  .chat.active {
    /* на мобилке список скрыт когда чат открыт — active не критичен */
    background: transparent;
    box-shadow: none;
  }

  .avatar {
    width: 52px;
    height: 52px;
  }
}
</style>
