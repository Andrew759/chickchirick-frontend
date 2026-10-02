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
      <MessageBubble
        v-for="msg in chat.messages"
        :key="'msg-' + msg.id"
        :msg="msg"
        :queue="voiceQueue"
        @open-photo="openPhoto"
        @open-video="openVideo"
        @delete="handleDelete"
      />
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
import { useChatStore } from '../stores/chat'
import { sendMessage, sendTyping, requestDeleteMessage } from '../services/socket'
import { uploadFile, linkFileToMessage, getFileUrl } from '../services/files'
import { buildFileMessageText } from '../services/fileMarker'
import {
  canEncryptFor,
  encryptForPeer,
  prepareE2eeForPeer,
  getPeerPublicKey
} from '../services/crypto' 
import MessageInput from './MessageInput.vue'
import MessageBubble from './MessageBubble.vue'
import PhotoViewer from './PhotoViewer.vue'
import VideoViewer from './VideoViewer.vue'

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
const emit = defineEmits(['open-profile', 'back'])
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

async function handleSend(payload) {
  const caption = (payload?.text || '').trim()
  const file = payload?.file || null
  const recipientId = chat.value?.id
  if (!recipientId) return
  if (!caption && !file) return

  await ensureE2eeReady(recipientId)

  if (!file) {
    const text = await maybeEncrypt(recipientId, caption)
    sendMessage({ recipientId, text })
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
  const text = await maybeEncrypt(recipientId, plain)
  sendMessage({ recipientId, text })

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

// При открытии чата — инициируем обмен ключами, если ещё нет ключа собеседника
watch(
  () => chat.value?.id,
  (id) => {
    if (id) ensureE2eeReady(id)
  },
  { immediate: true }
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
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px 8px;
  padding-top: max(6px, env(safe-area-inset-top));
  background: rgba(248, 252, 255, .94);
  font-weight: 600;
  border-bottom: 1px solid rgba(42, 171, 238, .16);
  box-shadow: 0 2px 10px rgba(42, 171, 238, .06);
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
</style>
