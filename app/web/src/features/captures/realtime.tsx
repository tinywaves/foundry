import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFoundryEvents } from '../../lib/foundry-events';
import {
  CAPTURE_JOB_CHANGED_EVENT,
  CAPTURES_CHANGED_EVENT,
} from '../../shared/events';
import { captureKeys } from './api';

export function CaptureRealtimeBridge() {
  const queryClient = useQueryClient();
  const { subscribe, status } = useFoundryEvents();

  useEffect(() => subscribe((event) => {
    if (
      event.type === CAPTURE_JOB_CHANGED_EVENT
      || event.type === CAPTURES_CHANGED_EVENT
    ) {
      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
    }
  }), [queryClient, subscribe]);

  useEffect(() => {
    if (status === 'open') {
      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
    }
  }, [queryClient, status]);

  return null;
}
