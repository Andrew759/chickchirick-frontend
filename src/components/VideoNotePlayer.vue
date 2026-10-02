<template>
  <button type="button" class="video-note" :class="{ playing }" @click="toggle">
    <video
      ref="videoEl"
      :src="src"
      class="video-note-media"
      preload="metadata"
      playsinline
      @play="playing = true"
      @pause="playing = false"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
    />
    <span v-if="!playing" class="video-note-play" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="27" height="27">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </svg>
    </span>
    <span class="video-note-duration">{{ durationLabel }}</span>
    <span class="video-note-ring" :style="{ '--progress': `${progress * 360}deg` }"></span>
  </button>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({ src: { type: String, required: true } })
const videoEl = ref(null)
const playing = ref(false)
const duration = ref(0)
const current = ref(0)

const progress = computed(() => duration.value ? Math.min(1, current.value / duration.value) : 0)
const durationLabel = computed(() => {
  const value = Math.max(0, Math.round(duration.value || 0))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
})

function onLoadedMetadata(e) {
  const el = e?.target
  if (!el) return
  duration.value = el.duration || 0
}

function onTimeUpdate(e) {
  const el = e?.target
  if (!el) return
  current.value = el.currentTime || 0
}

function toggle() {
  const video = videoEl.value
  if (!video) return
  if (video.paused) video.play().catch(() => {})
  else video.pause()
}

function onEnded() {
  playing.value = false
  current.value = 0
}

onBeforeUnmount(() => {
  const video = videoEl.value
  if (!video) return
  try {
    video.pause()
    video.removeAttribute('src')
    video.load()
  } catch (_) {}
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
  overflow: hidden;
  background: #dff3ff;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(30, 90, 120, .14);
}

.video-note-media {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background: #17232d;
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
}

.video-note-duration {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 4px 7px;
  border-radius: 10px;
  color: #fff;
  background: rgba(0,0,0,.55);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.video-note-ring {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,.78);
  pointer-events: none;
}

@media (max-width: 600px) {
  .video-note { width: 165px; height: 165px; }
}
</style>
