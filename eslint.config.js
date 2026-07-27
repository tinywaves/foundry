import { defineConfig } from '@dhzh/eslint-config';

export default defineConfig({
  configs: {
    json: {
      overrides: {
        packageJson: {
          'package-json/require-exports': 'off',
        },
      },
    },
    unicorn: {
      overrides: {
        'unicorn/max-nested-calls': 'off',
      },
    },
  },
  ignorePatterns: ['./.agents'],
});
