<template>
  <div v-if="open" class="picker" @keydown.esc.prevent="close">
    <div class="picker-panel" role="dialog" aria-label="Стикеры">
      <div class="picker-head">
        <div class="tabs">
          <button
            type="button"
            :class="['tab', tab === 'mine' && 'active']"
            @click="tab = 'mine'"
          >
            Мои
          </button>
          <button
            type="button"
            :class="['tab', tab === 'catalog' && 'active']"
            @click="tab = 'catalog'"
          >
            Каталог
          </button>
        </div>
        <button type="button" class="btn-close" title="Закрыть" @click="close">×</button>
      </div>

      <div v-if="loading" class="state">Загрузка…</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <template v-else>
        <!-- список паков -->
        <div class="packs">
          <button
            v-for="pack in visiblePacks"
            :key="pack.id"
            type="button"
            :class="['pack', selectedPackId === pack.id && 'active']"
            :title="pack.title"
            @click="selectPack(pack)"
          >
            <img
              v-if="pack.image_uuid"
              :src="fileUrl(pack.image_uuid)"
              :alt="pack.title"
              class="pack-cover"
              loading="lazy"
            />
            <span v-else class="pack-fallback">{{ pack.title?.slice(0, 1) || '?' }}</span>
          </button>
        </div>

        <div v-if="!visiblePacks.length" class="state muted">
          {{ tab === 'mine' ? 'Нет установленных наборов. Откройте каталог.' : 'Каталог пуст.' }}
        </div>

        <!-- стикеры выбранного пака -->
        <div v-else class="stickers">
          <div class="pack-title-row">
            <span class="pack-title">{{ selectedPack?.title || 'Стикеры' }}</span>
            <button
              v-if="tab === 'catalog' && selectedPack && !isInstalled(selectedPack.id)"
              type="button"
              class="btn-install"
              :disabled="installing"
              @click="onInstall(selectedPack)"
            >
              {{ installing ? '…' : 'Добавить' }}
            </button>
            <button
              v-else-if="tab === 'mine' && selectedPack"
              type="button"
              class="btn-install danger"
              :disabled="installing"
              @click="onUninstall(selectedPack)"
            >
              {{ installing ? '…' : 'Убрать' }}
            </button>
          </div>

          <div v-if="stickersLoading" class="state">Загрузка стикеров…</div>
          <div v-else class="grid">
            <button
              v-for="s in currentStickers"
              :key="s.id"
              type="button"
              class="sticker"
              :title="s.title || s.emoji || s.slug"
              @click="pick(s)"
            >
              <img
                :src="fileUrl(s.image_uuid)"
                :alt="s.title || s.emoji || 'sticker'"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getFileUrl } from '../services/files'
import {
  fetchStickerPacks,
  fetchInstalledPacks,
  fetchPackStickers,
  installPack,
  uninstallPack
} from '../services/stickers'

const props = defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'select'])

const tab = ref('mine')
const loading = ref(false)
const stickersLoading = ref(false)
const error = ref('')
const installing = ref(false)

const catalog = ref([])
const installed = ref([])
const selectedPackId = ref(null)
const stickersCache = ref({}) // packId -> stickers[]

const visiblePacks = computed(() =>
  tab.value === 'mine' ? installed.value : catalog.value
)

const selectedPack = computed(() =>
  visiblePacks.value.find((p) => p.id === selectedPackId.value) || null
)

const currentStickers = computed(() => {
  if (!selectedPackId.value) return []
  return stickersCache.value[selectedPackId.value] || selectedPack.value?.stickers || []
})

function fileUrl(uuid) {
  return getFileUrl(uuid)
}

function isInstalled(packId) {
  return installed.value.some((p) => p.id === packId)
}

function close() {
  emit('close')
}

