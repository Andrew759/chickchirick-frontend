<template>
  <aside class="public-profile group-profile channel-profile">
    <div class="profile-header">
      <button class="btn-back" type="button" @click="$emit('close')">← Назад</button>
      <h3>Канал</h3>
    </div>

    <div class="profile-content">
      <div class="hero">
        <div class="avatar-wrap">
          <AvatarEqualizer :size="88" :gap="5">
            <button
              type="button"
              class="profile-avatar"
              :class="{ clickable: !!avatarUrl }"
              @click="openAvatar"
            >
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="avatar-img" />
              <span v-else class="avatar-letter">{{ titleLetter }}</span>
            </button>
          </AvatarEqualizer>
        </div>
        <div class="identity">
          <div class="name">{{ title }}</div>
          <div class="meta">{{ memberCountLabel }}</div>
          <div class="badges">
            <span v-if="isPublic" class="badge">публичный</span>
            <span v-else class="badge badge-priv">приватный</span>
            <span v-if="e2eeEnabled" class="badge badge-e2ee">E2EE</span>
            <span v-if="myRole" class="badge badge-role">{{ roleLabel(myRole) }}</span>
          </div>
        </div>
      </div>

      <div class="section card profile-info">
        <div class="info-group">
          <label>Название</label>
          <p>{{ title || 'Не указано' }}</p>
        </div>
        <div class="info-group">
          <label>Описание</label>
          <p class="desc-text">{{ description?.trim() ? description : 'Не указано' }}</p>
        </div>
      </div>

      <!-- Музыка -->
      <div class="section card">
        <div class="section-header">
          <span class="section-title">Музыка</span>
          <span v-if="tracks.length" class="section-count">{{ tracks.length }}</span>
        </div>

        <div v-if="tracks.length === 0" class="music-empty">Нет треков — добавьте аудиофайл</div>
        <div v-else class="music-list">
          <div
            v-for="track in tracks"
            :key="track.fileUuid"
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
            <div class="track-meta" @click="toggleTrack(track)">
              <div class="track-name">{{ track.fileName || 'Трек' }}</div>
              <div class="track-hint">
                {{ isCurrentTrack(track) && player.playing ? 'Сейчас играет' : 'Нажмите, чтобы слушать' }}
              </div>
            </div>
            <button
              v-if="canEdit"
              type="button"
              class="btn-remove-track"
              title="Удалить трек"
              @click="removeTrack(track)"
            >×</button>
          </div>
        </div>

        <button
          v-if="canEdit"
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
        <p v-if="mediaError" class="status-line error">{{ mediaError }}</p>
      </div>

      <p v-if="loading" class="status-line">Обновление…</p>
      <p v-if="error" class="status-line error">{{ error }}</p>
      <p v-if="saveError" class="status-line error">{{ saveError }}</p>
      <p v-if="actionMsg" class="status-line ok">{{ actionMsg }}</p>
      <p v-if="actionErr" class="status-line error">{{ actionErr }}</p>

      <!-- Настройки owner/admin -->
      <div v-if="canEdit" class="section card settings-card">
        <div class="section-header">
          <span class="section-title">Настройки</span>
        </div>

        <div class="field-block">
          <label class="field-label" for="ch-edit-title">Название</label>
          <div class="edit-row">
            <input
              id="ch-edit-title"
              v-model="editTitle"
              type="text"
              maxlength="80"
              class="edit-input"
              placeholder="Название канала"
            />
            <button
              type="button"
              class="btn-ok"
              :disabled="saving || !editTitle.trim() || editTitle.trim() === title"
              @click="saveTitle"
            >
              {{ saving ? '…' : 'OK' }}
            </button>
          </div>
        </div>

        <div class="field-block">
          <label class="field-label" for="ch-edit-desc">Описание</label>
          <div class="edit-row">
            <input
              id="ch-edit-desc"
              v-model="editDescription"
              type="text"
              maxlength="500"
              class="edit-input"
              placeholder="О чём канал"
            />
            <button
              type="button"
              class="btn-ok"
              :disabled="saving || editDescription === description"
              @click="saveDescription"
            >
              {{ saving ? '…' : 'OK' }}
            </button>
          </div>
        </div>

        <label class="pretty-check" :class="{ disabled: saving }">
          <input
            type="checkbox"
            class="pretty-check-input"
            v-model="editIsPublic"
            :disabled="saving"
            @change="savePublic"
          />
          <span class="pretty-check-ui" aria-hidden="true"></span>
          <span class="pretty-check-label">Публичный канал</span>
        </label>

        <label class="btn-file" :class="{ disabled: saving }">
          <input type="file" accept="image/*" hidden :disabled="saving" @change="onAvatarFile" />
          <span class="btn-file-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M9 3 7.17 5H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.2A2.8 2.8 0 1 0 12 8.2a2.8 2.8 0 0 0 0 5.6z"/>
            </svg>
          </span>
          {{ saving ? 'Загрузка…' : 'Сменить фото' }}
        </label>
      </div>

      <!-- Подписчики -->
      <div class="section card">
        <div class="section-header">
          <span class="section-title">Подписчики</span>
          <span class="section-count">{{ membersView.length || memberCountHint }}</span>
        </div>

        <button
          v-if="canEdit"
          type="button"
          class="btn-add-members"
          :class="{ open: showAdd }"
          @click="showAdd = !showAdd"
        >
          {{ showAdd ? 'Скрыть поиск' : 'Добавить подписчиков' }}
        </button>

        <div v-if="canEdit && showAdd" class="add-block">
          <input
            v-model="query"
            type="text"
            class="edit-input"
            placeholder="Поиск по логину…"
            @input="onSearchInput"
          />
          <p v-if="searchLoading" class="status-line">Поиск…</p>
          <p v-if="searchError" class="status-line error">{{ searchError }}</p>
          <div v-if="results.length" class="member-list pick-list">
            <button
              v-for="u in results"
              :key="u.id"
              type="button"
              class="member-row"
              :class="{ on: isPicked(u), muted: isAlreadyMember(u) }"
              :disabled="isAlreadyMember(u)"
              @click="togglePick(u)"
            >
              <span class="member-avatar letter" :style="{ background: colorFor(u.id) }">
                {{ letter(u) }}
              </span>
              <span class="member-meta">
                <span class="member-name">{{ fullName(u) }}</span>
                <span class="member-role">
                  {{ isAlreadyMember(u) ? 'уже подписан' : (u.login ? '@' + u.login : '') }}
                </span>
              </span>
              <span v-if="isPicked(u)" class="check">✓</span>
            </button>
          </div>
          <button
            type="button"
            class="btn-ok full"
            :disabled="!picked.length || adding"
            @click="submitAdd"
          >
            {{ adding ? '…' : `Добавить (${picked.length})` }}
          </button>
          <p v-if="addError" class="status-line error">{{ addError }}</p>
          <p v-if="addOk" class="status-line ok">{{ addOk }}</p>
        </div>

        <div class="member-list">
          <div v-for="m in membersView" :key="m.user_id" class="member-row static">
            <span class="member-avatar letter" :style="{ background: colorFor(m.user_id) }">
              {{ m.letter }}
            </span>
            <span class="member-meta">
              <span class="member-name">{{ m.displayName }}</span>
              <span class="member-role">{{ roleLabel(m.role) }}</span>
            </span>
            <button
              v-if="canKick(m)"
              type="button"
              class="btn-kick"
              title="Удалить"
              @click="kickMember(m)"
            >×</button>
          </div>
          <p v-if="!membersView.length && !loading" class="status-line">Нет подписчиков</p>
        </div>
      </div>

      <!-- Действия -->
      <div class="actions-block">
        <button
          v-if="isPublic && !isMember"
          type="button"
          class="btn-action"
          :disabled="acting"
          @click="doSubscribe"
        >
          Подписаться
        </button>
        <button
          v-if="isMember && myRole !== 'owner'"
          type="button"
          class="btn-logout"
          :disabled="acting"
          @click="doUnsubscribe"
        >
          Отписаться
        </button>
        <button
          v-if="myRole === 'owner'"
          type="button"
          class="btn-logout"
          :disabled="acting"
          @click="doDelete"
        >
          Удалить канал
        </button>
      </div>
    </div>

    <PhotoViewer
      :open="viewerOpen"
      :items="viewerItems"
      :start-index="0"
      @close="viewerOpen = false"
    />
  </aside>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { getFileUrl, uploadFile, deleteFile, isAudioFilename } from '../services/files'
