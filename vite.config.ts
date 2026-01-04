import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'esnext' // Critical for PDF.js v4+ which uses top-level await
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
});