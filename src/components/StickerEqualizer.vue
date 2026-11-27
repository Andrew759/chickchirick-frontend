<template>
  <div
    class="seq-wrap"
    :style="wrapStyle"
  >
    <svg
      class="seq-svg"
      :viewBox="`0 0 ${boxW} ${boxH}`"
      :width="boxW"
      :height="boxH"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="barId" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#2aabee" />
          <stop offset="1" stop-color="#9be7ff" />
        </linearGradient>
        <filter :id="glowId" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>

      <rect
        v-for="(bar, i) in bars"
        :key="i"
        :x="bar.x"
        :y="bar.y"
        :width="bar.width"
        :height="bar.height"
        :rx="bar.rx"
        :fill="`url(#${barId})`"
        :opacity="active ? bar.opacity : 0.3"
        :filter="active && bar.level > 0.55 ? `url(#${glowId})` : undefined"
      />
    </svg>

    <div class="seq-inner" ref="innerEl">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player'

const props = defineProps({
  /** Макс. сторона картинки (px) */
  maxSize: { type: Number, default: 360 },
  /** Вылет полосок наружу (px) */
  pad: { type: Number, default: 26 },
  /**
   * Плотность: целевой шаг между центрами полосок (px).
   * Меньше = больше полосок, почти без пустот.
   */
  barStep: { type: Number, default: 7 }
})

const player = usePlayerStore()
const bands = computed(() => player.bands || [])
const active = computed(() => !!player.playing && !!player.hasTrack)

const uid = Math.random().toString(36).slice(2, 9)
const barId = `seq-bars-${uid}`
const glowId = `seq-glow-${uid}`

const innerEl = ref(null)
const imgW = ref(280)
const imgH = ref(280)

const pad = computed(() => props.pad)
const boxW = computed(() => imgW.value + pad.value * 2)
const boxH = computed(() => imgH.value + pad.value * 2)

const wrapStyle = computed(() => ({
  width: boxW.value + 'px',
  height: boxH.value + 'px'
}))

function sampleLevel(index, total) {
  const source = bands.value || []
  if (!source.length) return 0
  const pos = (index / Math.max(total, 1)) * source.length
  const left = Math.floor(pos) % source.length
  const right = (left + 1) % source.length
  const t = pos - Math.floor(pos)
  const a = source[left] || 0
  const b = source[right] || 0
  return Math.max(0, Math.min(1, a + (b - a) * t))
}

/** Сколько полосок на сторону, чтобы шаг ≈ barStep */
function countForLength(len) {
  return Math.max(6, Math.round(len / props.barStep))
}

const bars = computed(() => {
  const w = imgW.value
  const h = imgH.value
  const p = pad.value
  const thickness = Math.max(2, Math.min(3.2, props.barStep * 0.42))
  const barMin = 3
  const barMax = Math.max(10, p * 0.9)

  const nTop = countForLength(w)
  const nSide = countForLength(h)
  const total = nTop * 2 + nSide * 2
  const result = []
  let idx = 0

  const pushBar = (x, y, width, height, level) => {
    result.push({
      level,
      x,
      y,
      width,
      height,
      rx: thickness / 2,
      opacity: 0.45 + level * 0.55
    })
  }

  // Верх (слева → направо)
  for (let i = 0; i < nTop; i++) {
    const level = sampleLevel(idx++, total)
    const len = barMin + level * (barMax - barMin)
    const t = (i + 0.5) / nTop
    const along = p + t * w
    pushBar(along - thickness / 2, p - len, thickness, len, level)
  }

  // Право (сверху → вниз)
  for (let i = 0; i < nSide; i++) {
    const level = sampleLevel(idx++, total)
    const len = barMin + level * (barMax - barMin)
    const t = (i + 0.5) / nSide
    const along = p + t * h
    pushBar(p + w, along - thickness / 2, len, thickness, level)
  }

  // Низ (справа → налево, зеркально для непрерывности волны)
  for (let i = 0; i < nTop; i++) {
    const level = sampleLevel(idx++, total)
    const len = barMin + level * (barMax - barMin)
    const t = (i + 0.5) / nTop
    const along = p + (1 - t) * w
    pushBar(along - thickness / 2, p + h, thickness, len, level)
  }

  // Лево (снизу → вверх)
  for (let i = 0; i < nSide; i++) {
    const level = sampleLevel(idx++, total)
    const len = barMin + level * (barMax - barMin)
    const t = (i + 0.5) / nSide
    const along = p + (1 - t) * h
    pushBar(p - len, along - thickness / 2, len, thickness, level)
  }

  return result
})

function measure() {
  const el = innerEl.value
  if (!el) return
  const img = el.querySelector('img')
  if (img && img.naturalWidth > 0) {
    const max = props.maxSize
    const ratio = img.naturalWidth / img.naturalHeight
    let w
    let h
    if (ratio >= 1) {
      w = Math.min(max, img.naturalWidth)
      h = w / ratio
    } else {
      h = Math.min(max, img.naturalHeight)
      w = h * ratio
    }
    // ограничение по высоте экрана
    const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.58 : max
    if (h > maxH) {
      h = maxH
      w = h * ratio
    }
    const maxW = typeof window !== 'undefined' ? window.innerWidth * 0.72 : max
    if (w > maxW) {
      w = maxW
      h = w / ratio
    }
    imgW.value = Math.max(80, Math.round(w))
    imgH.value = Math.max(80, Math.round(h))
    img.style.width = imgW.value + 'px'
    img.style.height = imgH.value + 'px'
  } else {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      imgW.value = Math.round(rect.width)
      imgH.value = Math.round(rect.height)
    }
  }
}

let ro = null
let imgEl = null

function bindImg() {
  const el = innerEl.value
  if (!el) return
  const img = el.querySelector('img')
  if (img && img !== imgEl) {
    if (imgEl) imgEl.removeEventListener('load', measure)
    imgEl = img
    img.addEventListener('load', measure)
    if (img.complete) measure()
  }
  measure()
}

onMounted(async () => {
  await nextTick()
  bindImg()
  if (typeof ResizeObserver !== 'undefined' && innerEl.value) {
    ro = new ResizeObserver(() => measure())
    ro.observe(innerEl.value)
  }
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  if (imgEl) imgEl.removeEventListener('load', measure)
  window.removeEventListener('resize', measure)
})

watch(
  () => player.playing,
  () => nextTick(bindImg)
)
</script>

<style scoped>
.seq-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  isolation: isolate;
  box-sizing: border-box;
}

.seq-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 0;
}

.seq-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  /* padding = pad, чтобы картинка совпала с координатами полосок */
  padding: v-bind('pad + "px"');
  box-sizing: border-box;
}

.seq-inner :deep(img) {
  display: block;
  object-fit: contain;
  background: transparent;
  border-radius: 4px;
}
</style>
