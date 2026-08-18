export const skillIpcChannels = {
  listStorePackages: 'skills:list-store-packages',
  getStorePackage: 'skills:get-store-package',
  listTargets: 'skills:list-targets',
  listInstallations: 'skills:list-installations',
  importExisting: 'skills:import-existing',
  beginWatchSession: 'skills:begin-watch-session',
  endWatchSession: 'skills:end-watch-session',
  listPackageFiles: 'skills:list-package-files',
  readPackageFile: 'skills:read-package-file',
  revealPackage: 'skills:reveal-package',
  revealTarget: 'skills:reveal-target',
  openTargetDocumentation: 'skills:open-target-documentation',
  selectCustomTargetDirectory: 'skills:select-custom-target-directory',
  createCustomTarget: 'skills:create-custom-target',
  updateTargetPolicy: 'skills:update-target-policy',
  resetBuiltInTargetPolicy: 'skills:reset-built-in-target-policy',
  removeCustomTarget: 'skills:remove-custom-target',
  preflightDistribution: 'skills:preflight-distribution',
  distribute: 'skills:distribute',
  restoreInstallation: 'skills:restore-installation',
  promoteInstallation: 'skills:promote-installation',
  importInstallationAsNew: 'skills:import-installation-as-new',
  uninstall: 'skills:uninstall',
  listRevisions: 'skills:list-revisions',
  listRevisionFiles: 'skills:list-revision-files',
  readRevisionFile: 'skills:read-revision-file',
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
  changed: 'skills:changed',
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

export const skillRevisionReasons = [
  'import',
  'distribution',
  'promotion',
  'remote-update',
] as const;

export type SkillRevisionReason = typeof skillRevisionReasons[number];

export const skillDistributionOperations = [
  'adoption',
  'distribution',
  'restore',
] as const;

export type SkillDistributionOperation = typeof skillDistributionOperations[number];

export const skillContentObservationStatuses = [
  'available',
  'missing',
  'unreadable',
] as const;

export type SkillContentObservationStatus
  = typeof skillContentObservationStatuses[number];

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

export const skillSourceCheckStatuses = [
  'never',
  'current',
  'update-available',
  'unavailable',
] as const;
export type SkillSourceCheckStatus = typeof skillSourceCheckStatuses[number];

export type SkillId = string;
export type SkillRevisionId = string;
export type SkillTargetId = string;
export type SkillInstallationId = string;
export type SkillDistributionRecordId = string;
export type SkillWatchSessionId = string;
export type SkillSourceId = string;
export type SkillUpdateCandidateId = string;
export type SkillRemoteResultId = string;
export type SkillContentFingerprint = string;

export type SkillContentObservation
  = | {
    status: 'available';
    fingerprint: SkillContentFingerprint;
    observedAt: number;
  }
  | {
    status: 'missing';
    observedAt: number;
  }
  | {
    status: 'unreadable';
    observedAt: number;
  };

export interface SkillDistributionBaseline {
  revisionId: SkillRevisionId;
  fingerprint: SkillContentFingerprint;
  recordedAt: number;
}

export interface SkillInstallationFacts {
  store: SkillContentObservation;
  distribution: SkillDistributionBaseline | null;
  target: SkillContentObservation;
}

export type SkillInstallationState
  = | 'synced'
    | 'outdated'
    | 'drifted'
    | 'diverged'
    | 'missing';

export type SkillInstallationStateResult
  = | { kind: 'known'; state: SkillInstallationState }
    | {
      kind: 'unavailable';
      reason:
        | 'distribution-baseline-missing'
        | 'store-missing'
        | 'store-unreadable'
        | 'target-unreadable';
    };

export type SkillApiErrorCode
  = | 'invalid-input'
    | 'not-found'
    | 'conflict'
    | 'content-unavailable'
    | 'filesystem-unavailable'
    | 'storage-unavailable'
    | 'storage-corrupt'
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

export interface SkillRevisionFileTarget extends SkillFileTarget {
  revisionId: SkillRevisionId;
}

export type SkillPackageFileKind = 'directory' | 'file' | 'symbolic-link' | 'unreadable';

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
    status: 'symbolic-link' | 'missing' | 'unreadable';
    relativePath: string;
    size: null;
  };

