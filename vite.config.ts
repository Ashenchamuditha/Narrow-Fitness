import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    proxy: {
      // This bridges the gap between Port 5173 and Port 5000
      '/api': {
         target: 'http://backend:5000', // Change 'localhost' or '127.0.0.1' to 'backend'
        changeOrigin: true,
        secure: false,
      },
    },
  },
});