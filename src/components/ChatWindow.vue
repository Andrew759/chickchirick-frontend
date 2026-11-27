<template>
  <div class="chat-window">
    <div class="header">
      <button
        type="button"
        class="btn-back-mobile"
        title="Назад к чатам"
        aria-label="Назад"
        @click="emit('back')"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <button
        v-if="!searchOpen"
        type="button"
        class="chat-profile-trigger"
        @click="onHeaderProfileClick"
      >
        <span class="chat-profile-avatar">
          <img
            v-if="(isGroupChat || isChannelChat) ? chat.avatarFileUuid : chatUser.avatarFileUuid"
            :src="getFileUrl((isGroupChat || isChannelChat) ? chat.avatarFileUuid : chatUser.avatarFileUuid)"
            alt=""
          />
          <span v-else>{{ (chat.name || '?').charAt(0).toUpperCase() }}</span>
        </span>
        <span class="chat-title">
          <span class="chat-name">{{ chat.name }}</span>
          <span v-if="headerSubtitle" class="typing-status">{{ headerSubtitle }}</span>
        </span>
      </button>
      <div v-else class="chat-search-inline">
        <div class="chat-search-input-wrap">
          <input
            ref="searchInputEl"
            v-model="searchQuery"
            type="search"
            class="chat-search-input"
            placeholder="Поиск в этой переписке…"
            autocomplete="off"
            @keydown.esc="closeSearch"
          />
          <button v-if="searchQuery" type="button" class="chat-search-clear" aria-label="Очистить поиск" @click="searchQuery = ''">×</button>
        </div>
      </div>
      <button type="button" class="chat-search-toggle" :aria-label="searchOpen ? 'Закрыть поиск' : 'Поиск по переписке'" :title="searchOpen ? 'Закрыть поиск' : 'Поиск по переписке'" @click="toggleSearch">
        <svg v-if="!searchOpen" viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.3 4.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <svg v-else viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div v-if="searchOpen" class="chat-search-panel">
      <div v-if="searchQuery.trim().length" class="chat-search-results">
        <button v-for="result in searchResults" :key="String(result.msg.id)" type="button" class="chat-search-result" @click="openSearchResult(result.msg)">
          <span class="chat-search-result-date">{{ formatSearchDate(result.msg) }}</span>
          <span class="chat-search-result-text">{{ result.snippet }}</span>
        </button>
        <div v-if="!searchResults.length" class="chat-search-empty">Ничего не найдено</div>
      </div>
      <div v-else class="chat-search-hint">Введите слово или фразу для поиска</div>
    </div>

    <div v-if="pinnedList.length" class="pinned-bar">
      <button type="button" class="pinned-main" @click="showNextPinned">
        <span class="pinned-copy">
          <span class="pinned-caption">Закреплённое сообщение <span v-if="pinnedList.length > 1">{{ activePinnedIndex + 1 }} / {{ pinnedList.length }}</span></span>
          <span class="pinned-text">{{ pinnedPreview }}</span>
        </span>
      </button>
      <button
        type="button"
        class="pinned-unpin"
        title="Открепить"
        @click.stop="handleUnpin(activePinned.messageId)"
      >×</button>
    </div>

    <div class="messages" ref="messagesEl">
      <MessageBubble
        v-for="(msg, idx) in chat.messages"
        :key="'msg-' + (msg.id ?? idx)"
        :msg="msg"
        :queue="voiceQueue"
        :is-group="isGroupChat"
        :prev-msg="idx > 0 ? chat.messages[idx - 1] : null"
        :chat-messages="chat.messages"
        :data-msg-id="msg.id"
        @open-photo="openPhoto"
        @open-video="openVideo"
        @open-sticker="openSticker"
        @delete="handleDelete"
        @edit-request="startEditing"
        @open-sender="onOpenSender"
        :can-reply="canReplyToMessages"
        @reply="handleReply"
        :is-pinned="isMsgPinned(msg)"
        @react="handleReact"
        @pin="handlePin"
        @share="handleShare"
        @scroll-to="scrollToMessage"
      />
    </div>

    <div v-if="isChannelChat && !canPostToChannel" class="channel-ro-hint"></div>
      <MessageInput
        v-if="canPostToChannel"
        :reply-to="replyTo"
        :edit-message="editingMessage"
        @send="handleSend"
        @edit="handleEdit"
        @cancel-edit="cancelEditing"
        @typing="handleTyping"
        @clear-reply="clearReply"
      />

    <PhotoViewer
      :open="viewerOpen"
      :items="activeViewerItems"
      :start-index="viewerIndex"
      @close="closePhotoViewer"
    />

    <VideoViewer
      :open="videoViewerOpen"
      :items="videoViewerItems"
      :start-index="videoViewerIndex"
      @close="videoViewerOpen = false"
    />
  </div>
  <SharePickerModal
    v-if="shareMsg"
    :message="shareMsg"
    @close="shareMsg = null"
    @done="shareMsg = null"
  />
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useChatStore } from '../stores/chat'
import { sendMessage, sendTyping, requestDeleteMessage, requestEditMessage } from '../services/socket'
import { isGroupChatId, parseGroupUuid, sendGroupMessage, listGroupMembers, sendGroupTyping, editGroupMessage } from '../services/groups'
import { isChannelChatId, parseChannelUuid, sendChannelMessage, listChannelMembers, sendChannelTyping, editChannelMessage } from '../services/channels'
import { toggleReaction } from '../services/reactions'
import { fetchPins, pinMessage, unpinMessage } from '../services/pins'
import { resolveChatUsers } from '../services/users'
import { uploadFile, linkFileToMessage, getFileUrl } from '../services/files'
import { buildFileMessageText } from '../services/fileMarker'
import {
  canEncryptFor,
  encryptForPeer,
  prepareE2eeForPeer,
  getPeerPublicKey,
  encryptForGroup,
  hasGroupKey,
  createGroupKey,
  buildGroupKeyDistributionMessage,
  encryptForChannel,
  hasChannelKey,
  createChannelKey,
  buildChannelKeyDistributionMessage
} from '../services/crypto'
import MessageInput from './MessageInput.vue'
import MessageBubble from './MessageBubble.vue'
import SharePickerModal from './SharePickerModal.vue'
import PhotoViewer from './PhotoViewer.vue'
import VideoViewer from './VideoViewer.vue'
import { usePlayerStore } from '../stores/player'

