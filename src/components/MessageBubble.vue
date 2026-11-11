<template>
  <div
    :class="[
      'msg-wrap',
      msg.fromMe ? 'me' : 'peer',
      isGroup ? 'group' : 'direct',
      showSenderMeta ? 'with-sender' : '',
      isContinuation ? 'continuation' : ''
    ]"
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
        noHalo ? 'no-halo' : ''
      ]"
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
      <div class="time">{{ timeLabel }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatMessageTime, useChatStore } from '../stores/chat'
import { getFileUrl } from '../services/files'
import AudioPlayer from './AudioPlayer.vue'
import VoiceMessagePlayer from './VoiceMessagePlayer.vue'
import VideoNotePlayer from './VideoNotePlayer.vue'

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
  prevMsg: { type: Object, default: null }
})

const emit = defineEmits(['open-photo', 'open-video', 'open-sticker', 'delete', 'open-sender'])

const store = useChatStore()

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

const showText = computed(() => {
  if (isSticker.value) return false
  const t = props.msg.text
  return !!(t && String(t).trim())
})

const displayText = computed(() => {
  const t = typeof props.msg.text === 'string' ? props.msg.text : ''
  if (/^e2ee:v\d+:/i.test(t.trim()) || t.startsWith('🔒e2ee:')) {
    return 'Зашифрованное сообщение'
  }
  return t
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
</style>
