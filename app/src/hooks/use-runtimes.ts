import type {
  ApplyRuntimeConfigurationRequest,
  PreviewRuntimeConfigurationRequest,
  ProviderRuntime,
  RuntimeConfigurationPreview,
  RuntimeSummary,
} from '@dhzh/foundry-api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const runtimesQueryKey = ['runtimes'] as const;

export class RuntimeRequestError extends Error {}

async function readRuntimeResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    throw new RuntimeRequestError(fallbackMessage);
  }
  const result = await response.json() as {
    data: T | null;
    message?: string;
    status: string;
  };
  if (result.status !== 'SUCCESS' || result.data === null) {
    throw new RuntimeRequestError(result.message ?? fallbackMessage);
  }
  return result.data;
}

async function listRuntimes(): Promise<RuntimeSummary[]> {
  const response = await fetch('/api/runtimes', { cache: 'no-store' });
  return readRuntimeResponse<RuntimeSummary[]>(
    response,
    'The Foundry Server could not load Runtimes.',
  );
}

async function previewRuntimeConfiguration(
  runtime: ProviderRuntime,
  input: PreviewRuntimeConfigurationRequest,
): Promise<RuntimeConfigurationPreview> {
  const response = await fetch(`/api/runtimes/${runtime}/preview`, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  return readRuntimeResponse<RuntimeConfigurationPreview>(
    response,
    'The Runtime configuration could not be previewed.',
  );
}

async function applyRuntimeConfiguration(
  runtime: ProviderRuntime,
  input: ApplyRuntimeConfigurationRequest,
): Promise<RuntimeSummary> {
  const response = await fetch(`/api/runtimes/${runtime}/apply`, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  return readRuntimeResponse<RuntimeSummary>(
    response,
    'The Runtime configuration could not be applied.',
  );
}

export function useRuntimes() {
  return useQuery({
    queryKey: runtimesQueryKey,
    queryFn: listRuntimes,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function usePreviewRuntimeConfiguration(runtime: ProviderRuntime) {
  return useMutation({
    mutationFn: (input: PreviewRuntimeConfigurationRequest) =>
      previewRuntimeConfiguration(runtime, input),
  });
}

export function useApplyRuntimeConfiguration(runtime: ProviderRuntime) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplyRuntimeConfigurationRequest) =>
      applyRuntimeConfiguration(runtime, input),
    onSuccess: (summary) => {
      queryClient.setQueryData<RuntimeSummary[]>(runtimesQueryKey, (runtimes) =>
        runtimes?.map((runtimeSummary) => {
          if (runtimeSummary.runtime === summary.runtime) {
            return summary;
          }
          return runtimeSummary;
        }));
    },
  });
}
