import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFoundryEvents } from '../../lib/foundry-events';
import { PROVIDERS_CHANGED_EVENT } from '../../shared/events';
import { providerKeys } from './api';

export function ProvidersRealtimeBridge() {
  const queryClient = useQueryClient();
  const { subscribe, status } = useFoundryEvents();

  useEffect(() => subscribe((event) => {
    if (event.type === PROVIDERS_CHANGED_EVENT) {
      void queryClient.invalidateQueries({ queryKey: providerKeys.all });
    }
  }), [queryClient, subscribe]);

  useEffect(() => {
    if (status === 'open') {
      void queryClient.invalidateQueries({ queryKey: providerKeys.all });
    }
  }, [queryClient, status]);

  return null;
}
