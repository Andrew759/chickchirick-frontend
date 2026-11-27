<template>
  <button type="button" class="video-link" @click.stop="$emit('open')">
    <div class="video-thumb-wrap">
      <img
        v-if="posterUrl"
        :src="posterUrl"
        :alt="fileName || 'video'"
        class="msg-video-preview"
      />
      <video
        v-else
        ref="videoEl"
        :src="src"
        class="msg-video-preview"
        muted
        preload="metadata"
        playsinline
        @loadedmetadata="captureFrame"
      />
      <div v-if="loading" class="video-thumb-shimmer" aria-hidden="true"></div>
    </div>

    <span class="video-play" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </svg>
    </span>

    <span v-if="durationLabel" class="video-duration">{{ durationLabel }}</span>
  </button>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  fileName: { type: String, default: 'video' }
})

defineEmits(['open'])

const videoEl = ref(null)
const posterUrl = ref('')
const duration = ref(0)
const loading = ref(true)

const durationLabel = computed(() => {
  if (!Number.isFinite(duration.value) || duration.value <= 0) return ''
  const total = Math.round(duration.value)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

function captureFrame() {
  const video = videoEl.value
  if (!video) return

  duration.value = video.duration
  loading.value = true

  const makePoster = () => {
    try {
      if (!video.videoWidth || !video.videoHeight) throw new Error('Video dimensions unavailable')
      const canvas = document.createElement('canvas')
      const maxWidth = 720
      const scale = Math.min(1, maxWidth / video.videoWidth)
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      posterUrl.value = canvas.toDataURL('image/jpeg', 0.82)
    } catch {
      // If canvas capture is blocked (for example by CORS), keep the video fallback.
    } finally {
      loading.value = false
    }
  }

  if (video.readyState >= 2 && video.currentTime === 0) {
    makePoster()
    return
  }

  const onSeeked = () => {
    video.removeEventListener('seeked', onSeeked)
    makePoster()
  }
  video.addEventListener('seeked', onSeeked, { once: true })
  try {
    video.currentTime = 0
  } catch {
    loading.value = false
  }
}

watch(() => props.src, () => {
  posterUrl.value = ''
  duration.value = 0
  loading.value = true
})

onBeforeUnmount(() => {
  posterUrl.value = ''
})
</script>

<style scoped>
.video-link {
  position: relative;
  display: block;
  width: min(360px, 70vw);
  min-height: 180px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #111;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.16);
}

.video-thumb-wrap {
  position: relative;
  min-height: 180px;
  background: #111;
}

.msg-video-preview {
  display: block;
  width: 100%;
  height: 230px;
  object-fit: cover;
  background: #111;
}

.video-thumb-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.02) 70%);
  animation: video-shimmer 1.2s infinite;
}

.video-play {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 58px;
  height: 58px;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.58);
  color: #fff;
  box-shadow: 0 5px 22px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s ease, background 0.15s ease;
}

.video-link:hover .video-play {
  transform: translate(-50%, -50%) scale(1.07);
  background: rgba(42, 171, 238, 0.92);
}

.video-duration {
  position: absolute;
  right: 9px;
  bottom: 9px;
  padding: 4px 7px;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.68);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

@keyframes video-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
</style>
