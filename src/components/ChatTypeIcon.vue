<template>
  <span
    class="chat-type-icon"
    :class="`chat-type-icon--${type}`"
    :style="iconStyle"
    role="img"
    :aria-label="accessibleLabel"
    :title="accessibleLabel"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** direct — личная переписка, group — групповой чат */
  type: { type: String, default: 'direct', validator: v => ['direct', 'group'].includes(v) },
  /** Номер SVG-варианта: от 1 до 5 */
  variant: { type: Number, default: 1, validator: v => Number.isInteger(v) && v >= 1 && v <= 5 },
  size: { type: [Number, String], default: 24 },
  label: { type: String, default: '' }
})

const iconStyle = computed(() => {
  const url = `url("/chat-icons/${props.type}-${props.variant}.svg")`
  const dimension = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: dimension,
    height: dimension,
    maskImage: url,
    WebkitMaskImage: url
  }
})
const accessibleLabel = computed(() => props.label || (props.type === 'group' ? 'Групповой чат' : 'Личный чат'))
</script>

<style scoped>
.chat-type-icon {
  display: inline-block;
  flex: 0 0 auto;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  vertical-align: middle;
}
</style>
