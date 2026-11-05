<template>
  <div class="sm-overlay">
    <div class="sm-panel">
      <div class="sm-head">
        <button type="button" class="sm-back" title="Назад" @click="onBack">←</button>
        <span class="sm-title">{{ viewTitle }}</span>
        <button
          v-if="view === 'list'"
          type="button"
          class="sm-action"
          title="Новый набор"
          @click="view = 'create'"
        >
          +
        </button>
        <span v-else class="sm-action-spacer" />
      </div>

      <div v-if="view === 'list'" class="sm-body">
        <div class="sm-tabs">
          <button type="button" :class="['sm-tab', tab === 'mine' && 'on']" @click="tab = 'mine'">Мои</button>
          <button type="button" :class="['sm-tab', tab === 'catalog' && 'on']" @click="tab = 'catalog'">Каталог</button>
        </div>

        <p v-if="error" class="sm-err">{{ error }}</p>
        <p v-if="loading" class="sm-hint">Загрузка…</p>

        <div v-else class="sm-packs">
          <div v-if="!visiblePacks.length" class="sm-hint">
            {{ tab === 'mine' ? 'Нет наборов — добавьте из каталога или создайте свой' : 'Каталог пуст' }}
          </div>

          <div v-for="pack in visiblePacks" :key="pack.id" class="sm-row">
            <button type="button" class="sm-row-main" @click="openPack(pack)">
              <img v-if="pack.image_uuid" :src="fileUrl(pack.image_uuid)" class="sm-cover" alt="" />
              <span v-else class="sm-cover ph">{{ (pack.title || '?')[0] }}</span>
              <span class="sm-row-text">
                <span class="sm-name">{{ pack.title }}</span>
                <span class="sm-sub">{{ pack.description || pack.slug }}</span>
              </span>
            </button>
            <button
              v-if="tab === 'catalog' && !isInstalled(pack.id)"
              type="button"
              class="sm-btn"
              :disabled="busy === pack.id"
              @click="doInstall(pack)"
            >
              +
            </button>
            <button
              v-else-if="tab === 'mine'"
              type="button"
              class="sm-btn ghost"
              :disabled="busy === pack.id"
              @click="doUninstall(pack)"
            >
              ×
            </button>
            <span v-else class="sm-check">✓</span>
          </div>
        </div>
      </div>

      <div v-else-if="view === 'pack'" class="sm-body">
        <p v-if="stickersLoading" class="sm-hint">Загрузка…</p>
        <div class="sm-grid">
          <div v-for="s in packStickers" :key="s.id" class="sm-cell">
            <img :src="fileUrl(s.image_uuid)" :alt="s.title || s.slug" />
          </div>
          <label class="sm-cell add" :class="{ busy: uploading }">
            <input type="file" accept="image/*" multiple hidden :disabled="uploading" @change="onAddStickers" />
            <span class="sm-add-inner">
              <svg v-if="!uploading" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <span class="sm-add-text">{{ uploading ? '…' : 'Обзор' }}</span>
            </span>
          </label>
        </div>
        <p v-if="status" class="sm-hint">{{ status }}</p>
      </div>

      <div v-else class="sm-body sm-form">
        <label class="sm-field">
          Название
          <input v-model="form.title" type="text" maxlength="120" placeholder="Мой набор" />
        </label>
        <div class="sm-field">
          <span>Обложка</span>
          <label class="sm-file-btn">
            <input type="file" accept="image/*" hidden @change="onCover" />
            <span class="sm-file-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            </span>
            <span class="sm-file-label">{{ coverName || 'Выбрать изображение' }}</span>
          </label>
        </div>
        <label class="sm-checkrow">
          <input v-model="form.published" type="checkbox" />
          Опубликовать в каталоге
        </label>
        <button
          type="button"
          class="sm-submit"
          :disabled="saving || !form.title.trim()"
          @click="submitPack"
        >
          {{ saving ? 'Создание…' : 'Создать' }}
        </button>
        <p v-if="status" class="sm-hint">{{ status }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getFileUrl, uploadFile } from '../services/files'
