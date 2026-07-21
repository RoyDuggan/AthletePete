import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose the dev server on the local network so phones/tablets can reach it.
  server: {
    host: true, // bind to 0.0.0.0 (all interfaces)
    // Proxy the API to the backend so the frontend is same-origin in dev too
    // (keeps the auth cookie working and mirrors the Caddy setup in prod).
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
})
