<template>
  <div class="input-wrap">
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
      <button type="button" class="btn-attach" title="Прикрепить файл" @click="fileInput?.click()">📎</button>
      <input v-model="text" @input="handleInput" @blur="stopTyping" @keyup.enter="send" placeholder="Сообщение" />
      <button
        v-if="!text.trim() && !pendingFile"
        type="button"
        class="btn-voice"
        title="Голосовое сообщение"
        @click="voiceRecorderOpen = true"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H8v2h8v-2h-3v-3.08A7 7 0 0 0 19 11h-2Z"/>
        </svg>
      </button>
      <button v-else type="button" @click="send" :disabled="sending">➤</button>
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
import { ref, computed } from 'vue'
import VideoNoteRecorder from './VideoNoteRecorder.vue'
import VoiceRecorder from './VoiceRecorder.vue'
import { isAudioFilename, isImageFilename, isVideoFilename } from '../services/files'

const text = ref('')
const pendingFile = ref(null)
const fileInput = ref(null)
const sending = ref(false)
const videoNoteOpen = ref(false)
const voiceRecorderOpen = ref(false)
const typingActive = ref(false)
let typingHeartbeatTimer = null

const emit = defineEmits(['send'])

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

function handleInput() {
  if (!text.value.trim()) {
    stopTyping()
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
  emit('send', { text: '', file, isVideoNote: true })
}

function onVoiceRecorded(file) {
  voiceRecorderOpen.value = false
  emit('send', { text: '', file, isVoiceMessage: true })
}

async function send() {
  stopTyping()
  const caption = text.value.trim()
  const file = pendingFile.value
  if (!caption && !file) return
  if (sending.value) return

  sending.value = true
  try {
    emit('send', { text: caption, file })
    text.value = ''
    pendingFile.value = null
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
.btn-attach {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
}

.btn-video-note {
  color: #2aabee;
  margin-right: 4px;
}

.input > input[type='text'],
.input > input:not([type]) {
  flex: 1;
  padding: 10px;
  border-radius: 20px;
  border: none;
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

  .input > input[type='text'],
  .input > input:not([type]) {
    font-size: 16px; /* iOS: без авто-зума */
    padding: 11px 14px;
  }

  .input > button:last-child,
  .input > .btn-voice,
  .btn-attach,
  .btn-video-note {
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
  }

  .btn-video-note,
  .btn-attach {
    font-size: 20px;
    padding: 6px;
  }
}
</style>
