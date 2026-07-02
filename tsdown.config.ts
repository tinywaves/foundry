import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    'bin/index': 'src/bin/index.ts',
    'index': 'src/index.ts',
  },
  outDir: 'dist',
  shims: true,
  format: ['cjs', 'esm'],
  clean: true,
  dts: true,
  minify: true,
  target: false,
});
