import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//TODO: не для прода. Проксировать в nginx
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true, // Разрешает слушать внешние интерфейсы
    allowedHosts: true, // Временно разрешаем любые хосты, чтобы не прописывать каждый раз новые ссылки туннелей
    hmr: {
      protocol: 'wss', // Автоматически переключит HMR на безопасные сокеты туннеля
    },
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
      },
      '/api/files': {
        target: 'http://127.0.0.1:8086',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/files/, '')
      }
    }
  }
})