const store = useChatStore()
const player = usePlayerStore()
const chat = computed(() => store.activeChat)
const isGroupChat = computed(() => isGroupChatId(chat.value?.id) || chat.value?.isGroup === true)
const isChannelChat = computed(() => isChannelChatId(chat.value?.id) || chat.value?.isChannel === true || chat.value?.type === 'channel')
const canPostToChannel = computed(() => {
  if (!isChannelChat.value) return true
  const role = chat.value?.myRole || chat.value?.my_role || ''
  return role === 'owner' || role === 'admin'
})

/** Отвечать можно там, где можно писать (в канале — только owner/admin) */
const canReplyToMessages = computed(() => canPostToChannel.value)


/** Подтянуть имена/аватары отправителей групповых сообщений */
async function loadGroupSenders() {
  if (!isGroupChat.value || !chat.value?.messages?.length) return
  const ids = [
    ...new Set(
      chat.value.messages
        .map((m) => Number(m.senderId))
        .filter((id) => id && id !== store.myUserId && !store.usersById[id])
    )
  ]
  if (!ids.length) return
  try {
    const users = await resolveChatUsers(ids)
    store.setUsersInfo(users)
  } catch (e) {
    console.warn('loadGroupSenders:', e)
  }
}

watch(
  () => [chat.value?.id, chat.value?.messages?.length],
  () => {
    loadGroupSenders()
  },
  { immediate: true }
)

function onHeaderProfileClick() {
  const c = chat.value
  if (!c) return

  // Канал
  if (isChannelChat.value || isChannelChatId(c.id) || c.isChannel || c.type === 'channel') {
    const uuid = parseChannelUuid(c.id) || c.channelId || c.channel_uuid || c.channelUuid
    if (!uuid) {
      console.warn('openChannelProfile: no channel uuid on chat', c)
      return
    }
    store.openChannelProfile({
      channel_uuid: uuid,
      title: c.name || c.title,
      description: c.description || '',
      avatar_file_uuid: c.avatarFileUuid || c.avatar_file_uuid,
      member_count: c.memberCount || c.member_count,
      created_by: c.createdBy || c.created_by,
      is_public: c.isPublic ?? c.is_public,
      e2ee_enabled: c.e2eeEnabled ?? c.e2ee_enabled,
      my_role: c.myRole || c.my_role
    })
    return
  }

  // Группа
  if (isGroupChat.value || isGroupChatId(c.id) || c.isGroup || c.type === 'group') {
    const uuid = parseGroupUuid(c.id) || c.groupId || c.group_uuid || c.groupUuid
    if (!uuid) {
      console.warn('openGroupProfile: no group uuid on chat', c)
      return
    }
    store.openGroupProfile({
      group_uuid: uuid,
      title: c.name || c.title,
      avatar_file_uuid: c.avatarFileUuid || c.avatar_file_uuid,
      member_count: c.memberCount || c.member_count,
      created_by: c.createdBy || c.created_by
    })
    return
  }

  emit('open-profile', { id: c.id, ...chatUser.value })
}

function onOpenSender(senderId) {
  const id = Number(senderId)
  if (!id) return
  const user = store.usersById[id]
  if (user) {
    emit('open-profile', { id, ...user })
  }
}

const voiceQueue = computed(() =>
  (chat.value?.messages || [])
    .filter((message) => message.isVoiceMessage && message.fileUuid)
    .map((message) => ({
      src: fileUrl(message.fileUuid),
      title: 'Голосовое сообщение',
      kind: 'voice'
    }))
)
const chatUser = computed(() => store.usersById[chat.value?.id] || {})
const isPeerTyping = computed(() => {
  const id = chat.value?.id
  if (!id) return false
  const v = store.typingByChatId[id]
  if (!v) return false
  if (v === true) return true
  if (typeof v === 'object') return Object.keys(v).length > 0
  return false
})

