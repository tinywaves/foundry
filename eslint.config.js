import { fileURLToPath } from 'node:url';
import { defineConfig } from '@dhzh/eslint-config';

export default defineConfig({
  configs: {
    tailwindcss: {
      settings: {
        cwd: fileURLToPath(new URL('app/web/', import.meta.url)),
        entryPoint: 'src/styles/globals.css',
      },
    },
  },
  ignorePatterns: [
    '.agents',
    '.claude',
    'docs',
    'app/web/src/components/ui/**',
    'app/web/src/hooks/use-mobile.ts',
    'app/web/legacy-src',
  ],
});
