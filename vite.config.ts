import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://<user>.github.io/battleship-game/ in production.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/battleship-game/' : '/',
  plugins: [react()],
}))
