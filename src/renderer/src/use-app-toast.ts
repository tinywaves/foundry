import { useCallback } from 'react';
import { useToast } from '@astryxdesign/core/Toast';
import type { ToastOptions } from '@astryxdesign/core/Toast';

const APP_TOAST_AUTO_HIDE_DURATION = 2500;

export type AppToastOptions = Omit<ToastOptions, 'isAutoHide' | 'autoHideDuration'>;

export function useAppToast() {
  const toast = useToast();

  return useCallback((options: AppToastOptions) => toast({
    ...options,
    isAutoHide: true,
    autoHideDuration: APP_TOAST_AUTO_HIDE_DURATION,
  }), [toast]);
}
