import { defineConfig } from '@dhzh/eslint-config';

export default defineConfig({
  ignorePatterns: [
    '.agents',
    './app/src/components/ui',
    './app/src/components/theme-provider.tsx',
  ],
  customLinterConfigs: [
    {
      files: ['./app/test/app.browser.test.tsx'],
      rules: {
        'n/no-unsupported-features/node-builtins': 'off',
      },
    },
  ],
});
