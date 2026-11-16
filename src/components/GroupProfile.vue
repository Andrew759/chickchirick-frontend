<template>
  <aside class="public-profile group-profile">
    <div class="profile-header">
      <button class="btn-back" type="button" @click="$emit('close')">← Назад</button>
      <h3>Группа</h3>
    </div>

    <div class="profile-content">
      <div class="avatar-wrap">
        <button
          type="button"
          class="profile-avatar"
          :class="{ clickable: !!avatarUrl }"
          @click="avatarUrl && openAvatar()"
        >
          <img v-if="avatarUrl" :src="avatarUrl" alt="" class="avatar-img" />
          <span v-else>{{ titleLetter }}</span>
        </button>
      </div>

      <div class="identity">
        <div class="name">{{ title }}</div>
        <div class="login">{{ memberCountLabel }}</div>
      </div>

      <p v-if="loading" class="status-line">Обновление…</p>
      <p v-if="error" class="status-line error">{{ error }}</p>
      <p v-if="saveError" class="status-line error">{{ saveError }}</p>

      <!-- Редактирование (owner/admin) -->
      <div v-if="canEdit" class="section">
        <div class="section-header">
          <span class="section-title">Название</span>
        </div>
        <div class="edit-row">
          <input v-model="editTitle" type="text" maxlength="80" class="edit-input" />
          <button
            type="button"
            class="btn-save"
            :disabled="saving || !editTitle.trim() || editTitle.trim() === title"
            @click="saveTitle"
          >
            {{ saving ? '…' : 'OK' }}
          </button>
        </div>
      </div>

      <div v-if="canEdit" class="section">
        <div class="section-header">
          <span class="section-title">Фото группы</span>
        </div>
        <label class="btn-file">
          <input type="file" accept="image/*" hidden :disabled="saving" @change="onAvatarFile" />
          {{ saving ? 'Загрузка…' : 'Сменить фото' }}
        </label>
      </div>

      <!-- Участники -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Участники</span>
          <span class="section-count">{{ membersView.length || memberCountHint }}</span>
        </div>

        <div v-if="membersLoading" class="status-line">Загрузка участников…</div>
        <div v-else-if="membersView.length === 0" class="status-line">Нет данных об участниках</div>
        <div v-else class="members-list">
          <button
            v-for="m in membersView"
            :key="m.user_id"
            type="button"
            class="member-row"
            @click="openMember(m)"
          >
            <span class="member-avatar" :style="{ background: colorFor(m.user_id) }">
              <img v-if="m.avatarUrl" :src="m.avatarUrl" alt="" />
              <span v-else>{{ m.letter }}</span>
            </span>
            <span class="member-meta">
              <span class="member-name">{{ m.displayName }}</span>
              <span class="member-role">{{ roleLabel(m.role) }}</span>
            </span>
          </button>
        </div>
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
import { computed, ref, watch } from 'vue'
import { getFileUrl, uploadFile } from '../services/files'
import { getGroup, listGroupMembers, updateGroup } from '../services/groups'
import { resolveChatUsers } from '../services/users'
import { useChatStore } from '../stores/chat'
import PhotoViewer from './PhotoViewer.vue'

const props = defineProps({
  group: { type: Object, required: true }
})

const emit = defineEmits(['close', 'updated', 'open-user'])

const store = useChatStore()

const loading = ref(false)
const error = ref('')
const groupData = ref(null)
const members = ref([])
const membersLoading = ref(false)
const membersMeta = ref({})
const editTitle = ref('')
const saving = ref(false)
const saveError = ref('')
const myRole = ref('')
const viewerOpen = ref(false)
const viewerItems = ref([])

const COLORS = [
  '#e17076', '#faa774', '#a695e7', '#7bc862',
  '#6ec9cb', '#65aadd', '#ee7aae', '#eeb620'
]

const groupUuid = computed(() => {
  let u =
    groupData.value?.group_uuid ||
    groupData.value?.groupUuid ||
    props.group?.group_uuid ||
    props.group?.groupUuid ||
    props.group?.groupId ||
    ''
  u = String(u || '')
  if (u.startsWith('group:')) u = u.slice(6)
  return u
})

const title = computed(
  () =>
    groupData.value?.title ||
    props.group?.title ||
    props.group?.name ||
    'Группа'
)

