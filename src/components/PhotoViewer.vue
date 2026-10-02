<template>
  <Teleport to="body">
    <Transition name="viewer-fade">
      <div
        v-if="open"
        class="viewer-overlay"
        @click.self="close"
        @keydown.esc.prevent="close"
        @keydown.left.prevent="prev"
        @keydown.right.prevent="next"
        tabindex="0"
        ref="overlayEl"
      >
        <button type="button" class="btn-close" title="Закрыть (Esc)" @click="close">×</button>

        <button
          v-if="items.length > 1"
          type="button"
          class="btn-nav btn-prev"
          title="Назад"
          @click="prev"
        >
          ‹
        </button>

        <div class="viewer-stage">
          <img
            v-if="current"
            :src="current.src"
            :alt="current.alt || ''"
            class="viewer-image"
            @click.stop
          />
          <div v-if="current?.caption" class="viewer-caption">{{ current.caption }}</div>
        </div>

        <button
          v-if="items.length > 1"
          type="button"
          class="btn-nav btn-next"
          title="Вперёд"
          @click="next"
        >
          ›
        </button>

        <div class="viewer-footer">
          <span v-if="items.length > 1" class="counter">{{ index + 1 }} / {{ items.length }}</span>
          <a
            v-if="current"
            class="btn-download"
            :href="current.src"
            :download="current.fileName || 'photo'"
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
import { ref, computed, watch, nextTick } from 'vue'

/**
 * items: Array<{ src: string, alt?: string, caption?: string, fileName?: string }>
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['close'])

const index = ref(0)
const overlayEl = ref(null)

const current = computed(() => props.items[index.value] || null)

watch(
  () => [props.open, props.startIndex, props.items.length],
  async ([isOpen, start]) => {
    if (isOpen) {
      index.value = Math.min(Math.max(0, Number(start) || 0), Math.max(0, props.items.length - 1))
      await nextTick()
      overlayEl.value?.focus()
    }
  }
)

function close() {
  emit('close')
}

function prev() {
  if (props.items.length < 2) return
  index.value = (index.value - 1 + props.items.length) % props.items.length
}

function next() {
  if (props.items.length < 2) return
  index.value = (index.value + 1) % props.items.length
}
</script>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  user-select: none;
}

.viewer-stage {
  max-width: min(96vw, 1200px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 56px 56px;
  box-sizing: border-box;
}

.viewer-image {
  max-width: 100%;
  max-height: calc(90vh - 80px);
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45);
  background: #111;
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

.btn-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 4px;
}

.btn-nav:hover {
  background: rgba(255, 255, 255, 0.22);
}

.btn-prev {
  left: 16px;
}

.btn-next {
  right: 16px;
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
  letter-spacing: 0.02em;
}

.btn-download {
  color: #54a9eb;
  text-decoration: none;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  transition: background 0.15s ease;
}

.btn-download:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #7ec0f5;
}

.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.18s ease;
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}
</style>
