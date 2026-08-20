import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type {
  SkillAddRemoteCandidateResult,
  SkillRemoteDetailView,
  SkillRemoteResultView,
  SkillRemoteVersionView,
  SkillSourceView,
  SkillSourceTrackingMode,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import type { SkillProviderHttpClient } from './skill-provider-http-client';
import type { SkillRemoteAcquisitionCoordinator } from './skill-remote-acquisition';
import type { SkillSourceRepository } from './skill-source-repository';
import type {
  SkillMaterializedSourceRevision,
  SkillResolvedSourceRevision,
} from './skill-remote-source';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import {
  parseSkillId,
  parseSkillRelativePath,
  parseSkillRemoteResultId,
} from './skill-validation';

const CLAWHUB_ORIGIN = 'https://clawhub.ai';
const CLAWHUB_HOSTS = new Set(['clawhub.ai']);
const MAX_RESULTS = 25;
const MAX_VERSIONS = 100;
const MAX_TEXT_BYTES = 16 * 1024;

interface SkillClawHubProviderOptions {
  httpClient: SkillProviderHttpClient;
  acquisition: SkillRemoteAcquisitionCoordinator;
  gitSourceCoordinator: SkillGitSourceCoordinator;
  storeCoordinator: SkillStoreCoordinator;
  sourceRepository: SkillSourceRepository;
  createId?: () => string;
  now?: () => number;
}

interface ClawHubResult {
  ownerId: number;
  ownerHandle: string;
  slug: string;
  view: SkillRemoteResultView;
}

interface ClawHubVersionCandidate {
  ownerId: number;
  ownerHandle: string;
  slug: string;
  version: string;
  requestedRef: string;
  trackingMode: SkillSourceTrackingMode;
  canonicalWebUrl: string;
}

interface ClawHubPackageFacts {
  ownerHandle: string;
  slug: string;
  displayName: string;
  summary: string | null;
  latestVersion: string | null;
}

interface ClawHubVersionFacts {
  version: string;
  publishedAt: number | null;
  changelog: string | null;
}

interface GitHubHandoff {
  repo: string;
  commit: string;
  packagePath: string | null;
  contentHash: string | null;
}

export class SkillClawHubProvider {
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly results = new Map<string, ClawHubResult>();
  private readonly versionCandidates = new Map<string, ClawHubVersionCandidate>();

  constructor(private readonly options: SkillClawHubProviderOptions) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
  }

  browse(ownerId: number): Promise<SkillRemoteResultView[]> {
    const url = new URL('/api/v1/packages', CLAWHUB_ORIGIN);
    url.searchParams.set('limit', String(MAX_RESULTS));
    url.searchParams.set('sort', 'recommended');
    url.searchParams.set('family', 'skill');
    return this.loadResults(ownerId, url, 'browse');
  }

  search(ownerId: number, query: string): Promise<SkillRemoteResultView[]> {
    const url = new URL('/api/v1/packages/search', CLAWHUB_ORIGIN);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(MAX_RESULTS));
    url.searchParams.set('family', 'skill');
    return this.loadResults(ownerId, url, 'search');
  }

  async getDetails(ownerId: number, resultIdValue: unknown): Promise<SkillRemoteDetailView> {
    const result = this.getResult(ownerId, resultIdValue);
    const packageUrl = new URL(
      `/api/v1/packages/${encodeURIComponent(result.slug)}`,
      CLAWHUB_ORIGIN,
    );
    const versionsUrl = new URL(
      `/api/v1/packages/${encodeURIComponent(result.slug)}/versions`,
      CLAWHUB_ORIGIN,
    );
    versionsUrl.searchParams.set('limit', String(MAX_VERSIONS));
    const [packagePayload, versionsPayload] = await Promise.all([
      this.options.httpClient.getJson({
        url: packageUrl.href,
        allowedHosts: CLAWHUB_HOSTS,
      }),
      this.options.httpClient.getJson({
        url: versionsUrl.href,
        allowedHosts: CLAWHUB_HOSTS,
      }),
    ]);
    const packageFacts = parsePackageResponse(packagePayload);
    assertSamePackage(result, packageFacts);
    const versions = parseVersionListResponse(versionsPayload);
    this.clearOwnerVersions(ownerId);
    const versionViews: SkillRemoteVersionView[] = [];
    let recommendedVersionId: string | null = null;
    if (packageFacts.latestVersion !== null) {
      const latest = versions.find((version) => version.version === packageFacts.latestVersion);
      const id = this.addVersionCandidate({
        ownerId,
        ownerHandle: result.ownerHandle,
        slug: result.slug,
        version: packageFacts.latestVersion,
        requestedRef: 'latest',
        trackingMode: 'tracked',
        canonicalWebUrl: result.view.canonicalWebUrl,
      });
      recommendedVersionId = id;
      versionViews.push({
        id,
        version: packageFacts.latestVersion,
        label: 'Latest',
        trackingMode: 'tracked',
        publishedAt: latest?.publishedAt ?? null,
        changelog: latest?.changelog ?? null,
      });
    }
    for (const version of versions) {
      const id = this.addVersionCandidate({
        ownerId,
        ownerHandle: result.ownerHandle,
        slug: result.slug,
        version: version.version,
        requestedRef: version.version,
        trackingMode: 'fixed',
        canonicalWebUrl: result.view.canonicalWebUrl,
      });
      versionViews.push({
        id,
        version: version.version,
        label: version.version,
        trackingMode: 'fixed',
        publishedAt: version.publishedAt,
        changelog: version.changelog,
      });
    }
    return {
      result: {
        ...result.view,
        name: packageFacts.displayName,
        description: packageFacts.summary,
        latestVersion: packageFacts.latestVersion,
      },
      versions: versionViews,
      recommendedVersionId,
    };
  }

  hasVersionCandidate(ownerId: number, candidateIdValue: unknown): boolean {
    if (typeof candidateIdValue !== 'string') {
      return false;
    }
    return this.versionCandidates.get(candidateIdValue)?.ownerId === ownerId;
  }

  hasResult(ownerId: number, resultIdValue: unknown): boolean {
    return typeof resultIdValue === 'string'
      && this.results.get(resultIdValue)?.ownerId === ownerId;
  }

  async addToStore(
    ownerId: number,
    candidateIdValue: unknown,
  ): Promise<SkillAddRemoteCandidateResult> {
    const candidateId = parseSkillRemoteResultId(candidateIdValue);
    const candidate = this.versionCandidates.get(candidateId);
    if (candidate?.ownerId !== ownerId) {
      throw new SkillOperationError('stale-result', 'Open the ClawHub Skill again.');
    }
    try {
      const resolved = await this.resolveExactCandidate(candidate);
      const downloadUrl = buildDownloadUrl(candidate.slug, resolved.version);
      const content = await this.options.httpClient.inspectJsonOrBinary({
        url: downloadUrl,
        allowedHosts: CLAWHUB_HOSTS,
        cache: false,
      });
      if (content.kind === 'json') {
        return await this.addGitHubHandoff(candidate, parseGitHubHandoff(content.value));
      }
      return await this.addZip(candidate, downloadUrl, resolved.artifactDigest);
    } catch (error) {
      throw toSkillOperationError(error);
    } finally {
      this.versionCandidates.delete(candidateId);
    }
  }

  getResultUrl(ownerId: number, resultIdValue: unknown): string {
    const resultId = parseSkillRemoteResultId(resultIdValue);
    const result = this.results.get(resultId);
    if (result?.ownerId === ownerId) {
      return result.view.canonicalWebUrl;
    }
    const candidate = this.versionCandidates.get(resultId);
    if (candidate?.ownerId === ownerId) {
      return candidate.canonicalWebUrl;
    }
    throw new SkillOperationError('stale-result', 'Search ClawHub again.');
  }

  async resolveSourceRevision(source: SkillSourceView): Promise<SkillResolvedSourceRevision> {
    const coordinate = parseClawHubSource(source);
    const packageUrl = new URL(
      `/api/v1/packages/${encodeURIComponent(coordinate.slug)}`,
      CLAWHUB_ORIGIN,
    );
    const packageFacts = parsePackageResponse(await this.options.httpClient.getJson({
      url: packageUrl.href,
      allowedHosts: CLAWHUB_HOSTS,
      cache: false,
    }));
    if (
      packageFacts.ownerHandle !== coordinate.ownerHandle
      || packageFacts.slug !== coordinate.slug
    ) {
      throw new SkillOperationError('source-unavailable', 'The ClawHub Skill identity changed.');
    }
    const resolvedRevision = source.requestedRef === 'latest'
      ? packageFacts.latestVersion
      : source.requestedRef;
    if (resolvedRevision === null) {
      throw new SkillOperationError('source-unavailable', 'The ClawHub Skill has no version.');
    }
    const versionUrl = new URL(
      `/api/v1/skills/${encodeURIComponent(coordinate.slug)}/versions/${encodeURIComponent(resolvedRevision)}`,
      CLAWHUB_ORIGIN,
    );
    const versionFacts = parseLegacyVersionResponse(
      await this.options.httpClient.getJson({
        url: versionUrl.href,
        allowedHosts: CLAWHUB_HOSTS,
        cache: false,
      }),
    );
    if (versionFacts.version !== resolvedRevision) {
      throw new SkillOperationError('source-unavailable', 'The ClawHub version is unavailable.');
    }
    return {
      resolvedRevision,
      artifactDigest: versionFacts.artifactDigest,
      canonicalWebUrl: buildCanonicalWebUrl(coordinate.ownerHandle, coordinate.slug),
    };
  }

  async materializeSourceRevision(
    source: SkillSourceView,
    expectedRevision: string,
  ): Promise<SkillMaterializedSourceRevision> {
    const coordinate = parseClawHubSource(source);
    const resolved = await this.resolveSourceRevision(source);
    if (resolved.resolvedRevision !== expectedRevision) {
      throw new SkillOperationError(
        'stale-result',
        'The ClawHub version changed after Update Check.',
      );
    }
    const downloadUrl = buildDownloadUrl(coordinate.slug, expectedRevision);
    const content = await this.options.httpClient.inspectJsonOrBinary({
      url: downloadUrl,
      allowedHosts: CLAWHUB_HOSTS,
      cache: false,
    });
    if (content.kind === 'json') {
      const handoff = parseGitHubHandoff(content.value);
      const gitSource: SkillSourceView = {
        ...source,
        provider: 'git',
        sourceUrl: `https://github.com/${handoff.repo}`,
        skillPath: handoff.packagePath,
        requestedRef: handoff.commit,
      };
      const materialized = await this.options.gitSourceCoordinator.materializeSourceRevision(
        gitSource,
        handoff.commit,
      );
      return {
        ...materialized,
        resolvedRevision: expectedRevision,
        artifactDigest: handoff.contentHash,
        canonicalWebUrl: resolved.canonicalWebUrl,
      };
    }
    const acquired = await this.options.acquisition.acquireZip({
      url: downloadUrl,
      expectedDigest: resolved.artifactDigest,
    });
    return {
      contentRoot: acquired.contentRoot,
      resolvedRevision: expectedRevision,
      artifactDigest: acquired.artifactDigest,
      canonicalWebUrl: resolved.canonicalWebUrl,
      release: () => this.options.acquisition.release(acquired.operationId),
    };
  }

  releaseOwner(ownerId: number): void {
    for (const [id, result] of this.results) {
      if (result.ownerId === ownerId) {
        this.results.delete(id);
      }
    }
    this.clearOwnerVersions(ownerId);
  }

  // Private parsing/session helpers stay adjacent to the provider API they support.
  // eslint-disable-next-line unicorn/consistent-class-member-order
  private async loadResults(
    ownerId: number,
    url: URL,
    kind: 'browse' | 'search',
  ): Promise<SkillRemoteResultView[]> {
    const payload = await this.options.httpClient.getJson({
      url: url.href,
      allowedHosts: CLAWHUB_HOSTS,
    });
    const packages = kind === 'browse'
      ? parseBrowseResponse(payload)
      : parseSearchResponse(payload);
    this.clearOwnerResults(ownerId);
    this.clearOwnerVersions(ownerId);
    return packages.map((facts) => {
      const id = parseSkillRemoteResultId(this.createId());
      const canonicalWebUrl = buildCanonicalWebUrl(facts.ownerHandle, facts.slug);
      const view: SkillRemoteResultView = {
        id,
        provider: 'clawhub',
        sourceNativeId: `${facts.ownerHandle}/${facts.slug}`,
        name: facts.displayName,
        description: facts.summary,
        publisher: facts.ownerHandle,
        latestVersion: facts.latestVersion,
        canonicalWebUrl,
      };
      this.results.set(id, {
        ownerId,
        ownerHandle: facts.ownerHandle,
        slug: facts.slug,
        view,
      });
      return view;
    });
  }

  private getResult(ownerId: number, resultIdValue: unknown): ClawHubResult {
    const resultId = parseSkillRemoteResultId(resultIdValue);
    const result = this.results.get(resultId);
    if (result?.ownerId !== ownerId) {
      throw new SkillOperationError('stale-result', 'Search ClawHub again.');
    }
    return result;
  }

  private addVersionCandidate(input: ClawHubVersionCandidate): string {
    const id = parseSkillRemoteResultId(this.createId());
    this.versionCandidates.set(id, input);
    return id;
  }

  private async resolveExactCandidate(candidate: ClawHubVersionCandidate): Promise<{
    version: string;
    artifactDigest: string | null;
  }> {
    const packageUrl = new URL(
      `/api/v1/packages/${encodeURIComponent(candidate.slug)}`,
      CLAWHUB_ORIGIN,
    );
    const packageFacts = parsePackageResponse(await this.options.httpClient.getJson({
      url: packageUrl.href,
      allowedHosts: CLAWHUB_HOSTS,
      cache: false,
    }));
    assertSamePackage(candidate, packageFacts);
    const version = candidate.trackingMode === 'tracked'
      ? packageFacts.latestVersion
      : candidate.version;
    if (version === null || version !== candidate.version) {
      throw new SkillOperationError('stale-result', 'The ClawHub version changed. Open it again.');
    }
    const versionUrl = new URL(
      `/api/v1/skills/${encodeURIComponent(candidate.slug)}/versions/${encodeURIComponent(version)}`,
      CLAWHUB_ORIGIN,
    );
    const versionFacts = parseLegacyVersionResponse(
      await this.options.httpClient.getJson({
        url: versionUrl.href,
        allowedHosts: CLAWHUB_HOSTS,
        cache: false,
      }),
    );
    if (versionFacts.version !== version) {
      throw new SkillOperationError('stale-result', 'The ClawHub version changed. Open it again.');
    }
    return {
      version,
      artifactDigest: versionFacts.artifactDigest,
    };
  }

  private async addZip(
    candidate: ClawHubVersionCandidate,
    downloadUrl: string,
    expectedDigest: string | null,
  ): Promise<SkillAddRemoteCandidateResult> {
    const acquired = await this.options.acquisition.acquireZip({
      url: downloadUrl,
      expectedDigest,
    });
    try {
      const packageId = parseSkillId(this.createId());
      const prepared = await this.options.storeCoordinator.preparePackageContent(
        acquired.contentRoot,
        packageId,
      );
      const fetchedAt = this.now();
      return this.options.sourceRepository.importPackageWithSource({
        packageId,
        distributionName: prepared.distributionName,
        description: prepared.description,
        content: prepared.encoded.content,
        fingerprint: prepared.encoded.fingerprint,
        createdAt: fetchedAt,
        source: {
          id: parseSkillId(this.createId()),
          provider: 'clawhub',
          trackingMode: candidate.trackingMode,
          sourceNativeId: `${candidate.ownerHandle}/${candidate.slug}`,
          directoryProvider: null,
          catalogLocator: null,
          sourceUrl: null,
          skillPath: null,
          requestedRef: candidate.requestedRef,
          resolvedRevision: candidate.version,
          artifactDigest: acquired.artifactDigest,
          observedContentFingerprint: prepared.encoded.fingerprint,
          canonicalWebUrl: candidate.canonicalWebUrl,
          fetchedAt,
        },
      });
    } finally {
      await ignoreFailure(() => this.options.acquisition.release(acquired.operationId));
    }
  }

  private async addGitHubHandoff(
    candidate: ClawHubVersionCandidate,
    handoff: GitHubHandoff,
  ): Promise<SkillAddRemoteCandidateResult> {
    const sourceUrl = handoff.packagePath === null
      ? `https://github.com/${handoff.repo}`
      : `https://github.com/${handoff.repo}/tree/${handoff.commit}/${handoff.packagePath}`;
    const resolution = await this.options.gitSourceCoordinator.resolve(candidate.ownerId, {
      sourceUrl,
      requestedRef: handoff.commit,
    });
    const selected = resolution.packages.find((item) => (
      item.packagePath === (handoff.packagePath ?? '.')
    ));
    if (!selected || resolution.packages.length !== 1) {
      throw new SkillOperationError(
        'content-unavailable',
        'The ClawHub GitHub handoff did not identify one Skill Package.',
      );
    }
    const added = await this.options.gitSourceCoordinator.addToStore(
      candidate.ownerId,
      selected.id,
    );
    const source = this.options.sourceRepository.attachOrRefresh({
      id: parseSkillId(this.createId()),
      packageId: added.skillPackage.id,
      provider: 'clawhub',
      trackingMode: candidate.trackingMode,
      sourceNativeId: `${candidate.ownerHandle}/${candidate.slug}`,
      directoryProvider: null,
      catalogLocator: null,
      sourceUrl: added.source.sourceUrl,
      skillPath: added.source.skillPath,
      requestedRef: candidate.requestedRef,
      resolvedRevision: candidate.version,
      artifactDigest: handoff.contentHash,
      observedContentFingerprint: added.skillPackage.fingerprint,
      canonicalWebUrl: candidate.canonicalWebUrl,
      fetchedAt: this.now(),
    });
    return { ...added, source };
  }

  private clearOwnerResults(ownerId: number): void {
    for (const [id, result] of this.results) {
      if (result.ownerId === ownerId) {
        this.results.delete(id);
      }
    }
  }

  private clearOwnerVersions(ownerId: number): void {
    for (const [id, candidate] of this.versionCandidates) {
      if (candidate.ownerId === ownerId) {
        this.versionCandidates.delete(id);
      }
    }
  }
}