const titleLetter = computed(() => (title.value.trim()[0] || 'Г').toUpperCase())

const avatarUuid = computed(
  () =>
    groupData.value?.avatar_file_uuid ||
    groupData.value?.avatarFileUuid ||
    props.group?.avatar_file_uuid ||
    props.group?.avatarFileUuid ||
    null
)

const avatarUrl = computed(() => (avatarUuid.value ? getFileUrl(avatarUuid.value) : ''))

const memberCountHint = computed(
  () =>
    members.value.length ||
    groupData.value?.member_count ||
    props.group?.member_count ||
    props.group?.memberCount ||
    0
)

const memberCountLabel = computed(() => {
  const n = Number(memberCountHint.value) || 0
  if (n === 1) return '1 участник'
  if (n >= 2 && n <= 4) return `${n} участника`
  return `${n} участников`
})

const canEdit = computed(() => myRole.value === 'owner' || myRole.value === 'admin')

const membersView = computed(() => {
  return (members.value || [])
    .map((m) => {
      const uid = Number(m.user_id ?? m.userId ?? m.UserId ?? 0)
      const meta = membersMeta.value[uid] || store.usersById[uid] || {}
      const name = [meta.name, meta.surname].filter(Boolean).join(' ').trim()
      const displayName = name || (meta.login ? `@${meta.login}` : `User ${uid}`)
      const letter = (displayName[0] || '?').toUpperCase()
      const aUrl = meta.avatarFileUuid ? getFileUrl(meta.avatarFileUuid) : ''
      return {
        user_id: uid,
        role: m.role || m.Role || 'member',
        displayName,
        letter,
        avatarUrl: aUrl
      }
    })
    .filter((m) => m.user_id)
    .sort((a, b) => {
      const rank = { owner: 0, admin: 1, member: 2 }
      return (rank[a.role] ?? 3) - (rank[b.role] ?? 3)
    })
})

function colorFor(id) {
  return COLORS[Math.abs(Number(id) || 0) % COLORS.length]
}

function roleLabel(role) {
  if (role === 'owner') return 'владелец'
  if (role === 'admin') return 'админ'
  return 'участник'
}

function openAvatar() {
  if (!avatarUrl.value) return
  viewerItems.value = [{ src: avatarUrl.value, alt: title.value, fileName: 'group-avatar.jpg' }]
  viewerOpen.value = true
}

function openMember(m) {
  if (!m?.user_id) return
  const meta = membersMeta.value[m.user_id] || store.usersById[m.user_id] || {}
  emit('open-user', { id: m.user_id, ...meta })
}

async function loadAll() {
  const uuid = groupUuid.value
  if (!uuid) {
    error.value = 'Нет идентификатора группы'
    return
  }

  // сразу показываем то, что уже есть в props
  groupData.value = {
    group_uuid: uuid,
    title: props.group?.title || props.group?.name || 'Группа',
    avatar_file_uuid: props.group?.avatar_file_uuid || props.group?.avatarFileUuid || null,
    member_count: props.group?.member_count || props.group?.memberCount || 0
  }
  editTitle.value = groupData.value.title || ''

  loading.value = true
  error.value = ''
  try {
    const g = await getGroup(uuid)
    groupData.value = { ...groupData.value, ...g }
    editTitle.value = g.title || editTitle.value
    store.ensureGroupChat(g)
  } catch (e) {
    console.warn('getGroup failed', e)
    // не блокируем UI — оставляем props
  } finally {
    loading.value = false
  }

  await loadMembers(uuid)
}

async function loadMembers(uuid) {
  membersLoading.value = true
  try {
    const list = await listGroupMembers(uuid)
    members.value = Array.isArray(list) ? list : []
    const myId = Number(store.myUserId)
    const me = members.value.find((m) => Number(m.user_id ?? m.userId) === myId)
    myRole.value = me?.role || me?.Role || ''

    const ids = members.value
      .map((m) => Number(m.user_id ?? m.userId))
      .filter(Boolean)
    if (ids.length) {
      try {
        const users = await resolveChatUsers(ids)
        membersMeta.value = { ...users }
        store.setUsersInfo(users)
      } catch (e) {
        console.warn('resolve members meta', e)
      }
    }
  } catch (e) {
    console.warn('members load:', e)
    members.value = []
  } finally {
    membersLoading.value = false
  }
}

