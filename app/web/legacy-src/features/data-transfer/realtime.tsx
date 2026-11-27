import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFoundryEvents } from '../../lib/foundry-events';
import {
  CAPTURE_JOB_CHANGED_EVENT,
  CAPTURES_CHANGED_EVENT,
  DATA_TRANSFER_IMPORTED_EVENT,
  DATA_TRANSFER_STATUS_CHANGED_EVENT,
} from '../../shared/events';
import { dataTransferKeys } from './api';

const STATUS_EVENTS = new Set([
  DATA_TRANSFER_STATUS_CHANGED_EVENT,
  CAPTURE_JOB_CHANGED_EVENT,
  CAPTURES_CHANGED_EVENT,
]);

export function DataTransferRealtimeBridge() {
  const queryClient = useQueryClient();
  const { subscribe, status } = useFoundryEvents();

  useEffect(() => subscribe((event) => {
    if (STATUS_EVENTS.has(event.type)) {
      void queryClient.invalidateQueries({ queryKey: dataTransferKeys.status() });
    } else if (event.type === DATA_TRANSFER_IMPORTED_EVENT) {
      void queryClient.invalidateQueries();
    }
  }), [queryClient, subscribe]);

  useEffect(() => {
    if (status === 'open') {
      void queryClient.invalidateQueries({ queryKey: dataTransferKeys.status() });
    }
  }, [queryClient, status]);

  return null;
}
