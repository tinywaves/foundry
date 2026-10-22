import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { router } from './router';
import RendererTheme from './components/renderer-theme';
import { I18nProvider } from './i18n';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './main.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RendererTheme>
        <I18nProvider>
          <RouterProvider router={router} />
        </I18nProvider>
      </RendererTheme>
    </QueryClientProvider>
  </StrictMode>,
);
