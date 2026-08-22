import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // Все запросы, начинающиеся с /api, Vite перенаправит на ваш Go бэкенд
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // удаляем префикс /api при пересылке
      }
    }
  }
})
