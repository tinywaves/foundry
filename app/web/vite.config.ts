import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: {
    outDir: path.resolve(import.meta.dirname, '../../dist/web'),
    emptyOutDir: true,
  },
  server: {
    port: 33_333,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:22222',
    },
  },
});
