<template>
  <div class="input-area">
    <input
      v-model="text"
      @keyup.enter="send"
      placeholder="Сообщение"
    />
    <button @click="send">➤</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const text = ref('')
const emit = defineEmits(['send'])

const send = () => {
  if (!text.value.trim()) return
  emit('send', text.value)
  text.value = ''
}
</script>

<style>
.input-area {
  display: flex;
  padding: 10px;
  background: #f0f0f0;
}

input {
  flex: 1;
  padding: 10px;
  border-radius: 20px;
  border: none;
  outline: none;
}

button {
  margin-left: 10px;
  border: none;
  background: #0088cc;
  color: white;
  border-radius: 50%;
  width: 40px;
}
</style>