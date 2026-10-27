import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  shims: true,
  format: ['cjs', 'esm'],
  clean: true,
  dts: true,
  minify: true,
  target: false,
});
