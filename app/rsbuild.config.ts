import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import path from 'node:path';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  html: {
    title: 'Foundry',
  },
  output: {
    cleanDistPath: true,
    distPath: {
      root: path.resolve(import.meta.dirname, '../dist/app'),
    },
  },
  plugins: [pluginReact(), pluginTailwindcss()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:54321',
    },
  },
});
