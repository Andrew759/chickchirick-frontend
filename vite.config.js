import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//TODO: не для прода. Проксировать в nginx
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    allowedHosts: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/api/user': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/user/, '')
      },
      '/api/messages': {
        target: 'http://127.0.0.1:8083',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/messages/, '')
      },
      '/api/files': {
        target: 'http://127.0.0.1:8086',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/files/, '')
      },
      '/api/stickers': {
        target: 'http://127.0.0.1:8087',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stickers/, '')
      },
      // Отдельный path, чтобы не пересекаться с HMR Vite
      // browser → /messages-ws → 127.0.0.1:8085/ws
      '/messages-ws': {
        target: 'http://127.0.0.1:8085',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/messages-ws/, '/ws')
      }
    }
  }
})
