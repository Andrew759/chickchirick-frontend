<template>
  <div
    :class="[
      'msg-wrap',
      msg.fromMe ? 'me' : 'peer',
      isGroup ? 'group' : 'direct',
      showSenderMeta ? 'with-sender' : '',
      msg.isVideoNote && showSenderMeta ? 'video-note-with-sender' : '',
      isContinuation ? 'continuation' : '',
      menuOpen ? 'menu-open' : ''
    ]"
    :data-msg-menu-open="menuOpen ? '1' : undefined"
  >
    <!-- Аватар слева (только входящие в группе) -->
    <div v-if="isGroup && !msg.fromMe" class="sender-avatar-col">
      <button
        v-if="showSenderMeta"
        type="button"
        class="sender-avatar"
        :style="{ background: senderColor }"
        :title="senderName"
        @click.stop="$emit('open-sender', msg.senderId)"
      >
        <img v-if="senderAvatarUrl" :src="senderAvatarUrl" alt="" />
        <span v-else>{{ senderLetter }}</span>
      </button>
      <span v-else class="sender-avatar-spacer" aria-hidden="true" />
    </div>

    <div
      :class="[
        'bubble',
        msg.fromMe ? 'me' : '',
        isSticker ? 'sticker' : '',
        msg.isVoiceMessage ? 'voice' : '',
        msg.isVideoNote ? 'video-note' : '',
        noHalo ? 'no-halo' : '',
        menuOpen ? 'menu-open' : '',
        canReply ? 'can-reply' : ''
      ]"
      @click="onBubbleClick"
    >
      <!-- Имя отправителя над пузырём (Telegram-style) -->
      <div
        v-if="showSenderMeta"
        class="sender-name"
        :style="{ color: senderColor }"
        @click.stop="$emit('open-sender', msg.senderId)"
      >
        {{ senderName }}
      </div>

      <div class="bubble-row">
        <div class="content">
          <div v-if="isPinned" class="msg-pinned-label">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m16 3 5 5-4 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z" />
            </svg>
            <span>Закреплено</span>
          </div>
          <button
            v-if="replyPreview"
            type="button"
            class="reply-quote"
            @click.stop="$emit('scroll-to', replyPreview.id)"
          >
            <span class="reply-quote-bar" aria-hidden="true" />
            <span class="reply-quote-body">
              <span class="reply-quote-name">{{ replyPreview.name }}</span>
              <span class="reply-quote-text">{{ replyPreview.snippet }}</span>
            </span>
          </button>
          <button
            v-if="forwardMeta"
            type="button"
            class="forward-label"
            :class="{ 'forward-label-channel': forwardMeta.type === 'channel' }"
            @click.stop="openForwardAuthor"
            :title="forwardMeta.type === 'channel' ? 'Открыть канал' : 'Открыть профиль'"
          >
            <span class="forward-label-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l7 7-7 7"/><path d="M21 12H9a6 6 0 0 0-6 6"/></svg>
            </span>
            <span class="forward-label-content">
              <span class="forward-label-title">Переслано от</span>
              <span class="forward-label-source">
                <span v-if="forwardMeta.avatarUrl" class="forward-label-avatar"><img :src="forwardMeta.avatarUrl" alt="" /></span>
                <span v-else class="forward-label-avatar" :class="{ channel: forwardMeta.type === 'channel' }">{{ forwardMeta.letter }}</span>
                <span class="forward-label-name">{{ forwardMeta.name }}</span>
                <svg v-if="forwardMeta.type === 'channel'" class="forward-channel-mark" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M8 1.2 9.8 3l2.5-.1.6 2.4 2.1 1.3-1 2.3.8 2.4-2.3 1-1 2.3-2.4-.8-2.3 1-1.3-2.1-2.4-.6.1-2.5L1.4 8l1.8-1.8-.1-2.5 2.4-.6 1.3-2.1z" fill="currentColor"/><path d="m5 8 2 2 4-4" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </span>
          </button>
          <div v-if="msg.fileUuid" class="attachment">
            <button
              v-if="isSticker"
              type="button"
              class="img-link sticker-link"
              @click.stop="onStickerClick"
            >
              <img
                :src="fileUrl"
                :alt="msg.fileName || 'sticker'"
                class="msg-sticker"
                loading="lazy"
                draggable="false"
              />
            </button>
            <button
              v-else-if="msg.isImage"
              type="button"
              class="img-link"
              @click.stop="$emit('open-photo', msg)"
            >
              <img
                :src="fileUrl"
                :alt="msg.fileName || 'image'"
                class="msg-image"
                loading="lazy"
              />
            </button>
            <VideoNotePlayer
              v-else-if="msg.isVideoNote"
              :src="fileUrl"
              @click.stop
            />
            <button
              v-else-if="msg.isVideo"
              type="button"
              class="video-link"
              @click.stop="$emit('open-video', msg)"
            >
              <video
                :src="fileUrl"
                class="msg-video-preview"
                muted
                preload="metadata"
                playsinline
              />
              <span class="video-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
            <VoiceMessagePlayer
              v-else-if="msg.isVoiceMessage"
              :src="fileUrl"
              :from-me="msg.fromMe"
              :queue="queue"
            />
            <AudioPlayer
              v-else-if="msg.isAudio"
              :src="fileUrl"
              :file-name="msg.fileName || 'audio'"
              :from-me="msg.fromMe"
            />
            <a
              v-else
              :href="fileUrl"
              :download="msg.fileName || 'file'"
              target="_blank"
              rel="noopener"
              class="file-link"
            >
              📄 {{ msg.fileName || 'Файл' }}
            </a>
          </div>
          <div v-if="showText" class="text">{{ displayText }}</div>
        </div>
        <button
          v-if="msg.fromMe"
          type="button"
          class="btn-delete"
          title="Удалить сообщение"
          @click.stop="$emit('delete', msg)"
        >
          ×
        </button>
      </div>
      <div v-if="reactionChips.length" class="msg-reactions" @click.stop>
        <button
          v-for="r in reactionChips"
          :key="r.emoji"
          type="button"
          class="msg-reaction-chip"
          :class="{ me: r.me }"
          :title="r.emoji"
          @click.stop="$emit('react', msg, r.emoji)"
        >
          <span class="msg-reaction-emoji">{{ r.emoji }}</span>
          <span v-if="r.count > 1" class="msg-reaction-count">{{ r.count }}</span>
        </button>
      </div>
      <div class="time">{{ timeLabel }}<span v-if="msg.edited" class="edited-label"> · изменено</span></div>

      <!-- Мини-меню: реакции + ответ -->
      <div
        v-if="menuOpen"
        class="msg-action-pop"
        @click.stop
      >
        <div class="msg-action-panel">
          <button
            type="button"
            class="msg-action-reply-round"
            title="Реакция"
            @click.stop="openEmojiModal"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 14.2s1.2 1.8 3.5 1.8 3.5-1.8 3.5-1.8" />
              <path d="M9 9.5h.01M15 9.5h.01" />
            </svg>
          </button>
          <button v-if="msg.fromMe && showText" type="button" class="msg-action-reply-round"
            title="Редактировать" @click.stop="startEdit">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>
            </svg>
          </button>
          <button
            type="button"
            class="msg-action-reply-round"
            :title="isPinned ? 'Открепить' : 'Закрепить'"
            @click.stop="togglePin"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m16 3 5 5-4 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z" />
            </svg>
          </button>
          <button
            type="button"
            class="msg-action-reply-round"
            title="Поделиться"
            @click.stop="onShareClick"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
            </svg>
          </button>
          <button
            v-if="canReply"
            type="button"
            class="msg-action-reply-round"
            title="Ответить"
            @click.stop="confirmReply"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"
              />
            </svg>
          </button>
        </div>
      </div>

      <EmojiPickerModal
        :open="emojiModalOpen"
        @close="emojiModalOpen = false"
        @select="onPickReaction"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { formatMessageTime, useChatStore } from '../stores/chat'
