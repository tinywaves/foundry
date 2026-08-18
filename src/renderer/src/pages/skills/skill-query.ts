import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type {
  SkillApiError,
  SkillApiResult,
  SkillEmptyTrashResult,
  SkillFileReadResult,
  SkillInstallationListInput,
  SkillInstallationView,
  SkillPackageFileEntry,
  SkillRevisionView,
  SkillSourceView,
  SkillStorePackageView,
  SkillTargetView,
  SkillTrashPackageView,
} from '../../../../shared/skill-contract';

export const skillQueryKeys = {
  all: ['skills'] as const,
  storePackages: () => [...skillQueryKeys.all, 'store-packages'] as const,
  storePackage: (skillId: string) => [
    ...skillQueryKeys.all,
    'store-package',
    skillId,
  ] as const,
  packageFiles: (skillId: string) => [
    ...skillQueryKeys.all,
    'package-files',
    skillId,
  ] as const,
  packageFile: (skillId: string, relativePath: string) => [
    ...skillQueryKeys.packageFiles(skillId),
    relativePath,
  ] as const,
  revisions: (skillId: string) => [
    ...skillQueryKeys.all,
    'revisions',
    skillId,
  ] as const,
  sources: (skillId: string) => [
    ...skillQueryKeys.all,
    'sources',
    skillId,
  ] as const,
  revisionFiles: (skillId: string, revisionId: string) => [
    ...skillQueryKeys.revisions(skillId),
    revisionId,
    'files',
  ] as const,
  revisionFile: (skillId: string, revisionId: string, relativePath: string) => [
    ...skillQueryKeys.revisionFiles(skillId, revisionId),
    relativePath,
  ] as const,
  trash: () => [...skillQueryKeys.all, 'trash'] as const,
  targets: () => [...skillQueryKeys.all, 'targets'] as const,
  installationLists: () => [...skillQueryKeys.all, 'installations'] as const,
  installations: (input: SkillInstallationListInput = {}) => [
    ...skillQueryKeys.installationLists(),
    input.skillId ?? null,
    input.targetId ?? null,
  ] as const,
};

export class SkillRequestError extends Error {
  readonly apiError: SkillApiError | undefined;

  constructor(message: string, apiError?: SkillApiError) {
    super(message);
    this.name = 'SkillRequestError';
    this.apiError = apiError;
  }
}

export async function resolveSkillRequest<T>(
  request: () => Promise<SkillApiResult<T>>,
  fallbackMessage: string,
): Promise<T> {
  try {
    const result = await request();
    if (!result.ok) {
      throw new SkillRequestError(result.error.message, result.error);
    }
    return result.value;
  } catch (error) {
    if (error instanceof SkillRequestError) {
      throw error;
    }
    throw new SkillRequestError(fallbackMessage);
  }
}

export function shouldRetrySkillRead(failureCount: number, error: Error): boolean {
  if (failureCount >= 1 || !(error instanceof SkillRequestError)) {
    return false;
  }
  return error.apiError === undefined
    || error.apiError.code === 'filesystem-unavailable'
    || error.apiError.code === 'storage-unavailable'
    || error.apiError.code === 'internal';
}

const skillReadQueryDefaults = {
  gcTime: Infinity,
  refetchOnMount: false,
  retry: shouldRetrySkillRead,
  retryOnMount: false,
  staleTime: Infinity,
} as const;

