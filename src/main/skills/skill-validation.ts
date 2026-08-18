import { Buffer } from 'node:buffer';
import {
  SKILL_DISTRIBUTION_NAME_MAX_UTF8_BYTES,
  SKILL_DISTRIBUTION_MAX_TARGETS,
  SKILL_RELATIVE_PATH_MAX_UTF8_BYTES,
  SKILL_REMOTE_LOCATOR_MAX_UTF8_BYTES,
  SKILL_REMOTE_QUERY_MAX_UTF8_BYTES,
  SKILL_REMOTE_REF_MAX_UTF8_BYTES,
  SKILL_REMOTE_REVISION_MAX_UTF8_BYTES,
  SKILL_TARGET_MAX_SCAN_DEPTH,
  skillDirectoryProviders,
  skillDiscoveryProviders,
  skillSourceCheckStatuses,
  skillSourceProviders,
  skillSourceTrackingModes,
  skillTargetKinds,
} from '../../shared/skill-contract';
import type {
  SkillAddRemoteCandidateInput,
  SkillApplyUpdateInput,
  SkillRemoteBrowseInput,
  SkillRemoteResultInput,
  SkillRemoteSearchInput,
  SkillContentObservation,
  SkillCreateCustomTargetInput,
  SkillDistributionInput,
  SkillFileTarget,
  SkillInstallationCommandInput,
  SkillInstallationListInput,
  SkillRevisionFileTarget,
  SkillResolveGitSourceInput,
  SkillDirectoryProvider,
  SkillDiscoveryProvider,
  SkillSourceCheckStatus,
  SkillSourceProvider,
  SkillSourceTrackingMode,
  SkillTargetKind,
  SkillTargetPolicyInput,
} from '../../shared/skill-contract';
import { invalidSkillField, SkillOperationError } from './skill-error';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WINDOWS_RESERVED_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function parseSkillId(value: unknown): string {
  return parseUuid(value, 'skillId', 'Provide a valid Skill ID.');
}

export function parseSkillRevisionId(value: unknown): string {
  return parseUuid(value, 'revisionId', 'Provide a valid Skill Revision ID.');
}

export function parseSkillTargetId(value: unknown): string {
  return parseUuid(value, 'targetId', 'Provide a valid Distribution Target ID.');
}

export function parseSkillInstallationId(value: unknown): string {
  return parseUuid(value, 'installationId', 'Provide a valid Skill Installation ID.');
}

export function parseSkillDistributionRecordId(value: unknown): string {
  return parseUuid(
    value,
    'distributionRecordId',
    'Provide a valid Distribution Record ID.',
  );
}

export function parseSkillWatchSessionId(value: unknown): string {
  return parseUuid(value, 'watchSessionId', 'Provide a valid Watch Session ID.');
}

export function parseSkillCustomTargetCandidateId(value: unknown): string {
  return parseUuid(value, 'candidateId', 'Select a Custom Target directory again.');
}

export function parseSkillSourceId(value: unknown): string {
  return parseUuid(value, 'sourceId', 'Provide a valid Skill Source ID.');
}

export function parseSkillUpdateCandidateId(value: unknown): string {
  return parseUuid(value, 'candidateId', 'Provide a valid Update Candidate ID.');
}

export function parseSkillRemoteResultId(value: unknown): string {
  return parseUuid(value, 'resultId', 'Resolve the remote result again.');
}

export function parseSkillSourceProvider(value: unknown): SkillSourceProvider {
  if (
    typeof value !== 'string'
    || !skillSourceProviders.includes(value as SkillSourceProvider)
  ) {
    return invalidSkillField('provider', 'Select a supported Skill Source provider.');
  }
  return value as SkillSourceProvider;
}

export function parseSkillDirectoryProvider(
  value: unknown,
): SkillDirectoryProvider | null {
  if (value === null) {
    return null;
  }
  if (
    typeof value !== 'string'
    || !skillDirectoryProviders.includes(value as SkillDirectoryProvider)
  ) {
    return invalidSkillField('directoryProvider', 'Select a supported Skill Directory.');
  }
  return value as SkillDirectoryProvider;
}