import { searchUsers, resolveMessagesIdByUuid, resolveChatUsers } from '../services/users'
import {
  getChannel,
  updateChannel,
  deleteChannel,
  listChannelMembers,
  addChannelMembers,
  subscribeChannel,
  unsubscribeChannel,
  listChannelMedia,
  addChannelMedia,
  removeChannelMedia
} from '../services/channels'
import PhotoViewer from './PhotoViewer.vue'
import AvatarEqualizer from './AvatarEqualizer.vue'
import { usePlayerStore } from '../stores/player'

const props = defineProps({
  channel: { type: Object, required: true }
})
const emit = defineEmits(['close', 'updated', 'open-user', 'deleted'])

const store = useChatStore()
const player = usePlayerStore()

const channelData = ref(null)
const tracks = ref([])
const isUploadingMusic = ref(false)
const mediaError = ref('')
const uploadProgress = ref('')
const musicInput = ref(null)
const members = ref([])
const membersMeta = ref({})
const loading = ref(false)
const error = ref('')
const saving = ref(false)
const saveError = ref('')
const acting = ref(false)
const actionMsg = ref('')
const actionErr = ref('')

const editTitle = ref('')
const editDescription = ref('')
const editIsPublic = ref(false)

const showAdd = ref(false)
const query = ref('')
const results = ref([])
const picked = ref([])
const searchLoading = ref(false)
const searchError = ref('')
const adding = ref(false)
const addError = ref('')
const addOk = ref('')
let searchDebounce = null

