import path from 'node:path';
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
    tailwindcss: {
      overrides: {
        'better-tailwindcss/no-unknown-classes': [
          'warn',
          {
            entryPoint: path.resolve(import.meta.dirname, './packages/web/src/main.css'),
          },
        ],
      },
    },
  },
  ignorePatterns: ['./packages/web/src/components/ui'],
});
