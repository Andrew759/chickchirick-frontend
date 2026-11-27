<template>
  <div class="share-overlay" @click.self="emit('close')">
    <div class="share-panel" role="dialog" aria-label="Поделиться">
      <div class="share-header">
        <h3>Поделиться</h3>
        <button type="button" class="share-close" @click="emit('close')">×</button>
      </div>

      <div class="share-tabs">
        <button type="button" :class="{ active: tab === 'people' }" @click="tab = 'people'">Люди</button>
        <button type="button" :class="{ active: tab === 'groups' }" @click="tab = 'groups'">Группы</button>
        <button type="button" :class="{ active: tab === 'channels' }" @click="tab = 'channels'">Каналы</button>
      </div>

      <div class="share-search">
        <input v-model="query" type="text" placeholder="Поиск…" autocomplete="off" />
      </div>

      <p v-if="error" class="share-err">{{ error }}</p>
      <p v-if="loading" class="share-hint">Загрузка…</p>

      <div v-else class="share-list">
        <template v-if="tab === 'people'">
          <button
            v-for="item in filteredPeople"
            :key="'u-' + item.id"
            type="button"
            class="share-item"
            :class="{ selected: isSelected('user', item.id) }"
            @click="toggle('user', item.id, item.name)"
          >
            <span class="share-avatar" :class="{ 'has-photo': item.avatarUrl }">
              <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="" />
              <template v-else>{{ letter(item.name) }}</template>
            </span>
            <span class="share-meta">
              <span class="share-name">{{ item.name }}</span>
              <span class="share-sub">{{ item.sub || 'Личный чат' }}</span>
            </span>
            <span v-if="isSelected('user', item.id)" class="share-check">✓</span>
          </button>
          <p v-if="!filteredPeople.length" class="share-hint">Нет личных чатов</p>
        </template>

        <template v-else-if="tab === 'groups'">
          <button
            v-for="item in filteredGroups"
            :key="'g-' + item.uuid"
            type="button"
            class="share-item"
            :class="{ selected: isSelected('group', item.uuid) }"
            @click="toggle('group', item.uuid, item.name)"
          >
            <span class="share-avatar group" :class="{ 'has-photo': item.avatarUrl }">
              <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="" />
              <template v-else>{{ letter(item.name) }}</template>
            </span>
            <span class="share-meta">
              <span class="share-name">{{ item.name }}</span>
              <span class="share-sub">Группа</span>
            </span>
            <span v-if="isSelected('group', item.uuid)" class="share-check">✓</span>
          </button>
          <p v-if="!filteredGroups.length" class="share-hint">Нет групп</p>
        </template>

        <template v-else>
          <button
            v-for="item in filteredChannels"
            :key="'c-' + item.uuid"
            type="button"
            class="share-item"
            :class="{ selected: isSelected('channel', item.uuid) }"
            @click="toggle('channel', item.uuid, item.name)"
          >
            <span class="share-avatar channel" :class="{ 'has-photo': item.avatarUrl }">
              <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="" />
              <template v-else>{{ letter(item.name) }}</template>
            </span>
            <span class="share-meta">
              <span class="share-name">{{ item.name }}</span>
              <span class="share-sub">Мой канал</span>
            </span>
            <span v-if="isSelected('channel', item.uuid)" class="share-check">✓</span>
          </button>
          <p v-if="!filteredChannels.length" class="share-hint">Нет каналов, где вы владелец</p>
        </template>
      </div>

      <div class="share-footer">
        <div v-if="selected.length" class="share-selected-count">
          Выбрано: {{ selected.length }}
        </div>
        <button
          type="button"
          class="share-send"
          :disabled="!selected.length || sending"
          @click="submit"
        >
          {{ sending ? 'Отправка…' : 'Отправить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useChatStore } from '../stores/chat'
import { listOwnedChannels, forwardMessages } from '../services/channels'
import { buildForwardMessageText, buildForwardChannelMessageText, buildFileMessageText } from '../services/fileMarker'
import { sendMessage } from '../services/socket'
import { sendGroupMessage } from '../services/groups'
import { getFileUrl } from '../services/files'
import {
  encryptForChannel,
  encryptForGroup,
  hasChannelKey,
  hasGroupKey
} from '../services/crypto'

const props = defineProps({
  message: { type: Object, required: true }
})
const emit = defineEmits(['close', 'done'])

const store = useChatStore()
const tab = ref('people')
const query = ref('')
const loading = ref(true)
const sending = ref(false)
const error = ref('')
const ownedChannels = ref([])
const selected = ref([])

function resolveUserName(userId, chat) {
  const u = store.usersById?.[userId]
  if (u) {
    const full = `${u.name || ''} ${u.surname || ''}`.trim()
    if (full) return full
    if (u.login) return u.login
  }
  const n = (chat?.name || '').trim()
  if (n && n !== 'Пользователь' && !/^User\s+\d+$/i.test(n)) return n
  return u?.login || `User ${userId}`
}

function resolveAvatarUrl(fileUuid) {
  if (!fileUuid) return ''
  try {
    return getFileUrl(fileUuid) || ''
  } catch {
    return ''
  }
}

const people = computed(() => {
  return (store.chats || [])
    .filter((c) => {
      const id = c.id
      if (id == null) return false
      if (typeof id === 'string' && (id.startsWith('group:') || id.startsWith('channel:'))) return false
      if (c.isGroup || c.isChannel || c.is_channel) return false
      return typeof id === 'number' || /^\d+$/.test(String(id))
    })
    .map((c) => {
      const id = Number(c.id)
      const u = store.usersById?.[id]
      const name = resolveUserName(id, c)
      const avatarFileUuid =
        c.avatarFileUuid || c.avatar_file_uuid || u?.avatarFileUuid || u?.avatar_file_uuid || null
      const login = u?.login ? `@${u.login}` : 'Личный чат'
      return {
        id,
        name,
        sub: login,
        avatarUrl: resolveAvatarUrl(avatarFileUuid)
      }
    })
})

const groups = computed(() => {
  return (store.chats || [])
    .filter((c) => c.isGroup || String(c.id || '').startsWith('group:'))
    .map((c) => {
      const uuid = String(c.groupId || c.group_uuid || String(c.id).replace(/^group:/, ''))
      const name = c.name || c.title || 'Группа'
      const avatarFileUuid = c.avatarFileUuid || c.avatar_file_uuid || null
      return {
        uuid,
        name,
        avatarUrl: resolveAvatarUrl(avatarFileUuid)
      }
    })
    .filter((g) => g.uuid)
})

const channels = computed(() => {
  return (ownedChannels.value || [])
    .map((ch) => {
      const uuid = String(ch.channel_uuid || ch.channelUuid || ch.channelId || '')
      const name = ch.title || ch.name || 'Канал'
      const avatarFileUuid = ch.avatar_file_uuid || ch.avatarFileUuid || null
      return {
        uuid,
        name,
        avatarUrl: resolveAvatarUrl(avatarFileUuid)
      }
    })
    .filter((c) => c.uuid)
})

const needle = computed(() => query.value.trim().toLowerCase())

const filteredPeople = computed(() => {
  const n = needle.value
  if (!n) return people.value
  return people.value.filter(
    (p) => p.name.toLowerCase().includes(n) || (p.sub || '').toLowerCase().includes(n)
  )
})
const filteredGroups = computed(() => {
  const n = needle.value
  if (!n) return groups.value
  return groups.value.filter((g) => g.name.toLowerCase().includes(n))
})
const filteredChannels = computed(() => {
  const n = needle.value
  if (!n) return channels.value
  return channels.value.filter((c) => c.name.toLowerCase().includes(n))
})

function letter(name) {
  const t = String(name || '?').trim()
  return (t[0] || '?').toUpperCase()
}

function isSelected(type, id) {
  return selected.value.some((s) => s.type === type && String(s.id) === String(id))
}

function toggle(type, id, name) {
  const key = String(id)
  const idx = selected.value.findIndex((s) => s.type === type && String(s.id) === key)
  if (idx >= 0) selected.value.splice(idx, 1)
  else selected.value.push({ type, id, name })
}

function resolveOriginalAuthor(m) {
  // если уже переслано — сохраняем исходного автора
  const fwdId = Number(m.forwardedFromSenderId || m.forwarded_from_sender_id || 0)
  const fwdName = (m.forwardedFromName || m.forwarded_from_name || '').trim()
  if (fwdId || fwdName) {
    const u = fwdId ? store.usersById?.[fwdId] : null
    if (u) {
      const full = `${u.name || ''} ${u.surname || ''}`.trim()
      return { id: fwdId || 0, name: full || u.login || fwdName || `User ${fwdId}` }
    }
    return { id: fwdId || 0, name: fwdName || (fwdId ? `User ${fwdId}` : 'Пользователь') }
  }
  const sid = Number(m.senderId || 0)
  if (m.fromMe || sid === Number(store.myUserId)) {
    const me = store.usersById?.[store.myUserId] || store.myProfile
    const full = me ? `${me.name || ''} ${me.surname || ''}`.trim() : ''
    return {
      id: Number(store.myUserId) || sid || 0,
      name: full || me?.login || 'Вы'
    }
  }
  const u = sid ? store.usersById?.[sid] : null
  if (u) {
    const full = `${u.name || ''} ${u.surname || ''}`.trim()
    return { id: sid, name: full || u.login || `User ${sid}` }
  }
  return { id: sid || 0, name: sid ? `User ${sid}` : 'Пользователь' }
}

function buildPayloadText() {
  const m = props.message || {}
  let body = ''
  // сохранить вложение
  if (m.fileUuid) {
    body = buildFileMessageText(m.fileUuid, m.fileName || 'file', String(m.text || '').trim(), m.audioUuid || '')
  } else {
    const textBody = String(m.text || '').trim()
    if (textBody) body = textBody
    else if (m.isVoiceMessage) body = 'Голосовое сообщение'
    else if (m.isVideoNote) body = 'Видеосообщение'
    else if (m.isVideo) body = m.fileName ? `Видео: ${m.fileName}` : 'Видео'
    else if (m.isImage) body = m.fileName ? `Фото: ${m.fileName}` : 'Фото'
    else if (m.isSticker) body = 'Стикер'
    else if (m.isAudio) body = m.fileName ? `Аудио: ${m.fileName}` : 'Аудио'
    else body = 'Сообщение'
  }
  const sourceChannelId = m.forwardedFromChannelId || m.forwarded_from_channel_id || m.channelId || m.channel_id
  if (sourceChannelId) {
    const sourceChannel = store.chats.find((c) => c.type === 'channel' && String(c.channelId) === String(sourceChannelId))
    const channelName = m.forwardedFromChannelName || m.forwarded_from_channel_name || sourceChannel?.name || 'Канал'
    return buildForwardChannelMessageText(sourceChannelId, channelName, body)
  }
  const author = resolveOriginalAuthor(m)
  return buildForwardMessageText(author.id, author.name, body)
}

async function encryptForTarget(type, id, plain) {
  try {
    if (type === 'channel' && hasChannelKey(id)) return await encryptForChannel(id, plain)
    if (type === 'group' && hasGroupKey(id)) return await encryptForGroup(id, plain)
  } catch (e) {
    console.warn('encrypt forward', e)
  }
  return plain
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    ownedChannels.value = await listOwnedChannels()
  } catch (e) {
    console.warn(e)
    ownedChannels.value = (store.chats || [])
      .filter(
        (c) =>
          (c.isChannel || String(c.id || '').startsWith('channel:')) &&
          (c.myRole === 'owner' || c.my_role === 'owner')
      )
      .map((c) => ({
        channel_uuid: c.channelId || String(c.id).replace(/^channel:/, ''),
        title: c.name || c.title,
        avatar_file_uuid: c.avatarFileUuid || c.avatar_file_uuid
      }))
  } finally {
    loading.value = false
  }
})

