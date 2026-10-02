<template>
  <Teleport to="body">
    <Transition name="voice-recorder">
      <div v-if="open" class="voice-overlay" @click.self="cancel">
        <div class="voice-dialog" role="dialog" aria-modal="true" aria-label="Голосовое сообщение">
          <div class="voice-header">
            <button type="button" class="voice-close" title="Отменить" @click="cancel">×</button>
            <div>
              <div class="voice-title">Голосовое сообщение</div>
              <div class="voice-subtitle">Максимум 1 минута</div>
            </div>
            <div class="voice-timer">{{ formattedTime }}</div>
          </div>

          <div class="voice-stage" :class="{ recording, ready: !recording }">
            <div class="voice-orb" :class="{ pulse: recording }">
              <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H8v2h8v-2h-3v-3.08A7 7 0 0 0 19 11h-2Z" />
              </svg>
            </div>
            <div class="voice-bars" aria-hidden="true">
              <span v-for="n in 28" :key="n" :style="barStyle(n)"></span>
            </div>
            <div class="voice-hint">
              <template v-if="error">{{ error }}</template>
              <template v-else-if="recording">Говорите… нажмите на кнопку, чтобы отправить</template>
              <template v-else>Подготавливаем микрофон…</template>
            </div>
          </div>

          <div class="voice-actions">
            <button type="button" class="voice-cancel" @click="cancel">Отмена</button>
            <button
              type="button"
              class="voice-stop"
              :disabled="!recording"
              :aria-label="recording ? 'Остановить и отправить' : 'Запись не началась'"
              @click="finish"
            >
              <span></span>
            </button>
            <div class="voice-limit">{{ remainingLabel }}</div>
          </div>
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

const stream = ref(null)
const recorder = ref(null)
const chunks = ref([])
const recording = ref(false)
const elapsed = ref(0)
const error = ref('')
let timer = null
let shouldSend = false

const MAX_SECONDS = 60
const formattedTime = computed(() => {
  const sec = Math.min(MAX_SECONDS, Math.floor(elapsed.value))
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
})
const remainingLabel = computed(() => {
  const remaining = Math.max(0, Math.ceil(MAX_SECONDS - elapsed.value))
  return `${remaining}с`
})

function pickMimeType() {
  if (!window.MediaRecorder) return ''
  const types = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/ogg',
    'audio/mp4'
  ]
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function extensionFor(type) {
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('mp4')) return 'm4a'
  return 'webm'
}

function barStyle(index) {
  const base = [7, 11, 15, 10, 18, 12, 9, 16, 20, 12, 17, 9, 14, 18, 11, 16]
  const h = base[(index - 1) % base.length]
  return {
    height: `${recording.value ? h + ((index * 7) % 5) : 6}px`,
    animationDelay: `${((index * 37) % 600) * -1}ms`
  }
}

async function startRecording() {
  error.value = ''
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Браузер не поддерживает запись с микрофона')
    }
    if (!window.MediaRecorder) {
      throw new Error('Браузер не поддерживает запись аудио')
    }

    stream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickMimeType()
    recorder.value = mimeType
      ? new MediaRecorder(stream.value, { mimeType })
      : new MediaRecorder(stream.value)

    chunks.value = []
    elapsed.value = 0
    shouldSend = false

    recorder.value.ondataavailable = (event) => {
      if (event.data?.size) chunks.value.push(event.data)
    }
    recorder.value.onerror = () => {
      error.value = 'Во время записи произошла ошибка'
      recording.value = false
      stopTimer()
    }
    recorder.value.onstop = () => {
      const type = recorder.value?.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunks.value, { type })
      const file = new File(
        [blob],
        `voice-message-${Date.now()}.${extensionFor(type)}`,
        { type }
      )
      chunks.value = []
      const send = shouldSend && blob.size > 0
      recorder.value = null
      stopTimer()
      stopStream()

      if (send) emit('recorded', file)
      emit('close')
    }

    recorder.value.start(250)
    recording.value = true
    startTimer()
  } catch (e) {
    error.value = e?.name === 'NotAllowedError'
      ? 'Разрешите доступ к микрофону в браузере'
      : (e?.message || 'Не удалось начать запись')
    stopStream()
  }
}

