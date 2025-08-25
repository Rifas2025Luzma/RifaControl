import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  build: {
    rollupOptions: {
      input: {
        main: './admin-index.html'
      }
    },
    outDir: 'admin-dist'
  },
  server: {
    port: 5173,
    host: true
  }
})