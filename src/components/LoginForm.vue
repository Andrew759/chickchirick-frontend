<template>
  <div class="login-container">
    <form @submit.prevent="handleSubmit" class="login-form">
      <div class="login-brand">
        <img
          class="login-logo"
          src="/favicon.png"
          alt="ChickChirick"
          width="120"
          height="120"
        />
      </div>

      <div class="form-group">
        <label for="login">Логин или телефон</label>
        <input
          id="login"
          v-model="formData.login"
          type="text"
          required
          placeholder="Логин или +7..."
          autocomplete="username"
        />
      </div>

      <div class="form-group">
        <label for="password">Пароль</label>
        <input
          id="password"
          v-model="formData.password"
          type="password"
          required
          placeholder="Пароль"
          autocomplete="current-password"
        />
      </div>

      <button type="submit" class="btn-submit" :disabled="isLoading || !isValid">
        {{ isLoading ? 'Вход...' : 'Войти' }}
      </button>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <p class="switch-auth">
        Нет аккаунта?
        <button type="button" class="link-btn" @click="emit('switch-to-register')">
          Зарегистрироваться
        </button>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['login-success', 'switch-to-register'])

const isLoading = ref(false)
const errorMessage = ref('')

const formData = ref({
  login: '',
  password: ''
})

const isValid = computed(() => {
  return formData.value.login.trim() !== '' && formData.value.password.length >= 8
})

async function handleSubmit() {
  if (!isValid.value) return

  isLoading.value = true
  errorMessage.value = ''

  emit('login-success', {
    login: formData.value.login.trim(),
    password: formData.value.password
  })
}

defineExpose({
  setError(msg) {
    errorMessage.value = msg
    isLoading.value = false
  },
  setLoading(val) {
    isLoading.value = val
  }
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: #f0f2f5;
}


.login-brand {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.login-logo {
  width: 120px;
  height: 120px;
  object-fit: contain;
  display: block;
  user-select: none;
  pointer-events: none;
}

.login-form {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  margin-top: 0;
  margin-bottom: 25px;
  color: #333;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  color: #666;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

input:focus {
  border-color: #1396db;
  outline: none;
}

.btn-submit {
  width: 100%;
  padding: 12px;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  background: #0da3f1;
}

.btn-submit:disabled {
  background: #508098;
  cursor: not-allowed;
}

.error-message {
  color: #ea0038;
  font-size: 14px;
  margin-top: 10px;
  text-align: center;
}

.switch-auth {
  margin-top: 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.link-btn {
  background: none;
  border: none;
  color: #2aabee;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: auto;
  margin: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .login-logo {
    width: 96px;
    height: 96px;
  }

  .login-container,
  .register-container {
    align-items: flex-start;
    padding: 24px 16px;
    padding-top: max(24px, env(safe-area-inset-top));
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    box-sizing: border-box;
  }

  .login-form,
  .register-form {
    max-width: 100%;
    padding: 24px 18px;
    box-shadow: none;
    border-radius: 12px;
  }

  input {
    font-size: 16px; /* prevent iOS zoom */
    padding: 12px;
  }

  .btn-submit {
    padding: 14px;
    font-size: 16px;
    border-radius: 10px;
  }
}
</style>
