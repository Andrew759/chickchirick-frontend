<template>
  <div class="profile-container">
    <div class="profile-header">
      <button class="btn-back" @click="store.setView('chats')">← Назад</button>
      <h3>Профиль</h3>
    </div>

    <!-- Индикатор загрузки, пока бэкенд отвечает -->
    <div v-if="isLoading" class="profile-loading">
      Загрузка профиля...
    </div>

    <!-- Сообщение об ошибке, если бэкенд недоступен или токен протух -->
    <div v-else-if="error" class="profile-error">
      {{ error }}
    </div>

    <!-- Отображение реальных данных из бэкенда -->
    <div v-else class="profile-content">
      <div class="profile-avatar">
        {{ user.name ? user.name.charAt(0).toUpperCase() : '?' }}
      </div>

      <div class="profile-info">
        <div class="info-group">
          <label>Имя и Фамилия</label>
          <p>{{ user.name || 'Не указано' }} {{ user.surname || '' }}</p>
        </div>

        <div class="info-group">
          <label>Логин</label>
          <p v-if="user.login">@{{ user.login }}</p>
          <p v-else>Не указан</p>
        </div>

        <div class="info-group">
          <label>Телефон</label>
          <p>{{ user.phone || 'Не указан' }}</p>
        </div>

        <div class="info-group" v-if="user.email">
          <label>Email</label>
          <p>{{ user.email }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'

const store = useChatStore()

const user = ref({})
const isLoading = ref(true)
const error = ref(null)

// Функция загрузки данных с вашего Go-бэкенда
async function fetchUserProfile() {
  try {
    isLoading.value = true
    error.value = null

//TODO: кидать запрос в проксю nginx

    const response = await fetch('http://localhost:8081/frontend/profile', {
      method: 'GET',
      credentials: 'include' // Передаем HttpOnly куки на бэкенд
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Если токен невалиден, разлогиниваем пользователя на фронте
        store.setAuthenticated(false)
        throw new Error('Сессия истекла. Войдите заново.')
      }
      throw new Error(`Ошибка сервера: ${response.status}`)
    }

    const result = await response.json()

    // Записываем данные. Если ваш бэкенд возвращает структуры u, p, m в payload,
    // адаптируем результат. Предполагаем стандартный маппинг полей пользователя:
    user.value = result.payload || {}

  } catch (err) {
    console.error('Не удалось загрузить профиль:', err.message)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>

<style scoped>
.profile-container {
  width: 300px;
  background: white;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #eee;
  background: #f7f9fa;
}

.profile-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-back {
  background: none;
  border: none;
  color: #00a884;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.profile-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-loading, .profile-error {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.profile-error {
  color: #ea0038;
}

.profile-avatar {
  width: 90px;
  height: 90px;
  background: #00a884;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 25px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.profile-info {
  width: 100%;
}

.info-group {
  margin-bottom: 18px;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 8px;
}

.info-group label {
  font-size: 12px;
  color: #00a884;
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
}

.info-group p {
  margin: 0;
  font-size: 15px;
  color: #333;
}
</style>
