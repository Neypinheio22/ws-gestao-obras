import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa para o app funcionar em qualquer endereço (GitHub Pages, subpasta, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
})
