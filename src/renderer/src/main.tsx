import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './main.css';
import { loadInitialApplicationSettings } from './application-settings-model';
import { ApplicationSettingsProvider } from './application-settings';
import { FoundryApplication } from './foundry-application';
import { queryClient } from './query-client';

async function bootstrapRenderer(): Promise<void> {
  const initialSettings = await loadInitialApplicationSettings(globalThis.api.settings);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ApplicationSettingsProvider initialSettings={initialSettings}>
          <FoundryApplication />
        </ApplicationSettingsProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrapRenderer();
