import path from 'node:path';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
  ],
  html: {
    title: 'Foundry',
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:7777',
    },
  },
  output: {
    distPath: path.resolve(import.meta.dirname, '../../dist/web'),
  },
});
