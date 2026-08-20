export const skillIpcChannels = {
  listStorePackages: 'skills:list-store-packages',
  getStorePackage: 'skills:get-store-package',
  listTargets: 'skills:list-targets',
  listInstallations: 'skills:list-installations',
  importExisting: 'skills:import-existing',
  listPackageFiles: 'skills:list-package-files',
  readPackageFile: 'skills:read-package-file',
  revealTarget: 'skills:reveal-target',
  openTargetDocumentation: 'skills:open-target-documentation',
  selectCustomTargetDirectory: 'skills:select-custom-target-directory',
  createCustomTarget: 'skills:create-custom-target',
  updateTargetPolicy: 'skills:update-target-policy',
  resetBuiltInTargetPolicy: 'skills:reset-built-in-target-policy',
  removeCustomTarget: 'skills:remove-custom-target',
  preflightDistribution: 'skills:preflight-distribution',
  distribute: 'skills:distribute',
  uninstall: 'skills:uninstall',
  preflightStoreDeletion: 'skills:preflight-store-deletion',
  movePackageToTrash: 'skills:move-package-to-trash',
  listTrash: 'skills:list-trash',
  restoreTrashedPackage: 'skills:restore-trashed-package',
  removeTrashedPackage: 'skills:remove-trashed-package',
  emptyTrash: 'skills:empty-trash',
  listSources: 'skills:list-sources',
  browseRemoteSkills: 'skills:browse-remote-skills',
  searchRemoteSkills: 'skills:search-remote-skills',
  getRemoteSkillDetails: 'skills:get-remote-skill-details',
  resolveDirectoryResult: 'skills:resolve-directory-result',
  resolveGitSource: 'skills:resolve-git-source',
  addRemoteCandidate: 'skills:add-remote-candidate',
  openRemoteResult: 'skills:open-remote-result',
  openSource: 'skills:open-source',
  checkSourceForUpdates: 'skills:check-source-for-updates',
  checkPackageForUpdates: 'skills:check-package-for-updates',
  applyUpdate: 'skills:apply-update',
} as const;

export const skillTargetKinds = [
  'generic-agent-skills',
  'claude-code',
  'gemini-cli',
  'opencode',
  'cursor',
  'github-copilot',
  'hermes',
  'openclaw',
  'codex-legacy',
  'custom',
] as const;
export type SkillTargetKind = typeof skillTargetKinds[number];

export const skillSourceCheckStatuses = [
  'never',
  'current',
  'update-available',
  'unavailable',
] as const;
export type SkillSourceCheckStatus = typeof skillSourceCheckStatuses[number];

export const skillTargetPolicySources = ['adapter-default', 'user-override'] as const;
export type SkillTargetPolicySource = typeof skillTargetPolicySources[number];
export const skillSourceProviders = ['git', 'clawhub'] as const;
export type SkillSourceProvider = typeof skillSourceProviders[number];
export const skillDirectoryProviders = ['skills-sh'] as const;
export type SkillDirectoryProvider = typeof skillDirectoryProviders[number];
export const skillDiscoveryProviders = ['clawhub', 'skills-sh'] as const;
export type SkillDiscoveryProvider = typeof skillDiscoveryProviders[number];
export const skillSourceTrackingModes = ['tracked', 'fixed'] as const;
export type SkillSourceTrackingMode = typeof skillSourceTrackingModes[number];

export type SkillId = string;
export type SkillTargetId = string;
export type SkillInstallationId = string;
export type SkillSourceId = string;
export type SkillRemoteResultId = string;
export type SkillContentFingerprint = string;

export type SkillApiErrorCode
  = | 'invalid-input'
    | 'not-found'
    | 'conflict'
    | 'content-unavailable'
    | 'filesystem-unavailable'
    | 'storage-unavailable'
    | 'storage-corrupt'
    | 'store-corrupt'
    | 'unsupported-database-version'
    | 'network-unavailable'
    | 'authentication-required'
    | 'rate-limited'
    | 'operation-timeout'
    | 'resource-limit'
    | 'source-unavailable'
    | 'stale-result'
    | 'internal';

export interface SkillFieldError {
  field: string;
  message: string;
}

export interface SkillApiError {
  code: SkillApiErrorCode;
  message: string;
  fields?: SkillFieldError[];
  retryAfterSeconds?: number;
}

export type SkillApiResult<T>
  = | { ok: true; value: T }
    | { ok: false; error: SkillApiError };

export interface SkillFileTarget {
  skillId: SkillId;
  relativePath: string;
}

export type SkillPackageFileKind = 'directory' | 'file' | 'symbolic-link';

