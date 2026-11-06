import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Apply the saved theme before mounting the app.
const savedTheme = localStorage.getItem('messenger-theme')
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')