export type SkillDiscoveryWarningCode
  = | 'entry-unreadable'
    | 'symlink-escape-blocked'
    | 'traversal-limit-reached'
    | 'candidate-unreadable'
    | 'candidate-reconciliation-failed'
    | 'content-changed-during-adoption';

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
  observationsUpdated: number;
  warnings: SkillDiscoveryWarning[];
  rootFailures: Array<{
    targetId: SkillTargetId;
    status: 'missing' | 'unreadable';
  }>;
}

export interface SkillWatchSessionStart {
  sessionId: SkillWatchSessionId;
  scan: SkillDiscoveryResult;
}

export interface SkillChangedNotification {
  reason: 'filesystem' | 'watch-error';
  sequence: number;
}

export interface SkillStorePackageView {
  id: SkillId;
  distributionName: string;
  storeObservation: SkillContentObservation;
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

export interface SkillInstallationView {
  id: SkillInstallationId;
  packageId: SkillId;
  targetId: SkillTargetId;
  distributionName: string;
  relativePath: string;
  targetObservation: SkillContentObservation;
  distribution: SkillDistributionBaseline | null;
  state: SkillInstallationStateResult;
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
  'name-conflict',
  'untracked-content',
  'target-unreadable',
] as const;

export type SkillDistributionConflictCode
  = typeof skillDistributionConflictCodes[number];

export type SkillDistributionTargetPreflight
  = | {
    targetId: SkillTargetId;
    status: 'ready';
    operation: 'install' | 'replace';
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
    revisionId: SkillRevisionId;
  }
  | {
    targetId: SkillTargetId;
    ok: false;
    error: SkillApiError;
  };

export interface SkillDistributionResult {
  skillId: SkillId;
  revisionId: SkillRevisionId | null;
  targets: SkillDistributionTargetResult[];
}

export interface SkillPromotionResult {
  skillPackage: SkillStorePackageView;
  revisionId: SkillRevisionId;
  installation: SkillInstallationView;
}

export interface SkillImportInstallationResult {
  skillPackage: SkillStorePackageView;
  revisionId: SkillRevisionId;
}

export interface SkillRevisionView {
  id: SkillRevisionId;
  packageId: SkillId;
  sequenceNumber: number;
  fingerprint: SkillContentFingerprint;
  reason: SkillRevisionReason;
  createdAt: number;
}

export interface SkillTrashPackageView {
  id: SkillId;
  distributionName: string;
  trashObservation: SkillContentObservation;
  createdAt: number;
  updatedAt: number;
  trashedAt: number;
}

export interface SkillUpdateCandidateView {
  id: SkillUpdateCandidateId;
  sourceId: SkillSourceId;
  packageId: SkillId;
  resolvedRevision: string;
  artifactDigest: string | null;
  canonicalWebUrl: string;
  checkedAt: number;
}

export type SkillSourceCheckView
  = | { status: 'never' }
    | { status: 'current'; checkedAt: number }
    | {
      status: 'update-available';
      checkedAt: number;
      candidate: SkillUpdateCandidateView;
    }
    | { status: 'unavailable'; checkedAt: number };

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
  check: SkillSourceCheckView;
  createdAt: number;
  updatedAt: number;
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
  revisionId: SkillRevisionId;
  source: SkillSourceView;
  reusedPackage: boolean;
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
  candidateId: SkillUpdateCandidateId;
}

export interface SkillApplyUpdateResult {
  skillPackage: SkillStorePackageView;
  revisionId: SkillRevisionId;
  source: SkillSourceView;
  contentChanged: boolean;
}

export interface SkillEmptyTrashResult {
  removedIds: SkillId[];
  failures: Array<{
    skillId: SkillId;
    error: SkillApiError;
  }>;
}