function startTimer() {
  stopTimer()
  timer = window.setInterval(() => {
    elapsed.value += 0.1
    if (elapsed.value >= MAX_SECONDS) finish()
  }, 100)
}

function stopTimer() {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

function stopStream() {
  stream.value?.getTracks().forEach((track) => track.stop())
  stream.value = null
}

function finish() {
  if (!recorder.value || recorder.value.state === 'inactive') return
  shouldSend = true
  recording.value = false
  stopTimer()
  recorder.value.stop()
}

function cancel() {
  shouldSend = false
  recording.value = false
  stopTimer()
  if (recorder.value && recorder.value.state !== 'inactive') {
    recorder.value.stop()
  } else {
    stopStream()
    emit('close')
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    await startRecording()
  } else {
    shouldSend = false
    recording.value = false
    stopTimer()
    if (recorder.value && recorder.value.state !== 'inactive') recorder.value.stop()
    else stopStream()
  }
})

onBeforeUnmount(() => {
  shouldSend = false
  stopTimer()
  if (recorder.value && recorder.value.state !== 'inactive') recorder.value.stop()
  stopStream()
})
</script>

<style scoped>
.voice-overlay {
  position: fixed;
  inset: 0;
  z-index: 2300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 18px;
  background: rgba(10, 24, 35, .42);
  backdrop-filter: blur(9px);
}

.voice-dialog {
  width: min(520px, 100%);
  overflow: hidden;
  border-radius: 22px;
  background: rgba(248, 252, 255, .98);
  border: 1px solid rgba(42, 171, 238, .18);
  box-shadow: 0 22px 70px rgba(23, 56, 77, .25);
}

.voice-header {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(42, 171, 238, .1);
}

.voice-close,
.voice-cancel {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.voice-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #58717f;
  font-size: 26px;
}

.voice-close:hover { background: rgba(42, 171, 238, .08); }

.voice-title {
  font-size: 15px;
  font-weight: 700;
  color: #17384d;
}

.voice-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #76909d;
}

.voice-timer {
  min-width: 62px;
  padding: 7px 9px;
  border-radius: 14px;
  background: #e7f6ff;
  color: #168dcc;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.voice-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 30px 22px 24px;
}

.voice-orb {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #38bdf8, #2aabee);
  box-shadow: 0 11px 28px rgba(42, 171, 238, .24);
}

.voice-orb.pulse {
  animation: voice-pulse 1.2s ease-in-out infinite;
}

.voice-bars {
  width: min(430px, 90%);
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.voice-bars span {
  width: 4px;
  min-height: 6px;
  border-radius: 999px;
  background: linear-gradient(to top, #2aabee, #7dd3fc);
  opacity: .82;
}

.voice-stage.recording .voice-bars span {
  animation: voice-wave .8s ease-in-out infinite alternate;
}

.voice-hint {
  min-height: 18px;
  font-size: 13px;
  color: #698491;
  text-align: center;
}

.voice-actions {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(42, 171, 238, .1);
}

.voice-cancel {
  justify-self: start;
  padding: 8px 2px;
  color: #657d89;
  font-size: 13px;
}

.voice-cancel:hover { color: #17384d; }

.voice-stop {
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #2aabee;
  box-shadow: 0 9px 24px rgba(42, 171, 238, .28);
  cursor: pointer;
}

.voice-stop:disabled {
  opacity: .45;
  cursor: default;
  box-shadow: none;
}

.voice-stop span {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: #fff;
}

.voice-limit {
  justify-self: end;
  font-size: 12px;
  color: #7f96a2;
  font-variant-numeric: tabular-nums;
}

.voice-recorder-enter-active,
.voice-recorder-leave-active {
  transition: opacity .16s ease, transform .18s ease;
}

.voice-recorder-enter-from,
.voice-recorder-leave-to {
  opacity: 0;
}

.voice-recorder-enter-from .voice-dialog,
.voice-recorder-leave-to .voice-dialog {
  transform: translateY(18px);
}

@keyframes voice-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes voice-wave {
  from { transform: scaleY(.65); }
  to { transform: scaleY(1.25); }
}
</style>
