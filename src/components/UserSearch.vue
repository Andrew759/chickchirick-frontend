<template>
  <div class="search-overlay" @click.self="emit('close')">
    <div class="search-panel">
      <div class="search-header">
        <h3>Новый чат</h3>
        <button type="button" class="btn-close" @click="emit('close')" aria-label="Закрыть">×</button>
      </div>

      <div class="search-input-wrap">
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          placeholder="Люди, каналы…"
          @input="onInput"
          @keydown.esc="emit('close')"
        />
      </div>

      <div class="search-body">
        <div v-if="loading" class="hint">Поиск...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else-if="query.trim().length > 0 && query.trim().length < 2" class="hint">
          Введите минимум 2 символа
        </div>
        <div v-else-if="searched && !userResults.length && !channelResults.length" class="hint">
          Ничего не найдено
        </div>

        <template v-if="!loading">
          <div v-if="channelResults.length" class="section-label">Каналы</div>
          <div
            v-for="ch in channelResults"
            :key="'ch-' + (ch.channel_uuid || ch.channelUuid || ch.id)"
            class="result is-channel"
            @click="selectChannel(ch)"
          >
            <div class="avatar channel-avatar">
              <img
                v-if="ch.avatar_file_uuid || ch.avatarFileUuid"
                :src="fileUrl(ch.avatar_file_uuid || ch.avatarFileUuid)"
                alt=""
              />
              <span v-else>{{ channelLetter(ch) }}</span>
            </div>
            <div class="meta">
              <div class="name">
                {{ ch.title || 'Канал' }}
                <span class="badge-ch">канал</span>
              </div>
              <div class="login">{{ memberLabel(ch) }}</div>
            </div>
            <button
              v-if="!isSubscribedToChannel(ch)"
              type="button"
              class="btn-subscribe"
              :disabled="loading || subscribingUuid === channelResultUuid(ch)"
              @click.stop="subscribeFromSearch(ch)"
            >
              {{ subscribingUuid === channelResultUuid(ch) ? '…' : 'Подписаться' }}
            </button>
            <span v-else class="subscribed-badge">Вы подписаны</span>
          </div>

          <div v-if="userResults.length" class="section-label">Люди</div>
          <div
            v-for="user in userResults"
            :key="'u-' + user.id"
            class="result"
            @click="selectUser(user)"
          >
            <div class="avatar">{{ letter(user) }}</div>
            <div class="meta">
              <div class="name">{{ fullName(user) }}</div>
              <div class="login">@{{ user.login }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { searchUsers, resolveMessagesIdByUuid } from '../services/users'
import { listPublicChannels, subscribeChannel } from '../services/channels'
import { getFileUrl } from '../services/files'
import { useChatStore } from '../stores/chat'

const emit = defineEmits(['close'])
const store = useChatStore()

const query = ref('')
const userResults = ref([])
const channelResults = ref([])
const subscribingUuid = ref('')
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const inputEl = ref(null)

let debounceTimer = null

onMounted(async () => {
  await nextTick()
  inputEl.value?.focus()
})

function fullName(user) {
  const n = `${user.name || ''} ${user.surname || ''}`.trim()
  return n || user.login || `User ${user.id}`
}

function letter(user) {
  const n = (user.name || user.login || '?').trim()
  return n[0]?.toUpperCase() || '?'
}

function channelLetter(ch) {
  const t = String(ch.title || 'К').trim()
  return (t[0] || 'К').toUpperCase()
}

function memberLabel(ch) {
  const n = Number(ch.member_count ?? ch.memberCount ?? 0)
  if (!n) return 'Публичный канал'
  if (n === 1) return '1 подписчик'
  if (n >= 2 && n <= 4) return `${n} подписчика`
  return `${n} подписчиков`
}

function fileUrl(uuid) {
  return uuid ? getFileUrl(uuid) : ''
}

/** Локальный поиск среди уже открытых/своих каналов по title */
function matchLocalChannels(q) {
  const needle = q.toLowerCase()
  const list = store.chats || []
  return list
    .filter((c) => c.isChannel || c.type === 'channel' || String(c.id || '').startsWith('channel:'))
    .filter((c) => {
      const title = String(c.name || c.title || '').toLowerCase()
      return title.includes(needle)
    })
    .map((c) => ({
      channel_uuid: c.channelId || String(c.id || '').replace(/^channel:/, ''),
      title: c.name || c.title,
      avatar_file_uuid: c.avatarFileUuid || null,
      member_count: c.memberCount || 0,
      is_public: c.isPublic,
      _local: true
    }))
}

function mergeChannels(local, remote) {
  const map = new Map()
  for (const ch of [...local, ...remote]) {
    const uuid = ch.channel_uuid || ch.channelUuid || ch.channelId
    if (!uuid) continue
    if (!map.has(uuid)) map.set(uuid, { ...ch, channel_uuid: uuid })
  }
  return [...map.values()]
}

function normalizePublicList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.channels)) return data.channels
  if (Array.isArray(data?.items)) return data.items
  return []
}