export function parseSkillDiscoveryProvider(value: unknown): SkillDiscoveryProvider {
  if (
    typeof value !== 'string'
    || !skillDiscoveryProviders.includes(value as SkillDiscoveryProvider)
  ) {
    return invalidSkillField('provider', 'Select a supported discovery provider.');
  }
  return value as SkillDiscoveryProvider;
}

export function parseSkillSourceTrackingMode(value: unknown): SkillSourceTrackingMode {
  if (
    typeof value !== 'string'
    || !skillSourceTrackingModes.includes(value as SkillSourceTrackingMode)
  ) {
    return invalidSkillField('trackingMode', 'Select a Skill Source tracking mode.');
  }
  return value as SkillSourceTrackingMode;
}

export function parseSkillSourceCheckStatus(value: unknown): SkillSourceCheckStatus {
  if (
    typeof value !== 'string'
    || !skillSourceCheckStatuses.includes(value as SkillSourceCheckStatus)
  ) {
    return invalidSkillField('checkStatus', 'Stored Skill Source state is invalid.');
  }
  return value as SkillSourceCheckStatus;
}

export function parseSkillRemoteLocator(
  value: unknown,
  field = 'sourceNativeId',
): string {
  return parseBoundedRemoteText(value, field, SKILL_REMOTE_LOCATOR_MAX_UTF8_BYTES);
}

export function parseSkillRemoteRevision(value: unknown): string {
  return parseBoundedRemoteText(
    value,
    'resolvedRevision',
    SKILL_REMOTE_REVISION_MAX_UTF8_BYTES,
  );
}

export function parseSkillRemoteRef(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  const ref = parseBoundedRemoteText(
    value,
    'requestedRef',
    SKILL_REMOTE_REF_MAX_UTF8_BYTES,
  );
  if (
    ref.startsWith('-')
    || ref.endsWith('.')
    || ref.includes('..')
    || ref.includes('@{')
    || (/[\\~^:?*[\]\s]/).test(ref)
  ) {
    return invalidSkillField('requestedRef', 'Provide a safe Git ref or source channel.');
  }
  return ref;
}

export function parseSkillArtifactDigest(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  return parseSkillContentFingerprint(value);
}

export function parseSkillCanonicalWebUrl(value: unknown): string {
  const rawUrl = parseBoundedRemoteText(
    value,
    'canonicalWebUrl',
    SKILL_REMOTE_LOCATOR_MAX_UTF8_BYTES,
  );
  return parseRemoteUrl(rawUrl, 'canonicalWebUrl', ['https:'], false);
}

export function parseSkillSourceUrl(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  const rawUrl = parseBoundedRemoteText(
    value,
    'sourceUrl',
    SKILL_REMOTE_LOCATOR_MAX_UTF8_BYTES,
  );
  if ((/^[\w.-]+@[\w.-]+:\S+$/).test(rawUrl)) {
    return rawUrl;
  }
  return parseRemoteUrl(rawUrl, 'sourceUrl', ['https:', 'ssh:'], true);
}

export function parseSkillRemoteQuery(value: unknown): string {
  return parseBoundedRemoteText(value, 'query', SKILL_REMOTE_QUERY_MAX_UTF8_BYTES);
}

export function parseSkillResolveGitSourceInput(value: unknown): SkillResolveGitSourceInput {
  const input = requireRecord(value, 'gitSource');
  const sourceUrl = parseSkillSourceUrl(input.sourceUrl);
  if (sourceUrl === null) {
    return invalidSkillField('sourceUrl', 'Provide a Git remote or GitHub URL.');
  }
  return {
    sourceUrl,
    requestedRef: parseSkillRemoteRef(input.requestedRef),
  };
}

export function parseSkillAddRemoteCandidateInput(value: unknown): SkillAddRemoteCandidateInput {
  const input = requireRecord(value, 'remoteCandidate');
  return { candidateId: parseSkillRemoteResultId(input.candidateId) };
}

export function parseSkillApplyUpdateInput(value: unknown): SkillApplyUpdateInput {
  const input = requireRecord(value, 'skillUpdate');
  return { candidateId: parseSkillUpdateCandidateId(input.candidateId) };
}

export function parseSkillRemoteBrowseInput(value: unknown): SkillRemoteBrowseInput {
  const input = requireRecord(value, 'remoteBrowse');
  return { provider: parseSkillDiscoveryProvider(input.provider) };
}

