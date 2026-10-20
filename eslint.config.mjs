import { defineConfig } from '@dhzh/eslint-config';

export default defineConfig({
  ignorePatterns: ['out/**', 'backup/**', '.agents/**'],
  configs: {
    json: {
      overrides: {
        packageJson: {
          'package-json/require-exports': 'off',
          'package-json/require-files': 'off',
        },
      },
    },
  },
});
