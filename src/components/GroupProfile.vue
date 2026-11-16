<template>
  <aside class="public-profile group-profile">
    <div class="profile-header">
      <button class="btn-back" type="button" @click="$emit('close')">← Назад</button>
      <h3>Группа</h3>
    </div>

    <div class="profile-content">
      <!-- Hero -->
      <div class="hero">
        <button
          type="button"
          class="profile-avatar"
          :class="{ clickable: !!avatarUrl }"
          @click="avatarUrl && openAvatar()"
        >
          <img v-if="avatarUrl" :src="avatarUrl" alt="" class="avatar-img" />
          <span v-else>{{ titleLetter }}</span>
        </button>
        <div class="identity">
          <div class="name">{{ title }}</div>
          <div class="meta">{{ memberCountLabel }}</div>
        </div>
      </div>

      <p v-if="loading" class="status-line">Обновление…</p>
      <p v-if="error" class="status-line error">{{ error }}</p>
      <p v-if="saveError" class="status-line error">{{ saveError }}</p>
      <p v-if="addError" class="status-line error">{{ addError }}</p>
      <p v-if="addOk" class="status-line ok">{{ addOk }}</p>

      <!-- Управление (owner/admin) -->
      <div v-if="canEdit" class="section card">
        <div class="section-header">
          <span class="section-title">Настройки</span>
        </div>
        <div class="edit-row">
          <input
            v-model="editTitle"
            type="text"
            maxlength="80"
            class="edit-input"
            placeholder="Название группы"
          />
          <button
            type="button"
            class="btn-save"
            :disabled="saving || !editTitle.trim() || editTitle.trim() === title"
            @click="saveTitle"
          >
            {{ saving ? '…' : 'OK' }}
          </button>
        </div>
        <label class="btn-file">
          <input type="file" accept="image/*" hidden :disabled="saving" @change="onAvatarFile" />
          {{ saving ? 'Загрузка…' : 'Сменить фото' }}
        </label>
      </div>

      <!-- Участники -->
      <div class="section card">
        <div class="section-header">
          <span class="section-title">Участники</span>
          <span class="section-count">{{ membersView.length || memberCountHint }}</span>
        </div>

        <button
          v-if="canEdit"
          type="button"
          class="btn-add-members"
          :class="{ open: showAdd }"
          @click="toggleAdd"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
              stroke-linecap="round"
            />
          </svg>
          {{ showAdd ? 'Скрыть поиск' : 'Добавить участников' }}
        </button>

        <!-- Панель добавления -->
        <div v-if="showAdd && canEdit" class="add-panel">
          <div class="search-wrap">
            <input
              v-model="query"
              type="text"
              class="edit-input"
              placeholder="Логин или имя…"
              @input="onSearchInput"
            />
          </div>
          <div v-if="searchLoading" class="status-line small">Поиск…</div>
          <div v-else-if="searchError" class="status-line error small">{{ searchError }}</div>
          <div v-else-if="results.length" class="search-results">
            <button
              v-for="u in results"
              :key="u.id"
              type="button"
              class="result-row"
              :class="{ selected: isPicked(u), disabled: isAlreadyMember(u) }"
              :disabled="isAlreadyMember(u) || adding"
              @click="togglePick(u)"
            >
              <span class="member-avatar letter" :style="{ background: colorFor(u.id) }">
                {{ letter(u) }}
              </span>
              <span class="member-meta">
                <span class="member-name">{{ fullName(u) }}</span>
                <span class="member-role">
                  {{ isAlreadyMember(u) ? 'уже в группе' : (u.login ? '@' + u.login : '') }}
                </span>
              </span>
              <span v-if="isPicked(u)" class="check">✓</span>
            </button>
          </div>

          <div v-if="picked.length" class="picked-bar">
            <span class="picked-label">Выбрано: {{ picked.length }}</span>
            <button
              type="button"
              class="btn-save wide"
              :disabled="adding"
              @click="submitAdd"
            >
              {{ adding ? 'Добавляем…' : 'Добавить' }}
            </button>
          </div>
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
              <span class="member-role" :class="m.role">{{ roleLabel(m.role) }}</span>
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
import { getGroup, listGroupMembers, updateGroup, addGroupMembers } from '../services/groups'
import { resolveChatUsers, searchUsers, resolveMessagesIdByUuid } from '../services/users'
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

