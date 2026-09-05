import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        extends: true,
        root: path.resolve(import.meta.dirname, 'app'),
        plugins: [react(), tailwindcss()],
        optimizeDeps: {
          include: ['@base-ui/react/select', '@base-ui/react/switch'],
        },
        resolve: {
          alias: {
            '#': path.resolve(import.meta.dirname, 'app/src'),
          },
        },
        test: {
          name: 'browser',
          include: ['test/**/*.browser.test.tsx'],
          setupFiles: ['./test/browser.setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
