<template>
  <div class="voice-message" :class="{ me: fromMe, playing: isPlaying }">
    <button
      type="button"
      class="voice-play"
      :title="isPlaying ? 'Пауза' : 'Слушать'"
      @click.stop="toggle"
    >
      <svg v-if="!isPlaying" viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
      </svg>
    </button>

    <div class="voice-body">
      <button type="button" class="voice-track" @click.stop="seek">
        <span class="voice-track-bg"></span>
        <span class="voice-track-fill" :style="{ width: `${progressPct}%` }"></span>
        <span class="voice-wave" aria-hidden="true">
          <i v-for="n in 26" :key="n" :style="waveBar(n)"></i>
        </span>
      </button>
      <div class="voice-meta">
        <span>{{ formatTime(displayTime) }}</span>
        <span>{{ formatTime(displayDuration) }}</span>
      </div>
    </div>

    <!-- Невидимый элемент нужен только для получения длительности до запуска глобального плеера. -->
    <audio
      ref="metaAudio"
      :src="src"
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @error="handleError"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { usePlayerStore } from '../stores/player'

const props = defineProps({
  src: { type: String, required: true },
  fromMe: { type: Boolean, default: false },
  title: { type: String, default: 'Голосовое сообщение' },
  queue: { type: Array, default: () => [] }
})

const player = usePlayerStore()
const metaAudio = ref(null)
const localDuration = ref(0)
const loadError = ref(false)

const isCurrent = computed(() => player.src === props.src)
const isPlaying = computed(() => isCurrent.value && player.playing)
const displayTime = computed(() => (isCurrent.value ? player.currentTime : 0))
const displayDuration = computed(() =>
  isCurrent.value && player.duration > 0 ? player.duration : localDuration.value
)
const progressPct = computed(() => {
  const duration = displayDuration.value
  if (!duration) return 0
  return Math.min(100, (displayTime.value / duration) * 100)
})

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function waveBar(index) {
  const heights = [8, 11, 15, 9, 18, 12, 7, 16, 20, 13, 10, 17, 8, 14]
  const raw = heights[(index - 1) % heights.length]
  const played = displayDuration.value
    ? index / 26 <= (displayTime.value / displayDuration.value) * 26
    : false
  return { '--h': `${raw}px`, opacity: played ? '1' : '.42' }
}

async function onLoadedMetadata() {
  const value = metaAudio.value?.duration
  if (Number.isFinite(value) && value > 0) {
    localDuration.value = value
    player.setDuration(props.src, value)
    return
  }

  const valueFromStore = await player.loadDuration(props.src)
  if (valueFromStore > 0) {
    localDuration.value = valueFromStore
    player.setDuration(props.src, valueFromStore)
  }
}

async function toggle() {
  if (!props.src) return
  const metadataDuration = Number(metaAudio.value?.duration)
  if (Number.isFinite(metadataDuration) && metadataDuration > 0) {
    localDuration.value = metadataDuration
    player.setDuration(props.src, metadataDuration)
  }
  await player.toggle({
    src: props.src,
    title: props.title || 'Голосовое сообщение',
    kind: 'voice',
    // Передаём уже известную длительность напрямую. Это особенно важно для
    // WebM/Opus: у глобального Audio duration иногда остаётся 0/Infinity.
    duration: Math.max(localDuration.value || 0, Number(metaAudio.value?.duration) || 0) || undefined,
    queue: props.queue
  })
}

async function seek(event) {
  if (!displayDuration.value) return

  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))

  if (!isCurrent.value) {
    await player.play({
      src: props.src,
      title: props.title || 'Голосовое сообщение',
      kind: 'voice',
      queue: props.queue
    })
  }

  player.seek(ratio)
}

function handleError() {
  loadError.value = true
}

async function loadDurationForMessage() {
  if (!props.src) return
  const value = await player.loadDuration(props.src)
  if (value > 0) {
    localDuration.value = value
    player.setDuration(props.src, value)
  }
}

onMounted(() => {
  // Для голосовых WebM metadata часто не содержит duration.
  loadDurationForMessage()
})

watch(() => props.src, () => {
  localDuration.value = 0
  loadError.value = false
  loadDurationForMessage()
})

// Если длительность определилась уже после запуска сообщения, немедленно
// синхронизируем её с глобальным плеером. Это закрывает race condition между
// metadata-audio и нажатием Play.
watch(localDuration, (value) => {
  if (value > 0 && isCurrent.value) {
    player.setDuration(props.src, value)
  }
})
</script>

<style scoped>
.voice-message {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(330px, 72vw);
  padding: 8px 10px 8px 7px;
  border-radius: 18px;
  background: #f5fbff;
  border: 1px solid rgba(42, 171, 238, .1);
}

.voice-message.me {
  background: rgba(255, 255, 255, .32);
}

.voice-play {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  padding: 0 0 0 2px;
  border: 0;
  border-radius: 50%;
  background: #38bdf8;
  color: #fff;
  cursor: pointer;
  transition: transform .12s ease, background .12s ease;
}

.voice-message.me .voice-play { background: #2aabee; }
.voice-play:hover { transform: scale(1.04); }

.voice-body {
  min-width: 0;
  flex: 1;
}

.voice-track {
  position: relative;
  display: block;
  width: 100%;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.voice-track-bg,
.voice-track-fill {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 3px;
  border-radius: 999px;
  transform: translateY(-50%);
}

.voice-track-bg { background: rgba(38, 91, 116, .12); }
.voice-track-fill { right: auto; background: #38bdf8; }
.voice-message.me .voice-track-fill { background: #2aabee; }

.voice-wave {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 3px;
}

.voice-wave i {
  flex: 1;
  height: var(--h);
  max-height: 22px;
  border-radius: 999px;
  background: #38bdf8;
}

.voice-message.me .voice-wave i { background: #2aabee; }

.voice-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 1px;
  font-size: 11px;
  color: #6b8490;
  font-variant-numeric: tabular-nums;
}

audio { display: none; }
</style>
