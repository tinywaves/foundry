import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type {
  PromptApiError,
  PromptApiResult,
  PromptDetail,
  PromptSummary,
  PromptVersionDetail,
  PromptVersionSummary,
  PromptVersionTarget,
  TrashedPromptDetail,
  TrashedPromptSummary,
} from '../../../../shared/prompt-contract';

export const promptQueryKeys = {
  all: ['prompts'] as const,
  list: () => [...promptQueryKeys.all, 'list'] as const,
  details: () => [...promptQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptQueryKeys.details(), id] as const,
  versionLists: () => [...promptQueryKeys.all, 'version-list'] as const,
  versionList: (id: string) => [...promptQueryKeys.versionLists(), id] as const,
  versions: () => [...promptQueryKeys.all, 'version'] as const,
  version: (id: string, version: number) => (
    [...promptQueryKeys.versions(), id, version] as const
  ),
  trashList: () => [...promptQueryKeys.all, 'trash-list'] as const,
  trashDetails: () => [...promptQueryKeys.all, 'trash-detail'] as const,
  trashDetail: (id: string) => [...promptQueryKeys.trashDetails(), id] as const,
};

export class PromptRequestError extends Error {
  readonly apiError: PromptApiError | undefined;

  constructor(message: string, apiError?: PromptApiError) {
    super(message);
    this.name = 'PromptRequestError';
    this.apiError = apiError;
  }
}

export async function resolvePromptRequest<T>(
  request: () => Promise<PromptApiResult<T>>,
  fallbackMessage: string,
): Promise<T> {
  try {
    const result = await request();
    if (!result.ok) {
      throw new PromptRequestError(result.error.message, result.error);
    }
    return result.value;
  } catch (error) {
    if (error instanceof PromptRequestError) {
      throw error;
    }
    throw new PromptRequestError(fallbackMessage);
  }
}

export function shouldRetryPromptRead(failureCount: number, error: Error): boolean {
  if (failureCount >= 1 || !(error instanceof PromptRequestError)) {
    return false;
  }
  return error.apiError === undefined
    || error.apiError.code === 'storage-unavailable'
    || error.apiError.code === 'internal';
}