export interface SkillPackageFileEntry {
  relativePath: string;
  kind: SkillPackageFileKind;
  size: number | null;
}

export type SkillFileReadResult
  = | {
    status: 'text';
    relativePath: string;
    content: string;
    size: number;
  }
  | {
    status: 'binary' | 'oversized';
    relativePath: string;
    size: number;
  }
  | {
    status: 'symbolic-link' | 'missing';
    relativePath: string;
    size: null;
  };

export type SkillDiscoveryWarningCode
  = | 'entry-unreadable'
    | 'symlink-escape-blocked'
    | 'traversal-limit-reached'
    | 'candidate-unreadable'
    | 'candidate-reconciliation-failed';

export interface SkillDiscoveryWarning {
  targetId: SkillTargetId;
  relativePath: string | null;
  code: SkillDiscoveryWarningCode;
}

export interface SkillDiscoveryRootResult {
  targetId: SkillTargetId;
  rootPath: string;
  status: 'scanned' | 'missing' | 'unreadable';
  packagesFound: number;
  truncated: boolean;
}

export interface SkillDiscoveryResult {
  roots: SkillDiscoveryRootResult[];
  rootsInspected: number;
  packagesFound: number;
  packagesImported: number;
  installationsAdopted: number;
  warnings: SkillDiscoveryWarning[];
  rootFailures: Array<{
    targetId: SkillTargetId;
    status: 'unreadable';
  }>;
}

export interface SkillStorePackageView {
  id: SkillId;
  distributionName: string;
  fingerprint: SkillContentFingerprint;
  createdAt: number;
  updatedAt: number;
}

export interface SkillTargetView {
  id: SkillTargetId;
  kind: SkillTargetKind;
  displayName: string;
  configuredPath: string;
  documentationUrl: string | null;
  brandingKey: string;
  hint: string | null;
  builtIn: boolean;
  writable: boolean;
  enabled: boolean;
  policySource: SkillTargetPolicySource;
  maxScanDepth: number;
  allowSymlinkEscape: boolean;
  sortOrder: number;
}

export type SkillInstallationDistributionStatus = 'current' | 'needs-distribution';

export interface SkillInstallationView {
  id: SkillInstallationId;
  packageId: SkillId;
  targetId: SkillTargetId;
  distributionName: string;
  relativePath: string;
  distributedFingerprint: SkillContentFingerprint;
  distributionStatus: SkillInstallationDistributionStatus;
  createdAt: number;
  updatedAt: number;
}

export interface SkillInstallationListInput {
  skillId?: SkillId;
  targetId?: SkillTargetId;
}

export interface SkillCustomTargetDirectorySelection {
  candidateId: string;
  suggestedName: string;
}

export interface SkillCreateCustomTargetInput {
  candidateId: string;
  displayName: string;
  enabled: boolean;
  maxScanDepth: number;
  allowSymlinkEscape: boolean;
}

export interface SkillCreateCustomTargetResult {
  target: SkillTargetView;
  reused: boolean;
}

export const skillDistributionConflictCodes = [
  'target-disabled',
  'target-read-only',
  'target-unavailable',
  'duplicate-physical-target',
] as const;
export type SkillDistributionConflictCode = typeof skillDistributionConflictCodes[number];

export type SkillDistributionTargetPreflight
  = | {
    targetId: SkillTargetId;
    status: 'ready';
    operation: 'install' | 'none' | 'replace';
    installationId: SkillInstallationId | null;
  }
  | {
    targetId: SkillTargetId;
    status: 'conflict';
    code: SkillDistributionConflictCode;
    message: string;
  };

export interface SkillDistributionPreflightResult {
  skillId: SkillId;
  distributionName: string;
  targets: SkillDistributionTargetPreflight[];
}

export type SkillDistributionTargetResult
  = | {
    targetId: SkillTargetId;
    ok: true;
    installation: SkillInstallationView;
  }
  | {
    targetId: SkillTargetId;
    ok: false;
    error: SkillApiError;
  };

export interface SkillDistributionResult {
  skillId: SkillId;
  targets: SkillDistributionTargetResult[];
}

export interface SkillStoreDeletionTargetView {
  installationId: SkillInstallationId;
  targetId: SkillTargetId;
  targetName: string;
  path: string;
  status: 'missing' | 'ready' | 'unavailable';
  message: string | null;
}

export interface SkillStoreDeletionPreflight {
  skillId: SkillId;
  targets: SkillStoreDeletionTargetView[];
}

export interface SkillStoreDeletionResult {
  deleted: boolean;
  skillPackage: SkillTrashPackageView | null;
  failures: Array<{
    installationId: SkillInstallationId;
    targetId: SkillTargetId;
    error: SkillApiError;
  }>;
}