import {
  fetchStickerPacks,
  fetchInstalledPacks,
  fetchPackStickers,
  installPack,
  uninstallPack,
  createPack,
  createSticker,
  slugify
} from '../services/stickers'

const emit = defineEmits(['close'])

const view = ref('list')
const tab = ref('mine')
const loading = ref(false)
const error = ref('')
const status = ref('')
const busy = ref(null)
const installed = ref([])
const catalog = ref([])

const currentPack = ref(null)
const packStickers = ref([])
const stickersLoading = ref(false)
const uploading = ref(false)

const form = ref({ title: '', published: true })
const coverFile = ref(null)
const coverName = ref('')
const saving = ref(false)

const visiblePacks = computed(() =>
  tab.value === 'mine' ? installed.value : catalog.value
)

const viewTitle = computed(() => {
  if (view.value === 'create') return 'Новый набор'
  if (view.value === 'pack') return currentPack.value?.title || 'Набор'
  return 'Стикеры'
})

function fileUrl(u) {
  return getFileUrl(u)
}

function isInstalled(id) {
  return installed.value.some((p) => p.id === id)
}

function onBack() {
  if (view.value === 'list') {
    emit('close')
    return
  }
  view.value = 'list'
  currentPack.value = null
  status.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [cat, mine] = await Promise.all([
      fetchStickerPacks().catch(() => []),
      fetchInstalledPacks().catch(() => [])
    ])
    catalog.value = Array.isArray(cat) ? cat : []
    installed.value = Array.isArray(mine) ? mine : []
  } catch (e) {
    error.value = e.message || 'Ошибка загрузки'
  } finally {
    loading.value = false
  }
}

async function openPack(pack) {
  currentPack.value = pack
  view.value = 'pack'
  status.value = ''
  stickersLoading.value = true
  try {
    if (pack.stickers?.length) {
      packStickers.value = pack.stickers
    } else {
      const list = await fetchPackStickers(pack.id)
      packStickers.value = Array.isArray(list) ? list : []
    }
  } catch (e) {
    packStickers.value = []
    status.value = e.message || 'Не удалось загрузить'
  } finally {
    stickersLoading.value = false
  }
}

async function doInstall(pack) {
  busy.value = pack.id
  try {
    await installPack(pack.id)
    if (!isInstalled(pack.id)) installed.value = [...installed.value, pack]
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = null
  }
}

async function doUninstall(pack) {
  busy.value = pack.id
  try {
    await uninstallPack(pack.id)
    installed.value = installed.value.filter((p) => p.id !== pack.id)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = null
  }
}

function onCover(e) {
  const f = e.target.files?.[0] || null
  coverFile.value = f
  coverName.value = f ? f.name : ''
}

async function submitPack() {
  const title = form.value.title.trim()
  if (!title) return
  saving.value = true
  status.value = ''
  try {
    let imageUuid = ''
    if (coverFile.value) {
      imageUuid = crypto.randomUUID()
      await uploadFile(imageUuid, coverFile.value)
    }
    const pack = await createPack({
      slug: slugify(title) + '-' + String(Date.now()).slice(-4),
      title,
      description: '',
      image_uuid: imageUuid,
      is_published: !!form.value.published,
      sort_order: 0
    })
    form.value = { title: '', published: true }
    coverFile.value = null
    coverName.value = ''
    await load()
    await openPack(pack)
    try {
      await installPack(pack.id)
      if (!isInstalled(pack.id)) installed.value = [...installed.value, pack]
    } catch {
      /* ignore */
    }
  } catch (e) {
    status.value = e.message || 'Не удалось создать'
  } finally {
    saving.value = false
  }
}

