import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to backend server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy WebSocket requests for Socket.IO
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      // Proxy auth requests
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: '../public/dist',
    emptyOutDir: true,
    sourcemap: true
  }
})