const canEdit = computed(() => {
  const role = String(myRole.value || '').toLowerCase().trim()
  if (role === 'owner' || role === 'admin') return true
  const createdBy = Number(
    groupData.value?.created_by ??
    groupData.value?.createdBy ??
    props.group?.created_by ??
    props.group?.createdBy ??
    0
  )
  return Boolean(createdBy && createdBy === Number(store.myUserId))
})

const memberIdSet = computed(() => {
  const s = new Set()
  for (const m of members.value || []) {
    const id = Number(m.user_id ?? m.userId)
    if (id) s.add(id)
  }
  return s
})

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

function fullName(user) {
  const n = `${user.name || ''} ${user.surname || ''}`.trim()
  return n || user.login || `User ${user.id}`
}

function letter(user) {
  const n = (user.name || user.login || '?').trim()
  return (n[0] || '?').toUpperCase()
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

function toggleAdd() {
  showAdd.value = !showAdd.value
  addError.value = ''
  addOk.value = ''
  if (!showAdd.value) {
    query.value = ''
    results.value = []
    picked.value = []
  }
}

function isAlreadyMember(user) {
  // user.id from search is user-service id; membership is messages-local id
  // we match after resolve; for now filter by login/name against current members meta
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

async function submitAdd() {
  if (!picked.value.length || adding.value) return
  const uuid = groupUuid.value
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
    const res = await addGroupMembers(uuid, memberIds)
    const n = res?.added ?? memberIds.length
    addOk.value = n ? `Добавлено: ${n}` : 'Никого не добавлено (уже в группе?)'
    picked.value = []
    query.value = ''
    results.value = []
    await loadMembers(uuid)
    // member_count in chat list
    store.ensureGroupChat({
      group_uuid: uuid,
      title: title.value,
      member_count: members.value.length,
      avatar_file_uuid: avatarUuid.value
    })
    emit('updated', {
      group_uuid: uuid,
      title: title.value,
      member_count: members.value.length,
      avatar_file_uuid: avatarUuid.value
    })
  } catch (e) {
    addError.value = e.message || 'Не удалось добавить'
  } finally {
    adding.value = false
  }
}

async function loadAll() {
  const uuid = groupUuid.value
  if (!uuid) {
    error.value = 'Нет идентификатора группы'
    return
  }

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
    const me = members.value.find((m) => {
      const uid = Number(m.user_id ?? m.userId ?? m.UserId ?? 0)
      return uid && uid === myId
    })
    myRole.value = String(me?.role || me?.Role || '').toLowerCase()
    // fallback: creator of the group
    if (!myRole.value) {
      const createdBy = Number(
        groupData.value?.created_by ?? groupData.value?.createdBy ?? props.group?.created_by ?? 0
      )
      if (createdBy && createdBy === myId) myRole.value = 'owner'
    }

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
    showAdd.value = false
    loadAll()
  },
  { immediate: true }
)
</script>

<style scoped>
.group-profile.public-profile {
  --gp-bg: #ffffff;
  --gp-card-bg: #f5f9fc;
  --gp-card-border: #e4edf2;
  --gp-text: #163247;
  --gp-muted: #6b8494;
  --gp-header-bg: #f7fbfd;
  --gp-header-border: #e8eef2;
  --gp-input-bg: #ffffff;
  --gp-input-border: #d7e3ec;
  --gp-accent-bg: #e8f6fd;
  --gp-accent-text: #0b6ea8;
  --gp-add-bg: #eef8fd;
  --gp-add-border: #9ec9e0;
  --gp-hover: rgba(42, 171, 238, 0.08);
  --gp-owner: #c98512;
  --gp-admin: #1a7ab8;

  width: 320px;
  max-width: 100vw;
  flex: 0 0 320px;
  background: var(--gp-bg);
  border-left: 1px solid var(--gp-card-border);
  color: var(--gp-text);
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
  border-bottom: 1px solid var(--gp-header-border);
  background: var(--gp-header-bg);
  position: sticky;
  top: 0;
  z-index: 2;
  flex-shrink: 0;
}

.profile-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  color: var(--gp-text);
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
  padding: 20px 16px 28px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1;
  gap: 14px;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8px 0 4px;
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
  box-shadow: 0 6px 20px rgba(42, 171, 238, 0.25);
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
  margin-top: 12px;
}

.identity .name {
  font-size: 20px;
  font-weight: 700;
  color: var(--gp-text);
  line-height: 1.25;
  word-break: break-word;
}

