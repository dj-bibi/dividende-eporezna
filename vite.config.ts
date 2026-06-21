// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/dividende-eporezna/',
  plugins: [react()],
  server: {
    proxy: {
      '/hnb': {
        target: 'https://api.hnb.hr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hnb/, ''),
      },
    },
  },
})