export interface SkillTrashPackageView {
  id: SkillId;
  distributionName: string;
  fingerprint: SkillContentFingerprint;
  createdAt: number;
  updatedAt: number;
  trashedAt: number;
}

export interface SkillSourceView {
  id: SkillSourceId;
  packageId: SkillId;
  provider: SkillSourceProvider;
  trackingMode: SkillSourceTrackingMode;
  sourceNativeId: string;
  directoryProvider: SkillDirectoryProvider | null;
  catalogLocator: string | null;
  sourceUrl: string | null;
  skillPath: string | null;
  requestedRef: string | null;
  resolvedRevision: string;
  artifactDigest: string | null;
  observedContentFingerprint: SkillContentFingerprint;
  canonicalWebUrl: string;
  fetchedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface SkillUpdateCandidateView {
  sourceId: SkillSourceId;
  packageId: SkillId;
  resolvedRevision: string;
  artifactDigest: string | null;
  canonicalWebUrl: string;
  checkedAt: number;
}

export type SkillUpdateCheckResult
  = | { status: 'fixed'; source: SkillSourceView }
    | { status: 'current'; source: SkillSourceView }
    | {
      status: 'update-available';
      source: SkillSourceView;
      candidate: SkillUpdateCandidateView;
    }
    | { status: 'unavailable'; source: SkillSourceView };

export interface SkillApplyUpdateInput {
  candidate: SkillUpdateCandidateView;
}

export interface SkillApplyUpdateResult {
  skillPackage: SkillStorePackageView;
  source: SkillSourceView;
  contentChanged: boolean;
}

export interface SkillRemoteResultView {
  id: SkillRemoteResultId;
  provider: SkillDiscoveryProvider;
  sourceNativeId: string;
  name: string;
  description: string | null;
  publisher: string | null;
  latestVersion: string | null;
  canonicalWebUrl: string;
}

export interface SkillRemoteVersionView {
  id: SkillRemoteResultId;
  version: string;
  label: string;
  trackingMode: SkillSourceTrackingMode;
  publishedAt: number | null;
  changelog: string | null;
}

export interface SkillRemoteDetailView {
  result: SkillRemoteResultView;
  versions: SkillRemoteVersionView[];
  recommendedVersionId: SkillRemoteResultId | null;
}

export interface SkillRemotePackageCandidateView {
  id: SkillRemoteResultId;
  name: string;
  description: string | null;
  packagePath: string;
}

export interface SkillGitResolutionView {
  id: SkillRemoteResultId;
  sourceUrl: string;
  requestedRef: string | null;
  resolvedRevision: string;
  packages: SkillRemotePackageCandidateView[];
}

export interface SkillRemoteSearchInput {
  provider: SkillDiscoveryProvider;
  query: string;
}

export interface SkillRemoteBrowseInput {
  provider: SkillDiscoveryProvider;
}

export interface SkillRemoteResultInput {
  resultId: SkillRemoteResultId;
}

export interface SkillResolveGitSourceInput {
  sourceUrl: string;
  requestedRef: string | null;
}

export interface SkillAddRemoteCandidateInput {
  candidateId: SkillRemoteResultId;
}

export interface SkillAddRemoteCandidateResult {
  skillPackage: SkillStorePackageView;
  source: SkillSourceView;
  reusedPackage: boolean;
}

export interface SkillEmptyTrashResult {
  removedIds: SkillId[];
  failures: Array<{
    skillId: SkillId;
    error: SkillApiError;
  }>;
}

export interface SkillTargetPolicyInput {
  targetId: SkillTargetId;
  enabled: boolean;
  maxScanDepth: number;
  allowSymlinkEscape: boolean;
}

export interface SkillDistributionInput {
  skillId: SkillId;
  targetIds: SkillTargetId[];
}

export interface SkillInstallationCommandInput {
  installationId: SkillInstallationId;
}

export interface SkillApi {
  listStorePackages: () => Promise<SkillApiResult<SkillStorePackageView[]>>;
  getStorePackage: (skillId: SkillId) => Promise<SkillApiResult<SkillStorePackageView>>;
  listTargets: () => Promise<SkillApiResult<SkillTargetView[]>>;
  listInstallations: (
    input?: SkillInstallationListInput,
  ) => Promise<SkillApiResult<SkillInstallationView[]>>;
  importExisting: () => Promise<SkillApiResult<SkillDiscoveryResult>>;
  listPackageFiles: (skillId: SkillId) => Promise<SkillApiResult<SkillPackageFileEntry[]>>;
  readPackageFile: (input: SkillFileTarget) => Promise<SkillApiResult<SkillFileReadResult>>;
  revealTarget: (targetId: SkillTargetId) => Promise<SkillApiResult<null>>;
  openTargetDocumentation: (targetId: SkillTargetId) => Promise<SkillApiResult<null>>;
  selectCustomTargetDirectory: (
  ) => Promise<SkillApiResult<SkillCustomTargetDirectorySelection | null>>;
  createCustomTarget: (
    input: SkillCreateCustomTargetInput,
  ) => Promise<SkillApiResult<SkillCreateCustomTargetResult>>;
  updateTargetPolicy: (
    input: SkillTargetPolicyInput,
  ) => Promise<SkillApiResult<SkillTargetView>>;
  resetBuiltInTargetPolicy: (
    targetId: SkillTargetId,
  ) => Promise<SkillApiResult<SkillTargetView>>;
  removeCustomTarget: (targetId: SkillTargetId) => Promise<SkillApiResult<null>>;
  preflightDistribution: (
    input: SkillDistributionInput,
  ) => Promise<SkillApiResult<SkillDistributionPreflightResult>>;
  distribute: (
    input: SkillDistributionInput,
  ) => Promise<SkillApiResult<SkillDistributionResult>>;
  uninstall: (input: SkillInstallationCommandInput) => Promise<SkillApiResult<null>>;
  preflightStoreDeletion: (
    skillId: SkillId,
  ) => Promise<SkillApiResult<SkillStoreDeletionPreflight>>;
  movePackageToTrash: (
    skillId: SkillId,
  ) => Promise<SkillApiResult<SkillStoreDeletionResult>>;
  listTrash: () => Promise<SkillApiResult<SkillTrashPackageView[]>>;
  restoreTrashedPackage: (
    skillId: SkillId,
  ) => Promise<SkillApiResult<SkillStorePackageView>>;
  removeTrashedPackage: (skillId: SkillId) => Promise<SkillApiResult<null>>;
  emptyTrash: () => Promise<SkillApiResult<SkillEmptyTrashResult>>;
  listSources: (skillId: SkillId) => Promise<SkillApiResult<SkillSourceView[]>>;
  browseRemoteSkills: (
    input: SkillRemoteBrowseInput,
  ) => Promise<SkillApiResult<SkillRemoteResultView[]>>;
  searchRemoteSkills: (
    input: SkillRemoteSearchInput,
  ) => Promise<SkillApiResult<SkillRemoteResultView[]>>;
  getRemoteSkillDetails: (
    input: SkillRemoteResultInput,
  ) => Promise<SkillApiResult<SkillRemoteDetailView>>;
  resolveDirectoryResult: (
    input: SkillRemoteResultInput,
  ) => Promise<SkillApiResult<SkillGitResolutionView>>;
  resolveGitSource: (
    input: SkillResolveGitSourceInput,
  ) => Promise<SkillApiResult<SkillGitResolutionView>>;
  addRemoteCandidate: (
    input: SkillAddRemoteCandidateInput,
  ) => Promise<SkillApiResult<SkillAddRemoteCandidateResult>>;
  openRemoteResult: (input: SkillRemoteResultInput) => Promise<SkillApiResult<null>>;
  openSource: (sourceId: SkillSourceId) => Promise<SkillApiResult<null>>;
  checkSourceForUpdates: (
    sourceId: SkillSourceId,
  ) => Promise<SkillApiResult<SkillUpdateCheckResult>>;
  checkPackageForUpdates: (
    skillId: SkillId,
  ) => Promise<SkillApiResult<SkillUpdateCheckResult[]>>;
  applyUpdate: (input: SkillApplyUpdateInput) => Promise<SkillApiResult<SkillApplyUpdateResult>>;
}

export const SKILL_DISTRIBUTION_NAME_MAX_UTF8_BYTES = 255;
export const SKILL_DISTRIBUTION_MAX_TARGETS = 64;
export const SKILL_DISCOVERY_MAX_DIRECTORIES = 10_000;
export const SKILL_RELATIVE_PATH_MAX_UTF8_BYTES = 4096;
export const shouldAllowSkillTargetSymlinkEscapeByDefault = true;
export const SKILL_TARGET_MAX_SCAN_DEPTH = 32;
export const SKILL_REMOTE_QUERY_MAX_UTF8_BYTES = 512;
export const SKILL_REMOTE_LOCATOR_MAX_UTF8_BYTES = 4096;
export const SKILL_REMOTE_REF_MAX_UTF8_BYTES = 1024;
export const SKILL_REMOTE_REVISION_MAX_UTF8_BYTES = 1024;