const viewerOpen = ref(false)

const COLORS = [
  '#e17076', '#faa774', '#a695e7', '#7bc862',
  '#6ec9cb', '#65aadd', '#ee7aae', '#eeb620'
]

const channelUuid = computed(() => {
  let u =
    channelData.value?.channel_uuid ||
    channelData.value?.channelUuid ||
    props.channel?.channel_uuid ||
    props.channel?.channelUuid ||
    props.channel?.channelId ||
    ''
  u = String(u || '')
  if (u.startsWith('channel:')) u = u.slice(8)
  return u
})

const title = computed(
  () =>
    channelData.value?.title ||
    props.channel?.title ||
    props.channel?.name ||
    'Канал'
)

const description = computed(
  () =>
    channelData.value?.description ??
    props.channel?.description ??
    ''
)

const titleLetter = computed(() => (title.value.trim()[0] || 'К').toUpperCase())

const avatarUuid = computed(
  () =>
    channelData.value?.avatar_file_uuid ||
    channelData.value?.avatarFileUuid ||
    props.channel?.avatar_file_uuid ||
    props.channel?.avatarFileUuid ||
    null
)

const avatarUrl = computed(() => (avatarUuid.value ? getFileUrl(avatarUuid.value) : ''))

const isPublic = computed(() =>
  Boolean(
    channelData.value?.is_public ??
    channelData.value?.isPublic ??
    props.channel?.is_public ??
    props.channel?.isPublic
  )
)

const e2eeEnabled = computed(() => {
  const v =
    channelData.value?.e2ee_enabled ??
    channelData.value?.e2eeEnabled ??
    props.channel?.e2ee_enabled ??
    props.channel?.e2eeEnabled
  return v !== false
})

const myRole = computed(() => {
  const fromApi =
    channelData.value?.my_role ||
    channelData.value?.myRole ||
    props.channel?.my_role ||
    props.channel?.myRole ||
    ''
  if (fromApi) return String(fromApi).toLowerCase()
  const me = Number(store.myUserId)
  for (const m of members.value || []) {
    if (Number(m.user_id ?? m.userId) === me) {
      return String(m.role || 'subscriber').toLowerCase()
    }
  }
  return ''
})

const isMember = computed(() => Boolean(myRole.value))

const memberCountHint = computed(
  () =>
    members.value.length ||
    channelData.value?.member_count ||
    props.channel?.member_count ||
    props.channel?.memberCount ||
    0
)

const memberCountLabel = computed(() => {
  const n = Number(memberCountHint.value) || 0
  if (n === 1) return '1 подписчик'
  if (n >= 2 && n <= 4) return `${n} подписчика`
  return `${n} подписчиков`
})

const canEdit = computed(() => {
  const role = String(myRole.value || '').toLowerCase()
  if (role === 'owner' || role === 'admin') return true
  const createdBy = Number(
    channelData.value?.created_by ??
    channelData.value?.createdBy ??
    props.channel?.created_by ??
    props.channel?.createdBy ??
    0
  )
  return Boolean(createdBy && createdBy === Number(store.myUserId))
})

function roleLabel(role) {
  const r = String(role || '').toLowerCase()
  if (r === 'owner') return 'владелец'
  if (r === 'admin') return 'админ'
  if (r === 'subscriber') return 'подписчик'
  return r || 'подписчик'
}

function colorFor(id) {
  const n = Number(id) || 0
  return COLORS[Math.abs(n) % COLORS.length]
}

function fullName(user) {
  const n = `${user.name || ''} ${user.surname || ''}`.trim()
  return n || (user.login ? `@${user.login}` : `User ${user.id}`)
}

