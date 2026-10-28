import { useCallback } from 'react';
import { useToast } from '@astryxdesign/core/Toast';
import type { ToastOptions } from '@astryxdesign/core/Toast';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await readJSON(response);
  if (!response.ok) {
    throw toApiError(payload, response.status);
  }
  return payload as T;
}

export function toApiError(payload: unknown, status?: number): ApiError {
  return new ApiError(
    readMessage(payload)
    ?? (status === undefined ? 'The request failed' : `Request failed with HTTP ${status}`),
    readCode(payload),
  );
}

async function readJSON(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readCode(value: unknown): string | undefined {
  return typeof value === 'object'
    && value !== null
    && 'error' in value
    && typeof value.error === 'object'
    && value.error !== null
    && 'code' in value.error
    && typeof value.error.code === 'string'
    ? value.error.code
    : undefined;
}

function readMessage(value: unknown): string | undefined {
  if (
    typeof value === 'object'
    && value !== null
    && 'error' in value
  ) {
    if (typeof value.error === 'string') {
      return value.error;
    }
    if (
      typeof value.error === 'object'
      && value.error !== null
      && 'message' in value.error
      && typeof value.error.message === 'string'
    ) {
      return value.error.message;
    }
  }
  return undefined;
}

export function errorResult(error: unknown): {
  ok: false;
  error: { code: string; message: string };
} {
  const apiError = error instanceof ApiError
    ? error
    : new ApiError(error instanceof Error ? error.message : 'The request failed');
  return {
    ok: false,
    error: {
      code: apiError.code ?? 'REQUEST_FAILED',
      message: apiError.message,
    },
  };
}

export function useAppToast() {
  const toast = useToast();

  return useCallback((options: Omit<ToastOptions, 'isAutoHide' | 'autoHideDuration'>) => (
    toast({
      ...options,
      isAutoHide: true,
      autoHideDuration: 2500,
    })
  ), [toast]);
}