/** Подзаголовок: typing в группе/личке или число участников */
const headerSubtitle = computed(() => {
  if (!chat.value) return ''
  const label = store.typingLabel?.(chat.value.id) || ''
  if (label) return label
  if (isGroupChat.value) {
    const n = Number(chat.value.memberCount || chat.value.member_count || 0)
    if (n === 1) return '1 участник'
    if (n >= 2 && n <= 4) return `${n} участника`
    if (n > 4) return `${n} участников`
  }
  if (isPeerTyping.value) return 'печатает...'
  return ''
})

const emit = defineEmits(['open-profile', 'open-group-profile', 'back'])
const messagesEl = ref(null)
const shareMsg = ref(null)
const replyTo = ref(null)
const editingMessage = ref(null)
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInputEl = ref(null)

const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return []
  return (chat.value?.messages || []).filter((msg) => {
    const text = String(msg?.text || msg?.caption || '').trim()
    return text && text.toLocaleLowerCase().includes(query)
  }).slice().reverse().map((msg) => {
    const text = String(msg.text || msg.caption || '').replace(/\s+/g, ' ').trim()
    const queryIndex = text.toLocaleLowerCase().indexOf(query)
    const start = Math.max(0, queryIndex - 45)
    const end = Math.min(text.length, queryIndex + query.length + 65)
    return { msg, snippet: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}` }
  })
})

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) {
    searchQuery.value = ''
  } else {
    nextTick(() => searchInputEl.value?.focus())
  }
}
function closeSearch() { searchOpen.value = false; searchQuery.value = '' }
function openSearchResult(msg) {
  closeSearch()
  nextTick(() => scrollToMessage(msg.id))
}
function formatSearchDate(msg) {
  const value = msg?.createdAt || msg?.created_at || msg?.created_at_unix || msg?.timestamp
  if (!value) return 'Сообщение'
  const date = typeof value === 'number' ? new Date(value > 1e12 ? value : value * 1000) : new Date(value)
  return Number.isNaN(date.getTime()) ? 'Сообщение' : date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const viewerOpen = ref(false)
const viewerIndex = ref(0)
const viewerItemsOverride = ref(null)
const videoViewerOpen = ref(false)
const videoViewerIndex = ref(0)

const viewerItems = computed(() => {
  const msgs = chat.value?.messages || []
  return msgs
    .filter((m) => m.isImage && m.fileUuid && !/^sticker-/i.test(m.fileName || ''))
    .map((m) => ({
      src: getFileUrl(m.fileUuid),
      alt: m.fileName || 'image',
      caption: m.text || '',
      fileName: m.fileName || 'photo.jpg'
    }))
})

const activeViewerItems = computed(() => viewerItemsOverride.value || viewerItems.value)

function fileUrl(uuid) {
  return getFileUrl(uuid)
}

function isStickerMsg(msg) {
  if (!msg?.fileUuid) return false
  if (msg.isSticker) return true
  return /^sticker-/i.test(msg.fileName || '')
}

function openSticker(msg) {
  if (!msg?.fileUuid) return
  const hasAudio = !!msg.audioUuid
  viewerItemsOverride.value = [{
    src: getFileUrl(msg.fileUuid),
    alt: msg.fileName || 'sticker',
    caption: '',
    fileName: msg.fileName || 'sticker.webp',
    kind: 'sticker',
    showEqualizer: hasAudio
  }]
  viewerIndex.value = 0
  viewerOpen.value = true

  // Через глобальный плеер — эквалайзер AvatarEqualizer читает bands/playing оттуда
  if (hasAudio) {
    player.play({
      src: getFileUrl(msg.audioUuid),
      title: 'Стикер',
      kind: 'sticker',
      queue: []
    }).catch(() => {})
  }
}

function openPhoto(msg) {
  if (!msg?.fileUuid) return
  // Стикер мог прийти через open-photo (fallback) или как isImage
  if (isStickerMsg(msg)) {
    openSticker(msg)
    return
  }
  if (!msg.isImage) return
  // Не глушим чужую музыку профиля при обычных фото
  viewerItemsOverride.value = null
  const idx = viewerItems.value.findIndex((it) => it.src === getFileUrl(msg.fileUuid))
  viewerIndex.value = idx >= 0 ? idx : 0
  viewerOpen.value = true
}

function closePhotoViewer() {
  viewerOpen.value = false
  viewerItemsOverride.value = null
  // Останавливаем только звук стикера, не музыку профиля
  if (player.kind === 'sticker') {
    player.stop()
  }
}

const videoViewerItems = computed(() => {
  const msgs = chat.value?.messages || []
  return msgs
    .filter((m) => m.isVideo && m.fileUuid)
    .map((m) => ({
      src: getFileUrl(m.fileUuid),
      caption: m.text || '',
      fileName: m.fileName || 'video.mp4'
    }))
})

function openVideo(msg) {
  if (!msg?.fileUuid || !msg.isVideo) return
  const idx = videoViewerItems.value.findIndex((it) => it.src === getFileUrl(msg.fileUuid))
  videoViewerIndex.value = idx >= 0 ? idx : 0
  videoViewerOpen.value = true
}

/**
 * @param {{ text?: string, file?: File|null }} payload
 */
function handleTyping(active) {
  const recipientId = chat.value?.id
  if (!recipientId) return
  const channelUuid = parseChannelUuid(recipientId)
  if (channelUuid) {
    sendMessage({
      type: 'typing',
      channelId: channelUuid,
      typing: Boolean(active),
      text: active ? '1' : '0'
    })
    sendChannelTyping(channelUuid, active).catch(() => {})
    return
  }
  const groupUuid = parseGroupUuid(recipientId)
  if (groupUuid) {
    // Основной путь — WS (как личный typing), REST — запасной
    sendMessage({
      type: 'typing',
      groupId: groupUuid,
      typing: Boolean(active),
      text: active ? '1' : '0'
    })
    sendGroupTyping(groupUuid, active).catch(() => {})
    return
  }
  sendTyping(recipientId, active)
}

/**
 * Перед отправкой: убедиться, что у нас есть identity и (по возможности)
 * публичный ключ собеседника. Если ключа нет — шлём анонс своего ключа.
 */
async function ensureE2eeReady(recipientId) {
  // Ключи через REST, в ленту ничего не пишем
  return prepareE2eeForPeer(recipientId)
}

/**
 * Шифрует текст, если возможно; иначе отправляет plaintext.
 */

/**
 * Group E2EE: если ключа нет — создаём и рассылаем участникам.
 * Участники без ключа получают его через __GROUP_KEY__ control-message.
 */
async function ensureGroupE2eeReady(groupUuid) {
  if (!groupUuid) return
  if (hasGroupKey(groupUuid)) return
  try {
    await createGroupKey(groupUuid)
    const members = await listGroupMembers(groupUuid)
    const ids = (members || []).map((m) => Number(m.user_id || m.userId)).filter(Boolean)
    const wire = await buildGroupKeyDistributionMessage(groupUuid, ids, store.myUserId)
    await sendGroupMessage(groupUuid, { text: wire })
  } catch (e) {
    console.warn('ensureGroupE2eeReady:', e)
  }
}

async function ensureChannelE2eeReady(channelUuid) {
  if (!channelUuid) return
  if (chat.value?.e2eeEnabled === false) return
  if (hasChannelKey(channelUuid)) return
  try {
    await createChannelKey(channelUuid)
    const members = await listChannelMembers(channelUuid)
    const ids = (members || []).map((m) => Number(m.user_id || m.userId)).filter(Boolean)
    const wire = await buildChannelKeyDistributionMessage(channelUuid, ids, store.myUserId)
    await sendChannelMessage(channelUuid, { text: wire })
  } catch (e) {
    console.warn('ensureChannelE2eeReady:', e)
  }
}

async function maybeEncrypt(recipientId, plainText) {
  if (!plainText) return plainText
  if (!canEncryptFor(recipientId)) {
    // ещё раз попробуем подтянуть ключ с API
    await prepareE2eeForPeer(recipientId)
  }
  if (!canEncryptFor(recipientId)) {
    // нет ключа — уходим plaintext (лучше, чем терять сообщение)
    return plainText
  }
  try {
    return await encryptForPeer(recipientId, plainText)
  } catch (e) {
    console.warn('E2EE encrypt failed, sending plaintext:', e)
    return plainText
  }
}

function stickerFileName(sticker) {
  const slug = (sticker?.slug || 'sticker').replace(/[^\w.-]+/g, '_')
  return `sticker-${slug}.webp`
}

async function handleReact(msg, emoji) {
  if (!msg?.id || !emoji) return
  try {
    const res = await toggleReaction(msg.id, emoji)
    store.setMessageReactions(msg.id, res.reactions || [])
  } catch (e) {
    console.error('reaction failed:', e)
    alert(e.message || 'Не удалось поставить реакцию')
  }
}

const pinnedList = computed(() => {
  const id = chat.value?.id
  if (id == null) return []
  return store.getChatPins?.(id) || store.pinsByChatKey?.[String(id)] || []
})

const activePinnedIndex = ref(0)
const activePinned = computed(() => pinnedList.value[activePinnedIndex.value] || pinnedList.value[0] || null)

watch(() => pinnedList.value.map((p) => p.messageId).join(','), () => {
  if (activePinnedIndex.value >= pinnedList.value.length) activePinnedIndex.value = 0
})

const pinnedPreview = computed(() => {
  const p = activePinned.value
  if (!p) return ''
  // p.text с сервера не используем: при E2EE там обрезанный шифротекст.
  const msg = chat.value?.messages?.find((m) => Number(m.id) === Number(p.messageId))
  const t = (msg?.text || '').trim()
  if (t) return t.length > 80 ? t.slice(0, 77) + '…' : t
  if (msg?.isSticker) return 'Стикер'
  if (msg?.isVideoNote) return 'Видеосообщение'
  if (msg?.isVoiceMessage) return 'Голосовое сообщение'
  if (msg?.fileUuid) return msg.fileName || 'Файл'
  return 'Закреплённое сообщение'
})

function showNextPinned() {
  if (!pinnedList.value.length) return
  if (pinnedList.value.length > 1) {
    activePinnedIndex.value = (activePinnedIndex.value + 1) % pinnedList.value.length
  }
  const target = activePinned.value?.messageId
  if (target != null) scrollToMessage(target)
}

function isMsgPinned(msg) {
  if (!msg?.id) return false
  return pinnedList.value.some((p) => Number(p.messageId) === Number(msg.id))
}

function pinScope() {
  if (isChannelChat.value) {
    const uuid = parseChannelUuid?.(chat.value?.id) || chat.value?.channelId || chat.value?.channel_uuid
    return { channelUuid: uuid }
  }
  if (isGroupChat.value) {
    const uuid = parseGroupUuid?.(chat.value?.id) || chat.value?.groupId || chat.value?.group_uuid
    return { groupUuid: uuid }
  }
  return { peerId: Number(chat.value?.id) }
}

async function loadPins() {
  const id = chat.value?.id
  if (id == null) return
  try {
    const pins = await fetchPins(pinScope())
    store.setChatPins(id, pins)
  } catch (e) {
    console.warn('load pins:', e)
  }
}

async function handlePin(msg) {
  if (!msg?.id) return
  try {
    if (isMsgPinned(msg)) {
      const res = await unpinMessage(msg.id, pinScope())
      store.setChatPins(chat.value.id, res.pins || [])
    } else {
      const res = await pinMessage(msg.id)
      store.setChatPins(chat.value.id, res.pins || [])
    }
  } catch (e) {
    console.error('pin failed:', e)
    alert(e.message || 'Не удалось закрепить сообщение')
  }
}

async function handleUnpin(messageId) {
  if (!messageId) return
  try {
    const res = await unpinMessage(messageId, pinScope())
    store.setChatPins(chat.value.id, res.pins || [])
  } catch (e) {
    console.error('unpin failed:', e)
  }
}

function handleReply(msg) {
  if (!canReplyToMessages.value) return
  if (!msg?.id) return
  let name = ''
  if (msg.fromMe) name = 'Вы'
  else {
    const u = store.usersById[Number(msg.senderId)]
    if (u) {
      name = [u.name, u.surname].filter(Boolean).join(' ').trim() || u.login || ''
    }
    if (!name) name = msg.senderId ? `User ${msg.senderId}` : 'Сообщение'
  }
  replyTo.value = { ...msg, _replyName: name }
}

function clearReply() {
  replyTo.value = null
}

function scrollToMessage(id) {
  if (id == null || !messagesEl.value) return
  const el = messagesEl.value.querySelector(`[data-msg-id="${id}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('msg-highlight')
    setTimeout(() => el.classList.remove('msg-highlight'), 1200)
  }
}

function handleShare(msg) {
  shareMsg.value = msg
}

async function handleSend(payload) {
  const caption = (payload?.text || '').trim()
  const file = payload?.file || null
  const sticker = payload?.sticker || null
  const respondMessageId = payload?.respondMessageId ?? replyTo.value?.id ?? null
  const recipientId = chat.value?.id
  if (!recipientId) return
  if (!caption && !file && !sticker) return

  const groupUuid = parseGroupUuid(recipientId)
  const channelUuid = parseChannelUuid(recipientId)
  const isGroup = Boolean(groupUuid)
  const isChannel = Boolean(channelUuid)

  if (isChannel && !canPostToChannel.value) {
    console.warn('subscribers cannot post to channel')
    return
  }

  if (isChannel) {
    await ensureChannelE2eeReady(channelUuid)
  } else if (!isGroup) {
    await ensureE2eeReady(recipientId)
  } else {
    await ensureGroupE2eeReady(groupUuid)
  }

  async function deliver(text) {
    const respond =
      respondMessageId != null && respondMessageId !== ''
        ? Number(respondMessageId)
        : null
    const respondPayload =
      respond != null && !Number.isNaN(respond) ? respond : undefined
    const chatKey = channelUuid || groupUuid || recipientId
    if (respondPayload != null) {
      store.noteOutgoingReply({
        respondMessageId: respondPayload,
        rawText: text,
        chatKey
      })
    }
    if (isChannel) {
      await sendChannelMessage(channelUuid, {
        text,
        ...(respondPayload != null ? { respond_message_id: respondPayload } : {})
      })
      return
    }
    if (isGroup) {
      await sendGroupMessage(groupUuid, {
        text,
        ...(respondPayload != null ? { respond_message_id: respondPayload } : {})
      })
      return
    }
    sendMessage({
      recipientId,
      text,
      ...(respondPayload != null ? { respondMessageId: respondPayload } : {})
    })
  }

  async function maybeEncryptOutgoing(plain) {
    if (!plain) return plain
    if (isChannel) {
      if (chat.value?.e2eeEnabled === false) return plain
      try {
        if (!hasChannelKey(channelUuid)) await ensureChannelE2eeReady(channelUuid)
        if (!hasChannelKey(channelUuid)) return plain
        return await encryptForChannel(channelUuid, plain)
      } catch (e) {
        console.warn('channel E2EE encrypt failed, plaintext:', e)
        return plain
      }
    }
    if (isGroup) {
      try {
        if (!hasGroupKey(groupUuid)) await ensureGroupE2eeReady(groupUuid)
        if (!hasGroupKey(groupUuid)) return plain
        return await encryptForGroup(groupUuid, plain)
      } catch (e) {
        console.warn('group E2EE encrypt failed, plaintext:', e)
        return plain
      }
    }
    return maybeEncrypt(recipientId, plain)
  }

  // Стикер: файл уже в files-сервисе (image_uuid), upload не нужен
  if (sticker?.image_uuid) {
    const fileUuid = sticker.image_uuid
    const audioUuid = sticker.audio_uuid || sticker.audioUuid || ''
    const plain = buildFileMessageText(
      fileUuid,
      stickerFileName(sticker),
      sticker.emoji || '',
      audioUuid
    )
    const text = await maybeEncryptOutgoing(plain)
    await deliver(text)
    waitAndLinkFile(fileUuid)
    return
  }

  if (!file) {
    const text = await maybeEncryptOutgoing(caption)
    await deliver(text)
    return
  }

  // 1) UUID → upload в files-сервис
  const fileUuid = crypto.randomUUID()
  try {
    await uploadFile(fileUuid, file)
  } catch (e) {
    console.error('upload failed:', e)
    alert(e.message || 'Не удалось загрузить файл')
    return
  }

  // 2) текст с маркером → шифруем целиком (caption + file marker)
  const plain = buildFileMessageText(fileUuid, file.name, caption)
  const text = await maybeEncryptOutgoing(plain)
  await deliver(text)

  // 3) после появления сообщения в store — привязка file_uuid в messages
  waitAndLinkFile(fileUuid)
}

/**
 * Ждём, пока upsertMessage положит сообщение с нашим fileUuid, и линкуем в БД.
 */
function waitAndLinkFile(fileUuid) {
  let tries = 0
  const timer = setInterval(() => {
    tries += 1
    const found = store.chats
      .flatMap((c) => c.messages)
      .find((m) => m.fileUuid === fileUuid && m.id)
    if (found) {
      clearInterval(timer)
      linkFileToMessage(found.id, fileUuid)
      return
    }
    if (tries > 40) clearInterval(timer)
  }, 250)
}

function startEditing(msg) {
  if (!msg?.id || !msg.fromMe) return
  replyTo.value = null
  editingMessage.value = { ...msg }
}

function cancelEditing() {
  editingMessage.value = null
}

async function handleEdit(msg, plainText) {
  if (!msg?.id || !msg.fromMe || !String(plainText || '').trim()) return
  const text = String(plainText).trim()
  const recipientId = chat.value?.id
  if (!recipientId) return
  const groupUuid = parseGroupUuid(recipientId)
  const channelUuid = parseChannelUuid(recipientId)
  try {
    let wireText = text
    if (channelUuid) {
      await ensureChannelE2eeReady(channelUuid)
      if (chat.value?.e2eeEnabled !== false && hasChannelKey(channelUuid)) wireText = await encryptForChannel(channelUuid, text)
      await editChannelMessage(channelUuid, msg.id, { text: wireText })
    } else if (groupUuid) {
      await ensureGroupE2eeReady(groupUuid)
      if (hasGroupKey(groupUuid)) wireText = await encryptForGroup(groupUuid, text)
      await editGroupMessage(groupUuid, msg.id, { text: wireText })
    } else {
      wireText = await maybeEncrypt(recipientId, text)
      await requestEditMessage(msg.id, { text: wireText })
    }
    for (const c of store.chats || []) {
      const target = (c.messages || []).find((m) => Number(m.id) === Number(msg.id))
      if (target) { target.text = text; target.edited = true; target.editedAt = new Date().toISOString() }
    }
    if (Number(editingMessage.value?.id) === Number(msg.id)) editingMessage.value = null
  } catch (e) {
    console.error('edit failed:', e)
    alert(e.message || 'Не удалось изменить сообщение')
  }
}

async function handleDelete(msg) {
  if (!msg?.id) return
  if (!confirm('Удалить это сообщение?')) return

  store.deleteMessage(msg.id)
  try {
    await requestDeleteMessage(msg.id)
  } catch (e) {
    console.error('delete failed:', e)
    alert(e.message || 'Не удалось удалить сообщение')
  }
}

function scrollMessagesToEnd() {
  const el = messagesEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

/** Надёжный скролл вниз: после DOM + после layout (картинки/шрифты). */
async function scrollToLatestMessage() {
  await nextTick()
  scrollMessagesToEnd()
  // ещё кадр — высота списка могла вырасти после рендера пузырей
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  scrollMessagesToEnd()
  // короткий отложенный дожим (на случай поздней подгрузки реакций/медиа)
  setTimeout(scrollMessagesToEnd, 50)
  setTimeout(scrollMessagesToEnd, 200)
}

// Новые сообщения / смена длины ленты
watch(() => chat.value?.id, () => closeSearch())

watch(
  () => chat.value?.messages?.length,
  () => {
    scrollToLatestMessage()
  }
)

// При открытии/смене чата — сразу к последнему сообщению
watch(
  () => chat.value?.id,
  (id) => {
    if (id) {
      activePinnedIndex.value = 0
      scrollToLatestMessage()
      ensureE2eeReady(id)
      loadPins()
    }
  },
  { immediate: true }
)
</script>

<style>
 .chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  min-width: 0;
}

.header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px 8px;
  padding-top: max(6px, env(safe-area-inset-top));
  background: rgba(248, 252, 255, .94);
  font-weight: 600;
  border-bottom: 1px solid rgba(42, 171, 238, .16);
  box-shadow: 0 2px 10px rgba(15, 23, 42, .06);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.btn-back-mobile {
  display: none;
  border: none;
  background: transparent;
  color: #2aabee;
  cursor: pointer;
  padding: 6px 4px;
  margin: 0 2px 0 -4px;
  border-radius: 50%;
  line-height: 0;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.btn-back-mobile:active {
  background: rgba(42, 171, 238, .12);
}

.chat-profile-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 2px 4px;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 9px;
  -webkit-tap-highlight-color: transparent;
}

.chat-profile-trigger:hover {
  background: rgba(42, 171, 238, .08);
}

.chat-profile-avatar {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #54a9eb, #2aabee);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.chat-profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}

.chat-name {
  position: relative;
  padding: 3px 4px 1px 2px;
  font-size: 15px;
  font-weight: 650;
  color: #163247;
}

.typing-status {
  padding: 0 4px 2px 2px;
  font-size: 11px;
  font-weight: 500;
  color: #2aabee;
  animation: typing-fade 1.2s ease-in-out infinite;
}


@keyframes typing-fade {
  0%, 100% { opacity: .55; }
  50% { opacity: 1; }
}



.pinned-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(42, 171, 238, 0.1);
  border-bottom: 1px solid rgba(42, 171, 238, 0.2);
  flex-shrink: 0;
}
.pinned-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 0;
}
.pinned-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.pinned-caption {
  color: #2aabee;
  font-size: 11px;
  font-weight: 600;
}
.pinned-text {
  font-size: 13px;
  color: #263746;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}
.pinned-unpin {
  border: none;
  background: transparent;
  color: #6d8796;
  font-size: 18px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pinned-unpin:hover {
  background: rgba(0,0,0,0.06);
  color: #e11d48;
}
:global(html[data-theme="dark"]) .pinned-bar {
  background: rgba(42, 171, 238, 0.12);
  border-bottom-color: rgba(42, 171, 238, 0.25);
}
:global(html[data-theme="dark"]) .pinned-text {
  color: #f1f5f9 !important;
}
:global(html[data-theme="dark"]) .pinned-caption {
  color: #69c7f5;
}

.messages {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px 88px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  background-image: none;
  background-color: inherit;
}


.bubble {
  position: relative;
  max-width: 70%;
  align-self: flex-start;
  background: rgba(255, 255, 255, .94);
  border: 1px solid rgba(42, 171, 238, .08);
  border-radius: 10px 10px 10px 3px;
  padding: 6px 10px 4px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, .06);
}

.bubble.me {
  align-self: flex-end;
  background: linear-gradient(135deg, #e5f7ff, #d7f1ff);
  border-color: rgba(42, 171, 238, .18);
  border-radius: 10px 10px 3px 10px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, .08);
}

/* Стикеры — без ореола/пузыря */
.bubble.no-halo,
.bubble.no-halo.me,
.bubble.sticker,
.bubble.sticker.me,
.bubble.voice,
.bubble.voice.me,
.bubble.video-note,
.bubble.video-note.me {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
}

.bubble.sticker {
  max-width: 180px;
}

.bubble.no-halo .time,
.bubble.sticker .time,
.bubble.voice .time,
.bubble.video-note .time {
  margin-top: 4px;
  padding-right: 2px;
}

/* не даём старым правилам :has(.video-note) вернуть padding */
.bubble.no-halo:has(.video-note),
.bubble.video-note:has(.video-note) {
  padding: 0 !important;
  background: transparent !important;
}

.bubble-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.content {
  min-width: 0;
  flex: 1;
}

.text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  color: #17384d;
}