async function submit() {
  if (!selected.value.length || sending.value) return
  sending.value = true
  error.value = ''
  const plain = buildPayloadText()
  const restTargets = []
  try {
    for (const t of selected.value) {
      if (t.type === 'user') {
        const wire = await encryptForTarget('user', t.id, plain)
        sendMessage({ recipientId: Number(t.id), text: wire })
        continue
      }
      if (t.type === 'group') {
        const wire = await encryptForTarget('group', t.id, plain)
        try {
          await sendGroupMessage(t.id, { text: wire })
        } catch (e) {
          restTargets.push({ type: 'group', uuid: String(t.id) })
        }
        continue
      }
      if (t.type === 'channel') {
        const wire = await encryptForTarget('channel', t.id, plain)
        try {
          const mod = await import('../services/channels')
          await mod.sendChannelMessage(t.id, { text: wire })
        } catch (e) {
          restTargets.push({ type: 'channel', uuid: String(t.id) })
        }
      }
    }
    if (restTargets.length) {
      await forwardMessages(plain, restTargets)
    }
    emit('done')
    emit('close')
  } catch (e) {
    error.value = e.message || 'Не удалось отправить'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.share-panel {
  width: min(420px, 100%);
  max-height: min(72vh, 640px);
  background: var(--dm-panel, #ffffff);
  color: var(--dm-text, #111111);
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
}
.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
}
.share-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--dm-text, #111111);
}
.share-close {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--dm-muted, #6b7280);
}
.share-tabs {
  display: flex;
  gap: 6px;
  padding: 0 12px 8px;
}
.share-tabs button {
  flex: 1;
  border: none;
  background: var(--dm-panel-soft, #f1f3f5);
  border-radius: 20px;
  padding: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  color: var(--dm-muted, #4b5563);
}
.share-tabs button.active {
  background: var(--dm-accent, #2aabee);
  color: #fff;
}
.share-search {
  padding: 0 12px 8px;
}
.share-search input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--dm-border, #e5e7eb);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--dm-panel-soft, #f3f4f6);
  color: var(--dm-text, #111111);
  outline: none;
}
.share-search input::placeholder {
  color: var(--dm-muted, #6b7280);
}
.share-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 8px;
  min-height: 180px;
}
.share-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--dm-text, #111111);
}
.share-item:hover {
  background: var(--dm-panel-raised, #f5f9fc);
}
.share-item.selected {
  background: rgba(42, 171, 238, 0.14);
}
.share-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--dm-accent, #2aabee);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}
.share-avatar.has-photo {
  background: transparent;
}
.share-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.share-avatar.group {
  background: linear-gradient(145deg, #6c5ce7, #a29bfe);
  border-radius: 12px;
}
.share-avatar.channel {
  background: linear-gradient(145deg, #54a9eb, #2aabee);
}
.share-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.share-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--dm-text, #111111);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.share-sub {
  font-size: 12px;
  color: var(--dm-muted, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.share-check {
  color: var(--dm-accent, #2aabee);
  font-weight: 700;
  flex-shrink: 0;
}
.share-hint,
.share-err {
  padding: 12px 16px;
  margin: 0;
  font-size: 13px;
  color: var(--dm-muted, #6b7280);
}
.share-err {
  color: #e74c3c;
}
.share-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--dm-border, #e5e7eb);
  display: flex;
  align-items: center;
  gap: 12px;
}
.share-selected-count {
  font-size: 13px;
  color: var(--dm-muted, #6b7280);
  flex: 1;
}
.share-send {
  margin-left: auto;
  border: none;
  background: var(--dm-accent, #2aabee);
  color: #fff;
  font-weight: 700;
  border-radius: 10px;
  padding: 10px 18px;
  cursor: pointer;
}
.share-send:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