function onInput() {
  clearTimeout(debounceTimer)
  error.value = ''
  const q = query.value.trim()
  if (q.length < 2) {
    userResults.value = []
    channelResults.value = []
    searched.value = false
    loading.value = false
    return
  }
  loading.value = true
  debounceTimer = setTimeout(() => doSearch(q), 300)
}

async function doSearch(q) {
  loading.value = true
  error.value = ''
  const localCh = matchLocalChannels(q)

  try {
    const [users, publicRaw] = await Promise.all([
      searchUsers(q).catch((e) => {
        console.warn('user search', e)
        return []
      }),
      listPublicChannels({ q, limit: 20 }).catch((e) => {
        console.warn('channel search', e)
        return []
      })
    ])

    userResults.value = Array.isArray(users) ? users : []
    const remoteCh = normalizePublicList(publicRaw)
    // Поиск каналов только по title (названию)
    const needle = q.toLowerCase().replace(/^@+/, '')
    const filteredRemote = remoteCh.filter((ch) => {
      const title = String(ch.title || '').toLowerCase()
      return title.includes(needle)
    })
    channelResults.value = mergeChannels(localCh, filteredRemote)
    searched.value = true
  } catch (e) {
    error.value = e.message || 'Ошибка поиска'
    userResults.value = []
    channelResults.value = localCh
    searched.value = true
  } finally {
    loading.value = false
  }
}

async function selectUser(user) {
  error.value = ''
  if (!user?.userUuid) {
    error.value = 'У пользователя нет UUID — чат недоступен'
    return
  }

  loading.value = true
  try {
    const messagesId = await resolveMessagesIdByUuid(user.userUuid)
    if (!messagesId) {
      error.value = 'Пользователь ещё не доступен в мессенджере. Попросите его зайти в приложение.'
      return
    }
    store.openChatWithUser(user, messagesId)
    emit('close')
  } catch (e) {
    error.value = e.message || 'Не удалось открыть чат'
  } finally {
    loading.value = false
  }
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
  error.value = ''
  const uuid = channelResultUuid(ch)
  if (!uuid) {
    error.value = 'Нет идентификатора канала'
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
    error.value = e.message || 'Не удалось подписаться'
  } finally {
    subscribingUuid.value = ''
  }
}

async function selectChannel(ch) {
  error.value = ''
  const uuid = channelResultUuid(ch)
  if (!uuid) {
    error.value = 'Нет идентификатора канала'
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
  emit('close')
}
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 1000;
}

.search-panel {
  background: white;
  width: 100%;
  max-width: 420px;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: min(70vh, 520px);
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}

.search-header h3 {
  margin: 0;
  font-size: 16px;
  color: #111;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
  width: auto;
  margin: 0;
}

.btn-close:hover {
  color: #111;
}

.search-input-wrap {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.search-input-wrap input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 14px;
}

.search-input-wrap input:focus {
  border-color: #2aabee;
  outline: none;
}

.search-body {
  overflow-y: auto;
  flex: 1;
  min-height: 120px;
}

.section-label {
  padding: 10px 16px 4px;
  font-size: 12px;
  font-weight: 650;
  color: #8aa1ae;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.hint, .error {
  padding: 20px 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.error {
  color: #ea0038;
}

.result {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.result:hover {
  background: #f7f9fa;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2aabee;
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.channel-avatar {
  background: linear-gradient(145deg, #54a9eb, #2aabee);
}

.channel-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  margin-left: 12px;
  overflow: hidden;
  min-width: 0;
}

.name {
  font-weight: 600;
  color: var(--search-name, #111);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
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
  color: var(--search-muted, #666);
  white-space: nowrap;
}
.result.is-channel {
  align-items: center;
}
.badge-ch {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #2aabee;
  background: rgba(42, 171, 238, 0.12);
  border-radius: 6px;
  padding: 2px 6px;
}

.login {
  font-size: 13px;
  color: var(--search-muted, #666);
  margin-top: 2px;
}

@media (max-width: 768px) {
  .search-overlay {
    padding-top: 0;
    align-items: stretch;
  }
}

:global(html[data-theme="dark"]) .search-panel {
  --search-name: #eef3f8;
  --search-muted: #91a4b4;
  background: #1a222c;
  color: #e6edf3;
  border-color: #2a333e;
}
:global(html[data-theme="dark"]) .search-header {
  border-color: #2a333e;
}
:global(html[data-theme="dark"]) .search-header h3 {
  color: var(--search-name, #eef3f8);
}
:global(html[data-theme="dark"]) .btn-close {
  color: #9eb0c0;
}
:global(html[data-theme="dark"]) .search-input-wrap {
  border-color: #2a333e;
}
:global(html[data-theme="dark"]) .search-input-wrap input {
  background: #202f3d;
  border-color: #2a333e;
  color: #e6edf3;
}
:global(html[data-theme="dark"]) .result:hover {
  background: #222b36;
}
:global(html[data-theme="dark"]) .section-label,
:global(html[data-theme="dark"]) .hint {
  color: var(--search-muted, #91a4b4);
}
</style>
