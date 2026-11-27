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

    <!-- Переключение типов чатов и быстрые действия -->
    <nav class="chat-toolbar" aria-label="Разделы чатов">
      <button
        type="button"
        class="toolbar-tab"
        :class="{ active: chatFilter === 'direct' }"
        :aria-pressed="chatFilter === 'direct'"
        @click="chatFilter = 'direct'"
      >
        <ChatTypeIcon type="direct" :variant="1" :size="18" label="Личные сообщения" />
        <span>Личные</span>
      </button>
      <button
        type="button"
        class="toolbar-tab"
        :class="{ active: chatFilter === 'group' }"
        :aria-pressed="chatFilter === 'group'"
        @click="chatFilter = 'group'"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19Z"/><path d="M16 5.5a3 3 0 0 1 0 5.8M17 13h.5a3.5 3.5 0 0 1 3.5 3.5V19h-4"/></svg>
        <span>Группы</span>
      </button>
      <button
        type="button"
        class="toolbar-tab"
        :class="{ active: chatFilter === 'channel' }"
        :aria-pressed="chatFilter === 'channel'"
        @click="chatFilter = 'channel'"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.3 4.3a10.9 10.9 0 0 0 0 15.4M19.7 4.3a10.9 10.9 0 0 1 0 15.4"/></svg>
        <span>Каналы</span>
      </button>
      <button
        type="button"
        class="toolbar-action"
        title="Загрузить стикеры"
        aria-label="Загрузить стикеры"
        @click="openStickers"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8a9.2 9.2 0 1 0 9.2 9.2V9.5A6.7 6.7 0 0 0 14.5 2.8Z"/><path d="M14.5 2.8v6.7h6.7M8.5 10h.01M15.5 10h.01M8.5 15c1.8 2 5.2 2 7 0"/></svg>
      </button>
    </nav>

    <!-- Создание группы — только во вкладке «Группы» -->
    <div v-if="chatFilter === 'group'" class="group-actions">
      <button
        type="button"
        class="btn-create-group"
        @click="showCreateGroup = true"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>
        <span>Создать группу</span>
      </button>
    </div>

    <div v-if="chatFilter === 'channel'" class="group-actions">
      <button
        type="button"
        class="btn-create-group btn-create-channel"
        @click="showCreateChannel = true"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>
        <span>Создать канал</span>
      </button>
    </div>


    <!-- Поиск всегда сверху -->
    <div class="search-bar" :class="{ focused: searchFocused || searchQuery }">
      <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
        />
      </svg>
      <input
        ref="searchInputEl"
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Поиск"
        autocomplete="off"
        @focus="searchFocused = true"
        @blur="onSearchBlur"
        @input="onSearchInput"
        @keydown.esc="clearSearch"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="search-clear"
        title="Очистить"
        @mousedown.prevent
        @click="clearSearch"
      >×</button>
    </div>

    <CreateGroupModal v-if="showCreateGroup" @close="showCreateGroup = false" @created="onGroupCreated" />
    <CreateChannelModal v-if="showCreateChannel" @close="showCreateChannel = false" @created="onChannelCreated" />
    <StickersManager v-if="showStickers" @close="showStickers = false" />

    <PhotoViewer
      v-if="viewerOpen"
      :open="viewerOpen"
      :items="viewerItems"
      :start-index="0"
      @close="viewerOpen = false"
    />

    <div class="chat-list">
      <!-- Результаты поиска пользователей -->
      <template v-if="searchActive">
        <div v-if="searchLoading" class="search-hint">Поиск…</div>
        <div v-else-if="searchError" class="search-hint error">{{ searchError }}</div>
        <div v-else-if="searchQuery.trim().length < 2" class="search-hint">
          Введите минимум 2 символа
        </div>
        <div
          v-else-if="searchSearched && searchResults.length === 0 && channelSearchResults.length === 0"
          class="search-hint"
        >
          Ничего не найдено
        </div>
        <template v-else>
          <div v-if="channelSearchResults.length" class="search-section-label">Каналы</div>
          <div
            v-for="ch in channelSearchResults"
            :key="'ch-' + (ch.channel_uuid || ch.id)"
            class="chat search-result search-result-channel"
            @click="selectSearchChannel(ch)"
          >
            <div class="avatar">{{ channelSearchLetter(ch) }}</div>
            <div class="info">
              <div class="row">
                <div class="name-wrap">
                  <div class="name">{{ ch.title || 'Канал' }}</div>
                </div>
              </div>
              <div class="last">{{ channelMemberLabel(ch) }}</div>
            </div>
            <button
              v-if="!isSubscribedToChannel(ch)"
              type="button"
              class="btn-subscribe"
              :disabled="searchLoading || subscribingUuid === channelResultUuid(ch)"
              @click.stop="subscribeFromSearch(ch)"
            >
              {{ subscribingUuid === channelResultUuid(ch) ? '…' : 'Подписаться' }}
            </button>
            <span v-else class="subscribed-badge">Вы подписаны</span>
          </div>
          <div v-if="searchResults.length" class="search-section-label">Люди</div>
          <div
            v-for="user in searchResults"
            :key="'user-' + user.id"
            class="chat search-result"
            @click="selectSearchUser(user)"
          >
            <div class="avatar">{{ searchLetter(user) }}</div>
            <div class="info">
              <div class="row">
                <div class="name-wrap">
                  <div class="name">{{ searchFullName(user) }}</div>
                </div>
              </div>
              <div class="last">@{{ user.login }}</div>
            </div>
          </div>
        </template>
      </template>

      <!-- Обычный список чатов -->
      <template v-else>
        <div v-if="visibleChats.length === 0" class="no-chats">
          {{ chatFilter === 'group' ? 'Групповых чатов пока нет' : chatFilter === 'channel' ? 'Каналов пока нет' : 'Нет активных личных чатов' }}
        </div>

        <div
          v-for="chat in visibleChats"
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
                <span v-if="store.typingByChatId[chat.id]" class="typing-dots" :aria-label="store.typingLabel(chat.id) || 'печатает'">
                  <span></span><span></span><span></span>
                </span>
              </div>
              <div class="time" v-if="formatMessageTime(lastMessage(chat)?.createdAt)">
                {{ formatMessageTime(lastMessage(chat)?.createdAt) }}
              </div>
            </div>
            <div class="last">
              {{ lastMessagePreview(chat) }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useChatStore, formatMessageTime } from '../stores/chat'
