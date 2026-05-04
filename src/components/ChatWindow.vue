<template>
  <div class="chat-window">
    <!-- Header -->
    <div class="chat-header">
      <img :src="chat.avatar" class="avatar" />
      <div>
        <div class="name">{{ chat.name }}</div>
        <div class="status">online</div>
      </div>
    </div>

    <!-- Messages -->
    <div class="messages">
      <div
        v-for="msg in chat.messages"
        :key="msg.id"
        :class="['bubble', msg.fromMe ? 'me' : '']"
      >
        {{ msg.text }}
      </div>
    </div>

    <!-- Input -->
    <MessageInput @send="handleSend" />
  </div>
</template>

<script setup>
import MessageInput from './MessageInput.vue'

const props = defineProps(['chat'])
const emit = defineEmits(['sendMessage'])

const handleSend = (text) => {
  emit('sendMessage', text)
}
</script>

<style>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #ededed;
  border-bottom: 1px solid #ddd;
}

.messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
}

.bubble {
  max-width: 60%;
  padding: 10px 14px;
  margin: 6px 0;
  border-radius: 12px;
  background: white;
}

.bubble.me {
  margin-left: auto;
  background: #dcf8c6;
}

.status {
  font-size: 12px;
  color: идфс;
}
</style>