<template>
  <div class="audio-player" :class="{ me: fromMe, playing: isPlaying }">
    <button
      type="button"
      class="btn-play"
      :title="isPlaying ? 'Пауза' : 'Слушать'"
      @click.stop="toggle"
    >
      <svg v-if="!isPlaying" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
      </svg>
    </button>

    <div class="body">
      <div class="wave-row">
        <div
          class="progress-track"
          ref="trackEl"
          @click.stop="seek"
        >
          <div class="progress-fill" :style="{ width: progressPct + '%' }" />
          <div class="progress-thumb" :style="{ left: progressPct + '%' }" />
        </div>
      </div>
      <div class="meta-row">
        <span class="time">{{ formatTime(displayTime) }}</span>
        <span class="name" :title="fileName">{{ displayName }}</span>
        <span class="duration">{{ formatTime(displayDuration) }}</span>
      </div>
    </div>

    <a
      class="btn-dl"
      :href="src"
      :download="fileName || 'audio'"
      target="_blank"
      rel="noopener"
      title="Скачать"
      @click.stop
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
      </svg>
    </a>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '../stores/player'

const props = defineProps({
  src: { type: String, required: true },
  fileName: { type: String, default: '' },
  fromMe: { type: Boolean, default: false }
})

const player = usePlayerStore()
const { playing, currentTime, duration, src: currentSrc } = storeToRefs(player)
const trackEl = ref(null)

const isCurrent = computed(() => currentSrc.value === props.src)
const isPlaying = computed(() => isCurrent.value && playing.value)
const progressPct = computed(() => {
  if (!isCurrent.value || !duration.value) return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})
const displayTime = computed(() => (isCurrent.value ? currentTime.value : 0))
const displayDuration = computed(() => (isCurrent.value ? duration.value : 0))

const displayName = computed(() => {
  const n = (props.fileName || '').trim()
  if (!n) return 'Аудио'
  const base = n.split(/[/\\]/).pop()
  return base.length > 22 ? base.slice(0, 19) + '…' : base
})

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function toggle() {
  player.toggle({ src: props.src, title: props.fileName || 'Аудио' })
}

function seek(e) {
  if (!isCurrent.value || !duration.value || !trackEl.value) return
  const rect = trackEl.value.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  player.seek(ratio)
}
</script>

<style scoped>
.audio-player {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  max-width: 280px;
  padding: 6px 4px 4px 2px;
}

.btn-play {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #38bdf8;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, background 0.12s ease;
  padding: 0;
}

.audio-player.me .btn-play {
  background: #2aabee;
}

.btn-play:hover {
  transform: scale(1.05);
}

.btn-play:active {
  transform: scale(0.96);
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-track {
  position: relative;
  height: 4px;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  cursor: pointer;
  margin: 6px 0 2px;
}

.audio-player.me .progress-track {
  background: rgba(0, 0, 0, 0.1);
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: #38bdf8;
  border-radius: 2px;
  pointer-events: none;
}

.audio-player.me .progress-fill {
  background: #2aabee;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  margin-top: -5px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.audio-player.me .progress-thumb {
  background: #2aabee;
}

.audio-player:hover .progress-thumb,
.audio-player.playing .progress-thumb {
  opacity: 1;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #667781;
}

.time,
.duration {
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  color: #54656f;
}

.btn-dl {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667781;
  text-decoration: none;
  transition: background 0.12s ease, color 0.12s ease;
}

.btn-dl:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #111;
}
</style>
