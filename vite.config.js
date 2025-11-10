import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',  // Mejora compatibilidad con Vercel
    assetsInlineLimit: 0,  // Carga assets externos
  },
  define: {
    global: 'globalThis',
  },
});