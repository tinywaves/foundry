import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  outDir: 'dist',
  shims: true,
  clean: true,
  dts: false,
  minify: true,
  target: false,
  banner: { js: '#!/usr/bin/env node' },
});