.attachment {
  margin-bottom: 4px;
}

.bubble:has(.video-note) {
  padding: 4px;
}

.bubble:has(.video-note) .bubble-row {
  align-items: center;
}

.bubble:has(.video-note) .time {
  margin: -2px 4px 0 0;
}

.img-link {
  display: block;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  border-radius: 7px;
  overflow: hidden;
}

.img-link:hover .msg-image {
  opacity: 0.92;
}

.msg-image {
  max-width: 240px;
  max-height: 240px;
  border-radius: 7px;
  display: block;
  object-fit: cover;
  transition: opacity 0.12s ease;
}

.video-link {
  position: relative;
  display: block;
  width: min(360px, 70vw);
  padding: 0;
  border: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #111;
  cursor: pointer;
  text-align: left;
}

.msg-video-preview {
  display: block;
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  background: #111;
}

.video-play {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 52px;
  height: 52px;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.58);
  color: #fff;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease, background 0.15s ease;
}

.video-link:hover .video-play {
  transform: translate(-50%, -50%) scale(1.06);
  background: rgba(42, 171, 238, 0.9);
}

.file-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #168dcc;
  text-decoration: none;
  font-size: 14px;
  word-break: break-all;
}

.file-link:hover {
  color: #0d78ad;
  text-decoration: underline;
}

