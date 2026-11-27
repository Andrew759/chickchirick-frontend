<template>
  <div class="input-wrap" style="position: relative">
    <StickerPicker :open="stickerPickerOpen" @close="stickerPickerOpen = false" @select="onStickerSelect" />
    <div v-if="editMessage" class="edit-bar">
      <div class="edit-bar-main">
        <span class="edit-bar-label">Редактирование сообщения</span>
      </div>
      <button type="button" class="btn-clear" title="Отменить редактирование" @click="cancelEdit">×</button>
    </div>
    <div v-if="!editMessage && replyTo" class="reply-bar">
      <div class="reply-bar-main">
        <span class="reply-bar-label">Ответ</span>
        <span class="reply-bar-name">{{ replyName }}</span>
        <span class="reply-bar-text">{{ replySnippet }}</span>
      </div>
      <button type="button" class="btn-clear" title="Отменить ответ" @click="clearReply">×</button>
    </div>
    <div v-if="pendingFile" class="pending">
      <span class="pending-name" :title="pendingFile.name">
        {{ pendingIcon }} {{ pendingFile.name }}
      </span>
      <button type="button" class="btn-clear" title="Убрать файл" @click="clearFile">×</button>
    </div>
    <div class="input">
      <input ref="fileInput" type="file" class="file-hidden" @change="onFileChange" />
      <button type="button" class="btn-video-note" title="Видеосообщение" @click="videoNoteOpen = true">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
          <path fill="currentColor" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h6A2.5 2.5 0 0 1 15 7.5v.2l3.2-1.9A1.2 1.2 0 0 1 20 6.8v10.4a1.2 1.2 0 0 1-1.8 1L15 16.3v.2a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 4 16.5v-9Z"/>
        </svg>
      </button>
      <button type="button" class="btn-sticker" title="Стикеры" @click="stickerPickerOpen = !stickerPickerOpen">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-3.2 8.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm6.4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4ZM12 18c-2.4 0-4.4-1.4-5.2-3.4h10.4C16.4 16.6 14.4 18 12 18Z"/>
        </svg>
      </button>
      <button type="button" class="btn-attach" title="Прикрепить файл" @click="fileInput?.click()">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.5 6.75v7.88a4.38 4.38 0 0 1-8.75 0V6.1a2.88 2.88 0 0 1 5.75 0v7.78a1.38 1.38 0 0 1-2.75 0V7.25h1.5v6.63a.88.88 0 0 0 1.75 0V6.1a4.38 4.38 0 1 0-8.75 0v8.53a5.88 5.88 0 0 0 11.75 0V6.75h-1.5Z"
          />
        </svg>
      </button>
      <textarea
        ref="textArea"
        v-model="text"
        rows="1"
        class="msg-textarea"
        placeholder="Сообщение"
        @input="onTextInput"
        @blur="stopTyping"
        @keydown="onKeydown"
      />
      <button
        v-if="!editMessage && !text.trim() && !pendingFile"
        type="button"
        class="btn-voice"
        title="Голосовое сообщение"
        @click="voiceRecorderOpen = true"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H8v2h8v-2h-3v-3.08A7 7 0 0 0 19 11h-2Z"/>
        </svg>
      </button>
      <button v-else type="button" @click="send" :disabled="sending" :title="editMessage ? 'Сохранить изменения' : 'Отправить сообщение'">{{ editMessage ? '✓' : '➤' }}</button>
    </div>

    <VideoNoteRecorder
      :open="videoNoteOpen"
      @close="videoNoteOpen = false"
      @recorded="onVideoNoteRecorded"
    />

    <VoiceRecorder
      :open="voiceRecorderOpen"
      @close="voiceRecorderOpen = false"
      @recorded="onVoiceRecorded"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import VideoNoteRecorder from './VideoNoteRecorder.vue'
import VoiceRecorder from './VoiceRecorder.vue'
import StickerPicker from './StickerPicker.vue'
import { isAudioFilename, isImageFilename, isVideoFilename } from '../services/files'

const text = ref('')
const textArea = ref(null)
const MAX_LINES = 10
const pendingFile = ref(null)
const fileInput = ref(null)
const sending = ref(false)
const videoNoteOpen = ref(false)
const voiceRecorderOpen = ref(false)
const stickerPickerOpen = ref(false)
const typingActive = ref(false)
let typingHeartbeatTimer = null

