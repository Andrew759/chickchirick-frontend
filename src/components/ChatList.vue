<template>
  <div class="sidebar">
    <div class="header">
      <span>Чаты</span>
      <button class="btn-profile" @click="store.setView('profile')">Профиль</button>
    </div>

    <div v-if="chats.length === 0" class="no-chats">Нет активных чатов</div>

    <div
      v-for="chat in chats"
      :key="chat.id"
      class="chat"
      :class="{ active: chat.id === store.activeChatId }"
      @click="store.setActiveChat(chat.id)"
    >
      <div class="avatar">
        {{ avatarLetter(chat) }}
      </div>

      <div class="info">
        <div class="row">
          <div class="name">{{ chat.name }}</div>
          <div class="time" v-if="formatMessageTime(lastMessage(chat)?.createdAt)">
            {{ formatMessageTime(lastMessage(chat)?.createdAt) }}
          </div>
        </div>
        <div class="last">
          {{ lastMessage(chat)?.text || 'No messages' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useChatStore, formatMessageTime } from '../stores/chat'

const store = useChatStore()
const chats = computed(() => store.chats)

function lastMessage(chat) {
  return chat.messages?.at(-1) ?? null
}

function avatarLetter(chat) {
  const n = (chat.name || '').trim()
  if (!n || n.startsWith('User ')) return '?'
  return n[0].toUpperCase()
}
</script>

<style scoped>
.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 15px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-profile {
  background: none;
  border: 1px solid #00a884;
  color: #00a884;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.btn-profile:hover {
  background: #00a884;
  color: white;
}

.chat {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f9f9f9;
  transition: background 0.2s ease;
}

.chat:hover {
  background: #f7f9fa;
}

.chat.active {
  background: #e9f5ff;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #00a884;
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info {
  margin-left: 12px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.name {
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.last {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-chats {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
</style>