async function onAddStickers(e) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  if (!files.length || !currentPack.value) return
  uploading.value = true
  status.value = ''
  let ok = 0
  try {
    for (let i = 0; i < files.length; i++) {
      status.value = `${i + 1}/${files.length}`
      const file = files[i]
      const imageUuid = crypto.randomUUID()
      await uploadFile(imageUuid, file)
      const base = (file.name || 'sticker').replace(/\.[^.]+$/, '')
      const item = await createSticker(currentPack.value.id, {
        slug: slugify(base) + '-' + String(Date.now()).slice(-5),
        title: base,
        image_uuid: imageUuid,
        emoji: '',
        sort_order: packStickers.value.length + i
      })
      packStickers.value = [...packStickers.value, item]
      ok += 1
    }
    status.value = ok ? `Добавлено: ${ok}` : ''
  } catch (err) {
    status.value = err.message || 'Ошибка загрузки'
  } finally {
    uploading.value = false
  }
}

watch(view, (v) => {
  if (v === 'list') {
    currentPack.value = null
    status.value = ''
  }
})

onMounted(load)
</script>

<style scoped>
.sm-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.sm-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sm-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(42, 171, 238, 0.12);
  background: linear-gradient(180deg, #f7fbff, #fff);
  flex-shrink: 0;
}

.sm-back,
.sm-action {
  border: none;
  background: transparent;
  color: #2aabee;
  font-size: 20px;
  line-height: 1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.sm-back:hover,
.sm-action:hover {
  background: rgba(42, 171, 238, 0.1);
}

.sm-action-spacer {
  width: 36px;
}

.sm-title {
  flex: 1;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  color: #163247;
}

.sm-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 0 16px;
}

.sm-tabs {
  display: flex;
  gap: 4px;
  padding: 4px 12px 10px;
}

.sm-tab {
  flex: 1;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
}

.sm-tab.on {
  background: rgba(42, 171, 238, 0.15);
  color: #0b6ea8;
}

.sm-err {
  color: #ea0038;
  font-size: 13px;
  padding: 0 14px;
  margin: 0 0 8px;
}

.sm-hint {
  text-align: center;
  color: #8aa1ae;
  font-size: 13px;
  padding: 12px 16px;
  margin: 0;
}

.sm-packs {
  display: flex;
  flex-direction: column;
}

.sm-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.04);
}

.sm-row:hover {
  background: #f2f9fd;
}

.sm-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.sm-cover {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  background: #e8f6fd;
  flex-shrink: 0;
}

.sm-cover.ph {
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #168dcc;
  font-size: 18px;
}

.sm-row-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sm-name {
  font-weight: 600;
  font-size: 15px;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-sub {
  font-size: 12px;
  color: #8e8e93;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.sm-btn.ghost {
  background: transparent;
  color: #94a3b8;
  font-size: 20px;
}

.sm-btn:disabled {
  opacity: 0.5;
}

.sm-check {
  color: #16a34a;
  font-weight: 700;
  width: 32px;
  text-align: center;
}

.sm-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px 12px;
}

.sm-cell {
  aspect-ratio: 1;
  border-radius: 12px;
  background: #f0f7fc;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.sm-cell img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sm-cell.add {
  border: 2px dashed rgba(42, 171, 238, 0.4);
  background: linear-gradient(180deg, #f7fbff, #eef8ff);
  cursor: pointer;
  color: #2aabee;
}

.sm-cell.add:hover {
  border-color: #2aabee;
  background: #e0f2fe;
}

.sm-form {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.sm-file-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px dashed rgba(42, 171, 238, 0.45);
  background: linear-gradient(180deg, #f7fbff, #eef8ff);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  color: #0b6ea8;
  font-size: 14px;
  font-weight: 600;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.sm-file-btn:hover {
  border-color: #2aabee;
  background: #e8f6fd;
}

.sm-file-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(42, 171, 238, 0.15);
  color: #2aabee;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.sm-file-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #163247;
  font-weight: 500;
}

.sm-add-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #2aabee;
}

.sm-add-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sm-cell.add.busy {
  opacity: 0.6;
  pointer-events: none;
}

.sm-field input[type='text'] {
  border: none;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  color: #0f172a;
}

.sm-checkrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #334155;
}

.sm-submit {
  border: none;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
}

.sm-submit:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