const props = defineProps({
  replyTo: { type: Object, default: null },
  editMessage: { type: Object, default: null }
})
const emit = defineEmits(['send', 'edit', 'typing', 'clear-reply', 'cancel-edit'])

const replyName = computed(() => {
  const m = props.replyTo
  if (!m) return ''
  if (m.fromMe) return 'Вы'
  return m._replyName || (m.senderId ? `User ${m.senderId}` : 'Сообщение')
})
const replySnippet = computed(() => {
  const m = props.replyTo
  if (!m) return ''
  if (m.isSticker) return 'Стикер'
  if (m.isVoiceMessage) return 'Голосовое сообщение'
  if (m.isVideoNote) return 'Видеосообщение'
  if (m.isImage) return 'Фото'
  if (m.isVideo) return 'Видео'
  if (m.isAudio) return 'Аудио'
  if (m.fileUuid && !(m.text || '').trim()) return m.fileName || 'Файл'
  const t = (m.text || '').trim()
  return t.length > 100 ? t.slice(0, 97) + '…' : t || 'Сообщение'
})

function clearReply() {
  emit('clear-reply')
}

function cancelEdit() {
  emit('cancel-edit')
}

watch(() => props.editMessage, (message) => {
  if (message) {
    stopTyping()
    pendingFile.value = null
    text.value = String(message.text || '')
    nextTick(() => {
      resizeTextarea()
      textArea.value?.focus()
      const el = textArea.value
      if (el) el.setSelectionRange(el.value.length, el.value.length)
    })
  } else {
    text.value = ''
    nextTick(resizeTextarea)
  }
}, { immediate: true })

watch(text, () => {
  nextTick(resizeTextarea)
})

const pendingIcon = computed(() => {
  const n = pendingFile.value?.name || ''
  if (isAudioFilename(n)) return '🎵'
  if (isImageFilename(n)) return '🖼'
  if (isVideoFilename(n)) return '🎬'
  return '📎'
})


function emitTyping(active) {
  emit('typing', Boolean(active))
}

function startTypingHeartbeat() {
  if (typingHeartbeatTimer) return
  typingHeartbeatTimer = setInterval(() => {
    if (!text.value.trim()) {
      stopTyping()
      return
    }
    emitTyping(true)
  }, 1000)
}

function resizeTextarea() {
  const el = textArea.value
  if (!el) return
  el.style.height = 'auto'
  const style = getComputedStyle(el)
  const lineHeight = parseFloat(style.lineHeight) || 20
  const padTop = parseFloat(style.paddingTop) || 0
  const padBottom = parseFloat(style.paddingBottom) || 0
  const maxH = lineHeight * MAX_LINES + padTop + padBottom
  const next = Math.min(el.scrollHeight, maxH)
  el.style.height = `${next}px`
  el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
}

function onTextInput() {
  handleInput()
  nextTick(resizeTextarea)
}

function onKeydown(e) {
  if (e.key === 'Escape' && props.editMessage) {
    e.preventDefault()
    cancelEdit()
    return
  }
  // Enter — отправить/сохранить, Shift+Enter — новая строка
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function handleInput() {
  if (!text.value.trim()) {
    stopTyping()
    nextTick(resizeTextarea)
    return
  }

  if (!typingActive.value) {
    typingActive.value = true
    emitTyping(true)
  }
  startTypingHeartbeat()
}

function stopTyping() {
  if (typingHeartbeatTimer) {
    clearInterval(typingHeartbeatTimer)
    typingHeartbeatTimer = null
  }
  if (typingActive.value) {
    typingActive.value = false
    emitTyping(false)
  }
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) pendingFile.value = f
  // сброс value, чтобы можно было выбрать тот же файл снова
  e.target.value = ''
}

function clearFile() {
  pendingFile.value = null
}

function onVideoNoteRecorded(file) {
  videoNoteOpen.value = false
  emit('send', { text: '', file, isVideoNote: true, respondMessageId: props.replyTo?.id || null })
  emit('clear-reply')
}

function onVoiceRecorded(file) {
  voiceRecorderOpen.value = false
  emit('send', { text: '', file, isVoiceMessage: true, respondMessageId: props.replyTo?.id || null })
  emit('clear-reply')
}

function onStickerSelect(sticker) {
  if (!sticker?.image_uuid) return
  emit('send', { text: '', sticker, respondMessageId: props.replyTo?.id || null })
  emit('clear-reply')
}

