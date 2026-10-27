import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';

const fontFallbacks
  = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const foundryTheme = defineTheme({
  name: 'foundry',
  extends: neutralTheme,
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: {
      family: 'Poppins',
      fallbacks: fontFallbacks,
    },
    heading: {
      family: 'Poppins',
      fallbacks: fontFallbacks,
      weights: { 3: 'bold', 4: 'bold' },
    },
    code: {
      family: 'ui-monospace',
      fallbacks: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },
});
