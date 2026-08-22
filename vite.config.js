import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//TODO: не для прода. Проксировать в nginx
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Перенаправляем запросы пользователей на :8081
      '/api/user': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/user/, '')
      },
      // Перенаправляем запросы сообщений на :8083
      '/api/messages': {
        target: 'http://127.0.0.1:8083',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/messages/, '')
      }
    }
  }
})
