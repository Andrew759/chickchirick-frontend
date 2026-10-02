<template>
  <div class="eq-wrap" :style="{ width: size + 'px', height: size + 'px' }">
    <svg
      class="eq-svg"
      :viewBox="`0 0 ${vb} ${vb}`"
      :width="size + 30"
      :height="size + 30"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="barId" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#2aabee" />
          <stop offset="1" stop-color="#9be7ff" />
        </linearGradient>
        <filter :id="glowId" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <circle
        :cx="cx"
        :cy="cy"
        :r="barRadius"
        fill="none"
        :stroke="active ? 'rgba(42,171,238,.22)' : 'rgba(42,171,238,.10)'"
        stroke-width="0.8"
      />

      <g>
        <rect
          v-for="(bar, i) in bars"
          :key="i"
          :x="bar.x"
          :y="bar.y"
          :width="bar.width"
          :height="bar.height"
          :rx="bar.width / 2"
          :fill="`url(#${barId})`"
          :opacity="active ? bar.opacity : 0.28"
          :transform="bar.transform"
          :filter="active && bar.level > 0.55 ? `url(#${glowId})` : undefined"
        />
      </g>
    </svg>

    <div class="eq-inner" :style="innerStyle">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'

const props = defineProps({
  size: { type: Number, default: 48 },
  gap: { type: Number, default: 4 }
})

const player = usePlayerStore()

// Не используем storeToRefs: Pinia 3.0.x может падать на nullable state-полях
// (например, src: null) при обходе rawStore. Computed безопасно читает только
// необходимые значения и не ломает рендер профилей/списка чатов.
const bands = computed(() => player.bands || [])
const playing = computed(() => !!player.playing)
const hasTrack = computed(() => !!player.hasTrack)

const uid = Math.random().toString(36).slice(2, 9)
const barId = `eq-bars-${uid}`
const glowId = `eq-glow-${uid}`
const active = computed(() => playing.value && hasTrack.value)

const pad = 15
const vb = computed(() => props.size + pad * 2)
const cx = computed(() => vb.value / 2)
const cy = computed(() => vb.value / 2)
const barRadius = computed(() => props.size / 2 + 4)

const innerStyle = computed(() => ({
  width: `${props.size - props.gap * 2}px`,
  height: `${props.size - props.gap * 2}px`
}))

const bars = computed(() => {
  const source = bands.value || []
  const count = 28
  const angleStep = 360 / count
  const barWidth = Math.max(1.5, Math.min(2.8, props.size / 22))
  const barMin = 2.5
  const barMax = Math.max(6, props.size * 0.18)
  const r = barRadius.value

  return Array.from({ length: count }, (_, i) => {
    const pos = (i / count) * source.length
    const left = Math.floor(pos) % Math.max(source.length, 1)
    const right = (left + 1) % Math.max(source.length, 1)
    const t = pos - Math.floor(pos)
    const a = source.length ? (source[left] || 0) : 0
    const b = source.length ? (source[right] || 0) : 0
    const level = Math.max(0, Math.min(1, a + (b - a) * t))
    const height = barMin + level * (barMax - barMin)
    const angle = i * angleStep - 90

    return {
      level,
      x: cx.value - barWidth / 2,
      y: cy.value - r - height,
      width: barWidth,
      height,
      opacity: 0.42 + level * 0.58,
      transform: `rotate(${angle} ${cx.value} ${cy.value})`
    }
  })
})
</script>

<style scoped>
.eq-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  isolation: isolate;
}

.eq-svg {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  overflow: visible;
  z-index: 0;
}

.eq-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  box-shadow: 0 5px 18px rgba(14, 165, 233, .12);
}
</style>
