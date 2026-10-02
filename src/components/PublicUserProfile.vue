<template>
  <aside class="public-profile">
    <div class="profile-header">
      <button class="btn-back" type="button" @click="$emit('close')">← Назад</button>
      <h3>Профиль</h3>
    </div>

    <div v-if="isLoading" class="profile-loading">Загрузка профиля...</div>

    <div v-else-if="error" class="profile-error">{{ error }}</div>

    <div v-else class="profile-content">
      <div class="avatar-wrap">
        <AvatarEqualizer :size="112" :gap="5">
          <button
            type="button"
            class="profile-avatar"
            :class="{ clickable: photos.length > 0 }"
            @click="openViewer(0)"
          >
            <img v-if="avatarUrl" :src="avatarUrl" alt="" class="avatar-img" />
            <span v-else>{{ profileLetter }}</span>
          </button>
        </AvatarEqualizer>
      </div>

      <div class="identity">
        <div class="name">{{ fullName }}</div>
        <div v-if="user.login" class="login">@{{ user.login }}</div>
      </div>

      <div class="section" v-if="photos.length">
        <div class="section-header">
          <span class="section-title">Фотографии</span>
          <span class="section-count">{{ photos.length }}</span>
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
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">Музыка</span>
          <span v-if="tracks.length" class="section-count">{{ tracks.length }}</span>
        </div>

        <div v-if="tracks.length === 0" class="music-empty">Нет добавленной музыки</div>

        <div v-else class="music-list">
          <div
            v-for="track in tracks"
            :key="track.id || track.fileUuid"
            class="music-row"
            :class="{ active: isCurrentTrack(track) }"
          >
            <button type="button" class="btn-track-play" @click="toggleTrack(track)">
              <svg v-if="isCurrentTrack(track) && player.playing" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button type="button" class="track-meta" @click="toggleTrack(track)">
              <span class="track-name">{{ track.fileName || 'Трек' }}</span>
              <span class="track-hint">
                {{ isCurrentTrack(track) && player.playing ? 'Сейчас играет' : 'Нажмите, чтобы слушать' }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="profile-info">
        <div v-if="user.phone" class="info-group">
          <label>Телефон</label>
          <p>{{ user.phone }}</p>
        </div>
        <div v-if="user.email" class="info-group">
          <label>Email</label>
          <p>{{ user.email }}</p>
        </div>
      </div>

      <PhotoViewer
        :open="viewerOpen"
        :items="viewerItems"
        :start-index="viewerIndex"
        @close="viewerOpen = false"
      />
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getFileUrl } from '../services/files'
import { fetchUserMedia } from '../services/users'
import PhotoViewer from './PhotoViewer.vue'
import AvatarEqualizer from './AvatarEqualizer.vue'
import { usePlayerStore } from '../stores/player'

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['close'])

const player = usePlayerStore()
const media = ref([])
const isLoading = ref(false)
const error = ref('')
const viewerOpen = ref(false)
const viewerIndex = ref(0)

const user = computed(() => props.user || {})
const photos = computed(() => media.value.filter((m) => m.kind === 'image'))
const tracks = computed(() => media.value.filter((m) => m.kind === 'audio'))
const avatarUrl = computed(() => {
  const uuid = user.value.avatarFileUuid || photos.value[0]?.fileUuid
  return uuid ? getFileUrl(uuid) : ''
})
const fullName = computed(() => {
  const value = `${user.value.name || ''} ${user.value.surname || ''}`.trim()
  return value || (user.value.login ? `@${user.value.login}` : `User ${user.value.id || ''}`)
})
const profileLetter = computed(() => {
  const source = user.value.name || user.value.login || fullName.value
  return source?.charAt(0)?.toUpperCase() || '?'
})
const viewerItems = computed(() =>
  photos.value.map((photo, index) => ({
    src: getFileUrl(photo.fileUuid),
    alt: photo.fileName || `Фото ${index + 1}`,
    fileName: photo.fileName || `photo-${index + 1}.jpg`
  }))
)

function fileUrl(uuid) {
  return getFileUrl(uuid)
}

function openViewer(index) {
  if (!photos.value.length) return
  viewerIndex.value = Math.max(0, Math.min(index, photos.value.length - 1))
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

async function loadMedia() {
  const serviceId = Number(user.value.userServiceId)
  if (!serviceId) {
    media.value = []
    return
  }

  isLoading.value = true
  error.value = ''
  try {
    media.value = await fetchUserMedia(serviceId)
  } catch (e) {
    console.warn('Не удалось загрузить медиа профиля:', e)
    error.value = 'Не удалось загрузить профиль'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => user.value.userServiceId,
  () => loadMedia(),
  { immediate: true }
)
</script>

<style scoped>
.public-profile {
  width: 320px;
  flex: 0 0 320px;
  background: #fff;
  border-left: 1px solid #e4edf2;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  min-height: 0;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  background: #f7fbfd;
  position: sticky;
  top: 0;
  z-index: 2;
}

.profile-header h3 {
  margin: 0;
  font-size: 17px;
  color: #163247;
}

.btn-back {
  border: none;
  background: transparent;
  color: #168dcc;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 4px 0;
}

.profile-loading,
.profile-error {
  padding: 40px 20px;
  text-align: center;
  color: #718895;
  font-size: 14px;
}

.profile-error { color: #d92d54; }

.profile-content {
  padding: 24px 18px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-wrap { margin-bottom: 12px; }

.profile-avatar {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(145deg, #54a9eb, #2aabee);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  overflow: hidden;
}

.profile-avatar.clickable { cursor: zoom-in; }

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.identity {
  text-align: center;
  margin-bottom: 24px;
}

.identity .name {
  font-size: 20px;
  font-weight: 700;
  color: #163247;
}

.identity .login {
  margin-top: 4px;
  font-size: 14px;
  color: #7b919d;
}

.section {
  width: 100%;
  margin-bottom: 22px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 650;
  color: #334e5e;
}

.section-count {
  font-size: 12px;
  color: #6e8794;
  background: #edf3f6;
  border-radius: 10px;
  padding: 2px 8px;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.photo-tile {
  aspect-ratio: 1;
  border: 0;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f4f6;
  cursor: zoom-in;
}

.photo-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.music-empty {
  padding: 8px 0;
  color: #8a9aa3;
  font-size: 13px;
  text-align: center;
}

.music-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.music-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  background: #f4f7f8;
}

.music-row.active { background: #e4f5fd; }

.btn-track-play {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #2aabee;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-meta {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.track-name,
.track-hint {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-name { font-size: 13px; font-weight: 600; color: #17384d; }
.track-hint { margin-top: 2px; font-size: 11px; color: #8497a1; }

.profile-info { width: 100%; }

.info-group {
  border-bottom: 1px solid #f0f3f5;
  padding: 0 0 9px;
  margin-bottom: 14px;
}

.info-group label {
  display: block;
  margin-bottom: 4px;
  color: #2aabee;
  font-size: 12px;
  font-weight: 600;
}

.info-group p { margin: 0; color: #334e5e; font-size: 14px; }
</style>
