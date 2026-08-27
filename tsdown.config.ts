import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  outDir: 'dist',
  shims: true,
  clean: true,
  dts: true,
  minify: true,
  target: false,
});
