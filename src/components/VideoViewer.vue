<template>
  <Teleport to="body">
    <Transition name="video-viewer-fade">
      <div
        v-if="open"
        class="video-viewer-overlay"
        @click.self="close"
        @keydown.esc.prevent="close"
        tabindex="0"
        ref="overlayEl"
      >
        <button type="button" class="btn-close" title="Закрыть (Esc)" @click="close">×</button>

        <div class="video-viewer-stage" @click.stop>
          <video
            v-if="current"
            :key="current.src"
            :src="playableSrc || current.src"
            :poster="current.poster || undefined"
            class="viewer-video"
            controls
            autoplay
            playsinline
            preload="metadata"
          />
          <div v-if="current?.caption" class="viewer-caption">{{ current.caption }}</div>
        </div>

        <div class="viewer-footer">
          <span v-if="items.length > 1" class="counter">{{ index + 1 }} / {{ items.length }}</span>
          <a
            v-if="current"
            class="btn-download"
            :href="current.src"
            :download="current.fileName || 'video'"
            target="_blank"
            rel="noopener"
            @click.stop
          >
            Скачать
          </a>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['close'])
const index = ref(0)
const overlayEl = ref(null)
const current = computed(() => props.items[index.value] || null)
const playableSrc = ref('')
let objectUrl = ''

function revokeObjectUrl() {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = ''
  playableSrc.value = ''
}

async function prepareVideo(item) {
  revokeObjectUrl()
  if (!item?.src) return
  try {
    const response = await fetch(item.src, { credentials: 'include' })
    if (!response.ok) throw new Error(`Video request failed: ${response.status}`)
    const blob = await response.blob()
    const type = blob.type || guessMime(item.fileName)
    const playableBlob = type && blob.type !== type ? new Blob([blob], { type }) : blob
    objectUrl = URL.createObjectURL(playableBlob)
    playableSrc.value = objectUrl
  } catch (error) {
    console.warn('Video blob load failed, falling back to direct URL', error)
    playableSrc.value = item.src
  }
}

function guessMime(name = '') {
  const ext = name.split('.').pop()?.toLowerCase()
  return ({
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    mov: 'video/quicktime',
    webm: 'video/webm',
    ogv: 'video/ogg',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    '3gp': 'video/3gpp'
  })[ext] || 'video/mp4'
}

watch(
  () => [props.open, props.startIndex, props.items.length],
  async ([isOpen, start]) => {
    if (isOpen) {
      index.value = Math.min(Math.max(0, Number(start) || 0), Math.max(0, props.items.length - 1))
      await nextTick()
      overlayEl.value?.focus()
      await prepareVideo(props.items[index.value])
    }
  }
)

function close() {
  emit('close')
}
</script>

<style scoped>
.video-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  user-select: none;
}

.video-viewer-stage {
  width: min(96vw, 1200px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 40px 64px;
  box-sizing: border-box;
}

.viewer-video {
  display: block;
  max-width: 100%;
  max-height: calc(90vh - 100px);
  width: auto;
  height: auto;
  border-radius: 6px;
  background: #111;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45);
}

.viewer-caption {
  color: #ddd;
  font-size: 14px;
  text-align: center;
  max-width: 80vw;
  word-break: break-word;
}

.btn-close {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease;
  z-index: 2;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.22);
}

.viewer-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #ccc;
  font-size: 14px;
}

.counter {
  font-variant-numeric: tabular-nums;
}

.btn-download {
  color: #fff;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 7px 14px;
  transition: background 0.15s ease;
}

.btn-download:hover {
  background: rgba(255, 255, 255, 0.22);
}

.video-viewer-fade-enter-active,
.video-viewer-fade-leave-active {
  transition: opacity 0.15s ease;
}

.video-viewer-fade-enter-from,
.video-viewer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .video-viewer-stage {
    width: 100vw;
    padding: 48px 12px 64px;
  }

  .viewer-video {
    max-width: calc(100vw - 24px);
  }
}
</style>


onBeforeUnmount(() => revokeObjectUrl())