.time {
  font-size: 11px;
  color: #6d8796;
  text-align: right;
  margin-top: 2px;
}


.btn-delete {
  opacity: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #8aa1ae;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  flex-shrink: 0;
}

.bubble:hover .btn-delete,
.bubble:focus-within .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: #e11d48;
}

@media (max-width: 768px) {
  .chat-window {
    height: 100%;
    max-height: 100%;
  }

  .btn-back-mobile {
    display: grid;
    place-items: center;
  }

  .header {
    padding: 8px 10px;
    padding-top: max(8px, env(safe-area-inset-top));
  }

  .chat-profile-trigger {
    flex: 1;
    min-width: 0;
  }

  .messages {
    padding: 12px 10px 96px;
  }

  .bubble {
    max-width: 88%;
  }

  .msg-image {
    max-width: min(100%, 280px);
  }

  /* На тач-устройствах кнопка удаления всегда чуть видна у своих */
  .bubble.me .btn-delete {
    opacity: 0.55;
  }
}

@media (max-width: 380px) {
  .bubble {
    max-width: 92%;
  }

}

/* Тёмная тема: убираем голубой ореол (radial, тени, border) — только dark */
:global(html[data-theme="dark"]) .chat-window {
  background: #12181f !important;
  background-image: none !important;
}
:global(html[data-theme="dark"]) .chat-window > .header {
  background: #1a222c !important;
  border-bottom: 1px solid #252d38 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}
:global(html[data-theme="dark"]) .chat-window .messages {
  background: #12181f !important;
  background-image: none !important;
}
:global(html[data-theme="dark"]) .chat-window .bubble:not(.no-halo):not(.sticker):not(.voice):not(.video-note) {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
  border-color: #2a333e !important;
}
:global(html[data-theme="dark"]) .chat-window .bubble.me:not(.no-halo):not(.sticker):not(.voice):not(.video-note) {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
  border-color: #245c7c !important;
}
:global(html[data-theme="dark"]) .chat-window .bubble.no-halo,
:global(html[data-theme="dark"]) .chat-window .bubble.no-halo.me,
:global(html[data-theme="dark"]) .chat-window .bubble.sticker,
:global(html[data-theme="dark"]) .chat-window .bubble.voice,
:global(html[data-theme="dark"]) .chat-window .bubble.video-note {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.chat-search-toggle {
  width: 40px; height: 40px; flex: 0 0 40px; border: 0; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--text-primary, #334155); background: transparent; cursor: pointer;
  flex-shrink: 0;
}
.chat-search-toggle:hover { background: rgba(127, 140, 155, .12); }

/* Поиск встроен в header рядом с лупой */
.chat-search-inline {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  margin-right: 2px;
}
.chat-search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}
.chat-search-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 10px 36px 10px 14px;
  border: none;
  border-radius: 12px;
  outline: none;
  color: #0f172a;
  background: #f1f5f9;
  font: inherit;
  font-size: 15px;
  line-height: 1.3;
  -webkit-appearance: none;
  appearance: none;
}
.chat-search-input::-webkit-search-decoration,
.chat-search-input::-webkit-search-cancel-button,
.chat-search-input::-webkit-search-results-button,
.chat-search-input::-webkit-search-results-decoration {
  display: none;
  -webkit-appearance: none;
}
.chat-search-input:focus {
  box-shadow: 0 0 0 3px rgba(42, 171, 238, 0.2);
}
.chat-search-input::placeholder {
  color: #94a3b8;
}
.chat-search-clear {
  position: absolute;
  right: 6px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}
