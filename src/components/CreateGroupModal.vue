<template>
  <div class="sm-overlay">
    <div class="sm-panel">
      <div class="sm-head">
        <button type="button" class="sm-back" title="Назад" @click="emit('close')">←</button>
        <span class="sm-title">Новая группа</span>
        <button
          type="button"
          class="sm-action"
          title="Создать"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          {{ submitting ? '…' : '✓' }}
        </button>
      </div>

      <div class="sm-body sm-form">
        <div class="gm-hero">
          <button
            type="button"
            class="gm-avatar"
            :class="{ has: !!avatarPreview }"
            title="Фото группы"
            @click="fileInput?.click()"
          >
            <img v-if="avatarPreview" :src="avatarPreview" alt="" class="gm-avatar-img" />
            <span v-else class="gm-avatar-ph">
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 12.5c.6-2.8 3.4-5 7-5s6.4 2.2 7 5H5Z"/>
                <path fill="currentColor" d="M19 8v2h2v2h-2v2h-2v-2h-2v-2h2V8h2Z"/>
              </svg>
            </span>
          </button>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="onAvatarChange" />

          <label class="sm-field gm-title-field">
            Название
            <input
              v-model="title"
              type="text"
              maxlength="80"
              placeholder="Имя группы"
              @keydown.enter.prevent="submit"
            />
          </label>
        </div>

        <label class="sm-field">
          Участники
          <input
            v-model="query"
            type="text"
            placeholder="Поиск по логину…"
            @input="onSearchInput"
          />
        </label>

        <p v-if="searchLoading" class="sm-hint">Поиск…</p>
        <p v-else-if="searchError" class="sm-err">{{ searchError }}</p>

        <div v-if="results.length" class="gm-results">
          <button
            v-for="user in results"
            :key="user.id"
            type="button"
            class="gm-result"
            :class="{ on: isSelected(user) }"
            @click="toggleUser(user)"
          >
            <span class="gm-letter">{{ letter(user) }}</span>
            <span class="gm-meta">
              <span class="gm-name">{{ fullName(user) }}</span>
              <span class="gm-login">@{{ user.login }}</span>
            </span>
            <span v-if="isSelected(user)" class="gm-check">✓</span>
          </button>
        </div>

        <div v-if="selected.length" class="gm-chips">
          <span v-for="u in selected" :key="u.id" class="gm-chip">
            {{ fullName(u) }}
            <button type="button" class="gm-chip-x" :aria-label="'Убрать ' + fullName(u)" @click="removeUser(u)">×</button>
          </span>
        </div>

        <p v-if="error" class="sm-err">{{ error }}</p>

        <button
          type="button"
          class="sm-submit"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          {{ submitting ? 'Создание…' : 'Создать группу' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { searchUsers, resolveMessagesIdByUuid } from '../services/users'
import { createGroup } from '../services/groups'
import { uploadFile } from '../services/files'

const emit = defineEmits(['close', 'created'])

const title = ref('')
const query = ref('')
const results = ref([])
const selected = ref([])
const searchLoading = ref(false)
const searchError = ref('')
const error = ref('')
const submitting = ref(false)
const fileInput = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')

let debounce = null

const canSubmit = computed(() => title.value.trim().length >= 1)

function fullName(user) {
  const n = `${user.name || ''} ${user.surname || ''}`.trim()
  return n || user.login || `User ${user.id}`
}

function letter(user) {
  const n = (user.name || user.login || '?').trim()
  return (n[0] || '?').toUpperCase()
}

function isSelected(user) {
  return selected.value.some((u) => u.id === user.id)
}

function toggleUser(user) {
  if (isSelected(user)) {
    selected.value = selected.value.filter((u) => u.id !== user.id)
  } else {
    selected.value = [...selected.value, user]
  }
}

function removeUser(user) {
  selected.value = selected.value.filter((u) => u.id !== user.id)
}

function onSearchInput() {
  clearTimeout(debounce)
  searchError.value = ''
  const q = query.value.trim()
  if (q.length < 2) {
    results.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  debounce = setTimeout(async () => {
    try {
      results.value = await searchUsers(q)
    } catch (e) {
      searchError.value = e.message || 'Ошибка поиска'
      results.value = []
    } finally {
      searchLoading.value = false
    }
  }, 280)
}

function onAvatarChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'Нужно изображение'
    return
  }
  avatarFile.value = file
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
  avatarPreview.value = URL.createObjectURL(file)
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    let avatarUuid = null
    if (avatarFile.value) {
      avatarUuid = crypto.randomUUID()
      await uploadFile(avatarUuid, avatarFile.value)
    }

    const memberIds = []
    for (const u of selected.value) {
      try {
        const mid = await resolveMessagesIdByUuid(u.userUuid || u.user_uuid || u.uuid)
        if (mid) memberIds.push(Number(mid))
      } catch (e) {
        console.warn('resolve member failed', u, e)
      }
    }

    const group = await createGroup({
      title: title.value.trim(),
      avatar_file_uuid: avatarUuid,
      member_user_ids: memberIds
    })
    emit('created', group)
    emit('close')
  } catch (e) {
    error.value = e.message || 'Не удалось создать группу'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* База как у StickersManager (scoped → копируем) */
.sm-overlay {
  position: absolute;
  inset: 0;
  z-index: 21;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.sm-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sm-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(42, 171, 238, 0.12);
  background: linear-gradient(180deg, #f7fbff, #fff);
  flex-shrink: 0;
}

.sm-back,
.sm-action {
  border: none;
  background: transparent;
  color: #2aabee;
  font-size: 20px;
  line-height: 1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.sm-back:hover,
.sm-action:hover {
  background: rgba(42, 171, 238, 0.1);
}

.sm-action:disabled {
  opacity: 0.35;
  cursor: default;
}

.sm-title {
  flex: 1;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  color: #163247;
}

.sm-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}

.sm-form {
  padding: 12px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.sm-field input[type='text'] {
  border: none;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  color: #0f172a;
  outline: none;
}

.sm-field input[type='text']:focus {
  box-shadow: 0 0 0 3px rgba(42, 171, 238, 0.2);
}

.sm-err {
  color: #ea0038;
  font-size: 13px;
  margin: 0;
}

.sm-hint {
  text-align: center;
  color: #8aa1ae;
  font-size: 13px;
  margin: 0;
  padding: 4px 0;
}

.sm-submit {
  border: none;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  width: 100%;
  margin-top: 4px;
}

.sm-submit:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Специфика группы */
.gm-hero {
  display: flex;
  align-items: center;
  gap: 14px;
}

.gm-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px dashed rgba(42, 171, 238, 0.45);
  background: linear-gradient(180deg, #f7fbff, #eef8ff);
  cursor: pointer;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #2aabee;
  flex-shrink: 0;
  padding: 0;
  transition: border-color 0.15s, background 0.15s;
}

.gm-avatar:hover {
  border-color: #2aabee;
  background: #e8f6fd;
}

.gm-avatar.has {
  border-style: solid;
  border-color: transparent;
}

.gm-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gm-avatar-ph {
  display: grid;
  place-items: center;
}

.gm-title-field {
  flex: 1;
  min-width: 0;
}

.gm-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.gm-result {
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s;
}

.gm-result:hover {
  background: #f2f9fd;
}

.gm-result.on {
  background: rgba(42, 171, 238, 0.12);
}

.gm-letter {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(145deg, #54a9eb, #2aabee);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 15px;
  flex-shrink: 0;
}

.gm-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.gm-name {
  font-weight: 600;
  font-size: 15px;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gm-login {
  font-size: 12px;
  color: #8e8e93;
}

.gm-check {
  color: #0b6ea8;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.gm-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.gm-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(42, 171, 238, 0.12);
  color: #0b6ea8;
  border-radius: 999px;
  padding: 4px 6px 4px 10px;
  font-size: 13px;
  font-weight: 500;
}

.gm-chip-x {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #0b6ea8;
  font-size: 16px;
  line-height: 1;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  padding: 0;
}

.gm-chip-x:hover {
  background: rgba(42, 171, 238, 0.2);
}

/* Dark theme */
:global(html[data-theme="dark"]) .sm-overlay {
  background: #161c24 !important;
}

:global(html[data-theme="dark"]) .sm-head {
  background: linear-gradient(180deg, #1a2430, #161c24) !important;
  border-color: #252d38 !important;
}

:global(html[data-theme="dark"]) .sm-title {
  color: #e6edf3 !important;
}

:global(html[data-theme="dark"]) .sm-back,
:global(html[data-theme="dark"]) .sm-action {
  color: #65c5f5 !important;
}

:global(html[data-theme="dark"]) .sm-back:hover,
:global(html[data-theme="dark"]) .sm-action:hover {
  background: #203747 !important;
}

:global(html[data-theme="dark"]) .sm-field {
  color: #9aafbf !important;
}

:global(html[data-theme="dark"]) .sm-field input[type='text'] {
  background: #202f3d !important;
  color: #e6edf3 !important;
}

:global(html[data-theme="dark"]) .sm-field input[type='text']::placeholder {
  color: #8195a5 !important;
}

:global(html[data-theme="dark"]) .sm-hint {
  color: #91a4b4 !important;
}

:global(html[data-theme="dark"]) .gm-avatar {
  background: linear-gradient(180deg, #1b2b38, #17364a);
  border-color: rgba(101, 197, 245, 0.35);
  color: #65c5f5;
}

:global(html[data-theme="dark"]) .gm-avatar:hover {
  background: #203747;
  border-color: #65c5f5;
}

:global(html[data-theme="dark"]) .gm-result:hover {
  background: #1b2b38;
}

:global(html[data-theme="dark"]) .gm-result.on {
  background: #17364a;
}

:global(html[data-theme="dark"]) .gm-name {
  color: #e6edf3;
}

:global(html[data-theme="dark"]) .gm-login {
  color: #91a4b4;
}

:global(html[data-theme="dark"]) .gm-check {
  color: #65c5f5;
}

:global(html[data-theme="dark"]) .gm-chip {
  background: #17364a;
  color: #75ccf8;
}

:global(html[data-theme="dark"]) .gm-chip-x {
  color: #75ccf8;
}

:global(html[data-theme="dark"]) .gm-chip-x:hover {
  background: rgba(101, 197, 245, 0.15);
}
</style>
