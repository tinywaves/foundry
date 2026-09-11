import type {
  CreatePromptRequest,
  Prompt,
  PromptDeleteResponse,
  PromptDetailResponse,
  PromptList,
  PromptResponse,
  PromptsResponse,
  PromptSummary,
  PromptUpdateResponse,
} from '@dhzh/foundry-api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface PromptFilters {
  query: string;
}

function promptsQueryKey(filters?: PromptFilters) {
  return filters ? ['prompts', filters] as const : ['prompts'] as const;
}

function promptQueryKey(promptId: string) {
  return ['prompt', promptId] as const;
}

async function readJson<TData>(response: Response, fallback: string): Promise<TData> {
  if (!response.ok) {
    throw new Error(fallback);
  }
  return response.json() as Promise<TData>;
}

async function listPrompts(filters: PromptFilters): Promise<PromptList> {
  const search = new URLSearchParams({ query: filters.query });
  const result = await readJson<PromptsResponse>(
    await fetch(`/api/prompts?${search.toString()}`, { cache: 'no-store' }),
    'The Foundry Server could not load Prompts.',
  );
  return result.data;
}

async function getPrompt(promptId: string): Promise<Prompt> {
  const result = await readJson<PromptDetailResponse>(
    await fetch(`/api/prompts/${encodeURIComponent(promptId)}`, { cache: 'no-store' }),
    'The Foundry Server could not load the Prompt.',
  );
  if (result.status !== 'SUCCESS' || result.data === null) {
    throw new Error(result.message ?? 'The Prompt could not be found.');
  }
  return result.data;
}

async function createPrompt(input: CreatePromptRequest): Promise<PromptSummary> {
  const result = await readJson<PromptResponse>(await fetch('/api/prompts', {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  }), 'The Foundry Server could not create the Prompt.');
  return result.data;
}

async function updatePrompt(
  promptId: string,
  input: CreatePromptRequest,
): Promise<PromptSummary> {
  const result = await readJson<PromptUpdateResponse>(
    await fetch(`/api/prompts/${encodeURIComponent(promptId)}`, {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json' },
      method: 'PUT',
    }),
    'The Foundry Server could not update the Prompt.',
  );
  if (result.status !== 'SUCCESS' || result.data === null) {
    throw new Error(result.message ?? 'The Prompt could not be updated.');
  }
  return result.data;
}

async function deletePrompt(promptId: string): Promise<void> {
  const result = await readJson<PromptDeleteResponse>(
    await fetch(`/api/prompts/${encodeURIComponent(promptId)}`, {
      method: 'DELETE',
    }),
    'The Foundry Server could not delete the Prompt.',
  );
  if (result.status !== 'SUCCESS' || !result.data) {
    throw new Error(result.message ?? 'The Prompt could not be deleted.');
  }
}

export function usePrompts(filters: PromptFilters) {
  return useQuery({
    queryKey: promptsQueryKey(filters),
    queryFn: () => listPrompts(filters),
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function usePrompt(promptId: string, isEnabled = true) {
  return useQuery({
    enabled: isEnabled,
    queryKey: promptQueryKey(promptId),
    queryFn: () => getPrompt(promptId),
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPrompt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: promptsQueryKey() });
    },
  });
}

export function useDeletePrompt(promptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deletePrompt(promptId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: promptQueryKey(promptId) });
      await queryClient.invalidateQueries({ queryKey: promptsQueryKey() });
    },
  });
}

export function useUpdatePrompt(promptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePromptRequest) => updatePrompt(promptId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: promptsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: promptQueryKey(promptId) }),
      ]);
    },
  });
}