function pick(sticker) {
  emit('select', sticker)
  emit('close')
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [cat, mine] = await Promise.all([
      fetchStickerPacks().catch((e) => {
        console.warn(e)
        return []
      }),
      fetchInstalledPacks().catch((e) => {
        // без авторизации — пусто
        console.warn(e)
        return []
      })
    ])
    catalog.value = Array.isArray(cat) ? cat : []
    installed.value = Array.isArray(mine) ? mine : []

    // автовыбор первого пака
    const list = tab.value === 'mine' ? installed.value : catalog.value
    if (list.length && !selectedPackId.value) {
      await selectPack(list[0])
    } else if (list.length && selectedPackId.value) {
      const still = list.find((p) => p.id === selectedPackId.value)
      if (!still) await selectPack(list[0])
    } else {
      selectedPackId.value = null
    }
  } catch (e) {
    error.value = e.message || 'Не удалось загрузить стикеры'
  } finally {
    loading.value = false
  }
}

async function selectPack(pack) {
  selectedPackId.value = pack.id
  if (stickersCache.value[pack.id]?.length) return
  if (pack.stickers?.length) {
    stickersCache.value = { ...stickersCache.value, [pack.id]: pack.stickers }
    return
  }
  stickersLoading.value = true
  try {
    const list = await fetchPackStickers(pack.id)
    stickersCache.value = { ...stickersCache.value, [pack.id]: Array.isArray(list) ? list : [] }
  } catch (e) {
    console.warn(e)
    stickersCache.value = { ...stickersCache.value, [pack.id]: [] }
  } finally {
    stickersLoading.value = false
  }
}

async function onInstall(pack) {
  installing.value = true
  try {
    await installPack(pack.id)
    if (!installed.value.some((p) => p.id === pack.id)) {
      installed.value = [...installed.value, pack]
    }
  } catch (e) {
    alert(e.message || 'Не удалось добавить набор')
  } finally {
    installing.value = false
  }
}

async function onUninstall(pack) {
  installing.value = true
  try {
    await uninstallPack(pack.id)
    installed.value = installed.value.filter((p) => p.id !== pack.id)
    if (selectedPackId.value === pack.id) {
      selectedPackId.value = installed.value[0]?.id || null
      if (selectedPackId.value) {
        const next = installed.value.find((p) => p.id === selectedPackId.value)
        if (next) await selectPack(next)
      }
    }
  } catch (e) {
    alert(e.message || 'Не удалось убрать набор')
  } finally {
    installing.value = false
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) loadAll()
  }
)

watch(tab, async () => {
  const list = tab.value === 'mine' ? installed.value : catalog.value
  if (list.length) await selectPack(list[0])
  else selectedPackId.value = null
})
</script>

<style scoped>
.picker {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  z-index: 20;
  padding: 0 8px 8px;
  pointer-events: none;
}

.picker-panel {
  pointer-events: auto;
  background: #f8fcff;
  border: 1px solid rgba(42, 171, 238, 0.18);
  border-radius: 16px 16px 12px 12px;
  box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.12);
  max-height: min(42vh, 360px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 4px;
  gap: 8px;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  color: #5b7383;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.tab.active {
  background: rgba(42, 171, 238, 0.14);
  color: #0b6ea8;
}

.btn-close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: #7a93a3;
  cursor: pointer;
  padding: 2px 6px;
}

.state {
  padding: 18px 12px;
  text-align: center;
  color: #4a6576;
  font-size: 13px;
}

.state.error {
  color: #b91c1c;
}

.state.muted {
  color: #8aa1ae;
}

.packs {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(42, 171, 238, 0.1);
}

.pack {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: #e8f6fd;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.pack.active {
  border-color: #2aabee;
  box-shadow: 0 0 0 2px rgba(42, 171, 238, 0.2);
}

.pack-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pack-fallback {
  font-weight: 700;
  color: #168dcc;
  font-size: 16px;
}

.stickers {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pack-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 4px;
}

.pack-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e3a4c;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-install {
  border: none;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.btn-install.danger {
  background: transparent;
  color: #b91c1c;
  border: 1px solid rgba(185, 28, 28, 0.25);
}

.btn-install:disabled {
  opacity: 0.6;
  cursor: default;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
  padding: 6px 10px 12px;
  overflow-y: auto;
}

.sticker {
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: 4px;
  cursor: pointer;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  transition: background 0.12s ease;
}

.sticker:hover {
  background: rgba(42, 171, 238, 0.1);
}

.sticker img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
</style>
