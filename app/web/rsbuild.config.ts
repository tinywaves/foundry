import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  output: {
    cleanDistPath: false,
    distPath: {
      root: '../../dist/web',
    },
  },
  server: {
    port: 33_333,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:22222',
    },
  },
});
