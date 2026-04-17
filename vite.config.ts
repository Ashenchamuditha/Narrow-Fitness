import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // This allows you to use '@' as a shortcut for the 'src' folder
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // This tells Vite to put the finished website files in the 'dist' folder
    outDir: 'dist',
    // This ensures old files are cleared before building new ones
    emptyOutDir: true,
    // Ensures the build is optimized for production
    sourcemap: false,
  },
  server: {
    // Local development proxy (only used when running npm run dev)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});