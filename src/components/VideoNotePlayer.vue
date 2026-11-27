<template>
  <div
    class="video-note"
    :class="{ playing, seeking }"
  >
    <video
      ref="videoEl"
      :src="src"
      class="video-note-media"
      preload="auto"
      playsinline
      @play="playing = true"
      @pause="playing = false"
      @loadedmetadata="refreshDuration"
      @durationchange="refreshDuration"
      @loadeddata="refreshDuration"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @click.stop.prevent="toggle"
    />

    <span v-if="!playing" class="video-note-play" aria-hidden="true" @click.stop.prevent="toggle">
      <svg viewBox="0 0 24 24" width="27" height="27">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </svg>
    </span>

    <span class="video-note-duration">{{ timeLabel }}</span>

    <span
      class="video-note-ring"
      :style="{ background: ringBackground }"
      @pointerdown.stop="onRingPointerDown"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({ src: { type: String, required: true } })

const videoEl = ref(null)
const playing = ref(false)
const seeking = ref(false)
/** Надёжная длительность: max(metadata, seekable, observed currentTime) */
const duration = ref(0)
const current = ref(0)

const progress = computed(() => {
  const d = effectiveDuration.value
  if (d <= 0) return 0
  return Math.min(1, Math.max(0, current.value / d))
})

const effectiveDuration = computed(() => Math.max(0, duration.value))

const ringBackground = computed(() => {
  const deg = progress.value * 360
  return `conic-gradient(from -90deg, #2aabee 0deg, #5ec8f5 ${deg}deg, rgba(255,255,255,.22) ${deg}deg 360deg)`
})

const timeLabel = computed(() => {
  const total = effectiveDuration.value
  const cur = Math.max(0, current.value || 0)
  const show = playing.value || seeking.value ? cur : total
  const v = Math.max(0, Math.round(show))
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
})

/**
 * MediaRecorder/WebM часто отдаёт неверную или «раннюю» duration.
 * Берём максимум из duration, seekable и уже проигранного currentTime.
 */
function refreshDuration() {
  const v = videoEl.value
  if (!v) return

  let candidates = []

  const meta = v.duration
  if (Number.isFinite(meta) && meta > 0) candidates.push(meta)

  try {
    if (v.seekable && v.seekable.length > 0) {
      const end = v.seekable.end(v.seekable.length - 1)
      if (Number.isFinite(end) && end > 0) candidates.push(end)
    }
  } catch {
    /* ignore */
  }

  try {
    if (v.buffered && v.buffered.length > 0) {
      const end = v.buffered.end(v.buffered.length - 1)
      if (Number.isFinite(end) && end > 0) candidates.push(end)
    }
  } catch {
    /* ignore */
  }

  const t = v.currentTime
  if (Number.isFinite(t) && t > 0) candidates.push(t)

  if (!candidates.length) return
  const next = Math.max(...candidates)
  // Только увеличиваем — не даём «прыгать» вниз из‑за кривой metadata
  if (next > duration.value + 0.05) {
    duration.value = next
  } else if (duration.value <= 0 && next > 0) {
    duration.value = next
  }
}

function onTimeUpdate() {
  if (seeking.value) return
  const v = videoEl.value
  if (!v) return
  const t = v.currentTime || 0
  current.value = t
  // Пока играем — подтягиваем длительность, если metadata занижена
  if (t > duration.value) {
    duration.value = t
  } else {
    refreshDuration()
  }
}

function onEnded() {
  const v = videoEl.value
  playing.value = false
  // Фиксируем реальный конец ролика
  if (v) {
    const end = Math.max(v.currentTime || 0, duration.value)
    if (end > 0) duration.value = end
  }
  current.value = duration.value > 0 ? duration.value : 0
  // Небольшой сброс кольца после конца (как в Telegram — можно оставить полным до play)
  // Оставляем полным до следующего play; при play сбросим в toggle
}

function toggle() {
  const video = videoEl.value
  if (!video) return
  if (video.paused) {
    // Если стояли в конце — с начала
    if (duration.value > 0 && current.value >= duration.value - 0.15) {
      video.currentTime = 0
      current.value = 0
    }
    video.play().catch(() => {})
  } else {
    video.pause()
  }
}

/** Угол 0..1 от верха по часовой */
function ratioFromEvent(event, el) {
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const x = event.clientX - cx
  const y = event.clientY - cy
  let angle = Math.atan2(y, x) + Math.PI / 2
  if (angle < 0) angle += Math.PI * 2
  return Math.min(1, Math.max(0, angle / (Math.PI * 2)))
}

function seekToRatio(ratio) {
  const video = videoEl.value
  refreshDuration()
  const d = effectiveDuration.value
  if (!video || d <= 0) return

  let t = ratio * d

  // Ограничиваем seekable-диапазоном, если браузер его знает
  try {
    if (video.seekable && video.seekable.length > 0) {
      const start = video.seekable.start(0)
      const end = video.seekable.end(video.seekable.length - 1)
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        t = Math.min(end, Math.max(start, t))
      }
    }
  } catch {
    /* ignore */
  }

  video.currentTime = t
  current.value = t
}

function onRingPointerDown(event) {
  const ring = event.currentTarget
  refreshDuration()
  if (effectiveDuration.value <= 0) return
  event.preventDefault()
  seeking.value = true
  ring.setPointerCapture?.(event.pointerId)

  const root = ring.parentElement || ring
  const apply = (e) => seekToRatio(ratioFromEvent(e, root))
  apply(event)

  const onMove = (e) => apply(e)
  const onUp = (e) => {
    apply(e)
    seeking.value = false
    ring.releasePointerCapture?.(e.pointerId)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

watch(
  () => props.src,
  () => {
    duration.value = 0
    current.value = 0
    playing.value = false
  }
)

onBeforeUnmount(() => {
  seeking.value = false
})
</script>

<style scoped>
.video-note {
  position: relative;
  display: block;
  width: 190px;
  height: 190px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  /* не clip — таймер может выходить за край кружка */
  overflow: visible;
  background: transparent;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.video-note-media {
  display: block;
  object-fit: cover;
  background: #17232d;
  width: calc(100% - 12px);
  height: calc(100% - 12px);
  margin: 6px;
  border-radius: 50%;
  box-shadow: 0 6px 18px rgba(30, 90, 120, .14);
}

.video-note-play {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  padding-left: 2px;
  box-sizing: border-box;
  color: #fff;
  background: rgba(42, 171, 238, .92);
  box-shadow: 0 5px 20px rgba(0,0,0,.22);
  z-index: 2;
  pointer-events: auto;
}

.video-note-duration {
  position: absolute;
  /* слегка за краем кружка, как в Telegram */
  right: 2px;
  bottom: 4px;
  padding: 3px 7px;
  border-radius: 10px;
  color: #fff;
  background: rgba(0, 0, 0, 0.62);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  z-index: 4;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.video-note-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  z-index: 1;
  pointer-events: auto;
  cursor: ew-resize;
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));
}

.video-note.seeking .video-note-ring {
  cursor: grabbing;
}

@media (max-width: 600px) {
  .video-note { width: 165px; height: 165px; }
}
</style>
