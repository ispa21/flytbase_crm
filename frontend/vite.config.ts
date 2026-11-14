/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: '../backend/public', emptyOutDir: true },
  server: { proxy: { '/api': { target: 'https://flytbase-crm.vercel.app', changeOrigin: true } } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setup.ts' },
})