export interface SkillApi {
  listStorePackages: () => Promise<SkillApiResult<SkillStorePackageView[]>>;
  getStorePackage: (skillId: SkillId) => Promise<SkillApiResult<SkillStorePackageView>>;
  listTargets: () => Promise<SkillApiResult<SkillTargetView[]>>;
  listInstallations: (
    input?: SkillInstallationListInput,
  ) => Promise<SkillApiResult<SkillInstallationView[]>>;
  importExisting: () => Promise<SkillApiResult<SkillDiscoveryResult>>;
  beginWatchSession: () => Promise<SkillApiResult<SkillWatchSessionStart>>;
  endWatchSession: (sessionId: SkillWatchSessionId) => Promise<SkillApiResult<boolean>>;
  listPackageFiles: (
    skillId: SkillId,
  ) => Promise<SkillApiResult<SkillPackageFileEntry[]>>;
  readPackageFile: (input: SkillFileTarget) => Promise<SkillApiResult<SkillFileReadResult>>;
  revealPackage: (skillId: SkillId) => Promise<SkillApiResult<null>>;
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
  restoreInstallation: (
    input: SkillInstallationCommandInput,
  ) => Promise<SkillApiResult<SkillDistributionTargetResult>>;
  promoteInstallation: (
    input: SkillInstallationCommandInput,
  ) => Promise<SkillApiResult<SkillPromotionResult>>;
  importInstallationAsNew: (
    input: SkillInstallationCommandInput,
  ) => Promise<SkillApiResult<SkillImportInstallationResult>>;
  uninstall: (
    input: SkillInstallationCommandInput,
  ) => Promise<SkillApiResult<null>>;
  listRevisions: (skillId: SkillId) => Promise<SkillApiResult<SkillRevisionView[]>>;
  listRevisionFiles: (
    skillId: SkillId,
    revisionId: SkillRevisionId,
  ) => Promise<SkillApiResult<SkillPackageFileEntry[]>>;
  readRevisionFile: (
    input: SkillRevisionFileTarget,
  ) => Promise<SkillApiResult<SkillFileReadResult>>;
  movePackageToTrash: (skillId: SkillId) => Promise<SkillApiResult<SkillTrashPackageView>>;
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
  applyUpdate: (
    input: SkillApplyUpdateInput,
  ) => Promise<SkillApiResult<SkillApplyUpdateResult>>;
  onChanged: (listener: (notification: SkillChangedNotification) => void) => () => void;
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

export const SKILL_DISTRIBUTION_NAME_MAX_UTF8_BYTES = 255;
export const SKILL_DISTRIBUTION_MAX_TARGETS = 64;
export const SKILL_DISCOVERY_MAX_DIRECTORIES = 10_000;
export const SKILL_RELATIVE_PATH_MAX_UTF8_BYTES = 4096;
export const SKILL_TARGET_MAX_SCAN_DEPTH = 32;
export const SKILL_REMOTE_QUERY_MAX_UTF8_BYTES = 512;
export const SKILL_REMOTE_LOCATOR_MAX_UTF8_BYTES = 4096;
export const SKILL_REMOTE_REF_MAX_UTF8_BYTES = 1024;
export const SKILL_REMOTE_REVISION_MAX_UTF8_BYTES = 1024;

export function deriveInstallationState(
  facts: SkillInstallationFacts,
): SkillInstallationStateResult {
  if (facts.target.status === 'missing') {
    return { kind: 'known', state: 'missing' };
  }
  if (facts.target.status === 'unreadable') {
    return { kind: 'unavailable', reason: 'target-unreadable' };
  }
  if (facts.store.status === 'missing') {
    return { kind: 'unavailable', reason: 'store-missing' };
  }
  if (facts.store.status === 'unreadable') {
    return { kind: 'unavailable', reason: 'store-unreadable' };
  }
  if (facts.distribution === null) {
    return { kind: 'unavailable', reason: 'distribution-baseline-missing' };
  }
  if (
    facts.distribution.fingerprint === facts.store.fingerprint
    && facts.distribution.fingerprint === facts.target.fingerprint
  ) {
    return { kind: 'known', state: 'synced' };
  }
  if (
    facts.distribution.fingerprint === facts.target.fingerprint
  ) {
    return { kind: 'known', state: 'outdated' };
  }
  if (
    facts.distribution.fingerprint === facts.store.fingerprint
  ) {
    return { kind: 'known', state: 'drifted' };
  }
  return { kind: 'known', state: 'diverged' };
}
