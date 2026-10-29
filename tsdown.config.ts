import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  outDir: 'dist',
  shims: true,
  clean: true,
  copy: [
    {
      from: 'drizzle',
      to: 'dist',
      flatten: false,
    },
    {
      from: 'skills',
      to: 'dist',
      flatten: false,
    },
  ],
  dts: false,
  minify: true,
  target: false,
  banner: { js: '#!/usr/bin/env node' },
});
