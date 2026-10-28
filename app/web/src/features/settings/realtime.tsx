import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useFoundryEvents } from '../../lib/foundry-events';
import { SETTINGS_CHANGED_EVENT } from '../../shared/events';
import { captureKeys } from '../captures/api';
import { providerKeys } from '../providers/api';
import { settingsKeys } from './api';

const TIME_FIELDS = new Set(['timeFormat', 'timezone']);

export function SettingsRealtimeBridge() {
  const queryClient = useQueryClient();
  const { subscribe, status } = useFoundryEvents();

  useEffect(() => subscribe((event) => {
    if (event.type !== SETTINGS_CHANGED_EVENT) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: settingsKeys.current() });
    if (hasTimeFieldChanged(event.data)) {
      invalidateFormattedRecords(queryClient);
    }
  }), [queryClient, subscribe]);

  useEffect(() => {
    if (status !== 'open') {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: settingsKeys.current() });
    invalidateFormattedRecords(queryClient);
  }, [queryClient, status]);

  return null;
}

function invalidateFormattedRecords(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: captureKeys.all });
  void queryClient.invalidateQueries({ queryKey: providerKeys.all });
}

function hasTimeFieldChanged(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !('fields' in value)) {
    return false;
  }

  const fields = value.fields;
  return Array.isArray(fields)
    && fields.some((field) => typeof field === 'string' && TIME_FIELDS.has(field));
}
