import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  outDir: 'dist',
  shims: true,
  clean: true,
  copy: [
    {
      from: 'skills',
      to: 'dist',
      flatten: false,
    },
  ],
  dts: false,
  deps: {
    alwaysBundle: ['@dhzh/foundry-shared'],
  },
  minify: true,
  target: false,
  banner: { js: '#!/usr/bin/env node' },
});
