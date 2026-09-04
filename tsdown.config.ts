import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    cli: 'src/cli/index.ts',
    index: 'src/index.ts',
  },
  deps: {
    alwaysBundle: ['@dhzh/foundry-api-contract'],
  },
  banner: ({ fileName }) => {
    if (fileName === 'cli.mjs') {
      return {
        js: '#!/usr/bin/env node',
      };
    }
  },
  copy: {
    from: 'drizzle',
    rename: 'migrations',
    to: 'dist',
  },
  outDir: 'dist',
  shims: true,
  clean: true,
  dts: true,
  minify: true,
  target: false,
});
