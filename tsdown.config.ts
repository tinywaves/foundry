import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
  },
  outDir: 'dist',
  shims: true,
  format: ['esm'],
  clean: true,
  dts: false,
  minify: true,
  target: false,
});
