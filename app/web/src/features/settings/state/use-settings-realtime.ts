import { FOUNDRY_EVENT_VERSION, SETTINGS_CHANGED_EVENT } from '@dhzh/foundry-shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { settingsMutationKey, settingsQueryKey } from './use-settings';

export function useSettingsRealtime(): void {
  const queryClient = useQueryClient();

  // Own only the external connection; React Query owns data and request state.
  useEffect(() => {
    // Browser EventSource, independent of Node's experimental implementation.
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const source = new EventSource('/api/events');
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: settingsQueryKey,
        refetchType: queryClient.isMutating({ mutationKey: settingsMutationKey }) > 0 ? 'none' : 'active',
      });
    };
    const onEvent = (event: MessageEvent<string>) => {
      try {
        const payload: unknown = JSON.parse(event.data);
        if (
          typeof payload === 'object' && payload !== null
          && 'version' in payload && payload.version === FOUNDRY_EVENT_VERSION
          && 'type' in payload && payload.type === SETTINGS_CHANGED_EVENT
        ) {
          refresh();
        }
      } catch {
        // Ignore malformed messages; reconnect always refreshes persisted data.
      }
    };
    source.addEventListener('open', refresh);
    source.addEventListener('foundry', onEvent);
    return () => {
      source.removeEventListener('open', refresh);
      source.removeEventListener('foundry', onEvent);
      source.close();
    };
  }, [queryClient]);
}
