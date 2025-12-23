import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/', // Базовый путь для всех ресурсов
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
  },
  preview: {
    port: 3001,
    host: '0.0.0.0',
  },
})
