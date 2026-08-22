<template>
  <div class="sidebar">
    <!-- Шапка с кнопкой переключения в профиль -->
    <div class="header">
      <span>Чаты</span>
      <button class="btn-profile" @click="store.setView('profile')">Профиль</button>
    </div>

    <!-- Заглушка, если чатов пока нет -->
    <div v-if="chats.length === 0" class="no-chats">No active chats</div>

    <div
      v-for="chat in chats"
      :key="chat.id"
      class="chat"
      :class="{ active: chat.id === store.activeChatId }"
      @click="store.setActiveChat(chat.id)"
    >
      <!-- Безопасное извлечение первой буквы с проверкой на пустоту -->
      <div class="avatar">
        {{ chat.name ? chat.name[0].toUpperCase() : '?' }}
      </div>

      <div class="info">
        <div class="name">{{ chat.name }}</div>
        <div class="last">
          {{ chat.messages.at(-1)?.text || 'No messages' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'

const store = useChatStore()
const chats = computed(() => store.chats)

// Наполняем стор моками при загрузке компонента, если он пуст
onMounted(() => {
  if (store.chats.length === 0) {
    store.chats = [
      {
        id: 2,
        name: 'Алексей Иванов',
        messages: [
          { id: 101, text: 'Привет! Как дела?', fromMe: false },
          { id: 102, text: 'Привет, всё отлично!', fromMe: true },
          { id: 103, text: 'Слушай, проект chickChirick уже готов к деплою?', fromMe: false }
        ]
      },
      {
        id: 3,
        name: 'Команда Разработки',
        messages: [
          { id: 201, text: 'Андрей, посмотри плиз код валидатора', fromMe: false },
          { id: 202, text: 'Там каскадная проверка падает', fromMe: false }
        ]
      },
      {
        id: 4,
        name: 'Елена Кузнецова',
        messages: [
          { id: 301, text: 'Встреча в 15:00, не забудь', fromMe: false },
          { id: 302, text: 'Помню, спасибо!', fromMe: true }
        ]
      },
      {
        id: 5,
        name: 'Иван Петров',
        messages: [] // Чат без сообщений для проверки заглушки 'No messages'
      }
    ]
  }
})
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

/* Новые стили для кнопки профиля в шапке */
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
}

.name {
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
