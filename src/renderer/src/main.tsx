import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { router } from './router';
import RendererTheme from './components/renderer-theme';
import '@fontsource/poppins/400.css';
import './main.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RendererTheme>
        <RouterProvider router={router} />
      </RendererTheme>
    </QueryClientProvider>
  </StrictMode>,
);