async function saveTitle() {
  const uuid = groupUuid.value
  if (!uuid || !editTitle.value.trim()) return
  saving.value = true
  saveError.value = ''
  try {
    const updated = await updateGroup(uuid, { title: editTitle.value.trim() })
    groupData.value = { ...groupData.value, ...updated }
    store.ensureGroupChat(updated)
    emit('updated', updated)
  } catch (e) {
    saveError.value = e.message || 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

async function onAvatarFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !file.type.startsWith('image/')) return
  const uuid = groupUuid.value
  if (!uuid) return
  saving.value = true
  saveError.value = ''
  try {
    const fileUuid = crypto.randomUUID()
    await uploadFile(fileUuid, file)
    const updated = await updateGroup(uuid, { avatar_file_uuid: fileUuid })
    groupData.value = { ...groupData.value, ...updated }
    store.ensureGroupChat(updated)
    emit('updated', updated)
  } catch (err) {
    saveError.value = err.message || 'Не удалось обновить фото'
  } finally {
    saving.value = false
  }
}

watch(
  () => props.group?.group_uuid || props.group?.groupUuid || props.group?.groupId,
  () => {
    loadAll()
  },
  { immediate: true }
)
</script>

<style scoped>
.group-profile.public-profile {
  width: 320px;
  max-width: 100vw;
  flex: 0 0 320px;
  background: #fff;
  border-left: 1px solid #e4edf2;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .group-profile.public-profile {
    width: 100%;
    flex: 1 1 auto;
    border-left: none;
    height: 100%;
    height: 100dvh;
  }
  .profile-header {
    padding-top: max(14px, env(safe-area-inset-top));
  }
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
  flex-shrink: 0;
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

.profile-content {
  padding: 24px 18px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.avatar-wrap {
  margin-bottom: 12px;
}

.profile-avatar {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  border: 0;
  padding: 0;
  background: linear-gradient(145deg, #54a9eb, #2aabee);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 700;
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

.identity {
  text-align: center;
  margin-bottom: 16px;
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

.status-line {
  width: 100%;
  text-align: center;
  font-size: 13px;
  color: #718895;
  margin: 0 0 12px;
}

.status-line.error {
  color: #d92d54;
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

.edit-row {
  display: flex;
  gap: 8px;
}

.edit-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  background: #f8fafc;
  color: #0f172a;
  min-width: 0;
}

.btn-save {
  border: none;
  border-radius: 10px;
  padding: 0 14px;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-file {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  padding: 10px 14px;
  background: #e8f6fd;
  color: #0b6ea8;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.member-row:hover {
  background: #f2f9fd;
}

.member-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  flex-shrink: 0;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.member-name {
  font-weight: 600;
  font-size: 14px;
  color: #163247;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 12px;
  color: #7b919d;
}

:global(html[data-theme="dark"]) .group-profile.public-profile {
  background: #161c24 !important;
  border-color: #252d38 !important;
  color: #e6edf3;
}

:global(html[data-theme="dark"]) .profile-header {
  background: #1a2430 !important;
  border-color: #252d38 !important;
}

:global(html[data-theme="dark"]) .profile-header h3,
:global(html[data-theme="dark"]) .identity .name,
:global(html[data-theme="dark"]) .member-name,
:global(html[data-theme="dark"]) .section-title {
  color: #e6edf3 !important;
}

:global(html[data-theme="dark"]) .identity .login,
:global(html[data-theme="dark"]) .member-role,
:global(html[data-theme="dark"]) .section-count,
:global(html[data-theme="dark"]) .status-line {
  color: #91a4b4 !important;
}

:global(html[data-theme="dark"]) .section-count {
  background: #20313f !important;
}

:global(html[data-theme="dark"]) .edit-input {
  background: #202f3d !important;
  border-color: #2a333e !important;
  color: #e6edf3 !important;
}

:global(html[data-theme="dark"]) .member-row:hover {
  background: #1b2b38 !important;
}

:global(html[data-theme="dark"]) .btn-file {
  background: #17364a !important;
  color: #75ccf8 !important;
}

:global(html[data-theme="dark"]) .btn-back {
  color: #65c5f5 !important;
}
</style>