export function getSkillStorePackagesQueryOptions() {
  return queryOptions({
    queryKey: skillQueryKeys.storePackages(),
    queryFn: () => resolveSkillRequest<SkillStorePackageView[]>(
      () => globalThis.api.skills.listStorePackages(),
      'Skill Store could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillStorePackageQueryOptions(skillId: string) {
  return queryOptions({
    queryKey: skillQueryKeys.storePackage(skillId),
    queryFn: () => resolveSkillRequest<SkillStorePackageView>(
      () => globalThis.api.skills.getStorePackage(skillId),
      'Skill Package could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillPackageFilesQueryOptions(skillId: string) {
  return queryOptions({
    queryKey: skillQueryKeys.packageFiles(skillId),
    queryFn: () => resolveSkillRequest<SkillPackageFileEntry[]>(
      () => globalThis.api.skills.listPackageFiles(skillId),
      'Skill Package files could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillPackageFileQueryOptions(
  skillId: string,
  relativePath: string,
) {
  return queryOptions({
    queryKey: skillQueryKeys.packageFile(skillId, relativePath),
    queryFn: () => resolveSkillRequest<SkillFileReadResult>(
      () => globalThis.api.skills.readPackageFile({ skillId, relativePath }),
      'Skill Package file could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillRevisionsQueryOptions(skillId: string) {
  return queryOptions({
    queryKey: skillQueryKeys.revisions(skillId),
    queryFn: () => resolveSkillRequest<SkillRevisionView[]>(
      () => globalThis.api.skills.listRevisions(skillId),
      'Skill Revisions could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillSourcesQueryOptions(skillId: string) {
  return queryOptions({
    queryKey: skillQueryKeys.sources(skillId),
    queryFn: () => resolveSkillRequest<SkillSourceView[]>(
      () => globalThis.api.skills.listSources(skillId),
      'Skill Sources could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillRevisionFilesQueryOptions(
  skillId: string,
  revisionId: string,
) {
  return queryOptions({
    queryKey: skillQueryKeys.revisionFiles(skillId, revisionId),
    queryFn: () => resolveSkillRequest<SkillPackageFileEntry[]>(
      () => globalThis.api.skills.listRevisionFiles(skillId, revisionId),
      'Skill Revision files could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillRevisionFileQueryOptions(
  skillId: string,
  revisionId: string,
  relativePath: string,
) {
  return queryOptions({
    queryKey: skillQueryKeys.revisionFile(skillId, revisionId, relativePath),
    queryFn: () => resolveSkillRequest<SkillFileReadResult>(
      () => globalThis.api.skills.readRevisionFile({
        skillId,
        revisionId,
        relativePath,
      }),
      'Skill Revision file could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillTrashQueryOptions() {
  return queryOptions({
    queryKey: skillQueryKeys.trash(),
    queryFn: () => resolveSkillRequest<SkillTrashPackageView[]>(
      () => globalThis.api.skills.listTrash(),
      'Skill Trash could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillTargetsQueryOptions() {
  return queryOptions({
    queryKey: skillQueryKeys.targets(),
    queryFn: () => resolveSkillRequest<SkillTargetView[]>(
      () => globalThis.api.skills.listTargets(),
      'Distribution Targets could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function getSkillInstallationsQueryOptions(
  input: SkillInstallationListInput = {},
) {
  return queryOptions({
    queryKey: skillQueryKeys.installations(input),
    queryFn: () => resolveSkillRequest<SkillInstallationView[]>(
      () => globalThis.api.skills.listInstallations(input),
      'Skill installations could not be loaded.',
    ),
    ...skillReadQueryDefaults,
  });
}

export function invalidateSkillQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: skillQueryKeys.all });
}

export async function invalidateSkillUpdateQueries(
  queryClient: QueryClient,
  skillId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: skillQueryKeys.storePackages() }),
    queryClient.invalidateQueries({
      queryKey: skillQueryKeys.storePackage(skillId),
      exact: true,
    }),
    queryClient.invalidateQueries({ queryKey: skillQueryKeys.packageFiles(skillId) }),
    queryClient.invalidateQueries({ queryKey: skillQueryKeys.sources(skillId) }),
    queryClient.invalidateQueries({ queryKey: skillQueryKeys.revisions(skillId) }),
    queryClient.invalidateQueries({ queryKey: skillQueryKeys.installationLists() }),
  ]);
}

export function moveSkillPackageToTrashCaches(
  queryClient: QueryClient,
  trashedPackage: SkillTrashPackageView,
): void {
  queryClient.setQueryData<SkillStorePackageView[]>(
    skillQueryKeys.storePackages(),
    (current) => current?.filter((item) => item.id !== trashedPackage.id),
  );
  queryClient.removeQueries({
    queryKey: skillQueryKeys.storePackage(trashedPackage.id),
    exact: true,
  });
  queryClient.removeQueries({
    queryKey: skillQueryKeys.packageFiles(trashedPackage.id),
  });
  queryClient.removeQueries({
    queryKey: skillQueryKeys.revisions(trashedPackage.id),
  });
  queryClient.setQueryData<SkillTrashPackageView[]>(
    skillQueryKeys.trash(),
    (current) => (
      current
        ? [trashedPackage, ...current.filter((item) => item.id !== trashedPackage.id)]
        : current
    ),
  );
}

export function restoreSkillPackageCaches(
  queryClient: QueryClient,
  restoredPackage: SkillStorePackageView,
): void {
  queryClient.setQueryData<SkillTrashPackageView[]>(
    skillQueryKeys.trash(),
    (current) => current?.filter((item) => item.id !== restoredPackage.id),
  );
  queryClient.setQueryData<SkillStorePackageView[]>(
    skillQueryKeys.storePackages(),
    (current) => (
      current
        ? [restoredPackage, ...current.filter((item) => item.id !== restoredPackage.id)]
        : current
    ),
  );
  queryClient.setQueryData(
    skillQueryKeys.storePackage(restoredPackage.id),
    restoredPackage,
  );
}

export function removeSkillPackageFromTrashCaches(
  queryClient: QueryClient,
  skillId: string,
): void {
  queryClient.setQueryData<SkillTrashPackageView[]>(
    skillQueryKeys.trash(),
    (current) => current?.filter((item) => item.id !== skillId),
  );
}

export function emptySkillTrashCaches(
  queryClient: QueryClient,
  result: SkillEmptyTrashResult,
): void {
  const removedIds = new Set(result.removedIds);
  queryClient.setQueryData<SkillTrashPackageView[]>(
    skillQueryKeys.trash(),
    (current) => current?.filter((item) => !removedIds.has(item.id)),
  );
}
