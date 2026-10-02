<template>
  <div class="chat-window">
    <div class="header">
      <button type="button" class="chat-profile-trigger" @click="emit('open-profile', { id: chat.id, ...chatUser })">
        <span class="chat-profile-avatar">
          <img v-if="chatUser.avatarFileUuid" :src="getFileUrl(chatUser.avatarFileUuid)" alt="" />
          <span v-else>{{ (chat.name || '?').charAt(0).toUpperCase() }}</span>
        </span>
        <span class="chat-title">
          <span class="chat-name">{{ chat.name }}</span>
          <span v-if="isPeerTyping" class="typing-status">печатает...</span>
        </span>
      </button>
    </div>

    <div class="messages" ref="messagesEl">
      <div
        v-for="msg in chat.messages"
        :key="msg.id"
        :class="['bubble', msg.fromMe ? 'me' : '']"
      >
        <div class="bubble-row">
          <div class="content">
            <!-- вложение -->
            <div v-if="msg.fileUuid" class="attachment">
              <button
                v-if="msg.isImage"
                type="button"
                class="img-link"
                @click.stop="openPhoto(msg)"
              >
                <img
                  :src="fileUrl(msg.fileUuid)"
                  :alt="msg.fileName || 'image'"
                  class="msg-image"
                  loading="lazy"
                />
              </button>
              <VideoNotePlayer
                v-else-if="msg.isVideoNote"
                :src="fileUrl(msg.fileUuid)"
                @click.stop
              />
              <button
                v-else-if="msg.isVideo"
                type="button"
                class="video-link"
                @click.stop="openVideo(msg)"
              >
                <video
                  :src="fileUrl(msg.fileUuid)"
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
                :src="fileUrl(msg.fileUuid)"
                :from-me="msg.fromMe"
                :queue="voiceQueue"
              />
              <AudioPlayer
                v-else-if="msg.isAudio"
                :src="fileUrl(msg.fileUuid)"
                :file-name="msg.fileName || 'audio'"
                :from-me="msg.fromMe"
              />
              <a
                v-else
                :href="fileUrl(msg.fileUuid)"
                :download="msg.fileName || 'file'"
                target="_blank"
                rel="noopener"
                class="file-link"
              >
                📄 {{ msg.fileName || 'Файл' }}
              </a>
            </div>
            <div v-if="msg.text" class="text">{{ msg.text }}</div>
          </div>
          <button
            v-if="msg.fromMe"
            type="button"
            class="btn-delete"
            title="Удалить сообщение"
            @click.stop="handleDelete(msg)"
          >
            ×
          </button>
        </div>
        <div class="time">{{ formatMessageTime(msg.createdAt) || '·' }}</div>
      </div>
    </div>

    <MessageInput @send="handleSend" @typing="handleTyping" />

    <PhotoViewer
      :open="viewerOpen"
      :items="viewerItems"
      :start-index="viewerIndex"
      @close="viewerOpen = false"
    />

    <VideoViewer
      :open="videoViewerOpen"
      :items="videoViewerItems"
      :start-index="videoViewerIndex"
      @close="videoViewerOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useChatStore, formatMessageTime } from '../stores/chat'
import { sendMessage, sendTyping, requestDeleteMessage } from '../services/socket'
import { uploadFile, linkFileToMessage, getFileUrl } from '../services/files'
import { buildFileMessageText } from '../services/fileMarker'
import MessageInput from './MessageInput.vue'
import PhotoViewer from './PhotoViewer.vue'
import VideoViewer from './VideoViewer.vue'
import AudioPlayer from './AudioPlayer.vue'
import VoiceMessagePlayer from './VoiceMessagePlayer.vue'
import VideoNotePlayer from './VideoNotePlayer.vue'

const store = useChatStore()
const chat = computed(() => store.activeChat)
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
const isPeerTyping = computed(() => Boolean(chat.value?.id && store.typingByChatId[chat.value.id]))
const emit = defineEmits(['open-profile'])
const messagesEl = ref(null)

const viewerOpen = ref(false)
const viewerIndex = ref(0)
const videoViewerOpen = ref(false)
const videoViewerIndex = ref(0)

const viewerItems = computed(() => {
  const msgs = chat.value?.messages || []
  return msgs
    .filter((m) => m.isImage && m.fileUuid)
    .map((m) => ({
      src: getFileUrl(m.fileUuid),
      alt: m.fileName || 'image',
      caption: m.text || '',
      fileName: m.fileName || 'photo.jpg'
    }))
})

function fileUrl(uuid) {
  return getFileUrl(uuid)
}

function openPhoto(msg) {
  if (!msg?.fileUuid || !msg.isImage) return
  const idx = viewerItems.value.findIndex((it) => it.src === getFileUrl(msg.fileUuid))
  viewerIndex.value = idx >= 0 ? idx : 0
  viewerOpen.value = true
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
  sendTyping(recipientId, active)
}

async function handleSend(payload) {
  const caption = (payload?.text || '').trim()
  const file = payload?.file || null
  const recipientId = chat.value?.id
  if (!recipientId) return
  if (!caption && !file) return

  if (!file) {
    sendMessage({ recipientId, text: caption })
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

  // 2) текст с маркером → WS (история/realtime без правок proto)
  const text = buildFileMessageText(fileUuid, file.name, caption)
  sendMessage({ recipientId, text })

  // 3) после появления сообщения в store — привязка file_uuid в messages
  // (оптимистично: слушаем ближайшее своё сообщение с этим маркером)
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

watch(
  () => chat.value?.messages?.length,
  async () => {
    await nextTick()
    if (messagesEl.value) {
      // Новые сообщения внизу — прокручиваем к концу списка
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  }
)
</script>

<style>
 .chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 50% 0%, rgba(125, 211, 252, .16), transparent 38%),
    #eef8ff;
  min-width: 0;
}

.header {
  padding: 6px 12px 8px;
  background: rgba(248, 252, 255, .94);
  font-weight: 600;
  border-bottom: 1px solid rgba(42, 171, 238, .16);
  box-shadow: 0 2px 10px rgba(42, 171, 238, .06);
  backdrop-filter: blur(12px);
}


.chat-profile-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 2px 4px;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 9px;
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



.messages {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px 88px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  background-image:
    linear-gradient(rgba(42, 171, 238, .025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(42, 171, 238, .025) 1px, transparent 1px);
  background-size: 28px 28px;
}


.bubble {
  position: relative;
  max-width: 70%;
  align-self: flex-start;
  background: rgba(255, 255, 255, .94);
  border: 1px solid rgba(42, 171, 238, .08);
  border-radius: 10px 10px 10px 3px;
  padding: 6px 10px 4px;
  box-shadow: 0 2px 8px rgba(30, 90, 120, .06);
}

.bubble.me {
  align-self: flex-end;
  background: linear-gradient(135deg, #e5f7ff, #d7f1ff);
  border-color: rgba(42, 171, 238, .18);
  border-radius: 10px 10px 3px 10px;
  box-shadow: 0 2px 10px rgba(42, 171, 238, .09);
}

.bubble.me::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 3px;
  width: 2px;
  height: 2px;
  border-radius: 2px;
  background: #2aabee;
  box-shadow:
    4px 0 0 #38bdf8,
    8px 0 0 #7dd3fc;
  opacity: .55;
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

</style>
