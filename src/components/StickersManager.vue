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

      <!-- LIST -->
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

      <!-- PACK DETAIL -->
      <div v-else-if="view === 'pack'" class="sm-body">
        <!-- Cover edit -->
        <div class="sm-pack-bar">
          <div class="sm-pack-cover-wrap">
            <img
                v-if="currentPack?.image_uuid"
                :src="fileUrl(currentPack.image_uuid)"
                class="sm-pack-cover-lg"
                alt=""
            />
            <span v-else class="sm-pack-cover-lg ph">{{ (currentPack?.title || '?')[0] }}</span>
            <label class="sm-cover-edit" title="Сменить обложку">
              <input type="file" accept="image/*" hidden :disabled="coverUpdating" @change="onChangeCover" />
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
              </svg>
            </label>
          </div>
          <div class="sm-pack-bar-text">
            <div class="sm-pack-bar-title">{{ currentPack?.title }}</div>
            <div class="sm-pack-bar-sub">{{ packStickers.length }} стикеров</div>
          </div>
        </div>

        <p v-if="stickersLoading" class="sm-hint">Загрузка…</p>
        <div class="sm-grid">
          <div v-for="s in packStickers" :key="s.id" class="sm-cell has-actions">
            <img :src="fileUrl(s.image_uuid)" :alt="s.title || s.slug" />
            <span v-if="s.emoji" class="sm-emoji-badge">{{ s.emoji }}</span>
            <span v-if="s.audio_uuid" class="sm-audio-badge" title="Есть музыка">♪</span>
            <div class="sm-cell-actions">
              <button type="button" class="sm-mini" title="Эмодзи" @click="startEditEmoji(s)">☺</button>
              <button type="button" class="sm-mini" title="Музыка" @click="startEditAudio(s)">♪</button>
              <button type="button" class="sm-mini danger" title="Удалить" @click="onDeleteSticker(s)">×</button>
            </div>
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

        <!-- Emoji editor -->
        <div v-if="emojiEdit" class="sm-emoji-sheet">
          <div class="sm-emoji-sheet-title">Эмодзи для стикера</div>
          <input
              v-model="emojiDraft"
              type="text"
              maxlength="8"
              class="sm-emoji-input"
              placeholder="😀"
              @keyup.enter="saveEmoji"
          />
          <div class="sm-emoji-quick sm-emoji-scroll">
            <button
                v-for="e in allEmojis"
                :key="e"
                type="button"
                class="sm-emoji-chip"
                @click="emojiDraft = e"
            >
              {{ e }}
            </button>
          </div>
          <div class="sm-emoji-actions">
            <button type="button" class="sm-submit ghost" @click="emojiEdit = null">Отмена</button>
            <button type="button" class="sm-submit" :disabled="emojiSaving" @click="saveEmoji">
              {{ emojiSaving ? '…' : 'Сохранить' }}
            </button>
          </div>
        </div>

        <!-- Audio editor -->
        <div v-if="audioEdit" class="sm-emoji-sheet">
          <div class="sm-emoji-sheet-title">Музыка для стикера</div>
          <p class="sm-hint" style="padding: 0 0 8px">
            {{ audioEdit.audio_uuid ? 'Сейчас звук привязан. Можно заменить или удалить.' : 'Прикрепите аудио — оно будет играть при нажатии на стикер в чате.' }}
          </p>
          <label class="sm-file-btn">
            <input type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac" hidden :disabled="audioSaving" @change="onPickAudio" />
            <span class="sm-file-icon" aria-hidden="true">♪</span>
            <span class="sm-file-label">{{ audioFileName || (audioEdit.audio_uuid ? 'Заменить файл' : 'Выбрать аудио') }}</span>
          </label>
          <div class="sm-emoji-actions">
            <button type="button" class="sm-submit ghost" @click="closeAudioEdit">Отмена</button>
            <button
              v-if="audioEdit.audio_uuid"
              type="button"
              class="sm-submit ghost"
              :disabled="audioSaving"
              @click="clearAudio"
            >Убрать звук</button>
            <button type="button" class="sm-submit" :disabled="audioSaving || !audioFile" @click="saveAudio">
              {{ audioSaving ? '…' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>

      <!-- CREATE -->
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
          <input v-model="form.published" type="checkbox" class="sm-checkbox" />
          <span class="sm-check-ui" aria-hidden="true"></span>
          <span>Опубликовать в каталоге</span>
        </label>
        <button
            type="button"
            class="sm-submit sm-submit-compact"
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
import { getAllEmojis } from '../services/emojis'
import {
  fetchStickerPacks,
  fetchInstalledPacks,
  fetchPackStickers,
  installPack,
  uninstallPack,
  createPack,
  updatePack,
  createSticker,
  updateSticker,
  deleteSticker,
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
const coverUpdating = ref(false)

const emojiEdit = ref(null)
const emojiDraft = ref('')
const emojiSaving = ref(false)
const audioEdit = ref(null)
const audioFile = ref(null)
const audioFileName = ref('')
const audioSaving = ref(false)

const allEmojis = ref([])

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
  if (emojiEdit.value) {
    emojiEdit.value = null
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
  currentPack.value = { ...pack }
  view.value = 'pack'
  status.value = ''
  emojiEdit.value = null
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

async function onChangeCover(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !currentPack.value) return
  coverUpdating.value = true
  status.value = ''
  try {
    const imageUuid = crypto.randomUUID()
    await uploadFile(imageUuid, file)
    const updated = await updatePack(currentPack.value.id, { image_uuid: imageUuid })
    currentPack.value = { ...currentPack.value, ...(updated || {}), image_uuid: imageUuid }
    // sync lists
    const sync = (list) =>
        list.map((p) => (p.id === currentPack.value.id ? { ...p, image_uuid: imageUuid } : p))
    catalog.value = sync(catalog.value)
    installed.value = sync(installed.value)
    status.value = 'Обложка обновлена'
  } catch (err) {
    status.value = err.message || 'Не удалось сменить обложку'
  } finally {
    coverUpdating.value = false
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

function startEditEmoji(sticker) {
  emojiEdit.value = sticker
  emojiDraft.value = sticker.emoji || ''
}

async function saveEmoji() {
  if (!emojiEdit.value) return
  emojiSaving.value = true
  status.value = ''
  try {
    const emoji = emojiDraft.value.trim()
    await updateSticker(emojiEdit.value.id, { emoji })
    packStickers.value = packStickers.value.map((s) =>
        s.id === emojiEdit.value.id ? { ...s, emoji } : s
    )
    emojiEdit.value = null
    status.value = 'Эмодзи сохранено'
  } catch (e) {
    status.value = e.message || 'Не удалось сохранить эмодзи'
  } finally {
    emojiSaving.value = false
  }
}

function startEditAudio(sticker) {
  audioEdit.value = sticker
  audioFile.value = null
  audioFileName.value = ''
  emojiEdit.value = null
}

function closeAudioEdit() {
  audioEdit.value = null
  audioFile.value = null
  audioFileName.value = ''
}

function onPickAudio(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  audioFile.value = f
  audioFileName.value = f.name
}

async function saveAudio() {
  if (!audioEdit.value || !audioFile.value) return
  audioSaving.value = true
  status.value = ''
  try {
    const audioUuid = crypto.randomUUID()
    await uploadFile(audioUuid, audioFile.value)
    await updateSticker(audioEdit.value.id, { audio_uuid: audioUuid })
    packStickers.value = packStickers.value.map((s) =>
      s.id === audioEdit.value.id ? { ...s, audio_uuid: audioUuid } : s
    )
    closeAudioEdit()
    status.value = 'Музыка сохранена'
  } catch (e) {
    status.value = e.message || 'Не удалось сохранить музыку'
  } finally {
    audioSaving.value = false
  }
}

async function clearAudio() {
  if (!audioEdit.value) return
  audioSaving.value = true
  status.value = ''
  try {
    await updateSticker(audioEdit.value.id, { audio_uuid: '' })
    packStickers.value = packStickers.value.map((s) =>
      s.id === audioEdit.value.id ? { ...s, audio_uuid: '' } : s
    )
    closeAudioEdit()
    status.value = 'Звук убран'
  } catch (e) {
    status.value = e.message || 'Не удалось убрать звук'
  } finally {
    audioSaving.value = false
  }
}

async function onDeleteSticker(sticker) {
  if (!confirm('Удалить этот стикер?')) return
  status.value = ''
  try {
    await deleteSticker(sticker.id)
    packStickers.value = packStickers.value.filter((s) => s.id !== sticker.id)
    status.value = 'Стикер удалён'
  } catch (e) {
    status.value = e.message || 'Не удалось удалить'
  }
}

watch(view, (v) => {
  if (v === 'list') {
    currentPack.value = null
    status.value = ''
    emojiEdit.value = null
  }
})

onMounted(load)

onMounted(() => {
  allEmojis.value = getAllEmojis()
})
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
  position: relative;
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

/* Pack header with cover */
.sm-pack-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px 12px;
}

.sm-pack-cover-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.sm-pack-cover-lg {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  object-fit: cover;
  background: #e8f6fd;
  display: block;
}

.sm-pack-cover-lg.ph {
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 22px;
  color: #168dcc;
}

.sm-cover-edit {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(42, 171, 238, 0.35);
}

.sm-pack-bar-text {
  min-width: 0;
}

.sm-pack-bar-title {
  font-weight: 700;
  font-size: 16px;
  color: #163247;
}

.sm-pack-bar-sub {
  font-size: 12px;
  color: #8aa1ae;
  margin-top: 2px;
}

.sm-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 10px 12px 16px;
}

.sm-cell {
  aspect-ratio: 1;
  border-radius: 14px;
  background: #f0f7fc;
  overflow: hidden;
  display: grid;
  place-items: center;
  position: relative;
  min-width: 0;
  min-height: 96px;
}

.sm-cell img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6px;
  box-sizing: border-box;
}

.sm-cell.has-actions:hover .sm-cell-actions,
.sm-cell.has-actions:focus-within .sm-cell-actions {
  opacity: 1;
  pointer-events: auto;
}

.sm-emoji-badge {
  position: absolute;
  left: 4px;
  bottom: 4px;
  font-size: 14px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 2px 4px;
  z-index: 1;
}

.sm-audio-badge {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  font-size: 11px;
  display: grid;
  place-items: center;
  line-height: 1;
  z-index: 1;
}

.sm-cell-actions {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  align-content: center;
  gap: 6px;
  padding: 6px;
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 2;
}

.sm-mini {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #0f172a;
  font-size: 15px;
  cursor: pointer;
  display: grid;
  place-items: center;
  line-height: 1;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

.sm-mini.danger {
  color: #b91c1c;
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

.sm-cell.add.busy {
  opacity: 0.6;
  pointer-events: none;
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

/* Emoji sheet */
.sm-emoji-sheet {
  margin: 8px 12px 0;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sm-emoji-sheet-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.sm-emoji-input {
  border: none;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  font-size: 28px;
  text-align: center;
  box-shadow: inset 0 0 0 1px #e2e8f0;
}

.sm-emoji-quick {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  justify-content: center;
}

/* скролл для полного списка эмодзи */
.sm-emoji-scroll {
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
  border-radius: 12px;
  background: #fff;
  box-shadow: inset 0 0 0 1px #e2e8f0;
}

.sm-emoji-chip {
  border: none;
  background: #fff;
  border-radius: 10px;
  width: 100%;
  aspect-ratio: 1;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 0 0 1px #e2e8f0;
  display: grid;
  place-items: center;
}

.sm-emoji-chip:hover {
  background: #e0f2fe;
}

.sm-emoji-actions {
  display: flex;
  gap: 8px;
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
  gap: 10px;
  font-size: 14px;
  color: #334155;
  cursor: pointer;
  user-select: none;
  width: fit-content;
}

.sm-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.sm-check-ui {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 2px solid #94a3b8;
  background: #fff;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  transition: border-color 0.15s, background 0.15s;
}

.sm-check-ui::after {
  content: '';
  width: 10px;
  height: 6px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg) translate(1px, -1px) scale(0);
  transition: transform 0.12s ease;
}

.sm-checkbox:checked + .sm-check-ui {
  border-color: #2aabee;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
}

.sm-checkbox:checked + .sm-check-ui::after {
  transform: rotate(-45deg) translate(1px, -1px) scale(1);
}

.sm-checkbox:focus-visible + .sm-check-ui {
  box-shadow: 0 0 0 3px rgba(42, 171, 238, 0.25);
}

.sm-submit {
  border: none;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  line-height: 1.2;
}

.sm-submit-compact {
  align-self: flex-start;
  width: auto;
  min-width: 96px;
}

.sm-emoji-actions .sm-submit {
  flex: 1;
}

.sm-submit.ghost {
  background: #e2e8f0;
  color: #475569;
}

.sm-submit:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>