export function getPromptListQueryOptions() {
  return queryOptions({
    queryKey: promptQueryKeys.list(),
    queryFn: () => resolvePromptRequest<PromptSummary[]>(
      () => globalThis.api.prompts.listPrompts(),
      'Prompts could not be loaded.',
    ),
    gcTime: Infinity,
    refetchOnMount: false,
    retry: shouldRetryPromptRead,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getPromptDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: promptQueryKeys.detail(id),
    queryFn: () => resolvePromptRequest<PromptDetail>(
      () => globalThis.api.prompts.getPrompt(id),
      'Prompt details could not be loaded.',
    ),
    gcTime: Infinity,
    refetchOnMount: false,
    retry: shouldRetryPromptRead,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getPromptVersionListQueryOptions(id: string) {
  return queryOptions({
    queryKey: promptQueryKeys.versionList(id),
    queryFn: () => resolvePromptRequest<PromptVersionSummary[]>(
      () => globalThis.api.prompts.listPromptVersions(id),
      'Prompt version history could not be loaded.',
    ),
    gcTime: Infinity,
    refetchOnMount: false,
    retry: shouldRetryPromptRead,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getPromptVersionQueryOptions(target: PromptVersionTarget) {
  return queryOptions({
    queryKey: promptQueryKeys.version(target.id, target.version),
    queryFn: () => resolvePromptRequest<PromptVersionDetail>(
      () => globalThis.api.prompts.getPromptVersion(target),
      'Prompt version could not be loaded.',
    ),
    gcTime: Infinity,
    refetchOnMount: false,
    retry: shouldRetryPromptRead,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getTrashedPromptListQueryOptions() {
  return queryOptions({
    queryKey: promptQueryKeys.trashList(),
    queryFn: () => resolvePromptRequest<TrashedPromptSummary[]>(
      () => globalThis.api.prompts.listTrashedPrompts(),
      'Trash could not be loaded.',
    ),
    gcTime: Infinity,
    refetchOnMount: false,
    retry: shouldRetryPromptRead,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getTrashedPromptDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: promptQueryKeys.trashDetail(id),
    queryFn: () => resolvePromptRequest<TrashedPromptDetail>(
      () => globalThis.api.prompts.getTrashedPrompt(id),
      'Trashed Prompt details could not be loaded.',
    ),
    gcTime: Infinity,
    refetchOnMount: false,
    retry: shouldRetryPromptRead,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

function toPromptSummary(prompt: PromptDetail): PromptSummary {
  const { content: _content, ...summary } = prompt;
  return summary;
}

function comparePromptSummaries(left: PromptSummary, right: PromptSummary): number {
  return right.updatedAt - left.updatedAt || left.id.localeCompare(right.id);
}

function toPromptVersionDetail(prompt: PromptDetail): PromptVersionDetail {
  return {
    promptId: prompt.id,
    version: prompt.currentVersion,
    title: prompt.title,
    description: prompt.description,
    content: prompt.content,
    createdAt: prompt.updatedAt,
  };
}

export function updatePromptCaches(
  queryClient: QueryClient,
  prompt: PromptDetail,
): void {
  queryClient.setQueryData(promptQueryKeys.detail(prompt.id), prompt);
  queryClient.setQueryData<PromptSummary[]>(promptQueryKeys.list(), (prompts) => {
    if (prompts === undefined) {
      return prompts;
    }
    const summary = toPromptSummary(prompt);
    const nextPrompts = prompts.some((item) => item.id === prompt.id)
      ? prompts.map((item) => (
          item.id === prompt.id ? summary : item
        ))
      : [...prompts, summary];
    return nextPrompts.toSorted(comparePromptSummaries);
  });

  const currentVersion = toPromptVersionDetail(prompt);
  queryClient.setQueryData(
    promptQueryKeys.version(prompt.id, prompt.currentVersion),
    currentVersion,
  );
  queryClient.setQueryData<PromptVersionSummary[]>(
    promptQueryKeys.versionList(prompt.id),
    (versions) => {
      if (versions === undefined) {
        return versions;
      }
      const summary: PromptVersionSummary = {
        promptId: currentVersion.promptId,
        version: currentVersion.version,
        createdAt: currentVersion.createdAt,
      };
      const remaining = versions.filter((version) => (
        version.version !== currentVersion.version
      ));
      return [summary, ...remaining].toSorted((left, right) => (
        right.version - left.version
      ));
    },
  );
}

function removePromptIdentityCaches(queryClient: QueryClient, id: string): void {
  queryClient.removeQueries({
    exact: true,
    queryKey: promptQueryKeys.detail(id),
  });
  queryClient.removeQueries({
    exact: true,
    queryKey: promptQueryKeys.versionList(id),
  });
  queryClient.removeQueries({
    queryKey: [...promptQueryKeys.versions(), id],
  });
}

function removeTrashedPromptDetailCache(queryClient: QueryClient, id: string): void {
  queryClient.removeQueries({
    exact: true,
    queryKey: promptQueryKeys.trashDetail(id),
  });
}

function withoutPrompt<T extends { id: string }>(
  prompts: T[] | undefined,
  id: string,
): T[] | undefined {
  return prompts?.filter((prompt) => prompt.id !== id);
}

export function movePromptToTrashCaches(
  queryClient: QueryClient,
  id: string,
): void {
  queryClient.setQueryData<PromptSummary[]>(promptQueryKeys.list(), (prompts) => (
    withoutPrompt(prompts, id)
  ));
  removePromptIdentityCaches(queryClient, id);
  removeTrashedPromptDetailCache(queryClient, id);
  queryClient.removeQueries({
    exact: true,
    queryKey: promptQueryKeys.trashList(),
  });
}

export function restoreTrashedPromptCaches(
  queryClient: QueryClient,
  prompt: PromptDetail,
): void {
  queryClient.setQueryData<TrashedPromptSummary[]>(
    promptQueryKeys.trashList(),
    (prompts) => withoutPrompt(prompts, prompt.id),
  );
  removeTrashedPromptDetailCache(queryClient, prompt.id);
  updatePromptCaches(queryClient, prompt);
}

export function removePromptFromTrashCaches(
  queryClient: QueryClient,
  id: string,
): void {
  queryClient.setQueryData<TrashedPromptSummary[]>(
    promptQueryKeys.trashList(),
    (prompts) => withoutPrompt(prompts, id),
  );
  queryClient.setQueryData<PromptSummary[]>(promptQueryKeys.list(), (prompts) => (
    withoutPrompt(prompts, id)
  ));
  removeTrashedPromptDetailCache(queryClient, id);
  removePromptIdentityCaches(queryClient, id);
}

export function emptyPromptTrashCaches(
  queryClient: QueryClient,
  promptIds: string[],
): void {
  const removedIds = new Set(promptIds);
  queryClient.setQueryData<TrashedPromptSummary[]>(promptQueryKeys.trashList(), []);
  queryClient.setQueryData<PromptSummary[]>(promptQueryKeys.list(), (prompts) => (
    prompts?.filter((prompt) => !removedIds.has(prompt.id))
  ));
  for (const id of promptIds) {
    removeTrashedPromptDetailCache(queryClient, id);
    removePromptIdentityCaches(queryClient, id);
  }
}
