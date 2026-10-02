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
          placeholder="Логин или телефон..."
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
        <div v-else-if="searched && results.length === 0" class="hint">Никого не найдено</div>

        <div
          v-for="user in results"
          :key="user.id"
          class="result"
          @click="selectUser(user)"
        >
          <div class="avatar">{{ letter(user) }}</div>
          <div class="meta">
            <div class="name">{{ fullName(user) }}</div>
            <div class="login">@{{ user.login }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { searchUsers, resolveMessagesIdByUuid } from '../services/users'
import { useChatStore } from '../stores/chat'

const emit = defineEmits(['close'])
const store = useChatStore()

const query = ref('')
const results = ref([])
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

function onInput() {
  clearTimeout(debounceTimer)
  error.value = ''
  const q = query.value.trim()
  if (q.length < 2) {
    results.value = []
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
  try {
    results.value = await searchUsers(q)
    searched.value = true
  } catch (e) {
    error.value = e.message || 'Ошибка поиска'
    results.value = []
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
}

.meta {
  margin-left: 12px;
  overflow: hidden;
}

.name {
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.login {
  font-size: 13px;
  color: #666;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .search-overlay {
    padding-top: 0;
    align-items: stretch;
  }

  .search-panel {
    max-width: none;
    max-height: none;
    height: 100%;
    border-radius: 0;
  }

  .search-header {
    padding-top: max(14px, env(safe-area-inset-top));
  }

  .search-input input,
  input {
    font-size: 16px;
  }
}
</style>