.identity .meta {
  margin-top: 4px;
  font-size: 14px;
  color: var(--gp-muted);
}

.status-line {
  width: 100%;
  text-align: center;
  font-size: 13px;
  color: #718895;
  margin: 0;
}

.status-line.small {
  font-size: 12px;
  text-align: left;
  padding: 4px 2px;
}

.status-line.error {
  color: #d92d54;
}

.status-line.ok {
  color: #1a9d5c;
}

.section.card {
  width: 100%;
  background: var(--gp-card-bg, #f5f9fc);
  border: 1px solid var(--gp-card-border, #e4edf2);
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--gp-muted);
}

.section-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--gp-muted);
  background: var(--gp-accent-bg);
  border-radius: 10px;
  padding: 2px 8px;
}

.edit-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.edit-input {
  flex: 1;
  border: 1px solid var(--gp-input-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  background: var(--gp-input-bg);
  color: var(--gp-text);
  min-width: 0;
  box-sizing: border-box;
  width: 100%;
}

.edit-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
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
  height: 40px;
}

.btn-save.wide {
  width: 100%;
  margin-top: 8px;
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
  background: var(--gp-accent-bg);
  color: var(--gp-accent-text);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}

.btn-file:hover {
  background: #d7f0fc;
}

.btn-add-members {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border: 1px dashed var(--gp-add-border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--gp-add-bg);
  color: var(--gp-accent-text);
  font-weight: 650;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 10px;
}

.btn-add-members:hover,
.btn-add-members.open {
  background: #e0f2fb;
  border-style: solid;
}

.add-panel {
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 12px;
  background: var(--gp-bg);
  border: 1px solid var(--gp-card-border);
}

.search-wrap {
  margin-bottom: 8px;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.result-row:hover:not(.disabled) {
  background: #f0f7fc;
}

.result-row.selected {
  background: #e5f4fc;
}

.result-row.disabled {
  opacity: 0.55;
  cursor: default;
}

.result-row .check {
  margin-left: auto;
  color: #0b6ea8;
  font-weight: 700;
}

.picked-bar {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eef2f6;
}

.picked-label {
  font-size: 12px;
  color: #6b8494;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  background: var(--gp-hover);
}

.member-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}

.member-avatar.letter {
  font-size: 15px;
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
  font-weight: 650;
  font-size: 14px;
  color: var(--gp-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 12px;
  color: var(--gp-muted);
}

.member-role.owner {
  color: var(--gp-owner);
  font-weight: 600;
}

.member-role.admin {
  color: var(--gp-admin);
  font-weight: 600;
}

/* Dark */
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
:global(html[data-theme="dark"]) .member-name {
  color: #eef3f8 !important;
}

:global(html[data-theme="dark"]) .identity .meta,
:global(html[data-theme="dark"]) .member-role,
:global(html[data-theme="dark"]) .section-title,
:global(html[data-theme="dark"]) .status-line,
:global(html[data-theme="dark"]) .picked-label {
  color: #9eb0c0 !important;
}

:global(html[data-theme="dark"]) .member-role.owner {
  color: #e6b84d !important;
}

:global(html[data-theme="dark"]) .member-role.admin {
  color: #6ec3f0 !important;
}

:global(html[data-theme="dark"]) .section-count {
  background: #243442 !important;
  color: #b8c9d6 !important;
}

:global(html[data-theme="dark"]) .section.card {
  background: #1a2430 !important;
  border-color: #2a333e !important;
}

:global(html[data-theme="dark"]) .edit-input {
  background: #202f3d !important;
  border-color: #2a333e !important;
  color: #e6edf3 !important;
}

:global(html[data-theme="dark"]) .btn-file {
  background: #17364a !important;
  color: #75ccf8 !important;
}

:global(html[data-theme="dark"]) .btn-add-members {
  background: #17364a !important;
  border-color: #2a5a75 !important;
  color: #75ccf8 !important;
}

:global(html[data-theme="dark"]) .add-panel {
  background: #161c24 !important;
  border-color: #2a333e !important;
}

:global(html[data-theme="dark"]) .member-row:hover,
:global(html[data-theme="dark"]) .result-row:hover:not(.disabled),
:global(html[data-theme="dark"]) .result-row.selected {
  background: #1b2b38 !important;
}

:global(html[data-theme="dark"]) .btn-back {
  color: #65c5f5 !important;
}

:global(html[data-theme="dark"]) .picked-bar {
  border-color: #2a333e !important;
}
</style>
