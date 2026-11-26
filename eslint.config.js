import { defineConfig } from '@dhzh/eslint-config';

export default defineConfig({
  ignorePatterns: ['.agents', '.claude', 'docs', 'app/web/src/components/ui/**', 'app/web/src/hooks/use-mobile.ts'],
});
