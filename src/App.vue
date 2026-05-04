<template>
  <div class="layout">
    <ChatList
      :chats="chats"
      :activeChat="activeChat"
      @selectChat="selectChat"
    />

    <ChatWindow
      v-if="activeChat"
      :chat="activeChat"
      @sendMessage="sendMessage"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ChatList from './components/ChatList.vue'
import ChatWindow from './components/ChatWindow.vue'

const chats = ref([
  {
    id: 1,
    name: 'Миха',
    avatar: 'https://i.pravatar.cc/40?img=13',
    lastMessage: 'Как дела?',
    time: '15:51',
    messages: [
      { id: 1, text: 'Привет!', fromMe: false },
      { id: 2, text: 'Как дела?', fromMe: false }
    ]
  }
])

const activeChat = ref(chats.value[0])

const selectChat = (chat) => {
  activeChat.value = chat
}

const sendMessage = (text) => {
  activeChat.value.messages.push({
    id: Date.now(),
    text,
    fromMe: true
  })
}
</script>

<style>
.layout {
  display: flex;
  height: 100vh;
  background: #e5ddd5;
}
</style>