function parseBrowseResponse(value: unknown): ClawHubPackageFacts[] {
  const record = requireRecord(value);
  return parsePackageArray(record.items, (entry) => entry);
}

function parseSearchResponse(value: unknown): ClawHubPackageFacts[] {
  const record = requireRecord(value);
  return parsePackageArray(record.results, (entry) => requireRecord(entry).package);
}

function parsePackageArray(
  value: unknown,
  select: (entry: unknown) => unknown,
): ClawHubPackageFacts[] {
  if (!Array.isArray(value) || value.length > MAX_RESULTS) {
    throw invalidProviderPayload();
  }
  return value.map((entry) => parsePackage(select(entry)));
}

function parsePackageResponse(value: unknown): ClawHubPackageFacts {
  return parsePackage(requireRecord(value).package);
}

function parsePackage(value: unknown): ClawHubPackageFacts {
  const record = requireRecord(value);
  if (record.family !== 'skill') {
    throw invalidProviderPayload();
  }
  return {
    ownerHandle: parseCoordinateSegment(record.ownerHandle),
    slug: parseCoordinateSegment(record.name),
    displayName: parseText(record.displayName, 512),
    summary: parseOptionalText(record.summary, MAX_TEXT_BYTES),
    latestVersion: parseOptionalText(record.latestVersion, 256),
  };
}