function letter(user) {
  const n = (user.name || user.login || '?').trim()
  return (n[0] || '?').toUpperCase()
}

const membersView = computed(() => {
  return (members.value || [])
    .map((m) => {
      const uid = Number(m.user_id ?? m.userId ?? 0)
      const meta = membersMeta.value[uid] || store.usersById[uid] || {}
      const name = [meta.name, meta.surname].filter(Boolean).join(' ').trim()
      const displayName = name || (meta.login ? `@${meta.login}` : `User ${uid}`)
      return {
        user_id: uid,
        role: m.role || 'subscriber',
        displayName,
        letter: (displayName[0] || '?').toUpperCase()
      }
    })
    .sort((a, b) => {
      const rank = { owner: 0, admin: 1, subscriber: 2 }
      return (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.displayName.localeCompare(b.displayName)
    })
})

function isAlreadyMember(user) {
  // user is from user-service; match by resolved messages id is hard — use login heuristic via membersMeta
  const login = (user.login || '').toLowerCase()
  if (!login) return false
  for (const m of membersView.value) {
    const meta = membersMeta.value[m.user_id] || store.usersById[m.user_id] || {}
    if ((meta.login || '').toLowerCase() === login) return true
  }
  return false
}

function isPicked(user) {
  return picked.value.some((u) => u.id === user.id)
}

function togglePick(user) {
  if (isAlreadyMember(user)) return
  if (isPicked(user)) {
    picked.value = picked.value.filter((u) => u.id !== user.id)
  } else {
    picked.value = [...picked.value, user]
  }
}

function canKick(m) {
  if (!canEdit.value) return false
  if (m.role === 'owner') return false
  if (myRole.value === 'admin' && m.role === 'admin') return false
  return true
}

const viewerItems = computed(() => {
  if (!avatarUrl.value) return []
  return [{
    src: avatarUrl.value,
    alt: title.value || 'Канал',
    caption: title.value || 'Канал',
    fileName: 'channel-avatar.jpg'
  }]
})

function openAvatar() {
  if (!avatarUrl.value) return
  viewerOpen.value = true
}

function onSearchInput() {
  clearTimeout(searchDebounce)
  searchError.value = ''
  const q = query.value.trim()
  if (q.length < 2) {
    results.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchDebounce = setTimeout(async () => {
    try {
      results.value = await searchUsers(q)
    } catch (e) {
      searchError.value = e.message || 'Ошибка поиска'
      results.value = []
    } finally {
      searchLoading.value = false
    }
  }, 280)
}

async function loadMembers(uuid) {
  const list = await listChannelMembers(uuid)
  members.value = list || []
  const ids = members.value.map((m) => Number(m.user_id ?? m.userId)).filter(Boolean)
  try {
    const users = await resolveChatUsers(ids)
    if (users && typeof users === 'object') {
      // resolveChatUsers may return map or array depending on implementation
      if (Array.isArray(users)) {
        for (const u of users) {
          const mid = Number(u.messagesId || u.messages_id || u.id)
          if (mid) membersMeta.value[mid] = u
        }
      } else {
        for (const [mid, u] of Object.entries(users)) {
          membersMeta.value[Number(mid)] = u
        }
      }
      store.setUsersInfo?.(users)
    }
  } catch (e) {
    console.warn('load channel member meta:', e)
  }
}


function mediaStorageKey(uuid) {
  return `cc_channel_media_${uuid}`
}

async function loadTracksFromServer(uuid) {
  if (!uuid) {
    tracks.value = []
    return
  }

  // Read the shared server-side list first. This is the source of truth.
  let remote = await listChannelMedia(uuid)
  let normalized = (Array.isArray(remote) ? remote : []).map((item) => ({
    fileUuid: item.file_uuid || item.fileUuid,
    fileName: item.file_name || item.fileName || 'Трек',
    kind: item.kind || 'audio'
  })).filter((item) => item.fileUuid)

  // One-time migration for tracks created by the old localStorage-only version.
  // Only an owner/admin can migrate them; ordinary members never overwrite server data.
  if (canEdit.value) {
    try {
      const legacy = JSON.parse(localStorage.getItem(mediaStorageKey(uuid)) || '[]')
      const known = new Set(normalized.map((item) => item.fileUuid))
      let migrated = false
      for (const item of (Array.isArray(legacy) ? legacy : [])) {
        if (!item?.fileUuid || known.has(item.fileUuid)) continue
        await addChannelMedia(uuid, item)
        known.add(item.fileUuid)
        migrated = true
      }
      if (migrated) remote = await listChannelMedia(uuid)
      if (Array.isArray(legacy) && legacy.length) localStorage.removeItem(mediaStorageKey(uuid))
      if (migrated) {
        normalized = (Array.isArray(remote) ? remote : []).map((item) => ({
          fileUuid: item.file_uuid || item.fileUuid,
          fileName: item.file_name || item.fileName || 'Трек',
          kind: item.kind || 'audio'
        })).filter((item) => item.fileUuid)
      }
    } catch (e) {
      // Keep legacy data if migration fails; still show the server list.
      console.warn('channel media legacy migration failed:', e)
    }
  }
  tracks.value = normalized
}

function fileUrl(uuid) {
  return getFileUrl(uuid)
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

function triggerMusicPick() {
  musicInput.value?.click()
}

async function onMusicSelected(e) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  const uuid = channelUuid.value
  if (!files.length || !uuid) return
  isUploadingMusic.value = true
  mediaError.value = ''
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      uploadProgress.value = `Загрузка ${i + 1}/${files.length}…`
      if (!file.type.startsWith('audio/') && !isAudioFilename(file.name)) {
        // still allow by extension
        if (!/\.(mp3|ogg|oga|opus|wav|m4a|aac|flac)$/i.test(file.name || '')) {
          mediaError.value = `Пропуск: ${file.name}`
          continue
        }
      }
      const fileUuid = crypto.randomUUID()
      await uploadFile(fileUuid, file)
      const track = { fileUuid, fileName: file.name || 'Трек', kind: 'audio' }
      try {
        await addChannelMedia(uuid, track)
      } catch (linkError) {
        // Do not leave an orphaned file when the channel association fails.
        await deleteFile(fileUuid).catch(() => {})
        throw linkError
      }
      tracks.value = [...tracks.value, track]
    }
    uploadProgress.value = ''
  } catch (err) {
    mediaError.value = err.message || 'Не удалось загрузить музыку'
  } finally {
    isUploadingMusic.value = false
    uploadProgress.value = ''
  }
}