export function parseSkillRemoteSearchInput(value: unknown): SkillRemoteSearchInput {
  const input = requireRecord(value, 'remoteSearch');
  return {
    provider: parseSkillDiscoveryProvider(input.provider),
    query: parseSkillRemoteQuery(input.query),
  };
}

export function parseSkillRemoteResultInput(value: unknown): SkillRemoteResultInput {
  const input = requireRecord(value, 'remoteResult');
  return { resultId: parseSkillRemoteResultId(input.resultId) };
}

export function parseSkillDistributionName(value: unknown): string {
  if (
    typeof value !== 'string'
    || value === ''
    || value !== value.trim()
    || ['.', '..'].includes(value)
    || value.includes('/')
    || value.includes('\\')
    || (/[<>:"|?*]/).test(value)
    || value.endsWith('.')
    || WINDOWS_RESERVED_NAME_PATTERN.test(value)
    || hasControlCharacters(value)
    || Buffer.byteLength(value, 'utf8') > SKILL_DISTRIBUTION_NAME_MAX_UTF8_BYTES
  ) {
    return invalidSkillField(
      'distributionName',
      'Provide a safe single-directory Distribution Name.',
    );
  }
  return value;
}

export function normalizeSkillDistributionName(value: string): string {
  return value.normalize('NFC').toLowerCase();
}

export function parseSkillRelativePath(value: unknown): string {
  const segments = typeof value === 'string' ? value.split('/') : [];
  if (
    typeof value !== 'string'
    || value === ''
    || value.startsWith('/')
    || value.includes('\\')
    || value.includes(':')
    || hasControlCharacters(value)
    || Buffer.byteLength(value, 'utf8') > SKILL_RELATIVE_PATH_MAX_UTF8_BYTES
    || segments.some((segment) => ['', '.', '..'].includes(segment))
  ) {
    return invalidSkillField('relativePath', 'Provide a normalized relative package path.');
  }
  return value;
}

export function normalizeSkillRelativePath(value: string): string {
  return value.normalize('NFC').toLowerCase();
}

export function parseSkillContentFingerprint(value: unknown): string {
  if (typeof value !== 'string' || !(/^[0-9a-f]{64}$/).test(value)) {
    return invalidSkillField('fingerprint', 'Provide a valid Content Fingerprint.');
  }
  return value;
}

export function parseSkillScanDepth(value: unknown): number {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 1
    || value > SKILL_TARGET_MAX_SCAN_DEPTH
  ) {
    return invalidSkillField(
      'maxScanDepth',
      `Use a scan depth from 1 to ${SKILL_TARGET_MAX_SCAN_DEPTH}.`,
    );
  }
  return value;
}

export function parseSkillTargetKind(value: unknown): SkillTargetKind {
  if (
    typeof value !== 'string'
    || !skillTargetKinds.includes(value as SkillTargetKind)
  ) {
    return invalidSkillField('kind', 'Select a supported Distribution Target kind.');
  }
  return value as SkillTargetKind;
}

export function parseSkillFileTarget(value: unknown): SkillFileTarget {
  const input = requireRecord(value, 'file');
  return {
    skillId: parseSkillId(input.skillId),
    relativePath: parseSkillRelativePath(input.relativePath),
  };
}

export function parseSkillRevisionFileTarget(value: unknown): SkillRevisionFileTarget {
  const input = requireRecord(value, 'revisionFile');
  return {
    skillId: parseSkillId(input.skillId),
    revisionId: parseSkillRevisionId(input.revisionId),
    relativePath: parseSkillRelativePath(input.relativePath),
  };
}

export function parseSkillInstallationCommandInput(
  value: unknown,
): SkillInstallationCommandInput {
  const input = requireRecord(value, 'installation');
  return { installationId: parseSkillInstallationId(input.installationId) };
}

export function parseSkillTargetPolicyInput(value: unknown): SkillTargetPolicyInput {
  const input = requireRecord(value, 'targetPolicy');
  return {
    targetId: parseSkillTargetId(input.targetId),
    enabled: isBooleanValue(input.enabled, 'enabled'),
    maxScanDepth: parseSkillScanDepth(input.maxScanDepth),
    allowSymlinkEscape: isBooleanValue(input.allowSymlinkEscape, 'allowSymlinkEscape'),
  };
}

export function parseSkillInstallationListInput(
  value: unknown,
): SkillInstallationListInput {
  if (value === undefined) {
    return {};
  }
  const input = requireRecord(value, 'installationList');
  return {
    ...(input.skillId !== undefined && { skillId: parseSkillId(input.skillId) }),
    ...(input.targetId !== undefined && { targetId: parseSkillTargetId(input.targetId) }),
  };
}

export function parseSkillCreateCustomTargetInput(
  value: unknown,
): SkillCreateCustomTargetInput {
  const input = requireRecord(value, 'customTarget');
  if (
    typeof input.displayName !== 'string'
    || input.displayName.trim() !== input.displayName
    || input.displayName === ''
    || Buffer.byteLength(input.displayName, 'utf8') > 255
    || hasControlCharacters(input.displayName)
  ) {
    return invalidSkillField('displayName', 'Provide a Custom Target name.');
  }
  return {
    candidateId: parseSkillCustomTargetCandidateId(input.candidateId),
    displayName: input.displayName,
    enabled: isBooleanValue(input.enabled, 'enabled'),
    maxScanDepth: parseSkillScanDepth(input.maxScanDepth),
    allowSymlinkEscape: isBooleanValue(input.allowSymlinkEscape, 'allowSymlinkEscape'),
  };
}

export function parseSkillDistributionInput(value: unknown): SkillDistributionInput {
  const input = requireRecord(value, 'distribution');
  if (
    !Array.isArray(input.targetIds)
    || input.targetIds.length === 0
    || input.targetIds.length > SKILL_DISTRIBUTION_MAX_TARGETS
  ) {
    return invalidSkillField(
      'targetIds',
      `Select from 1 to ${SKILL_DISTRIBUTION_MAX_TARGETS} Distribution Targets.`,
    );
  }
  const targetIds = input.targetIds.map((targetId) => parseSkillTargetId(targetId));
  if (new Set(targetIds).size !== targetIds.length) {
    return invalidSkillField('targetIds', 'Select each Distribution Target only once.');
  }
  return {
    skillId: parseSkillId(input.skillId),
    targetIds,
  };
}

export function parseStoredSkillContentObservation(
  status: unknown,
  fingerprint: unknown,
  observedAt: unknown,
): SkillContentObservation {
  try {
    if (
      typeof observedAt !== 'number'
      || !Number.isSafeInteger(observedAt)
      || observedAt < 0
    ) {
      throw new Error('Invalid observation timestamp.');
    }
    if (status === 'available') {
      return {
        status,
        fingerprint: parseSkillContentFingerprint(fingerprint),
        observedAt,
      } as const;
    }
    if ((status === 'missing' || status === 'unreadable') && fingerprint === null) {
      return { status, observedAt } as const;
    }
    throw new Error('Invalid observation state.');
  } catch {
    throw new SkillOperationError(
      'storage-corrupt',
      'Stored Skill observation is invalid.',
    );
  }
}

function parseUuid(value: unknown, field: string, message: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    return invalidSkillField(field, message);
  }
  return value;
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidSkillField(field, 'Provide an object value.');
  }
  return value as Record<string, unknown>;
}

function isBooleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    return invalidSkillField(field, 'Provide a boolean value.');
  }
  return value;
}

function parseBoundedRemoteText(value: unknown, field: string, maxBytes: number): string {
  if (
    typeof value !== 'string'
    || value === ''
    || value !== value.trim()
    || hasControlCharacters(value)
    || Buffer.byteLength(value, 'utf8') > maxBytes
  ) {
    return invalidSkillField(field, 'Provide a valid remote value.');
  }
  return value;
}

function parseRemoteUrl(
  rawUrl: string,
  field: string,
  protocols: readonly string[],
  canHaveSshUsername: boolean,
): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return invalidSkillField(field, 'Provide a supported remote URL.');
  }
  if (
    !protocols.includes(parsed.protocol)
    || parsed.hostname === ''
    || parsed.password !== ''
    || (!canHaveSshUsername && parsed.username !== '')
    || (parsed.protocol === 'https:' && parsed.username !== '')
  ) {
    return invalidSkillField(field, 'Provide a supported remote URL without credentials.');
  }
  return parsed.href;
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1F || codePoint === 0x7F) {
      return true;
    }
  }
  return false;
}
