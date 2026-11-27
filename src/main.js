import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initTheme, watchSystemTheme } from './theme'

// Тема до mount: сохранённая или системная (prefers-color-scheme)
initTheme()
watchSystemTheme()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