function parseVersionListResponse(value: unknown): ClawHubVersionFacts[] {
  const items = requireRecord(value).items;
  if (!Array.isArray(items) || items.length > MAX_VERSIONS) {
    throw invalidProviderPayload();
  }
  const versions = items.map((item): ClawHubVersionFacts => {
    const record = requireRecord(item);
    return {
      version: parseText(record.version, 256),
      publishedAt: parseOptionalTimestamp(record.createdAt),
      changelog: parseOptionalText(record.changelog, MAX_TEXT_BYTES),
    };
  });
  if (new Set(versions.map((version) => version.version)).size !== versions.length) {
    throw invalidProviderPayload();
  }
  return versions;
}

function parseLegacyVersionResponse(value: unknown): {
  version: string;
  artifactDigest: string | null;
} {
  const version = requireRecord(requireRecord(value).version);
  const security = version.security === null || version.security === undefined
    ? null
    : requireRecord(version.security);
  return {
    version: parseText(version.version, 256),
    artifactDigest: parseOptionalDigest(security?.sha256hash),
  };
}

function parseGitHubHandoff(value: unknown): GitHubHandoff {
  const record = requireRecord(value);
  if (record.sourceRef !== 'public-github') {
    throw invalidProviderPayload();
  }
  const repo = parseText(record.repo, 512);
  if (!(/^[\w.-]+\/[\w.-]+$/u).test(repo)) {
    throw invalidProviderPayload();
  }
  const commit = parseText(record.commit, 64).toLowerCase();
  if (!(/^[0-9a-f]{40,64}$/).test(commit)) {
    throw invalidProviderPayload();
  }
  const pathValue = parseText(record.path, 4096);
  const packagePath = pathValue === '.' ? null : parseSkillRelativePath(pathValue);
  parseHttpsUrl(record.archiveUrl);
  return {
    repo,
    commit,
    packagePath,
    contentHash: parseOptionalDigest(record.contentHash),
  };
}