import { getFileUrl } from '../services/files'
import { parseFileMessageText, parseForwardMessageText } from '../services/fileMarker'
import { searchUsers, resolveMessagesIdByUuid } from '../services/users'
import { listPublicChannels, subscribeChannel } from '../services/channels'
import PhotoViewer from './PhotoViewer.vue'
import AvatarEqualizer from './AvatarEqualizer.vue'
import StickersManager from './StickersManager.vue'
import ChatTypeIcon from './ChatTypeIcon.vue'
import CreateGroupModal from './CreateGroupModal.vue'
import CreateChannelModal from './CreateChannelModal.vue'

const store = useChatStore()

const chats = computed(() => store.chats)
const chatFilter = ref('direct')




function chatKind(chat) {
  const type = String(chat?.type || chat?.chatType || chat?.chat_type || '').toLowerCase()
  const id = String(chat?.id || '')
  if (chat?.isChannel === true || chat?.is_channel === true ||
      chat?.channelId != null || chat?.channel_id != null ||
      id.startsWith('channel:') ||
      ['channel', 'broadcast', 'broadcast_channel'].includes(type)) return 'channel'
  if (chat?.isGroup === true || chat?.is_group === true ||
      chat?.groupId != null || chat?.group_id != null ||
      id.startsWith('group:') ||
      ['group', 'group_chat', 'supergroup'].includes(type)) return 'group'
  return 'direct'
}

const visibleChats = computed(() => chats.value.filter((chat) =>
  chatKind(chat) === chatFilter.value
))

const showStickers = ref(false)
const showCreateGroup = ref(false)
const showCreateChannel = ref(false)

function onGroupCreated(group) {
  store.openGroupChat(group)
  chatFilter.value = 'group'
}

function onChannelCreated(channel) {
  store.openChannelChat(channel)
  chatFilter.value = 'channel'
}

function openStickers() {
  showStickers.value = true
}
const viewerOpen = ref(false)
const viewerItems = ref([])

// —— Inline search ——
const searchQuery = ref('')
const searchFocused = ref(false)
const searchResults = ref([])
const channelSearchResults = ref([])
const subscribingUuid = ref('')
const searchLoading = ref(false)
const searchError = ref('')
const searchSearched = ref(false)
const searchInputEl = ref(null)
let searchDebounce = null

const searchActive = computed(() => searchQuery.value.trim().length > 0)

