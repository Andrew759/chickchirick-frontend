<template>
  <div class="layout">
    <ChatList />

    <ChatWindow v-if="store.activeChat" />
    <div v-else class="empty">Выберите чат</div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { connectSocket, subscribe } from './services/socket'
import { useChatStore } from './stores/chat'

import ChatList from './components/ChatList.vue'
import ChatWindow from './components/ChatWindow.vue'

const store = useChatStore()

onMounted(() => {
  const token = localStorage.getItem('token') || 'test-token'

  connectSocket(token)
  subscribe(handleEvent)
})

function handleEvent(event) {
  if (event.message) {
    store.upsertMessage(event.message)
  }

  if (event.deletedMessageId) {
    store.deleteMessage(event.deletedMessageId)
  }
}
</script>

<style>
.layout {
  display: flex;
  height: 100vh;
  background: #e5ddd5;
}

.empty {
  margin: auto;
  color: gray;
}
</style>