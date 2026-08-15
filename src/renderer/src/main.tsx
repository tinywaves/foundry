import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core';
import { LinkProvider } from '@astryxdesign/core/Link';
import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { QueryClientProvider } from '@tanstack/react-query';
import { createHashRouter, Link, RouterProvider } from 'react-router';
import './main.css';
import { queryClient } from './query-client';
import { foundryRoutes } from './router';

const foundryTheme = defineTheme({
  name: 'foundry',
  extends: neutralTheme,
  tokens: {
    '--font-family-code': 'monospace',
  },
});

const router = createHashRouter(foundryRoutes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme theme={foundryTheme}>
        <LinkProvider component={Link}>
          <RouterProvider router={router} />
        </LinkProvider>
      </Theme>
    </QueryClientProvider>
  </StrictMode>,
);
