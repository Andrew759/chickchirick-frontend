<template>
  <div class="sidebar">
    <div class="header">Чаты</div>

    <div
      v-for="chat in chats"
      :key="chat.id"
      class="chat"
      :class="{ active: chat.id === activeChat?.id }"
      @click="$emit('selectChat', chat)"
    >
      <img :src="chat.avatar" class="avatar" />

      <div class="info">
        <div class="top">
          <span class="name">{{ chat.name }}</span>
          <span class="time">{{ chat.time }}</span>
        </div>
        <div class="last">{{ chat.lastMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps(['chats', 'activeChat'])
</script>

<style>
.sidebar {
  width: 320px;
  background: #fff;
  border-right: 1px solid #ddd;
}

.header {
  padding: 15px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}

.chat {
  display: flex;
  padding: 12px;
  cursor: pointer;
}

.chat:hover {
  background: #f5f5f5;
}

.chat.active {
  background: #e9f5ff;
}

.avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
}

.info {
  margin-left: 10px;
  flex: 1;
}

.top {
  display: flex;
  justify-content: space-between;
}

.name {
  font-weight: 600;
}

.time {
  font-size: 12px;
  color: gray;
}

.last {
  font-size: 14px;
  color: #666;
}
</style>