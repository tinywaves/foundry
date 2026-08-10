import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core';
import { LinkProvider } from '@astryxdesign/core/Link';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Link } from 'react-router';
import './main.css';
import App from './app';
import { queryClient } from './query-client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme theme={neutralTheme}>
        <HashRouter>
          <LinkProvider component={Link}>
            <App />
          </LinkProvider>
        </HashRouter>
      </Theme>
    </QueryClientProvider>
  </StrictMode>,
);