function parseClawHubSource(source: SkillSourceView): {
  ownerHandle: string;
  slug: string;
} {
  if (source.provider !== 'clawhub') {
    throw new SkillOperationError('invalid-input', 'Select a ClawHub Skill Source.');
  }
  const segments = source.sourceNativeId.split('/');
  if (segments.length !== 2) {
    throw new SkillOperationError('source-unavailable', 'The ClawHub Source identity is invalid.');
  }
  return {
    ownerHandle: parseCoordinateSegment(segments[0]),
    slug: parseCoordinateSegment(segments[1]),
  };
}

function assertSamePackage(
  expected: Pick<ClawHubResult, 'ownerHandle' | 'slug'>,
  actual: ClawHubPackageFacts,
): void {
  if (expected.ownerHandle !== actual.ownerHandle || expected.slug !== actual.slug) {
    throw new SkillOperationError('stale-result', 'The ClawHub Skill identity changed.');
  }
}

function buildDownloadUrl(slug: string, version: string): string {
  const url = new URL('/api/v1/download', CLAWHUB_ORIGIN);
  url.searchParams.set('slug', slug);
  url.searchParams.set('version', version);
  return url.href;
}

function buildCanonicalWebUrl(ownerHandle: string, slug: string): string {
  return `${CLAWHUB_ORIGIN}/${encodeURIComponent(ownerHandle)}/skills/${encodeURIComponent(slug)}`;
}

