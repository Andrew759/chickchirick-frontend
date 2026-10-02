<template>
  <div class="profile-container">
    <div class="profile-header">
      <button type="button" class="btn-back" @click.prevent="goBack">← Назад</button>
      <h3>Профиль</h3>
    </div>

    <div v-if="isLoading" class="profile-loading">
      Загрузка профиля...
    </div>

    <div v-else-if="error" class="profile-error">
      {{ error }}
    </div>

    <div v-else class="profile-content">
      <!-- Аватар + эквалайзер по битам -->
      <div class="avatar-wrap">
        <AvatarEqualizer :size="112" :gap="5">
          <div
            class="profile-avatar"
            :class="{ clickable: photos.length > 0 }"
            @click="openViewer(0)"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="Аватар"
              class="avatar-img"
            />
            <span v-else class="avatar-letter">
              {{ user.name ? user.name.charAt(0).toUpperCase() : '?' }}
            </span>
          </div>
        </AvatarEqualizer>
      </div>

      <!-- Фотографии -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Фотографии</span>
          <span v-if="photos.length" class="section-count">{{ photos.length }}</span>
        </div>

        <div class="photos-grid">
          <button
            v-for="(photo, idx) in photos"
            :key="photo.id || photo.fileUuid"
            type="button"
            class="photo-tile"
            @click="openViewer(idx)"
          >
            <img :src="fileUrl(photo.fileUuid)" alt="" loading="lazy" />
            <button
              type="button"
              class="btn-remove"
              title="Удалить"
              @click.stop="removeMedia(photo)"
            >
              ×
            </button>
          </button>

          <button
            type="button"
            class="photo-tile photo-add"
            :disabled="isUploadingPhotos"
            @click="triggerPhotoPick"
          >
            <span class="add-label">{{ isUploadingPhotos ? '…' : '+' }}</span>
          </button>
        </div>

        <input
          ref="photoInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden-input"
          @change="onPhotosSelected"
        />
      </div>

      <!-- Музыка (как в Telegram) -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Музыка</span>
          <span v-if="tracks.length" class="section-count">{{ tracks.length }}</span>
        </div>

        <div v-if="tracks.length === 0" class="music-empty">
          Нет треков — добавьте аудиофайл
        </div>

        <div class="music-list">
          <div
            v-for="track in tracks"
            :key="track.id || track.fileUuid"
            class="music-row"
            :class="{ active: isCurrentTrack(track) }"
          >
            <button
              type="button"
              class="btn-track-play"
              @click="toggleTrack(track)"
            >
              <svg v-if="isCurrentTrack(track) && player.playing" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div class="track-meta" @click="toggleTrack(track)">
              <div class="track-name">{{ track.fileName || 'Трек' }}</div>
              <div class="track-hint">
                {{ isCurrentTrack(track) && player.playing ? 'Сейчас играет' : 'Нажмите, чтобы слушать' }}
              </div>
            </div>
            <button
              type="button"
              class="btn-remove-track"
              title="Удалить трек"
              @click="removeMedia(track)"
            >
              ×
            </button>
          </div>
        </div>

        <button
          type="button"
          class="btn-add-music"
          :disabled="isUploadingMusic"
          @click="triggerMusicPick"
        >
          {{ isUploadingMusic ? uploadProgress : '+ Добавить музыку' }}
        </button>

        <input
          ref="musicInput"
          type="file"
          accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.opus"
          multiple
          class="hidden-input"
          @change="onMusicSelected"
        />
      </div>

      <p v-if="mediaError" class="media-error">{{ mediaError }}</p>
      <p v-if="uploadProgress && isUploadingPhotos" class="media-progress">{{ uploadProgress }}</p>

      <PhotoViewer
        :open="viewerOpen"
        :items="viewerItems"
        :start-index="viewerIndex"
        @close="viewerOpen = false"
      />

      <div class="profile-info">
        <div class="info-group">
          <label>Имя и Фамилия</label>
          <p>{{ user.name || 'Не указано' }} {{ user.surname || '' }}</p>
        </div>

        <div class="info-group">
          <label>Логин</label>
          <p v-if="user.login">@{{ user.login }}</p>
          <p v-else>Не указан</p>
        </div>

        <div class="info-group">
          <label>Телефон</label>
          <p>{{ user.phone || 'Не указан' }}</p>
        </div>

        <div class="info-group" v-if="user.email">
          <label>Email</label>
          <p>{{ user.email }}</p>
        </div>
      </div>

      <button class="btn-logout" type="button" :disabled="isLoggingOut" @click="handleLogout">
        {{ isLoggingOut ? 'Выход...' : 'Выйти' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import { disconnectSocket } from '../services/socket'
import {
  getFileUrl,
  uploadFile,
  deleteFile,
  isAudioFilename,
  detectMediaKind
} from '../services/files'
import {
  fetchUserByUuid,
  fetchUserMedia,
  createUserPhoto,
  deleteUserPhoto
} from '../services/users'
import PhotoViewer from './PhotoViewer.vue'
import AvatarEqualizer from './AvatarEqualizer.vue'
import { usePlayerStore } from '../stores/player'

const META_KEY = 'cc_media_meta'

const store = useChatStore()
const player = usePlayerStore()

const user = ref({})
const isLoading = ref(true)
const error = ref(null)
const isLoggingOut = ref(false)

const userServiceId = ref(null)
/** @type {import('vue').Ref<Array<{ id: number, fileUuid: string, kind: string, fileName: string }>>} */
const media = ref([])

const isUploadingPhotos = ref(false)
const isUploadingMusic = ref(false)
const mediaError = ref('')
const uploadProgress = ref('')
const photoInput = ref(null)
const musicInput = ref(null)

const viewerOpen = ref(false)
const viewerIndex = ref(0)

const photos = computed(() => media.value.filter((m) => m.kind === 'image'))
const tracks = computed(() => media.value.filter((m) => m.kind === 'audio'))

const avatarUrl = computed(() =>
  photos.value[0] ? getFileUrl(photos.value[0].fileUuid) : ''
)

const viewerItems = computed(() =>
  photos.value.map((p, i) => ({
    src: getFileUrl(p.fileUuid),
    alt: p.fileName || `Фото ${i + 1}`,
    fileName: p.fileName || `photo-${i + 1}.jpg`
  }))
)

function fileUrl(uuid) {
  return getFileUrl(uuid)
}

function goBack() {
  store.closeMyProfile()
}

function openViewer(idx) {
  if (!photos.value.length) return
  viewerIndex.value = Math.min(Math.max(0, idx), photos.value.length - 1)
  viewerOpen.value = true
}

function isCurrentTrack(track) {
  return player.src === fileUrl(track.fileUuid)
}

function toggleTrack(track) {
  player.toggle({
    src: fileUrl(track.fileUuid),
    title: track.fileName || 'Трек',
    kind: 'music',
    queue: tracks.value.map((item) => ({
      src: fileUrl(item.fileUuid),
      title: item.fileName || 'Трек',
      kind: 'music'
    }))
  })
}

function readLocalMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveLocalMeta(fileUuid, fileName, kind) {
  const map = readLocalMeta()
  map[fileUuid] = { fileName, kind }
  try {
    localStorage.setItem(META_KEY, JSON.stringify(map))
  } catch (_) { /* quota */ }
}

function applyLocalMeta(item) {
  const map = readLocalMeta()
  const local = map[item.fileUuid]
  if (!local) return item
  return {
    ...item,
    fileName: item.fileName || local.fileName || '',
    kind: item.kind === 'file' && local.kind ? local.kind : item.kind
  }
}

async function resolveOwnUuid() {
  if (store.myProfile?.userUuid) return store.myProfile.userUuid

  try {
    const res = await fetch('/api/user/frontend/user/me', {
      method: 'GET',
      credentials: 'include'
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => ({}))
    const p = data.payload || data
    const nested = p.Payload || p.payload || p
    return (
      nested.user_uuid ||
      nested.userUuid ||
      p.user_uuid ||
      p.userUuid ||
      null
    )
  } catch {
    return null
  }
}

function syncMyProfileAvatar() {
  store.setMyProfile({
    avatarFileUuid: photos.value[0]?.fileUuid || null
  })
}

async function loadMedia(serviceId) {
  const list = await fetchUserMedia(serviceId)
  media.value = list.map(applyLocalMeta)
  syncMyProfileAvatar()
}

async function fetchUserProfile() {
  try {
    isLoading.value = true
    error.value = null

    const response = await fetch('/api/user/frontend/profile', {
      method: 'GET',
      credentials: 'include'
    })

    if (!response.ok) {
      if (response.status === 401) {
        store.setAuthenticated(false)
        throw new Error('Сессия истекла. Войдите заново.')
      }
      throw new Error(`Ошибка сервера: ${response.status}`)
    }

    const result = await response.json().catch(() => ({}))
    const payload = result?.payload ?? result?.Payload ?? result?.data ?? result?.user ?? result ?? {}
    const normalized = payload?.payload ?? payload?.Payload ?? payload?.user ?? payload
    user.value = normalized && typeof normalized === 'object' ? normalized : {}

    // Профиль должен отобразиться даже если медиа-сервис временно недоступен.
    // Сначала сохраняем основные данные, а медиа догружаем отдельно.
    const uuid =
      user.value.user_uuid ||
      user.value.userUuid ||
      user.value.uuid ||
      await resolveOwnUuid()

    let brief = null
    if (uuid) {
      brief = await fetchUserByUuid(uuid).catch(() => null)
    }

    if (brief?.id) {
      userServiceId.value = brief.id
    }

    store.setMyProfile({
      userUuid: uuid || store.myProfile?.userUuid || null,
      userServiceId: userServiceId.value || store.myProfile?.userServiceId || null,
      name: user.value.name || brief?.name || '',
      surname: user.value.surname || brief?.surname || '',
      login: user.value.login || brief?.login || '',
      avatarFileUuid: store.myProfile?.avatarFileUuid || null
    })

    // Не блокируем весь экран профиля из-за медиа-запросов.
    if (userServiceId.value) {
      try {
        await loadMedia(userServiceId.value)
      } catch (mediaErr) {
        console.warn('Не удалось загрузить медиа профиля:', mediaErr)
      }
    }
  } catch (err) {
    console.error('Не удалось загрузить профиль:', err.message)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

function triggerPhotoPick() {
  if (isUploadingPhotos.value) return
  if (!userServiceId.value) {
    mediaError.value = 'Не удалось определить id пользователя'
    return
  }
  photoInput.value?.click()
}

function triggerMusicPick() {
  if (isUploadingMusic.value) return
  if (!userServiceId.value) {
    mediaError.value = 'Не удалось определить id пользователя'
    return
  }
  musicInput.value?.click()
}

async function uploadMediaFiles(files, kind) {
  const list = Array.from(files || [])
  if (!list.length) return

  mediaError.value = ''
  let done = 0
  const total = list.length

  for (const file of list) {
    done += 1
    uploadProgress.value = `Загрузка ${done} из ${total}…`
    const fileUuid = crypto.randomUUID()
    await uploadFile(fileUuid, file)
    const res = await createUserPhoto(userServiceId.value, fileUuid)
    const payload = res?.payload || res
    const photoId = Number(payload?.id || payload?.Id) || 0
    const itemKind =
      kind ||
      detectMediaKind({ fileName: file.name, contentType: file.type })
    saveLocalMeta(fileUuid, file.name, itemKind)
    media.value.unshift({
      id: photoId,
      fileUuid,
      kind: itemKind,
      fileName: file.name || ''
    })
  }
  syncMyProfileAvatar()
}

async function onPhotosSelected(event) {
  const files = Array.from(event.target.files || []).filter((f) =>
    f.type.startsWith('image/')
  )
  event.target.value = ''
  if (!files.length) {
    mediaError.value = 'Выберите изображения'
    return
  }
  isUploadingPhotos.value = true
  try {
    await uploadMediaFiles(files, 'image')
  } catch (e) {
    console.error(e)
    mediaError.value = e.message || 'Не удалось загрузить фото'
    if (userServiceId.value) await loadMedia(userServiceId.value)
  } finally {
    isUploadingPhotos.value = false
    uploadProgress.value = ''
  }
}

async function onMusicSelected(event) {
  const files = Array.from(event.target.files || []).filter(
    (f) => f.type.startsWith('audio/') || isAudioFilename(f.name)
  )
  event.target.value = ''
  if (!files.length) {
    mediaError.value = 'Выберите аудиофайлы (mp3, ogg, wav…)'
    return
  }
  isUploadingMusic.value = true
  try {
    await uploadMediaFiles(files, 'audio')
  } catch (e) {
    console.error(e)
    mediaError.value = e.message || 'Не удалось загрузить музыку'
    if (userServiceId.value) await loadMedia(userServiceId.value)
  } finally {
    isUploadingMusic.value = false
    uploadProgress.value = ''
  }
}

async function removeMedia(item) {
  if (!item) return
  if (!confirm('Удалить?')) return
  mediaError.value = ''
  try {
    if (item.id) await deleteUserPhoto(item.id)
    try {
      if (item.fileUuid) await deleteFile(item.fileUuid)
    } catch (_) { /* ignore */ }
    media.value = media.value.filter(
      (m) => m.fileUuid !== item.fileUuid && m.id !== item.id
    )
    syncMyProfileAvatar()
  } catch (e) {
    mediaError.value = e.message || 'Не удалось удалить'
  }
}

async function handleLogout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await fetch('/api/user/frontend/logout', {
      method: 'POST',
      credentials: 'include'
    })
  } catch (e) {
    console.warn('logout request failed:', e)
  } finally {
    try { disconnectSocket() } catch (_) {}
    store.resetSession()
    isLoggingOut.value = false
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>

<style scoped>
.profile-container {
  width: 300px;
  background: white;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .profile-container {
    width: 100%;
    border-right: none;
  }

  .profile-header {
    padding-top: max(15px, env(safe-area-inset-top));
  }
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #eee;
  background: #f7f9fa;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.profile-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-back {
  background: none;
  border: none;
  color: #2aabee;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.profile-content {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-loading,
.profile-error {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.profile-error {
  color: #ea0038;
}

.avatar-wrap {
  margin-bottom: 16px;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(145deg, #54a9eb, #2aabee);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.profile-avatar.clickable {
  cursor: zoom-in;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.section {
  width: 100%;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.section-count {
  font-size: 12px;
  color: #8e8e93;
  background: #f0f0f0;
  border-radius: 10px;
  padding: 1px 8px;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.photo-tile {
  position: relative;
  aspect-ratio: 1;
  border: none;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
  cursor: zoom-in;
}

.photo-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-tile:hover .btn-remove {
  opacity: 1;
}

.btn-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-remove:hover {
  background: #ea0038;
}

.photo-add {
  cursor: pointer;
  border: 2px dashed #ccc;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-add:hover:not(:disabled) {
  border-color: #2aabee;
  background: #f0f8ff;
}

.add-label {
  font-size: 28px;
  color: #8e8e93;
  font-weight: 300;
  line-height: 1;
}

/* —— Музыка —— */
.music-empty {
  font-size: 13px;
  color: #8e8e93;
  padding: 8px 0 12px;
  text-align: center;
}

.music-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.music-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f4f5;
  border-radius: 12px;
  padding: 8px 6px 8px 8px;
  transition: background 0.15s ease;
}

.music-row.active {
  background: #e3f2fd;
}

.btn-track-play {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #2aabee;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.track-meta {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.track-name {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-hint {
  font-size: 11px;
  color: #8e8e93;
  margin-top: 2px;
}

.btn-remove-track {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}

.btn-remove-track:hover {
  color: #ea0038;
  background: rgba(234, 0, 56, 0.08);
}

.btn-add-music {
  width: 100%;
  padding: 10px;
  border: 1px dashed #2aabee;
  border-radius: 10px;
  background: #f0f8ff;
  color: #2aabee;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-add-music:hover:not(:disabled) {
  background: #e3f2fd;
}

.btn-add-music:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.media-error {
  margin: 0 0 8px;
  font-size: 12px;
  color: #ea0038;
  text-align: center;
  width: 100%;
}

.media-progress {
  margin: 0 0 8px;
  font-size: 12px;
  color: #2aabee;
  text-align: center;
  width: 100%;
}

.hidden-input {
  display: none;
}

.profile-info {
  width: 100%;
}

.info-group {
  margin-bottom: 18px;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 8px;
}

.info-group label {
  font-size: 12px;
  color: #2aabee;
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
}

.info-group p {
  margin: 0;
  font-size: 15px;
  color: #333;
}

.btn-logout {
  margin-top: 24px;
  width: 100%;
  padding: 12px;
  background: #fff;
  border: 1px solid #ea0038;
  color: #ea0038;
  border-radius: 6px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout:hover:not(:disabled) {
  background: #ea0038;
  color: white;
}

.btn-logout:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
