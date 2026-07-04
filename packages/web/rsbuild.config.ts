import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import path from 'node:path';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
  ],
  output: {
    distPath: path.resolve(import.meta.dirname, '../../dist/web'),
    cleanDistPath: true,
  },
  html: {
    title: 'Foundry',
  },
});
