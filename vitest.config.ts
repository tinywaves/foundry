import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
    },
  },
});
