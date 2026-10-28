import path from 'node:path';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    stylex.vite({ devMode: 'full', useCSSLayers: true }),
    react(),
  ],
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
