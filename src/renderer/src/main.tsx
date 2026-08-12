import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core';
import { LinkProvider } from '@astryxdesign/core/Link';
import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Link } from 'react-router';
import './main.css';
import App from './app';
import { queryClient } from './query-client';

const foundryTheme = defineTheme({
  name: 'foundry',
  extends: neutralTheme,
  tokens: {
    '--font-family-code': 'monospace',
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme theme={foundryTheme}>
        <HashRouter>
          <LinkProvider component={Link}>
            <App />
          </LinkProvider>
        </HashRouter>
      </Theme>
    </QueryClientProvider>
  </StrictMode>,
);