import { getFileUrl } from '../services/files'
import { parseForwardMessageText } from '../services/fileMarker'
import AudioPlayer from './AudioPlayer.vue'
import VoiceMessagePlayer from './VoiceMessagePlayer.vue'
import VideoNotePlayer from './VideoNotePlayer.vue'
import EmojiPickerModal from './EmojiPickerModal.vue'

/** Палитра как в Telegram — стабильный цвет по id */
const SENDER_COLORS = [
  '#e17076', '#faa774', '#a695e7', '#7bc862',
  '#6ec9cb', '#65aadd', '#ee7aae', '#eeb620'
]

const props = defineProps({
  msg: { type: Object, required: true },
  queue: { type: Array, default: () => [] },
  /** Групповой чат — показывать аватар и имя */
  isGroup: { type: Boolean, default: false },
  /** Предыдущее сообщение в ленте (для склейки от одного автора) */
  prevMsg: { type: Object, default: null },
  /** Сообщения текущего чата — для превью ответа */
  chatMessages: { type: Array, default: () => [] },
  /** Можно ли отвечать (false для подписчиков канала) */
  canReply: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false }
})

const emit = defineEmits(['open-photo', 'open-video', 'open-sticker', 'delete', 'open-sender', 'reply', 'scroll-to', 'react', 'pin', 'edit-request', 'share'])