function onSearchInput() {
  clearTimeout(searchDebounce)
  searchError.value = ''
  const q = searchQuery.value.trim()
  if (q.length < 2) {
    searchResults.value = []
    channelSearchResults.value = []
    searchSearched.value = false
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchDebounce = setTimeout(() => doSearch(q), 300)
}

async function doSearch(q) {
  searchLoading.value = true
  searchError.value = ''
  const needle = q.toLowerCase().replace(/^@+/, '').trim()
  try {
    const [users, publicRaw] = await Promise.all([
      searchUsers(q).catch((e) => {
        console.warn('user search', e)
        return []
      }),
      listPublicChannels({ q: needle, limit: 20 }).catch((e) => {
        console.warn('channel search', e)
        return []
      })
    ])
    searchResults.value = Array.isArray(users) ? users : []

    // Локальные каналы по title
    const localCh = (store.chats || [])
      .filter((c) => c.isChannel || c.type === 'channel' || String(c.id || '').startsWith('channel:'))
      .filter((c) => String(c.name || c.title || '').toLowerCase().includes(needle))
      .map((c) => ({
        channel_uuid: c.channelId || String(c.id || '').replace(/^channel:/, ''),
        title: c.name || c.title,
        avatar_file_uuid: c.avatarFileUuid || null,
        member_count: c.memberCount || 0,
        is_public: c.isPublic,
        _local: true
      }))

    const remoteList = Array.isArray(publicRaw)
      ? publicRaw
      : publicRaw?.channels || publicRaw?.items || []
    // Поиск только по title
    const remoteCh = remoteList.filter((ch) =>
      String(ch.title || '').toLowerCase().includes(needle)
    )

    const map = new Map()
    for (const ch of [...localCh, ...remoteCh]) {
      const uuid = ch.channel_uuid || ch.channelUuid || ch.channelId
      if (!uuid) continue
      if (!map.has(uuid)) map.set(uuid, { ...ch, channel_uuid: uuid })
    }
    channelSearchResults.value = [...map.values()]
    searchSearched.value = true
  } catch (e) {
    searchError.value = e.message || 'Ошибка поиска'
    searchResults.value = []
    channelSearchResults.value = []
    searchSearched.value = true
  } finally {
    searchLoading.value = false
  }
}

function clearSearch() {
  clearTimeout(searchDebounce)
  searchQuery.value = ''
  searchResults.value = []
  channelSearchResults.value = []
  searchError.value = ''
  searchSearched.value = false
  searchLoading.value = false
  searchFocused.value = false
  searchInputEl.value?.blur()
}

function onSearchBlur() {
  // Небольшая задержка, чтобы клик по результату успел сработать
  setTimeout(() => {
    searchFocused.value = false
  }, 150)
}

function searchFullName(user) {
  const n = `${user.name || ''} ${user.surname || ''}`.trim()
  return n || user.login || `User ${user.id}`
}

function searchLetter(user) {
  const n = (user.name || user.login || '?').trim()
  return n[0]?.toUpperCase() || '?'
}

function channelSearchLetter(ch) {
  const t = String(ch.title || 'К').trim()
  return (t[0] || 'К').toUpperCase()
}

function channelMemberLabel(ch) {
  const n = Number(ch.member_count ?? ch.memberCount ?? 0)
  if (!n) return 'Канал'
  if (n === 1) return '1 подписчик'
  if (n >= 2 && n <= 4) return `${n} подписчика`
  return `${n} подписчиков`
}

function channelResultUuid(ch) {
  return String(ch?.channel_uuid || ch?.channelUuid || ch?.channelId || '')
}

function isSubscribedToChannel(ch) {
  const uuid = channelResultUuid(ch)
  if (!uuid) return false
  const id = `channel:${uuid}`
  return (store.chats || []).some((c) => c.id === id || c.channelId === uuid)
}

async function subscribeFromSearch(ch) {
  searchError.value = ''
  const uuid = channelResultUuid(ch)
  if (!uuid) {
    searchError.value = 'Нет идентификатора канала'
    return
  }
  subscribingUuid.value = uuid
  try {
    await subscribeChannel(uuid)
    store.openChannelChat({
      ...ch,
      channel_uuid: uuid,
      title: ch.title,
      avatar_file_uuid: ch.avatar_file_uuid || ch.avatarFileUuid,
      member_count: ch.member_count ?? ch.memberCount,
      is_public: ch.is_public ?? ch.isPublic ?? true
    })
    await store.loadChannelMessages(uuid)
  } catch (e) {
    searchError.value = e.message || 'Не удалось подписаться'
  } finally {
    subscribingUuid.value = ''
  }
}

async function selectSearchChannel(ch) {
  searchError.value = ''
  const uuid = channelResultUuid(ch)
  if (!uuid) {
    searchError.value = 'Нет идентификатора канала'
    return
  }
  // Без автоподписки — сообщения подтянутся, если уже участник
  store.openChannelChat({
    ...ch,
    channel_uuid: uuid,
    title: ch.title,
    avatar_file_uuid: ch.avatar_file_uuid || ch.avatarFileUuid,
    member_count: ch.member_count ?? ch.memberCount,
    is_public: ch.is_public ?? ch.isPublic ?? true
  })
  clearSearch()
}

async function selectSearchUser(user) {
  searchError.value = ''
  if (!user?.userUuid) {
    searchError.value = 'У пользователя нет UUID — чат недоступен'
    return
  }
  searchLoading.value = true
  try {
    const messagesId = await resolveMessagesIdByUuid(user.userUuid)
    if (!messagesId) {
      searchError.value = 'Пользователь ещё не доступен в мессенджере'
      return
    }
    store.openChatWithUser(user, messagesId)
    clearSearch()
  } catch (e) {
    searchError.value = e.message || 'Не удалось открыть чат'
  } finally {
    searchLoading.value = false
  }
}

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

function lastMessagePreview(chat) {
  const msg = lastMessage(chat)
  if (!msg) return 'Нет сообщений'

  // Store кладёт caption в text и выносит файл в fileUuid/fileName
  const fileName = msg.fileName || ''
  const fileUuid = msg.fileUuid || null
  let text = (msg.text || '').trim()

  // Маркер пересылки хранится в начале text. Не показываем его в превью списка чатов.
  // После удаления маркера продолжаем обычную обработку вложений/подписи.
  const forwarded = parseForwardMessageText(text)
  if (forwarded.forwardedFromType) {
    text = (forwarded.body || '').trim()
    if (!text && !fileUuid) return 'Пересланное сообщение'
  }

  if (msg.isVoiceMessage || /^voice-message-/i.test(fileName)) {
    return 'Голосовое сообщение'
  }
  if (msg.isVideoNote || /^video-note-/i.test(fileName)) {
    return 'Видеосообщение'
  }
  if (msg.isVideo) return 'Видео'

  // Стикер (в т.ч. без эмодзи: text пустой, fileName = sticker-*.webp)
  if (fileUuid && /^sticker-/i.test(fileName)) {
    if (text && /\p{Extended_Pictographic}/u.test(text)) return text
    if (text && [...text].length <= 4) return text
    return 'Стикер'
  }

  // Fallback по маркеру в сыром text (если store не разобрал)
  if (text) {
    const { fileUuid: fu, fileName: fn, caption } = parseFileMessageText(text)
    const name = fn || ''
    const cap = (caption || '').trim()
    if (fu && name) {
      if (/^sticker-/i.test(name)) {
        if (cap && /\p{Extended_Pictographic}/u.test(cap)) return cap
        if (cap && [...cap].length <= 4) return cap
        return 'Стикер'
      }
      if (/^voice-message-/i.test(name)) return 'Голосовое сообщение'
      if (/^video-note-/i.test(name)) return 'Видеосообщение'
      if (/\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(name)) return 'Видео'
      if (/\.(mp3|ogg|oga|opus|wav|m4a|aac|flac)$/i.test(name)) return 'Аудио'
      if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return cap || 'Фото'
      return cap || name
    }
  }

  if (!text) {
    if (fileUuid && msg.isImage) return 'Фото'
    if (fileUuid && msg.isAudio) return 'Аудио'
    if (fileUuid) return 'Файл'
    return 'Нет сообщений'
  }

  if (
    text === 'Зашифрованное сообщение' ||
    /^e2ee:v\d+:/i.test(text) ||
    text.startsWith('🔒e2ee:') ||
    text.startsWith('🔒')
  ) {
    return 'Сообщение'
  }

  return text
}

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
  position: relative;
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

.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px 8px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.toolbar-tab,
.toolbar-action {
  height: 36px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}

.toolbar-tab {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 2px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.toolbar-tab svg,
.toolbar-action svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.toolbar-action {
  flex: 0 0 30px;
  width: 30px;
  padding: 0;
}

.toolbar-tab:hover,
.toolbar-action:hover {
  background: #f0f8fd;
  color: #168dcc;
}

.toolbar-tab.active {
  color: #168dcc;
  background: #e8f6fe;
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
  padding: 7px 12px;
  background: #f2f9fd;
  border-radius: 22px;
  flex-shrink: 0;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.search-bar:hover,
.search-bar.focused {
  background: #e9f7ff;
}

.search-bar.focused {
  box-shadow: inset 0 0 0 1.5px rgba(42, 171, 238, 0.35);
}

.search-icon {
  color: #8e8e93;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #0f172a;
  padding: 2px 0;
  outline: none;
}

.search-input::placeholder {
  color: #8e8e93;
}

.search-clear {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: #c5d0da;
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  margin: 0;
}

.search-clear:hover {
  background: #94a3b8;
}

.btn-subscribe {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  background: #2aabee;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, opacity 0.15s ease;
}
.btn-subscribe:hover:not(:disabled) {
  background: #1e96d1;
}
.btn-subscribe:disabled {
  opacity: 0.6;
  cursor: default;
}
.subscribed-badge {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #8e8e93;
  white-space: nowrap;
}
.search-result-channel {
  align-items: center;
}
html[data-theme="dark"] .btn-subscribe {
  background: #2aabee;
  color: #fff;
}
html[data-theme="dark"] .subscribed-badge {
  color: #9eb0c0;
}
.search-section-label {
  padding: 10px 16px 4px;
  font-size: 12px;
  font-weight: 600;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
html[data-theme="dark"] .search-section-label {
  color: #9eb0c0;
}
.search-hint {
  padding: 24px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.search-hint.error {
  color: #ea0038;
}

.search-result .last {
  color: #64748b;
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
    background: #f0f2f5;
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

.group-actions {
  padding: 8px 12px 4px;
  flex-shrink: 0;
}

.btn-create-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(42, 171, 238, 0.25);
}

.btn-create-group:hover {
  filter: brightness(1.05);
}

.btn-create-group:active {
  transform: scale(0.98);
}

:global(html[data-theme="dark"]) .btn-create-group {
  background: linear-gradient(135deg, #2b8ec4, #1f6f9c);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

</style>

<style>
/* unscoped: без :global() — иначе селектор не матчится и .name остаётся color:#000 */
html[data-theme="dark"] .sidebar {
  background: #161c24;
  border-color: #252d38;
}
html[data-theme="dark"] .sidebar .header {
  background: #1a222c;
  border-color: #252d38;
  border-bottom: 1px solid #252d38;
  box-shadow: none;
}
html[data-theme="dark"] .sidebar .header-title,
html[data-theme="dark"] .sidebar .name {
  color: #e6edf3;
}
html[data-theme="dark"] .sidebar .chat-toolbar {
  border-color: #252d38;
  border-bottom: 1px solid #252d38;
  box-shadow: none;
}
html[data-theme="dark"] .sidebar .toolbar-tab,
html[data-theme="dark"] .sidebar .toolbar-action {
  color: #9aafbf;
}
html[data-theme="dark"] .sidebar .toolbar-tab.active {
  color: #65c5f5;
  background: #17364a;
}
html[data-theme="dark"] .sidebar .toolbar-tab:hover,
html[data-theme="dark"] .sidebar .toolbar-action:hover {
  color: #65c5f5;
  background: #203747;
}
html[data-theme="dark"] .sidebar .search-bar {
  background: #202f3d;
}
html[data-theme="dark"] .sidebar .search-bar:hover,
html[data-theme="dark"] .sidebar .search-bar.focused {
  background: #263b4d;
}
html[data-theme="dark"] .sidebar .search-input {
  color: #e6edf3;
}
html[data-theme="dark"] .sidebar .search-input::placeholder {
  color: #8195a5;
}
html[data-theme="dark"] .sidebar .chat {
  color: #dce6ee;
  border-color: #263746;
}
html[data-theme="dark"] .sidebar .chat:hover {
  background: #1b2b38;
}
html[data-theme="dark"] .sidebar .chat.active {
  background: #1a2e3d;
}
html[data-theme="dark"] .sidebar .chat.active .name {
  color: #75ccf8;
}
html[data-theme="dark"] .sidebar .last,
html[data-theme="dark"] .sidebar .time,
html[data-theme="dark"] .sidebar .no-chats,
html[data-theme="dark"] .sidebar .search-hint,
html[data-theme="dark"] .sidebar .search-result .last {
  color: #91a4b4;
}
html[data-theme="dark"] .theme-settings {
  background: #1b2a37;
  border-color: #34495a;
}
html[data-theme="dark"] .theme-settings-title {
  color: #e6edf3;
}
html[data-theme="dark"] .theme-option {
  background: #223442;
  color: #c2d0dc;
  border-color: #3a4d5c;
}
html[data-theme="dark"] .theme-option.active {
  background: #173b50;
  color: #75ccf8;
  border-color: #348bb8;
}

/* Участники в профилях группы/канала */
html[data-theme="dark"] .group-profile .member-name,
html[data-theme="dark"] .channel-profile .member-name {
  color: #eef3f8;
}
html[data-theme="dark"] .group-profile .member-role,
html[data-theme="dark"] .channel-profile .member-role {
  color: #9eb0c0;
}
html[data-theme="dark"] .group-profile .member-row,
html[data-theme="dark"] .channel-profile .member-row {
  color: #eef3f8;
}
</style>