async function send() {
  stopTyping()
  const caption = text.value.trim()
  const file = pendingFile.value
  if (!caption && !file) return
  if (sending.value) return

  sending.value = true
  try {
    if (props.editMessage) {
      if (caption === String(props.editMessage.text || '').trim()) return
      emit('edit', props.editMessage, caption)
      return
    }
    emit('send', { text: caption, file, respondMessageId: props.replyTo?.id || null })
    emit('clear-reply')
    text.value = ''
    pendingFile.value = null
    nextTick(resizeTextarea)
  } finally {
    sending.value = false
  }
}
</script>

<style>
.input-wrap {
  background: rgba(248, 252, 255, .96);
  position: sticky;
  bottom: 0;
  z-index: 5;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid rgba(42, 171, 238, .12);
}

.input-wrap {
  /* for absolute sticker picker */
}

.edit-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 10px 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(42, 171, 238, 0.1);
  border-left: 3px solid #2aabee;
}
.edit-bar-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.edit-bar-label { font-size: 11px; font-weight: 600; color: #168dcc; text-transform: uppercase; letter-spacing: .02em; }
.edit-bar-text { font-size: 12.5px; color: #5a7383; }

.reply-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 10px 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(42, 171, 238, 0.1);
  border-left: 3px solid #2aabee;
}
.reply-bar-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.reply-bar-label {
  font-size: 11px;
  font-weight: 600;
  color: #168dcc;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.reply-bar-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #163247;
}
.reply-bar-text {
  font-size: 12.5px;
  color: #5a7383;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pending {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 0;
  font-size: 13px;
  color: #333;
}

.pending-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80%;
}

.btn-clear {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #666;
}

.input {
  display: flex;
  align-items: center;
  padding: 10px;
}

.file-hidden {
  display: none;
}

.btn-video-note,
.btn-sticker,
.btn-attach {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #2aabee;
  width: 36px;
  height: 36px;
  padding: 0;
  margin: 0;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  line-height: 0;
  border-radius: 50%;
}

.btn-video-note:hover,
.btn-sticker:hover,
.btn-attach:hover {
  background: rgba(42, 171, 238, 0.1);
}

.btn-video-note svg,
.btn-sticker svg,
.btn-attach svg {
  display: block;
}

.input {
  align-items: flex-end;
}

.input > .msg-textarea,
.msg-textarea {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border-radius: 18px;
  border: none;
  resize: none;
  outline: none;
  font: inherit;
  font-size: 14.5px;
  line-height: 1.35;
  max-height: calc(1.35em * 10 + 20px);
  overflow-y: hidden;
  background: #fff;
  color: inherit;
  box-sizing: border-box;
  field-sizing: content; /* progressive enhancement */
}

.msg-textarea::placeholder {
  color: #8aa1ae;
}

.input > button:last-child {
  margin-left: 10px;
  border: none;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
}

.input > button:last-child:disabled {
  opacity: 0.5;
  cursor: default;
}

.input > .btn-voice {
  margin-left: 8px;
  background: transparent;
  color: #2aabee;
  display: grid;
  place-items: center;
  padding: 0;
}

.input > .btn-voice:hover {
  background: rgba(42, 171, 238, .1);
}

@media (max-width: 768px) {
  .input {
    padding: 8px 8px 10px;
    gap: 2px;
  }

  .msg-textarea {
    font-size: 16px; /* iOS: без авто-зума */
    padding: 11px 14px;
  }

  .input > button:last-child,
  .input > .btn-voice,
  .btn-attach,
  .btn-sticker,
  .btn-video-note {
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    padding: 0;
  }
}

/* Тёмная тема: убираем голубую линию сверху инпута */
:global(html[data-theme="dark"]) .input-wrap {
  border-top: 1px solid #252d38 !important;
  box-shadow: none !important;
  background: #1a222c !important;
}
:global(html[data-theme="dark"]) .edit-bar { background: rgba(42,171,238,.12); }
:global(html[data-theme="dark"]) .edit-bar-label { color: #55c7ff; }
:global(html[data-theme="dark"]) .edit-bar-text { color: #a9bac8; }
:global(html[data-theme="dark"]) .msg-textarea {
  background: #243140;
  color: #e6edf3;
}
:global(html[data-theme="dark"]) .msg-textarea::placeholder {
  color: #91a4b4;
}
</style>
