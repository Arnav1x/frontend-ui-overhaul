import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        output: {
          entryFileNames: '[name].cjs',
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/frontend'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/frontend/index.html')
      }
    },
    plugins: [react()]
  }
})
