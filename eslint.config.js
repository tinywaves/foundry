import { defineConfig } from '@dhzh/eslint-config';

export default defineConfig({
  ignorePatterns: [
    '.agents',
    './app/src/components/ui',
    './app/src/components/theme-provider.tsx',
  ],
});
