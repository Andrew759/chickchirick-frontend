<template>
  <div class="sidebar">
    <div class="header">Chats</div>

    <div
      v-for="chat in chats"
      :key="chat.id"
      class="chat"
      :class="{ active: chat.id === store.activeChatId }"
      @click="store.setActiveChat(chat.id)"
    >
      <div class="avatar">{{ chat.name[0] }}</div>

      <div class="info">
        <div class="name">{{ chat.name }}</div>
        <div class="last">
          {{ chat.messages.at(-1)?.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useChatStore } from '../stores/chat'

const store = useChatStore()
const chats = computed(() => store.chats)
</script>

<style>
.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #ddd;
}

.header {
  padding: 15px;
  font-weight: bold;
}

.chat {
  display: flex;
  padding: 10px;
  cursor: pointer;
}

.chat.active {
  background: #e9f5ff;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  margin-left: 10px;
}
</style>