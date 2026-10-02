<template>
  <Teleport to="body">
    <Transition name="video-note-modal">
      <div v-if="open" class="video-note-overlay" @click.self="close">
        <div class="video-note-dialog" role="dialog" aria-modal="true" aria-label="Видеосообщение">
          <div class="video-note-stage" :class="{ recording }">
            <video ref="previewEl" class="video-note-preview" autoplay muted playsinline />
            <div class="video-note-shade"></div>
            <div class="video-note-topbar">
              <button type="button" class="round-action" title="Закрыть" @click="close">×</button>
              <div class="record-time">{{ formattedTime }}</div>
              <div class="record-limit">30с</div>
            </div>
            <div class="video-note-bottom">
              <div class="record-progress">
                <span :style="{ width: `${progress}%` }"></span>
              </div>
              <button
                type="button"
                class="record-button"
                :class="{ active: recording }"
                :aria-label="recording ? 'Остановить запись' : 'Начать запись'"
                @click="toggleRecording"
              >
                <span></span>
              </button>
              <div class="record-hint">{{ recording ? 'Нажмите, чтобы отправить' : 'Нажмите для записи' }}</div>
            </div>
          </div>
          <div v-if="error" class="video-note-error">{{ error }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'recorded'])

const previewEl = ref(null)
const stream = ref(null)
const recorder = ref(null)
const chunks = ref([])
const recording = ref(false)
const elapsed = ref(0)
const error = ref('')
let timer = null
let discardOnStop = false

const MAX_SECONDS = 30
const progress = computed(() => Math.min(100, (elapsed.value / MAX_SECONDS) * 100))
const formattedTime = computed(() => {
  const seconds = Math.min(MAX_SECONDS, Math.floor(elapsed.value))
  return `0:${String(seconds).padStart(2, '0')}`
})

function pickMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ]
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

async function startCamera() {
  error.value = ''
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Браузер не поддерживает доступ к камере')
    }
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
      audio: true
    })
    await nextTick()
    if (previewEl.value) {
      previewEl.value.srcObject = stream.value
      await previewEl.value.play().catch(() => {})
    }
  } catch (e) {
    error.value = e?.name === 'NotAllowedError'
      ? 'Разрешите доступ к камере и микрофону в браузере'
      : (e?.message || 'Не удалось подключиться к камере')
  }
}

function stopCamera() {
  if (previewEl.value) previewEl.value.srcObject = null
  stream.value?.getTracks().forEach((track) => track.stop())
  stream.value = null
}

function startTimer() {
  stopTimer()
  timer = window.setInterval(() => {
    elapsed.value += 0.1
    if (elapsed.value >= MAX_SECONDS) stopRecording()
  }, 100)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function toggleRecording() {
  if (recording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

function startRecording() {
  if (!stream.value) return
  const mimeType = pickMimeType()
  try {
    recorder.value = mimeType
      ? new MediaRecorder(stream.value, { mimeType })
      : new MediaRecorder(stream.value)
  } catch (e) {
    error.value = e?.message || 'Не удалось начать запись'
    return
  }

  chunks.value = []
  elapsed.value = 0
  recorder.value.ondataavailable = (event) => {
    if (event.data?.size) chunks.value.push(event.data)
  }
  recorder.value.onerror = () => {
    error.value = 'Во время записи произошла ошибка'
    recording.value = false
    stopTimer()
  }
  recorder.value.onstop = () => {
    const type = recorder.value?.mimeType || mimeType || 'video/webm'
    const blob = new Blob(chunks.value, { type })
    chunks.value = []
    if (!discardOnStop && blob.size > 0) {
      const ext = type.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([blob], `video-note-${Date.now()}.${ext}`, { type })
      emit('recorded', file)
    }
    recorder.value = null
    discardOnStop = false
  }
  recorder.value.start(250)
  recording.value = true
  startTimer()
}

function stopRecording() {
  stopTimer()
  if (!recorder.value || recorder.value.state === 'inactive') {
    recording.value = false
    return
  }
  recording.value = false
  recorder.value.stop()
}

function close() {
  if (recording.value) {
    discardOnStop = true
    stopRecording()
  }
  stopTimer()
  stopCamera()
  emit('close')
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    elapsed.value = 0
    error.value = ''
    await nextTick()
    await startCamera()
  } else {
    if (recording.value) stopRecording()
    stopTimer()
    stopCamera()
  }
})

onBeforeUnmount(() => {
  if (recording.value) stopRecording()
  stopTimer()
  stopCamera()
})
</script>

<style scoped>
.video-note-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(7, 18, 28, .72);
  backdrop-filter: blur(10px);
}

.video-note-dialog {
  width: min(430px, 94vw);
}

.video-note-stage {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  background: #111;
  box-shadow: 0 22px 70px rgba(0, 0, 0, .38);
  border: 4px solid rgba(255, 255, 255, .18);
}

.video-note-stage.recording {
  border-color: rgba(42, 171, 238, .9);
}

.video-note-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  background: #111;
}

.video-note-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.42), transparent 30%, transparent 58%, rgba(0,0,0,.58));
  pointer-events: none;
}

.video-note-topbar,
.video-note-bottom {
  position: absolute;
  left: 18px;
  right: 18px;
  z-index: 2;
}

.video-note-topbar {
  top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.round-action {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, .42);
  color: #fff;
  font-size: 26px;
  cursor: pointer;
}

.record-time,
.record-limit {
  padding: 6px 10px;
  border-radius: 14px;
  background: rgba(0, 0, 0, .42);
  color: #fff;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.record-limit { margin-left: auto; margin-right: 8px; }

.video-note-bottom {
  bottom: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.record-progress {
  width: 82%;
  height: 4px;
  margin-bottom: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255,255,255,.3);
}

.record-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #fff;
  transition: width .1s linear;
}

.record-button {
  width: 72px;
  height: 72px;
  border: 5px solid #fff;
  border-radius: 50%;
  background: rgba(255,255,255,.2);
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 5px 22px rgba(0,0,0,.25);
}

.record-button span {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  transition: all .16s ease;
}

.record-button.active span {
  width: 26px;
  height: 26px;
  border-radius: 7px;
}

.record-hint {
  margin-top: 8px;
  color: rgba(255,255,255,.9);
  font-size: 12px;
  text-shadow: 0 1px 4px rgba(0,0,0,.4);
}

.video-note-error {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.95);
  color: #b42318;
  text-align: center;
  font-size: 13px;
}

.video-note-modal-enter-active,
.video-note-modal-leave-active { transition: opacity .18s ease; }
.video-note-modal-enter-from,
.video-note-modal-leave-to { opacity: 0; }
</style>