async function removeTrack(track) {
  const uuid = channelUuid.value
  if (!uuid || !track?.fileUuid) return
  mediaError.value = ''
  try {
    await removeChannelMedia(uuid, track.fileUuid)
    tracks.value = tracks.value.filter((t) => t.fileUuid !== track.fileUuid)
    await deleteFile(track.fileUuid)
  } catch (e) {
    mediaError.value = e.message || 'Не удалось удалить трек'
  }
}

async function loadAll() {
  const uuid = channelUuid.value
  if (!uuid) {
    error.value = 'Нет идентификатора канала'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const ch = await getChannel(uuid)
    channelData.value = ch
    editTitle.value = ch.title || ''
    editDescription.value = ch.description || ''
    editIsPublic.value = Boolean(ch.is_public)
    await loadMembers(uuid)
    await loadTracksFromServer(uuid)
    store.ensureChannelChat(ch)
  } catch (e) {
    error.value = e.message || 'Не удалось загрузить канал'
  } finally {
    loading.value = false
  }
}

async function saveTitle() {
  const uuid = channelUuid.value
  const t = editTitle.value.trim()
  if (!uuid || !t || t === title.value) return
  saving.value = true
  saveError.value = ''
  try {
    const ch = await updateChannel(uuid, { title: t })
    channelData.value = { ...channelData.value, ...ch }
    store.ensureChannelChat(ch)
    emit('updated', ch)
  } catch (e) {
    saveError.value = e.message || 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

async function saveDescription() {
  const uuid = channelUuid.value
  if (!uuid) return
  saving.value = true
  saveError.value = ''
  try {
    const ch = await updateChannel(uuid, { description: editDescription.value })
    channelData.value = { ...channelData.value, ...ch }
    store.ensureChannelChat(ch)
    emit('updated', ch)
  } catch (e) {
    saveError.value = e.message || 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

async function savePublic() {
  const uuid = channelUuid.value
  if (!uuid) return
  saving.value = true
  saveError.value = ''
  try {
    const ch = await updateChannel(uuid, { is_public: editIsPublic.value })
    channelData.value = { ...channelData.value, ...ch }
    store.ensureChannelChat(ch)
    emit('updated', ch)
  } catch (e) {
    saveError.value = e.message || 'Не удалось сохранить'
    editIsPublic.value = isPublic.value
  } finally {
    saving.value = false
  }
}

async function onAvatarFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !channelUuid.value) return
  if (!file.type.startsWith('image/')) {
    saveError.value = 'Нужно изображение'
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    const fileUuid = crypto.randomUUID()
    await uploadFile(fileUuid, file)
    const ch = await updateChannel(channelUuid.value, { avatar_file_uuid: fileUuid })
    channelData.value = { ...channelData.value, ...ch }
    store.ensureChannelChat(ch)
    emit('updated', ch)
  } catch (err) {
    saveError.value = err.message || 'Не удалось загрузить фото'
  } finally {
    saving.value = false
  }
}

async function submitAdd() {
  if (!picked.value.length || adding.value) return
  const uuid = channelUuid.value
  if (!uuid) return
  adding.value = true
  addError.value = ''
  addOk.value = ''
  try {
    const memberIds = []
    for (const u of picked.value) {
      try {
        const mid = await resolveMessagesIdByUuid(u.userUuid || u.user_uuid)
        if (mid) memberIds.push(Number(mid))
      } catch (e) {
        console.warn('resolve member', u, e)
      }
    }
    if (!memberIds.length) {
      addError.value = 'Не удалось сопоставить пользователей с мессенджером'
      return
    }
    const res = await addChannelMembers(uuid, memberIds)
    const n = res?.added ?? memberIds.length
    addOk.value = n ? `Добавлено: ${n}` : 'Никого не добавлено'
    picked.value = []
    query.value = ''
    results.value = []
    await loadMembers(uuid)
    const ch = {
      channel_uuid: uuid,
      title: title.value,
      member_count: members.value.length,
      avatar_file_uuid: avatarUuid.value,
      is_public: isPublic.value,
      e2ee_enabled: e2eeEnabled.value
    }
    store.ensureChannelChat(ch)
    emit('updated', ch)
  } catch (e) {
    addError.value = e.message || 'Не удалось добавить'
  } finally {
    adding.value = false
  }
}

async function kickMember(m) {
  const uuid = channelUuid.value
  if (!uuid || !m?.user_id) return
  if (!confirm(`Удалить ${m.displayName} из канала?`)) return
  try {
    const res = await fetch(`/api/messages/channels/${encodeURIComponent(uuid)}/members/${m.user_id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `remove failed: ${res.status}`)
    }
    await loadMembers(uuid)
    store.ensureChannelChat({
      channel_uuid: uuid,
      title: title.value,
      member_count: members.value.length
    })
  } catch (e) {
    actionErr.value = e.message || 'Не удалось удалить'
  }
}

async function doSubscribe() {
  const uuid = channelUuid.value
  if (!uuid) return
  acting.value = true
  actionErr.value = ''
  try {
    const ch = await subscribeChannel(uuid)
    channelData.value = ch
    await loadMembers(uuid)
    store.ensureChannelChat(ch)
    store.openChannelChat(ch)
    actionMsg.value = 'Вы подписались'
    emit('updated', ch)
  } catch (e) {
    actionErr.value = e.message || 'Не удалось подписаться'
  } finally {
    acting.value = false
  }
}

async function doUnsubscribe() {
  const uuid = channelUuid.value
  if (!uuid) return
  if (!confirm('Отписаться от канала?')) return
  acting.value = true
  actionErr.value = ''
  try {
    await unsubscribeChannel(uuid)
    actionMsg.value = 'Вы отписались'
    emit('deleted', uuid)
    emit('close')
  } catch (e) {
    actionErr.value = e.message || 'Не удалось отписаться'
  } finally {
    acting.value = false
  }
}

async function doDelete() {
  const uuid = channelUuid.value
  if (!uuid) return
  if (!confirm('Удалить канал безвозвратно?')) return
  acting.value = true
  actionErr.value = ''
  try {
    await deleteChannel(uuid)
    emit('deleted', uuid)
    emit('close')
  } catch (e) {
    actionErr.value = e.message || 'Не удалось удалить'
  } finally {
    acting.value = false
  }
}

watch(
  () => props.channel,
  () => {
    loadAll()
  },
  { immediate: false }
)

onMounted(() => {
  editTitle.value = title.value
  editDescription.value = description.value
  editIsPublic.value = isPublic.value
  loadAll()
})
</script>

<style scoped>
.channel-profile .badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(100, 140, 255, 0.15);
  color: #4a7dff;
}
.badge-priv {
  background: rgba(120, 120, 120, 0.15);
  color: #888;
}
.badge-e2ee {
  background: rgba(50, 180, 100, 0.15);
  color: #2a9d5c;
}
.badge-role {
  background: rgba(180, 100, 200, 0.12);
  color: #a05bc0;
}
.channel-desc {
  margin: 0 16px 12px;
  font-size: 14px;
  line-height: 1.4;
  opacity: 0.85;
  white-space: pre-wrap;
}
.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 14px;
  cursor: pointer;
}
.actions-block {
  margin-top: 8px;
  padding: 0 4px 8px;
}
.btn-action {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: none;
  background: #4a7dff;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 6px;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
/* .btn-logout — shared styles in style.css (как «Выйти» в профиле) */
.btn-kick {
  border: none;
  background: transparent;
  color: #e05a5a;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}
.btn-save.full {
  width: 100%;
  margin-top: 8px;
}
.member-row.muted {
  opacity: 0.5;
}
.member-row.on {
  background: rgba(74, 125, 255, 0.08);
}
.member-row.static {
  cursor: default;
}
.add-block {
  margin-bottom: 12px;
}
/* reuse group-profile layout classes from global/GroupProfile if present */
.public-profile {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-secondary, #fff);
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.btn-back {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}
.profile-content {
  flex: 1;
  overflow: auto;
  padding-bottom: 24px;
}
.hero {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 20px 16px 12px;
}
.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: #4a7dff;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}
.profile-avatar.clickable { cursor: pointer; }
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.identity .name {
  font-size: 18px;
  font-weight: 700;
}
.identity .meta {
  font-size: 13px;
  opacity: 0.65;
  margin-top: 2px;
}
.section.card {
  margin: 8px 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(0,0,0,0.03);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.section-title {
  font-weight: 600;
  font-size: 14px;
}
.section-count {
  font-size: 12px;
  opacity: 0.6;
}
.edit-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.edit-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.12);
  background: var(--bg-primary, #fff);
  font-size: 14px;
}
.btn-save {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #4a7dff;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
.btn-save:disabled {
  opacity: 0.4;
  cursor: default;
}
.btn-file {
  display: inline-block;
  margin-top: 4px;
  font-size: 13px;
  color: #4a7dff;
  cursor: pointer;
}
.btn-add-members {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed rgba(74,125,255,0.4);
  background: transparent;
  color: #4a7dff;
  cursor: pointer;
}
.member-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 10px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  width: 100%;
  color: var(--ch-text, #163247);
}
.member-avatar.letter {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.member-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.member-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ch-text, #163247);
}
.member-role {
  font-size: 12px;
  color: var(--ch-muted, #6b8494);
  opacity: 1;
}
.check {
  color: #4a7dff;
  font-weight: 700;
}
.status-line {
  margin: 6px 16px;
  font-size: 13px;
  opacity: 0.7;
}
.status-line.error { color: #e05a5a; opacity: 1; }
.status-line.ok { color: #2a9d5c; opacity: 1; }

.profile-info .info-group {
  margin-bottom: 12px;
}
.profile-info .info-group:last-child {
  margin-bottom: 0;
}
.profile-info label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.55;
  margin-bottom: 4px;
  text-transform: none;
}
.profile-info p {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  word-break: break-word;
}
.desc-text {
  white-space: pre-wrap;
}
/* Музыка — как в профиле пользователя */
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
  background: var(--music-row-bg, #f4f4f5);
  border-radius: 12px;
  padding: 8px 6px 8px 8px;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.music-row.active {
  background: var(--music-row-active-bg, #e3f2fd);
  box-shadow: var(--music-row-active-shadow, none);
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
/* .btn-add-music — shared styles in style.css */
.hidden-input {
  display: none;
}

/* —— Settings —— */
.settings-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  font-weight: 650;
  color: var(--ch-muted, #6b8494);
}
.edit-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.edit-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ch-input-border, #d7e3ec);
  background: var(--ch-input-bg, #fff);
  color: var(--ch-text, #163247);
  font-size: 14px;
  outline: none;
}
.edit-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
}

.btn-ok {
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  height: 40px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-weight: 650;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(42, 171, 238, 0.25);
}
.btn-ok:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn-ok:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-ok.full {
  width: 100%;
  margin-top: 8px;
  height: 42px;
}
.btn-ok:disabled {
  opacity: 0.45;
  cursor: default;
  box-shadow: none;
}

/* Pretty checkbox */
.pretty-check {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--ch-text, #163247);
}
.pretty-check.disabled {
  opacity: 0.55;
  cursor: default;
  pointer-events: none;
}
.pretty-check input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.pretty-check-box {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid #9ec9e0;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  flex-shrink: 0;
  transition: background .15s, border-color .15s, color .15s, box-shadow .15s;
}
.pretty-check input:checked + .pretty-check-box {
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 6px rgba(42, 171, 238, 0.35);
}
.pretty-check input:focus-visible + .pretty-check-box {
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
}
.pretty-check-label {
  font-weight: 550;
}

/* Change photo button */
.btn-file {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  padding: 11px 14px;
  background: #e8f6fd;
  color: #0b6ea8;
  font-weight: 650;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .15s, filter .15s;
}
.btn-file:hover:not(.disabled) {
  background: #d7f0fc;
}
.btn-file.disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}
.btn-file-icon {
  display: inline-flex;
  opacity: 0.9;
}

:global(html[data-theme="dark"]) .channel-profile {
  --ch-text: #e6edf3;
  --ch-muted: #8b9aab;
  --ch-input-bg: #1a222c;
  --ch-input-border: #2a3442;
}
:global(html[data-theme="dark"]) .btn-ok {
  background: linear-gradient(135deg, #2b8ec4, #1f6f9c);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
:global(html[data-theme="dark"]) .edit-input {
  background: var(--ch-input-bg);
  border-color: var(--ch-input-border);
  color: var(--ch-text);
}
:global(html[data-theme="dark"]) .edit-input:focus {
  border-color: #55b8e8;
  box-shadow: 0 0 0 3px rgba(85, 184, 232, 0.2);
}
:global(html[data-theme="dark"]) .pretty-check-box {
  background: #1a222c;
  border-color: #3a4a5c;
}
:global(html[data-theme="dark"]) .pretty-check input:checked + .pretty-check-box {
  background: linear-gradient(135deg, #2b8ec4, #1f6f9c);
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
:global(html[data-theme="dark"]) .pretty-check-label,
:global(html[data-theme="dark"]) .field-label {
  color: var(--ch-muted);
}
:global(html[data-theme="dark"]) .pretty-check {
  color: var(--ch-text);
}
:global(html[data-theme="dark"]) .btn-file {
  background: rgba(85, 184, 232, 0.12);
  color: #7ec8ec;
  border-color: rgba(85, 184, 232, 0.2);
}
:global(html[data-theme="dark"]) .btn-file:hover:not(.disabled) {
  background: rgba(85, 184, 232, 0.2);
}


.pretty-check {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--ch-text, #163247);
}
.pretty-check.disabled {
  opacity: 0.55;
  cursor: default;
  pointer-events: none;
}
.pretty-check-input {
  position: absolute;
  inset: 0 auto 0 0;
  width: 22px;
  height: 22px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}
.pretty-check-ui {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid #9ec9e0;
  background: #fff;
  box-sizing: border-box;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background .15s, border-color .15s, box-shadow .15s;
  pointer-events: none;
}
.pretty-check-ui::after {
  content: '';
  width: 11px;
  height: 7px;
  border: solid #fff;
  border-width: 0 0 2.5px 2.5px;
  transform: rotate(-45deg) scale(0);
  margin-top: -2px;
  transition: transform .12s ease;
}
.pretty-check-input:checked + .pretty-check-ui {
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(42, 171, 238, 0.35);
}
.pretty-check-input:checked + .pretty-check-ui::after {
  transform: rotate(-45deg) scale(1);
}
:global(html[data-theme="dark"]) .pretty-check-ui {
  background: #1a222c;
  border-color: #3d4d5e;
}
:global(html[data-theme="dark"]) .pretty-check-input:checked + .pretty-check-ui {
  background: linear-gradient(135deg, #2b8ec4, #1f6f9c);
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
:global(html[data-theme="dark"]) .pretty-check-label {
  color: #e6edf3;
}


.avatar-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  padding: 0;
}
.profile-avatar.clickable {
  cursor: pointer;
}
.profile-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.profile-avatar .avatar-letter {
  line-height: 1;
}
:global(html[data-theme="dark"]) .profile-avatar {
  background: linear-gradient(135deg, #2b8ec4, #1f6f9c);
}

</style>

<style>
/* unscoped — поиск подписчиков в профиле канала (как create modal) */
html[data-theme="dark"] .channel-profile .member-row {
  color: #eef3f8;
  background: transparent;
}
html[data-theme="dark"] .channel-profile .member-row:hover {
  background: #1b2b38;
}
html[data-theme="dark"] .channel-profile .member-row.on {
  background: #17364a;
}
html[data-theme="dark"] .channel-profile .member-name {
  color: #eef3f8;
}
html[data-theme="dark"] .channel-profile .member-role {
  color: #9eb0c0;
}
html[data-theme="dark"] .channel-profile .member-row .check {
  color: #65c5f5;
}
html[data-theme="dark"] .channel-profile .edit-input {
  background: #202f3d;
  border-color: #2a333e;
  color: #eef3f8;
}
html[data-theme="dark"] .channel-profile .add-block .status-line {
  color: #9eb0c0;
}
</style>
