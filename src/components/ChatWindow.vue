<template>
  <div class="chat-window">
    <div class="header">
      {{ chat.name }}
    </div>

    <div class="messages">
      <div
        v-for="msg in chat.messages"
        :key="msg.id"
        :class="['bubble', msg.fromMe ? 'me' : '']"
      >
        {{ msg.text }}
      </div>
    </div>

    <MessageInput @send="handleSend" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useChatStore } from '../stores/chat'
import { sendMessage } from '../services/socket'
import MessageInput from './MessageInput.vue'

const store = useChatStore()
const chat = computed(() => store.activeChat)

function handleSend(text) {
  sendMessage({
    recipientId: chat.value.id,
    text
  })

  // optimistic UI
  store.upsertMessage({
    id: Date.now(),
    text,
    senderId: store.myUserId,
    recipientId: chat.value.id
  })
}
</script>

<style>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 10px;
  background: #ededed;
}

.messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}

.bubble {
  background: white;
  padding: 8px 12px;
  border-radius: 10px;
  margin: 5px 0;
  max-width: 60%;
}

.bubble.me {
  background: #dcf8c6;
  margin-left: auto;
}
</style>