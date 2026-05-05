<template>
  <div class="input">
    <input
      v-model="text"
      @keyup.enter="send"
      placeholder="Message"
    />
    <button @click="send">➤</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const text = ref('')
const emit = defineEmits(['send'])

function send() {
  if (!text.value.trim()) return

  emit('send', text.value)
  text.value = ''
}
</script>

<style>
.input {
  display: flex;
  padding: 10px;
  background: #f0f0f0;
}

input {
  flex: 1;
  padding: 10px;
  border-radius: 20px;
  border: none;
}

button {
  margin-left: 10px;
}
</style>