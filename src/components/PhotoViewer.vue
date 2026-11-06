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

        <div class="viewer-stage" :class="{ 'is-sticker': isStickerView }">
          <!-- Стикер со звуком: квадратный эквалайзер по периметру картинки -->
          <StickerEqualizer
            v-if="isStickerView && current?.showEqualizer"
            :max-size="eqSize"
            :pad="26"
            :bar-step="6"
          >
            <img
              :src="current.src"
              :alt="current.alt || ''"
              class="viewer-sticker"
              @click.stop
            />
          </StickerEqualizer>

          <!-- Стикер без звука -->
          <img
            v-else-if="isStickerView"
            :src="current.src"
            :alt="current.alt || ''"
            class="viewer-sticker-plain"
            @click.stop
          />

          <!-- Обычное фото -->
          <template v-else>
            <img
              v-if="current"
              :src="current.src"
              :alt="current.alt || ''"
              class="viewer-image"
              @click.stop
            />
            <div v-if="current?.caption" class="viewer-caption">{{ current.caption }}</div>
          </template>
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
            v-if="current && !isStickerView"
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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import StickerEqualizer from './StickerEqualizer.vue'

/**
 * items: Array<{ src, alt?, caption?, fileName?, kind?, showEqualizer? }>
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['close'])

const index = ref(0)
const overlayEl = ref(null)
const eqSize = ref(320)

const current = computed(() => props.items[index.value] || null)
const isStickerView = computed(() => current.value?.kind === 'sticker')

function updateEqSize() {
  // Квадрат под стикер: почти на весь экран, с запасом под полоски
  const side = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.58, 400)
  eqSize.value = Math.max(200, Math.round(side))
}

watch(
  () => [props.open, props.startIndex, props.items.length],
  async ([isOpen, start]) => {
    if (isOpen) {
      index.value = Math.min(Math.max(0, Number(start) || 0), Math.max(0, props.items.length - 1))
      updateEqSize()
      await nextTick()
      overlayEl.value?.focus()
    }
  }
)

onMounted(() => {
  updateEqSize()
  window.addEventListener('resize', updateEqSize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateEqSize)
})

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

.viewer-stage.is-sticker {
  padding: 40px 24px;
}

.viewer-image {
  max-width: 100%;
  max-height: calc(90vh - 80px);
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45);
  background: #111;
}

.viewer-sticker {
  max-width: min(72vw, 400px);
  max-height: min(62vh, 400px);
  object-fit: contain;
  display: block;
  background: transparent;
}

.viewer-sticker-plain {
  max-width: min(72vw, 420px);
  max-height: min(62vh, 420px);
  object-fit: contain;
  display: block;
  background: transparent;
  filter: drop-shadow(0 8px 28px rgba(42, 171, 238, 0.25));
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
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.btn-prev {
  left: 12px;
}

.btn-next {
  right: 12px;
}

.btn-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.viewer-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  color: #ccc;
  font-size: 13px;
}

.btn-download {
  color: #9be7ff;
  text-decoration: none;
}

.btn-download:hover {
  text-decoration: underline;
}

.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.18s ease;
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .viewer-stage {
    padding: 56px 12px 64px;
  }
  .btn-nav {
    display: none;
  }
}
</style>
