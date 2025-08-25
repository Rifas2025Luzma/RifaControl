import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    outDir: 'dist'
  },
  server: {
    port: 5173,
    host: true
  }
})