const store = useChatStore()
const menuOpen = ref(false)
const emojiModalOpen = ref(false)

const reactionChips = computed(() => {
  const list = props.msg?.reactions
  return Array.isArray(list) ? list : []
})

function openEmojiModal() {
  menuOpen.value = false
  emojiModalOpen.value = true
}

function onPickReaction(emoji) {
  emojiModalOpen.value = false
  menuOpen.value = false
  emit('react', props.msg, emoji)
}

function onShareClick() {
  menuOpen.value = false
  emit('share', props.msg)
}


function onBubbleClick(e) {
  // не перехватываем клики по вложенным интерактивам (медиа, ссылки, цитата, удаление)
  const t = e.target
  if (t && t.closest && t.closest('button, a, input, textarea, video, audio, .file-link, .reply-quote, .forward-label, .btn-delete')) {
    return
  }
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

function startEdit() {
  menuOpen.value = false
  emit('edit-request', props.msg)
}
function togglePin() {
  menuOpen.value = false
  emit('pin', props.msg)
}

function confirmReply() {
  menuOpen.value = false
  emit('reply', props.msg)
}

function onDocPointer(e) {
  if (!menuOpen.value) return
  const root = e.target?.closest?.('.msg-wrap')
  // закрываем, если клик вне этого сообщения
  // (у каждого пузыря свой listener — закрываем только свой)
  if (!root || !root.contains?.(e.target) || !e.currentTarget) {
    // handled below via capture on document with root ref alternative
  }
}

function onDocClick(e) {
  if (!menuOpen.value) return
  const wrap = e.target?.closest?.('[data-msg-menu-open="1"]')
  if (!wrap) menuOpen.value = false
}

function bindDocClose() {
  document.addEventListener('click', onDocClick, true)
}
function unbindDocClose() {
  document.removeEventListener('click', onDocClick, true)
}

watch(menuOpen, (open) => {
  unbindDocClose()
  if (open) bindDocClose()
})

onBeforeUnmount(() => {
  unbindDocClose()
})

function messageSnippet(m) {
  if (!m) return 'Сообщение'
  if (m.isSticker) return m.text?.trim() || 'Стикер'
  if (m.isVoiceMessage) return 'Голосовое сообщение'
  if (m.isVideoNote) return 'Видеосообщение'
  if (m.isImage) return 'Фото'
  if (m.isVideo) return 'Видео'
  if (m.isAudio) return 'Аудио'
  if (m.fileUuid && !m.text) return m.fileName || 'Файл'
  const t = (m.text || '').trim()
  if (!t) return 'Сообщение'
  return t.length > 120 ? t.slice(0, 117) + '…' : t
}

function senderLabel(m) {
  if (!m) return ''
  if (m.fromMe) return 'Вы'
  const u = store.usersById[Number(m.senderId)]
  if (u) {
    const n = [u.name, u.surname].filter(Boolean).join(' ').trim()
    if (n) return n
    if (u.login) return u.login
  }
  return m.senderId ? `User ${m.senderId}` : 'Сообщение'
}

const forwardMeta = computed(() => {
  const msg = props.msg || {}
  // Защитный разбор: некоторые групповые WS-события приходят без нормализованных полей.
  const parsed = parseForwardMessageText(msg.text || '')
  const channelId = msg.forwardedFromChannelId || msg.forwarded_from_channel_id || parsed.forwardedFromChannelId || null
  if (channelId) {
    const channel = store.chats.find((c) => c.type === 'channel' && String(c.channelId) === String(channelId))
    const name = (msg.forwardedFromChannelName || msg.forwarded_from_channel_name || parsed.forwardedFromChannelName || channel?.name || 'Канал').trim()
    const avatarUuid = channel?.avatarFileUuid || channel?.avatar_file_uuid
    return { type: 'channel', id: channelId, name, letter: name.charAt(0).toUpperCase() || 'К', avatarUrl: avatarUuid ? getFileUrl(avatarUuid) : '' }
  }
  const id = Number(msg.forwardedFromSenderId || msg.forwarded_from_sender_id || parsed.forwardedFromSenderId || 0)
  const storedName = (msg.forwardedFromName || msg.forwarded_from_name || parsed.forwardedFromName || '').trim()
  if (!id && !storedName) return null
  const u = id ? store.usersById[id] : null
  let name = storedName
  if (u) {
    const full = `${u.name || ''} ${u.surname || ''}`.trim()
    if (full) name = full
    else if (u.login) name = u.login
  }
  if (!name) name = id ? `User ${id}` : 'Пользователь'
  const avatarUuid = u?.avatarFileUuid || u?.avatar_file_uuid || u?.photoFileUuid || u?.photo_file_uuid
  return { type: 'user', id: id || null, name, letter: name.charAt(0).toUpperCase() || 'П', avatarUrl: avatarUuid ? getFileUrl(avatarUuid) : '' }
})

function openForwardAuthor() {
  const meta = forwardMeta.value
  if (!meta?.id) return
  if (meta.type === 'channel') {
    const channel = store.chats.find((c) => c.type === 'channel' && String(c.channelId) === String(meta.id))
    if (channel) store.openChannelChat(channel)
    return
  }
  emit('open-sender', meta.id)
}

const replyPreview = computed(() => {
  const rid = props.msg?.respondMessageId ?? props.msg?.respond_message_id
  if (rid == null || rid === '') return null
  const idNum = Number(rid)
  const list = props.chatMessages || []
  const found = list.find((m) => Number(m.id) === idNum || String(m.id) === String(rid))
  return {
    id: found?.id ?? rid,
    name: senderLabel(found) || 'Сообщение',
    snippet: messageSnippet(found)
  }
})

const fileUrl = computed(() => getFileUrl(props.msg.fileUuid))
const timeLabel = computed(() => formatMessageTime(props.msg.createdAt) || '·')

const senderId = computed(() => Number(props.msg.senderId) || 0)

const senderUser = computed(() => {
  if (!senderId.value) return null
  return store.usersById[senderId.value] || null
})

function displayName(user) {
  if (!user || typeof user !== 'object') return null
  const name = (user.name || user.firstName || user.first_name || '').trim()
  const surname = (user.surname || user.lastName || user.last_name || '').trim()
  const full = `${name} ${surname}`.trim()
  if (full) return full
  if (user.login) return `@${user.login}`
  return null
}

const senderName = computed(() => {
  return displayName(senderUser.value) || (senderId.value ? `User ${senderId.value}` : 'Участник')
})

const senderLetter = computed(() => {
  const n = (senderName.value || '?').trim()
  return (n[0] || '?').toUpperCase()
})

const senderAvatarUrl = computed(() => {
  const uuid = senderUser.value?.avatarFileUuid
  return uuid ? getFileUrl(uuid) : ''
})

const senderColor = computed(() => {
  const id = senderId.value || 0
  return SENDER_COLORS[Math.abs(id) % SENDER_COLORS.length]
})

/** Скрыть имя/аватар, если предыдущее сообщение от того же автора (цепочка) */
const isContinuation = computed(() => {
  if (!props.isGroup || props.msg.fromMe) return false
  const prev = props.prevMsg
  if (!prev || prev.fromMe) return false
  return Number(prev.senderId) === senderId.value
})

const showSenderMeta = computed(() => {
  return props.isGroup && !props.msg.fromMe && !isContinuation.value
})

const isSticker = computed(() => {
  if (!props.msg.fileUuid) return false
  const name = props.msg.fileName || ''
  return /^sticker-/i.test(name) || props.msg.isSticker === true
})

const noHalo = computed(() => {
  if (!props.msg.fileUuid) return false
  if (isSticker.value) return true
  if (props.msg.isVoiceMessage || props.msg.isVideoNote) return true
  if (props.msg.isImage || props.msg.isVideo || props.msg.isAudio) return true
  return true
})

function onStickerClick() {
  emit('open-sticker', props.msg)
  emit('open-photo', props.msg)
}

const displayText = computed(() => {
  const t = typeof props.msg.text === 'string' ? props.msg.text : ''
  if (/^e2ee:v\d+:/i.test(t.trim()) || t.startsWith('🔒e2ee:')) {
    return 'Зашифрованное сообщение'
  }
  // Никогда не показываем служебный маркер пересылки как текст сообщения.
  return parseForwardMessageText(t).body
})

const showText = computed(() => {
  if (isSticker.value) return false
  return !!String(displayText.value || '').trim()
})
</script>

<style scoped>
.msg-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  max-width: 100%;
}

