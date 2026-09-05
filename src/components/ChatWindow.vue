<template>
  <div class="chat-window">
    <div class="header">
      {{ chat.name }}
    </div>

    <div class="messages" ref="messagesEl">
      <div
        v-for="msg in chat.messages"
        :key="msg.id"
        :class="['bubble', msg.fromMe ? 'me' : '']"
      >
        <div class="text">{{ msg.text }}</div>
        <div class="time">{{ formatMessageTime(msg.createdAt) || '·' }}</div>
      </div>
    </div>

    <MessageInput @send="handleSend" />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useChatStore, formatMessageTime } from '../stores/chat'
import { sendMessage } from '../services/socket'
import MessageInput from './MessageInput.vue'

const store = useChatStore()
const chat = computed(() => store.activeChat)
const messagesEl = ref(null)

function handleSend(text) {
  sendMessage({
    recipientId: chat.value.id,
    text
  })
}

watch(
  () => chat.value?.messages?.length,
  async () => {
    await nextTick()
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  }
)
</script>

<style>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.header {
  padding: 10px 16px;
  background: #ededed;
  font-weight: 600;
  flex-shrink: 0;
}

.messages {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble {
  background: white;
  padding: 6px 10px 4px;
  border-radius: 10px;
  max-width: 65%;
  width: fit-content;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.bubble .text {
  word-break: break-word;
  white-space: pre-wrap;
  font-size: 14.5px;
  line-height: 1.35;
}

.bubble .time {
  font-size: 11px;
  color: #667781;
  align-self: flex-end;
  line-height: 1;
  margin-top: 2px;
  min-height: 12px;
}

.bubble.me {
  background: #dcf8c6;
  align-self: flex-end;
  margin-left: auto;
}

.bubble:not(.me) {
  align-self: flex-start;
}

.bubble.me .time {
  color: #667781;
}
</style>
