// Збирання клієнта React (практичне завдання № 6). Під час розроблення Vite перенаправляє запити /api
// на сервер ПЗ 4–5, тому сторінка і API мають одне джерело і CORS не потрібен; у контейнері те саме робить Nginx.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: {
    port: 5184,
    strictPort: true,
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3001' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