.chat-search-clear:hover { opacity: 1; background: rgba(127,140,155,.15); }

/* Панель результатов под header */
.chat-search-panel {
  padding: 6px 12px 10px;
  background: var(--panel-bg, #fff);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}
.chat-search-results {
  max-height: 260px;
  overflow-y: auto;
}
.chat-search-result {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 9px;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.chat-search-result:hover { background: rgba(127,140,155,.12); }
.chat-search-result-date { font-size: 11px; opacity: .65; }
.chat-search-result-text { font-size: 13px; line-height: 1.4; overflow-wrap: anywhere; }
.chat-search-empty,
.chat-search-hint {
  padding: 10px 5px 6px;
  text-align: center;
  font-size: 13px;
  opacity: .65;
}

/* Тёмная тема — без светлых артефактов */
:global(html[data-theme="dark"]) .chat-search-panel {
  background: #1a222c !important;
  border-color: #252d38 !important;
  color: #e5edf5 !important;
}
:global(html[data-theme="dark"]) .chat-search-input {
  background: #202f3d !important;
  border: none !important;
  color: #e6edf3 !important;
}
:global(html[data-theme="dark"]) .chat-search-input:focus {
  box-shadow: 0 0 0 3px rgba(42, 171, 238, 0.25) !important;
}
:global(html[data-theme="dark"]) .chat-search-input::placeholder {
  color: #8195a5 !important;
}
:global(html[data-theme="dark"]) .chat-search-toggle {
  color: #e5edf5 !important;
}
:global(html[data-theme="dark"]) .chat-search-clear {
  color: #c5d0dc !important;
}
:global(html[data-theme="dark"]) .chat-search-result {
  color: #e6edf3 !important;
}
:global(html[data-theme="dark"]) .chat-search-result:hover {
  background: rgba(255,255,255,.06) !important;
}
:global(html[data-theme="dark"]) .chat-search-result-date {
  color: #91a4b4 !important;
  opacity: 1;
}
:global(html[data-theme="dark"]) .chat-search-empty,
:global(html[data-theme="dark"]) .chat-search-hint {
  color: #91a4b4 !important;
}
</style>