function parseCoordinateSegment(value: unknown): string {
  const segment = parseText(value, 255);
  if (!(/^[\w.-]+$/u).test(segment)) {
    throw invalidProviderPayload();
  }
  return segment;
}

function parseText(value: unknown, maxBytes: number): string {
  if (
    typeof value !== 'string'
    || value === ''
    || value !== value.trim()
    || Buffer.byteLength(value, 'utf8') > maxBytes
    || hasControlCharacters(value)
  ) {
    throw invalidProviderPayload();
  }
  return value;
}

function parseOptionalText(value: unknown, maxBytes: number): string | null {
  return value === null || value === undefined ? null : parseText(value, maxBytes);
}

function parseOptionalTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw invalidProviderPayload();
  }
  return value;
}

function parseOptionalDigest(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' && (/^[0-9a-f]{64}$/i).test(value)
    ? value.toLowerCase()
    : null;
}

function parseHttpsUrl(value: unknown): string {
  const rawUrl = parseText(value, 4096);
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw invalidProviderPayload();
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
    throw invalidProviderPayload();
  }
  return url.href;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidProviderPayload();
  }
  return value as Record<string, unknown>;
}

function invalidProviderPayload(): SkillOperationError {
  return new SkillOperationError('source-unavailable', 'The ClawHub response is invalid.');
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

async function ignoreFailure(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // Startup recovery removes marker-owned remote staging after cleanup failures.
  }
}
