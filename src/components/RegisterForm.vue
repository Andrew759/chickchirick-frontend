<template>
  <div class="reg-container">
    <form @submit.prevent="handleSubmit" class="reg-form">
      <h2>Регистрация</h2>

      <div class="steps-indicator">
        <span :class="{ active: currentStep === 1 }">Шаг 1</span>
        <span :class="{ active: currentStep === 2 }">Шаг 2</span>
      </div>

      <!-- ШАГ 1: Основные данные -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="form-group">
          <label for="name">Имя</label>
          <input id="name" v-model="formData.name" type="text" required placeholder="Имя" />
        </div>

        <div class="form-group">
          <label for="surname">Фамилия</label>
          <input id="surname" v-model="formData.surname" type="text" required placeholder="Фамилия" />
        </div>

        <div class="form-group">
          <label for="login">Логин</label>
          <input id="login" v-model="formData.login" type="text" required placeholder="Пароль" />
        </div>

        <div class="form-group">
          <label for="phone">Телефон</label>
          <input
            id="phone"
            v-model="visiblePhone"
            type="tel"
            required
            placeholder="Номер телефона"
            @input="handlePhoneInput"
          />
        </div>

        <button type="button" class="btn-next" @click="nextStep" :disabled="!isStep1Valid">
          Далее
        </button>
      </div>

      <!-- ШАГ 2: Дополнительные данные -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="form-group">
          <label for="email">Email (необязательно)</label>
          <input id="email" v-model="formData.email" type="email" placeholder="Емейл" />
        </div>

        <div class="form-group">
          <label for="password">Пароль (необязательно)</label>
          <input id="password" v-model="formData.password" type="password" placeholder="Пароль" />
        </div>

        <div class="form-group" v-if="formData.password">
          <label for="confirmPassword">Подтверждение пароля</label>
          <input id="confirmPassword" v-model="confirmPassword" type="password" placeholder="Повторите пароль" />
          <span v-if="passwordMismatch" class="field-error">Пароли не совпадают</span>
        </div>

        <div class="btn-group">
          <button type="button" class="btn-prev" @click="prevStep">Назад</button>
          <button type="submit" class="btn-submit" :disabled="isLoading || passwordMismatch">
            {{ isLoading ? 'Регистрация...' : 'Завершить' }}
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['register-success'])

const currentStep = ref(1)
const isLoading = ref(false)
const errorMessage = ref('')
const confirmPassword = ref('')
const visiblePhone = ref('')

const formData = ref({
  name: '',
  surname: '',
  login: '',
  phone: '',
  email: '',
  password: ''
})

// Форматирование телефона в маску +7 (XXX) XXX-XX-XX
function handlePhoneInput(e) {
  let input = e.target.value.replace(/\D/g, '')

  if (!input) {
    visiblePhone.value = ''
    formData.value.phone = ''
    return
  }

  // Если первая цифра 7 или 8, отсекаем её для форматирования
  if (input[0] === '7' || input[0] === '8') {
    input = input.substring(1)
  }

  // Ограничиваем длину 10 цифрами самого номера
  input = input.substring(0, 10)

  // Формируем чистый номер для отправки на бэкенд (+7...)
  formData.value.phone = input ? '+7' + input : ''

  // Форматируем маску для отображения пользователю
  let formatted = '+7'
  if (input.length > 0) formatted += ' (' + input.substring(0, 3)
  if (input.length >= 4) formatted += ') ' + input.substring(3, 6)
  if (input.length >= 7) formatted += '-' + input.substring(6, 8)
  if (input.length >= 9) formatted += '-' + input.substring(8, 10)

  visiblePhone.value = formatted
}

// Валидация первого шага (проверка заполненности и длины телефона)
const isStep1Valid = computed(() => {
  return formData.value.name.trim() !== '' &&
         formData.value.surname.trim() !== '' &&
         formData.value.login.trim() !== '' &&
         formData.value.phone.length === 12 // Длина "+7" + 10 цифр
})

// Валидация совпадения паролей на втором шаге
const passwordMismatch = computed(() => {
  if (!formData.value.password) return false
  return formData.value.password !== confirmPassword.value
})

function nextStep() {
  if (isStep1Valid.value) currentStep.value = 2
}

function prevStep() {
  currentStep.value = 1
}

async function handleSubmit() {
  if (passwordMismatch.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const payload = { ...formData.value }
    if (!payload.email.trim()) delete payload.email
    if (!payload.password.trim()) delete payload.password

    await new Promise(resolve => setTimeout(resolve, 1000))
    emit('register-success', payload)
  } catch (err) {
    errorMessage.value = 'Ошибка при регистрации. Попробуйте снова.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.reg-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background: #f0f2f5;
}

.reg-form {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
  text-align: center;
}

.steps-indicator {
  display: flex;
  justify-content: space-around;
  margin-bottom: 25px;
}

.steps-indicator span {
  font-size: 14px;
  color: #aaa;
  padding-bottom: 5px;
  border-bottom: 2px solid transparent;
}

.steps-indicator span.active {
  color: #00a884;
  font-weight: bold;
  border-bottom-color: #00a884;
}

.form-group {
  margin-bottom: 15px;
  position: relative;
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
  border-color: #00a884;
  outline: none;
}

.field-error {
  color: #ea0038;
  font-size: 11px;
  position: absolute;
  bottom: -15px;
  left: 0;
}

button {
  width: 100%;
  padding: 12px;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}

.btn-next, .btn-submit {
  background: #00a884;
}

button:disabled {
  background: #a5d7cb;
  cursor: not-allowed;
}

.btn-group {
  display: flex;
  gap: 10px;
}

.btn-prev {
  background: #6c757d;
}

.error-message {
  color: #ea0038;
  font-size: 14px;
  margin-top: 10px;
  text-align: center;
}
</style>
