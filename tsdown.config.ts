import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    cli: 'src/cli/index.ts',
    index: 'src/index.ts',
  },
  banner: ({ fileName }) => {
    if (fileName === 'cli.mjs') {
      return {
        js: '#!/usr/bin/env node',
      };
    }
  },
  outDir: 'dist',
  shims: true,
  clean: true,
  dts: true,
  minify: true,
  target: false,
});
