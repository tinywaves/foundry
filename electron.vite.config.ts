import path from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': path.resolve('src/renderer/src'),
      },
    },
    plugins: [
      stylex.vite({
        useCSSLayers: true,
      }),
      react(),
    ],
  },
});
