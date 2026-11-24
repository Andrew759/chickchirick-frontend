<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="ep-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор реакции"
      @click.self="close"
    >
      <div class="ep-modal" @click.stop>
        <div class="ep-header">
          <div class="ep-title">Реакция</div>
          <button type="button" class="ep-close" title="Закрыть" @click="close">×</button>
        </div>

        <div class="ep-search-wrap">
          <input
            ref="searchRef"
            v-model="query"
            type="search"
            class="ep-search"
            placeholder="Поиск…"
            autocomplete="off"
            @keydown.esc="close"
          />
        </div>

        <div class="ep-tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="ep-tab"
            :class="{ active: activeTab === tab.id }"
            role="tab"
            :aria-selected="activeTab === tab.id"
            @click="activeTab = tab.id"
          >
            {{ tab.icon }}
          </button>
        </div>

        <div class="ep-grid-wrap">
          <div class="ep-grid">
            <button
              v-for="e in visibleEmojis"
              :key="e"
              type="button"
              class="ep-emoji"
              :title="e"
              @click="pick(e)"
            >
              {{ e }}
            </button>
          </div>
          <div v-if="!visibleEmojis.length" class="ep-empty">Ничего не найдено</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { QUICK_REACTION_EMOJIS } from '../services/reactions'

const props = defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'select'])

const query = ref('')
const searchRef = ref(null)
const activeTab = ref('all')

const tabs = [
  { id: 'all', icon: '✨', label: 'Все' },
  { id: 'faces', icon: '😊', label: 'Лица' },
  { id: 'gestures', icon: '👍', label: 'Жесты' },
  { id: 'hearts', icon: '❤️', label: 'Сердца' },
  { id: 'symbols', icon: '🔥', label: 'Символы' }
]

const FACE = new Set('😂🤣😊😇🙂😉😍🥰😘😗🤗🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫🥱😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤢🤮🥴😈👿💀☠️💩🤡👹👺👻👽'.split(/.*?/u).filter(Boolean))
const GESTURE = new Set('👍👎👋🤚🖐✋🖖👌🤌🤏✌️🤞🤟🤘🤙👈👉👆👇☝️✊👊🤛🤜👏🙌👐🤲🙏✍️💅🤳💪'.split(/.*?/u).filter(Boolean))
const HEART = new Set('❤️🧡💛💚💙💜🖤🤍💔❣️💕'.split(/.*?/u).filter(Boolean))
const SYMBOL = new Set('🔥✨⭐🌟💥💯✅❌⚠️🚀🎉🎊🏆🥇🎯💡📌🔔💤🍻☕🍕🎂🌹🍀🌈'.split(/.*?/u).filter(Boolean))

// Better category lists from the full QUICK set by simple membership
const FACE_CHARS = '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗☺😚😙🥲😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠💩🤡👹👺👻👽👾🤖'
const GESTURE_CHARS = '👋🤚🖐✋🖖👌🤌🤏✌🤞🤟🤘🤙👈👉👆🖕👇☝👍👎✊👊🤛🤜👏🙌👐🤲🤝🙏✍💅🤳💪🦾'
const HEART_CHARS = '❤🧡💛💚💙💜🖤🤍🤎💔❣💕💞💓💗💖💘💝'
const SYMBOL_CHARS = '🔥✨⭐🌟💫💥💢💦💨🕳💣💬👁🗨🗯💭💤💯✅❌⚠🚫🚀🎉🎊🎈🎁🏆🥇🥈🥉⚽🎯💡📌📍🔔🔕🍻☕🍕🍔🍟🌭🍿🎂🍰🍎🌹🍀🌈☀🌙⚡'

function inChars(emoji, chars) {
  // emoji may be multi-codepoint; check if any significant char is in set
  for (const ch of emoji) {
    if (chars.includes(ch)) return true
  }
  return false
}

const categorized = computed(() => {
  const all = QUICK_REACTION_EMOJIS
  return {
    all,
    faces: all.filter((e) => inChars(e, FACE_CHARS)),
    gestures: all.filter((e) => inChars(e, GESTURE_CHARS)),
    hearts: all.filter((e) => inChars(e, HEART_CHARS)),
    symbols: all.filter((e) => inChars(e, SYMBOL_CHARS))
  }
})

const visibleEmojis = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = categorized.value[activeTab.value] || categorized.value.all
  // de-dupe
  list = [...new Set(list)]
  if (!q) return list
  // simple filter: if query is emoji substring
  return list.filter((e) => e.includes(query.value.trim()))
})

function close() {
  emit('close')
}
function pick(emoji) {
  emit('select', emoji)
  emit('close')
}

watch(
  () => props.open,
  async (v) => {
    if (v) {
      query.value = ''
      activeTab.value = 'all'
      await nextTick()
      searchRef.value?.focus?.()
    }
  }
)
</script>

<style scoped>
.ep-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.ep-modal {
  width: min(360px, 100%);
  max-height: min(520px, 88vh);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.ep-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
}
.ep-title {
  font-size: 16px;
  font-weight: 650;
  color: #163247;
}
.ep-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #6d8796;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
.ep-close:hover {
  background: rgba(0, 0, 0, 0.06);
}
.ep-search-wrap {
  padding: 0 16px 10px;
}
.ep-search {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(42, 171, 238, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  outline: none;
  background: #f5f9fc;
}
.ep-search:focus {
  border-color: #2aabee;
  background: #fff;
}
.ep-tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.ep-tab {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 18px;
  padding: 8px 0;
  border-radius: 10px;
  cursor: pointer;
  line-height: 1;
}
.ep-tab:hover {
  background: rgba(42, 171, 238, 0.1);
}
.ep-tab.active {
  background: rgba(42, 171, 238, 0.16);
}
.ep-grid-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  overscroll-behavior: contain;
}
.ep-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}
.ep-emoji {
  border: none;
  background: transparent;
  aspect-ratio: 1;
  border-radius: 10px;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  display: grid;
  place-items: center;
  padding: 0;
}
.ep-emoji:hover {
  background: rgba(42, 171, 238, 0.14);
}
.ep-empty {
  text-align: center;
  color: #8aa1ae;
  font-size: 14px;
  padding: 24px 8px;
}

:global(html[data-theme='dark']) .ep-modal {
  background: #1a222c;
}
:global(html[data-theme='dark']) .ep-title {
  color: #e6edf3;
}
:global(html[data-theme='dark']) .ep-search {
  background: #243140;
  border-color: rgba(42, 171, 238, 0.3);
  color: #e6edf3;
}
:global(html[data-theme='dark']) .ep-tabs {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
:global(html[data-theme='dark']) .ep-tab.active {
  background: rgba(42, 171, 238, 0.22);
}
</style>