.msg-wrap.me {
  flex-direction: row-reverse;
}

.msg-wrap.continuation {
  margin-top: -4px;
}

.msg-wrap.with-sender {
  margin-top: 10px;
}

/* Для круглых видеосообщений аватар и имя автора стоят в одной верхней строке. */
.msg-wrap.video-note-with-sender {
  align-items: flex-start;
}

.msg-wrap.video-note-with-sender .sender-avatar-col {
  align-items: flex-start;
  padding-bottom: 0;
}

.sender-avatar-col {
  width: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  padding-bottom: 2px;
}

.sender-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.sender-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sender-avatar-spacer {
  width: 36px;
  height: 36px;
}

.sender-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 3px;
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sender-name:hover {
  text-decoration: underline;
}

.bubble {
  position: relative;
  max-width: min(70%, 420px);
  padding: 8px 12px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  word-break: break-word;
  min-width: 0;
}

.msg-wrap.peer .bubble {
  border-top-left-radius: 6px;
}

.msg-wrap.peer.continuation .bubble {
  border-top-left-radius: 14px;
}

.msg-wrap.me .bubble {
  border-top-right-radius: 6px;
}

.bubble.me {
  background: linear-gradient(135deg, #dff6ff, #c9efff);
}

.bubble.no-halo,
.bubble.no-halo.me,
.bubble.sticker,
.bubble.voice,
.bubble.video-note {
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
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.bubble.no-halo .msg-image,
.bubble.no-halo .msg-video-preview {
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
}

.msg-sticker {
  width: 160px;
  height: 160px;
  object-fit: contain;
  display: block;
  border-radius: 0;
  background: transparent;
}

.sticker-link {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: block;
  line-height: 0;
}

.bubble-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.content {
  min-width: 0;
  flex: 1;
  background: transparent;
}

.text {
  font-size: 14.5px;
  line-height: 1.35;
  color: #163247;
  white-space: pre-wrap;
}

.time {
  font-size: 11px;
  color: #6d8796;
  text-align: right;
  margin-top: 2px;
}

.forward-label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  margin: 0 0 7px;
  padding: 7px 10px;
  border: 1px solid rgba(42, 171, 238, .16);
  border-radius: 11px;
  background: linear-gradient(110deg, rgba(42, 171, 238, .105), rgba(42, 171, 238, .035));
  color: #168dcc;
  text-align: left;
  cursor: pointer;
  transition: background .16s ease, border-color .16s ease, transform .16s ease;
}
.forward-label:hover {
  background: rgba(42, 171, 238, .15);
  border-color: rgba(42, 171, 238, .32);
}
.forward-label:active { transform: scale(.99); }
.forward-label-icon { display: grid; place-items: center; flex: 0 0 18px; opacity: .9; }
.forward-label-content { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.forward-label-title { font-size: 10px; line-height: 1.1; font-weight: 600; letter-spacing: .025em; color: #5b9fc5; }
.forward-label-source { display: flex; align-items: center; gap: 6px; min-width: 0; }
.forward-label-avatar { width: 20px; height: 20px; flex: 0 0 20px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; background: #d7effb; color: #168dcc; font-size: 10px; font-weight: 700; }
.forward-label-avatar img { width: 100%; height: 100%; object-fit: cover; }
.forward-label-avatar.channel { background: #168dcc; color: white; }
.forward-label-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; line-height: 1.2; font-weight: 700; color: #168dcc; }
.forward-channel-mark { flex: 0 0 auto; color: #168dcc; }

.reply-quote {
  display: flex;
  gap: 8px;
  align-items: stretch;
  width: 100%;
  margin: 0 0 6px;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: rgba(22, 141, 204, 0.1);
  cursor: pointer;
  text-align: left;
}
.reply-quote-bar {
  width: 3px;
  border-radius: 2px;
  background: #2aabee;
  flex-shrink: 0;
}
.reply-quote-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.reply-quote-name {
  font-size: 12px;
  font-weight: 600;
  color: #168dcc;
}
.reply-quote-text {
  font-size: 12.5px;
  color: #5a7383;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-delete {
  opacity: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #8aa1ae;
  font-size: 15px;
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

.msg-wrap {
  position: relative;
}
.bubble.can-reply {
  cursor: pointer;
}
.bubble.menu-open {
  outline: 2px solid rgba(42, 171, 238, 0.35);
  outline-offset: 2px;
}
/* Меню у нижнего края пузыря, к центру ленты (не за край окна). */
.msg-action-pop {
  position: absolute;
  bottom: 2px;
  top: auto;
  transform: none;
  z-index: 6;
  display: flex;
  align-items: center;
  pointer-events: auto;
}
.msg-wrap.peer .msg-action-pop {
  left: calc(100% + 8px);
  right: auto;
}
.msg-wrap.me .msg-action-pop {
  right: calc(100% + 8px);
  left: auto;
}
.msg-action-pop .msg-action-reply-round {
  animation: msg-pop-in 0.14s ease-out;
}

.msg-action-reply-round {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  padding: 0;
  display: grid;
  place-items: center;
  background: transparent;
  color: #8495a3;
  box-shadow: none;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease, color 0.12s ease;
}
.msg-action-reply-round:hover {
  background: rgba(120, 140, 155, 0.14);
  color: #d5e0e8;
  transform: scale(1.06);
}
.msg-action-reply-round:active {
  transform: scale(0.96);
}
@keyframes msg-pop-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.msg-image {
  max-width: min(100%, 320px);
  border-radius: 10px;
  display: block;
}

.img-link,
.video-link {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: block;
}

.msg-video-preview {
  max-width: min(100%, 320px);
  border-radius: 10px;
  display: block;
}

.video-link {
  position: relative;
}

.video-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
}

.file-link {
  color: #168dcc;
  text-decoration: none;
  font-size: 14px;
  word-break: break-all;
}

.file-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .bubble {
    max-width: min(88%, 360px);
  }
  .msg-image,
  .msg-video-preview {
    max-width: min(100%, 280px);
  }
  .bubble.me .btn-delete {
    opacity: 0.55;
  }
  .msg-action-reply-round {
    width: 44px;
    height: 44px;
  }
  .sender-avatar,
  .sender-avatar-spacer {
    width: 32px;
    height: 32px;
  }
  .sender-avatar-col {
    width: 32px;
  }
}

/* Dark theme */
:global(html[data-theme="dark"]) .msg-action-reply-round {
  background: transparent;
  color: #aab8c4;
  box-shadow: none;
}
:global(html[data-theme="dark"]) .msg-action-reply-round:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #eef4f8;
}
:global(html[data-theme="dark"]) .reply-quote {
  background: rgba(42, 171, 238, 0.12);
}
:global(html[data-theme="dark"]) .reply-quote-text {
  color: #9db0be;
}
:global(html[data-theme="dark"]) .text {
  color: #e6edf3;
}

:global(html[data-theme="dark"]) .time {
  color: #91a4b4;
}

:global(html[data-theme="dark"]) .bubble:not(.me):not(.no-halo) {
  background: #20313f !important;
}

:global(html[data-theme="dark"]) .bubble.me:not(.no-halo) {
  background: #174968 !important;
}

.msg-pinned-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 6px;
  color: #368db8;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 600;
}
:global(html[data-theme="dark"]) .msg-pinned-label {
  color: #75cafa;
}
.msg-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
  max-width: 100%;
}
.msg-reaction-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid rgba(42, 171, 238, 0.25);
  background: rgba(42, 171, 238, 0.08);
  border-radius: 12px;
  padding: 2px 7px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.2;
  color: #163247;
}
.msg-reaction-chip.me {
  border-color: rgba(42, 171, 238, 0.55);
  background: rgba(42, 171, 238, 0.18);
}
.msg-reaction-chip:hover {
  background: rgba(42, 171, 238, 0.2);
}
.msg-reaction-count {
  font-size: 11px;
  font-weight: 600;
  color: #5a7383;
}
.msg-action-panel {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.msg-action-emojis {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-width: 220px;
  padding: 6px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.16);
}
.msg-action-emoji {
  border: none;
  background: transparent;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  display: grid;
  place-items: center;
}
.msg-action-emoji:hover {
  background: rgba(42, 171, 238, 0.12);
}
:global(html[data-theme="dark"]) .msg-reaction-chip {
  background: rgba(42, 171, 238, 0.12);
  border-color: rgba(42, 171, 238, 0.3);
  color: #e6edf3;
}
:global(html[data-theme="dark"]) .msg-reaction-count {
  color: #9db0be;
}
:global(html[data-theme="dark"]) .msg-action-emojis {
  background: #243746;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
}


.edited-label { opacity: .72; font-size: 11px; }

:global(html[data-theme="dark"]) .forward-label {
  background: linear-gradient(110deg, rgba(42, 171, 238, .17), rgba(42, 171, 238, .07));
  border-color: rgba(90, 177, 225, .22);
  color: #73c9f3;
}
:global(html[data-theme="dark"]) .forward-label:hover { background: rgba(42, 171, 238, .23); border-color: rgba(90, 177, 225, .4); }
:global(html[data-theme="dark"]) .forward-label-title { color: #83b9d4; }
:global(html[data-theme="dark"]) .forward-label-name,
:global(html[data-theme="dark"]) .forward-channel-mark { color: #78cafa; }
:global(html[data-theme="dark"]) .forward-label-avatar { background: #244b61; color: #9cddfa; }
:global(html[data-theme="dark"]) .forward-label-avatar.channel { background: #167db5; color: #fff; }
</style>
