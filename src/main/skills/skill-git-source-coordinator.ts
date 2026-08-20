import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  chmod,
  mkdir,
  readdir,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type {
  SkillAddRemoteCandidateResult,
  SkillDirectoryProvider,
  SkillGitResolutionView,
  SkillRemotePackageCandidateView,
  SkillResolveGitSourceInput,
  SkillSourceView,
  SkillSourceTrackingMode,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type {
  SkillRemoteAcquisitionCoordinator,
  SkillRemoteWorkspace,
} from './skill-remote-acquisition';
import type { SkillSourceRepository } from './skill-source-repository';
import type {
  SkillMaterializedSourceRevision,
  SkillResolvedSourceRevision,
} from './skill-remote-source';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import {
  parseSkillId,
  parseSkillRemoteResultId,
  parseSkillRelativePath,
  parseSkillResolveGitSourceInput,
} from './skill-validation';

export interface SkillGitPolicy {
  commandTimeoutMs: number;
  maxCommandOutputBytes: number;
  maxRepositoryBytes: number;
  maxTreeEntries: number;
  maxPackageEntries: number;
  maxPackageBytes: number;
  maxFileBytes: number;
  maxPackageDepth: number;
  maxSessionsPerOwner: number;
}

export const defaultSkillGitPolicy: SkillGitPolicy = {
  commandTimeoutMs: 60_000,
  maxCommandOutputBytes: 8 * 1024 * 1024,
  maxRepositoryBytes: 100 * 1024 * 1024,
  maxTreeEntries: 20_000,
  maxPackageEntries: 1000,
  maxPackageBytes: 25 * 1024 * 1024,
  maxFileBytes: 10 * 1024 * 1024,
  maxPackageDepth: 8,
  maxSessionsPerOwner: 8,
};

export interface GitCommandRequest {
  args: string[];
  cwd?: string;
  timeoutMs: number;
  maxOutputBytes: number;
  resourceRoot?: string;
  maxResourceBytes?: number;
}

export interface GitCommandResult {
  stdout: Buffer;
}

export type GitCommandRunner = (request: GitCommandRequest) => Promise<GitCommandResult>;

interface SkillGitSourceCoordinatorOptions {
  acquisition: SkillRemoteAcquisitionCoordinator;
  storeCoordinator: SkillStoreCoordinator;
  sourceRepository: SkillSourceRepository;
  createId?: () => string;
  now?: () => number;
  runGit?: GitCommandRunner;
  policy?: Partial<SkillGitPolicy>;
}

interface SkillDirectoryProvenance {
  provider: SkillDirectoryProvider;
  locator: string;
}

interface NormalizedGitLocator {
  remoteUrl: string;
  canonicalWebBase: string;
  requestedRef: string | null;
  githubTreeSegments: string[] | null;
}

interface ResolvedGitLocator extends NormalizedGitLocator {
  resolvedRevision: string;
  packagePathHint: string | null;
}

interface GitTreeEntry {
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  objectId: string;
  size: number | null;
  relativePath: string;
}

interface GitPackageCandidate {
  id: string;
  packagePath: string | null;
  view: SkillRemotePackageCandidateView;
}

interface GitResolutionSession {
  id: string;
  ownerId: number;
  workspace: SkillRemoteWorkspace;
  repositoryRoot: string;
  locator: ResolvedGitLocator;
  tree: GitTreeEntry[];
  candidates: Map<string, GitPackageCandidate>;
  directoryProvenance: SkillDirectoryProvenance | null;
}

export class SkillGitSourceCoordinator {
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly runGit: GitCommandRunner;
  private readonly policy: SkillGitPolicy;
  private readonly sessions = new Map<string, GitResolutionSession>();

  constructor(private readonly options: SkillGitSourceCoordinatorOptions) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
    this.runGit = options.runGit ?? runGitCommand;
    this.policy = validateGitPolicy({ ...defaultSkillGitPolicy, ...options.policy });
  }

  private getSessionCandidate(
    ownerId: number,
    candidateIdValue: unknown,
  ): { session: GitResolutionSession; candidate: GitPackageCandidate } {
    const candidateId = parseSkillRemoteResultId(candidateIdValue);
    for (const session of this.sessions.values()) {
      const candidate = session.candidates.get(candidateId);
      if (candidate && session.ownerId === ownerId) {
        return { session, candidate };
      }
    }
    throw new SkillOperationError('stale-result', 'Resolve the Git Source again.');
  }

  private async releaseSession(session: GitResolutionSession): Promise<void> {
    this.sessions.delete(session.id);
    await this.options.acquisition.release(session.workspace.operationId);
  }

  private runRepositoryCommand(
    args: string[],
    workspace: SkillRemoteWorkspace,
  ): Promise<GitCommandResult> {
    return this.runGit({
      args,
      timeoutMs: this.policy.commandTimeoutMs,
      maxOutputBytes: this.policy.maxCommandOutputBytes,
      resourceRoot: workspace.operationRoot,
      maxResourceBytes: this.policy.maxRepositoryBytes,
    });
  }

  private async materializeTrackedSource(
    source: SkillSourceView,
    expectedRevision: string,
  ): Promise<SkillMaterializedSourceRevision> {
    if (source.provider !== 'git' || source.sourceUrl === null) {
      throw new SkillOperationError('invalid-input', 'Select a Git Skill Source.');
    }
    const input = parseSkillResolveGitSourceInput({
      sourceUrl: source.sourceUrl,
      requestedRef: source.requestedRef,
    });
    const locator = await resolveGitLocator(
      normalizeGitLocator(input),
      this.runGit,
      this.policy,
    );
    if (locator.resolvedRevision !== expectedRevision) {
      throw new SkillOperationError('stale-result', 'The Git Source changed after Update Check.');
    }
    const workspace = await this.options.acquisition.createWorkspace();
    try {
      const repositoryRoot = path.join(workspace.operationRoot, 'repository.git');
      await this.runRepositoryCommand(['init', '--bare', repositoryRoot], workspace);
      await this.runRepositoryCommand(
        ['-C', repositoryRoot, 'remote', 'add', 'origin', locator.remoteUrl],
        workspace,
      );
      await this.runRepositoryCommand([
        '-C',
        repositoryRoot,
        'fetch',
        '--depth=1',
        '--no-tags',
        'origin',
        expectedRevision,
      ], workspace);
      const revisionResult = await this.runRepositoryCommand([
        '-C',
        repositoryRoot,
        'rev-parse',
        'FETCH_HEAD^{commit}',
      ], workspace);
      if (revisionResult.stdout.toString('utf8').trim() !== expectedRevision) {
        throw new SkillOperationError('stale-result', 'The Git Source revision changed.');
      }
      const treeOutput = await this.runRepositoryCommand([
        '-C',
        repositoryRoot,
        'ls-tree',
        '-rztl',
        expectedRevision,
      ], workspace);
      const tree = parseGitTree(treeOutput.stdout, this.policy.maxTreeEntries);
      const packagePaths = discoverPackagePaths(
        tree,
        source.skillPath,
        this.policy.maxPackageDepth,
      );
      const expectedPackagePath = source.skillPath;
      if (!packagePaths.includes(expectedPackagePath)) {
        throw new SkillOperationError(
          'source-unavailable',
          'The tracked Skill Package path is no longer available.',
        );
      }
      const packageRoot = path.join(workspace.contentRoot, 'package');
      await materializeGitPackage({
        repositoryRoot,
        revision: expectedRevision,
        packagePath: expectedPackagePath,
        destination: packageRoot,
        tree,
        runGit: (args) => this.runRepositoryCommand(args, workspace),
        policy: this.policy,
      });
      return {
        contentRoot: packageRoot,
        resolvedRevision: expectedRevision,
        artifactDigest: null,
        canonicalWebUrl: buildCanonicalRevisionUrl(locator, expectedPackagePath),
        release: () => this.options.acquisition.release(workspace.operationId),
      };
    } catch (error) {
      await ignoreFailure(() => this.options.acquisition.release(workspace.operationId));
      throw toSkillOperationError(error);
    }
  }

  async resolve(
    ownerId: number,
    inputValue: unknown,
    directoryProvenance: SkillDirectoryProvenance | null = null,
  ): Promise<SkillGitResolutionView> {
    const input = parseSkillResolveGitSourceInput(inputValue);
    const ownerSessionCount = this.sessions.values()
      .filter((session) => session.ownerId === ownerId)
      .toArray()
      .length;
    if (ownerSessionCount >= this.policy.maxSessionsPerOwner) {
      throw new SkillOperationError('resource-limit', 'Too many Git Sources are being resolved.');
    }
    const normalized = normalizeGitLocator(input);
    const locator = await resolveGitLocator(normalized, this.runGit, this.policy);
    const workspace = await this.options.acquisition.createWorkspace();
    try {
      const repositoryRoot = path.join(workspace.operationRoot, 'repository.git');
      await this.runRepositoryCommand(['init', '--bare', repositoryRoot], workspace);
      await this.runRepositoryCommand(
        ['-C', repositoryRoot, 'remote', 'add', 'origin', locator.remoteUrl],
        workspace,
      );
      await this.runRepositoryCommand([
        '-C',
        repositoryRoot,
        'fetch',
        '--depth=1',
        '--no-tags',
        'origin',
        locator.resolvedRevision,
      ], workspace);
      const revisionResult = await this.runRepositoryCommand([
        '-C',
        repositoryRoot,
        'rev-parse',
        'FETCH_HEAD^{commit}',
      ], workspace);
      const fetchedRevision = revisionResult.stdout.toString('utf8').trim();
      if (fetchedRevision !== locator.resolvedRevision) {
        throw new SkillOperationError('stale-result', 'The Git Source revision changed.');
      }
      const treeOutput = await this.runRepositoryCommand([
        '-C',
        repositoryRoot,
        'ls-tree',
        '-rztl',
        locator.resolvedRevision,
      ], workspace);
      const tree = parseGitTree(treeOutput.stdout, this.policy.maxTreeEntries);
      const packagePaths = discoverPackagePaths(
        tree,
        locator.packagePathHint,
        this.policy.maxPackageDepth,
      );
      const sessionId = parseSkillRemoteResultId(this.createId());
      const candidates = new Map<string, GitPackageCandidate>();
      for (const packagePath of packagePaths) {
        const candidateId = parseSkillRemoteResultId(this.createId());
        const displayPath = packagePath ?? '.';
        candidates.set(candidateId, {
          id: candidateId,
          packagePath,
          view: {
            id: candidateId,
            name: packagePath ? path.posix.basename(packagePath) : repositoryName(locator.remoteUrl),
            description: null,
            packagePath: displayPath,
          },
        });
      }
      const session: GitResolutionSession = {
        id: sessionId,
        ownerId,
        workspace,
        repositoryRoot,
        locator,
        tree,
        candidates,
        directoryProvenance,
      };
      this.sessions.set(sessionId, session);
      return {
        id: sessionId,
        sourceUrl: locator.remoteUrl,
        requestedRef: locator.requestedRef,
        resolvedRevision: locator.resolvedRevision,
        packages: candidates.values().map((candidate) => candidate.view).toArray(),
      };
    } catch (error) {
      await ignoreFailure(() => this.options.acquisition.release(workspace.operationId));
      throw toSkillOperationError(error);
    }
  }

  async addToStore(
    ownerId: number,
    candidateIdValue: unknown,
  ): Promise<SkillAddRemoteCandidateResult> {
    const { session, candidate } = this.getSessionCandidate(ownerId, candidateIdValue);
    try {
      const current = await resolveGitLocator(
        {
          remoteUrl: session.locator.remoteUrl,
          canonicalWebBase: session.locator.canonicalWebBase,
          requestedRef: session.locator.requestedRef,
          githubTreeSegments: null,
        },
        this.runGit,
        this.policy,
      );
      if (current.resolvedRevision !== session.locator.resolvedRevision) {
        throw new SkillOperationError('stale-result', 'The Git Source changed. Resolve it again.');
      }
      const packageRoot = path.join(session.workspace.contentRoot, 'package');
      await materializeGitPackage({
        repositoryRoot: session.repositoryRoot,
        revision: session.locator.resolvedRevision,
        packagePath: candidate.packagePath,
        destination: packageRoot,
        tree: session.tree,
        runGit: (args) => this.runRepositoryCommand(args, session.workspace),
        policy: this.policy,
      });
      const packageId = parseSkillId(this.createId());
      const prepared = await this.options.storeCoordinator.preparePackageContent(
        packageRoot,
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
          provider: 'git',
          trackingMode: inferTrackingMode(session.locator.requestedRef),
          sourceNativeId: session.locator.remoteUrl,
          directoryProvider: session.directoryProvenance?.provider ?? null,
          catalogLocator: session.directoryProvenance?.locator ?? null,
          sourceUrl: session.locator.remoteUrl,
          skillPath: candidate.packagePath,
          requestedRef: session.locator.requestedRef,
          resolvedRevision: session.locator.resolvedRevision,
          artifactDigest: null,
          observedContentFingerprint: prepared.encoded.fingerprint,
          canonicalWebUrl: buildCanonicalRevisionUrl(
            session.locator,
            candidate.packagePath,
          ),
          fetchedAt,
        },
      });
    } finally {
      await ignoreFailure(() => this.releaseSession(session));
    }
  }

  async resolveSourceRevision(source: SkillSourceView): Promise<SkillResolvedSourceRevision> {
    if (source.provider !== 'git' || source.sourceUrl === null) {
      throw new SkillOperationError('invalid-input', 'Select a Git Skill Source.');
    }
    const input = parseSkillResolveGitSourceInput({
      sourceUrl: source.sourceUrl,
      requestedRef: source.requestedRef,
    });
    const locator = await resolveGitLocator(
      normalizeGitLocator(input),
      this.runGit,
      this.policy,
    );
    return {
      resolvedRevision: locator.resolvedRevision,
      artifactDigest: null,
      canonicalWebUrl: buildCanonicalRevisionUrl(locator, source.skillPath),
    };
  }

  materializeSourceRevision(
    source: SkillSourceView,
    expectedRevision: string,
  ): Promise<SkillMaterializedSourceRevision> {
    return this.materializeTrackedSource(source, expectedRevision);
  }

  async releaseOwner(ownerId: number): Promise<void> {
    const sessions = this.sessions.values()
      .filter((session) => session.ownerId === ownerId)
      .toArray();
    await Promise.all(sessions.map((session) => this.releaseSession(session)));
  }

  async dispose(): Promise<void> {
    const sessions = this.sessions.values().toArray();
    await Promise.all(sessions.map((session) => this.releaseSession(session)));
  }
}

function normalizeGitLocator(input: SkillResolveGitSourceInput): NormalizedGitLocator {
  if ((/^[\w.-]+@[\w.-]+:\S+$/).test(input.sourceUrl)) {
    const separator = input.sourceUrl.indexOf(':');
    const host = input.sourceUrl.slice(0, separator).split('@').at(-1)!;
    const repositoryPath = input.sourceUrl.slice(separator + 1).replace(/\.git$/, '');
    return {
      remoteUrl: input.sourceUrl,
      canonicalWebBase: `https://${host}/${repositoryPath}`,
      requestedRef: input.requestedRef,
      githubTreeSegments: null,
    };
  }
  const sourceUrl = new URL(input.sourceUrl);
  const segments = sourceUrl.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
  if (sourceUrl.hostname.toLowerCase() === 'github.com' && segments.length >= 2) {
    const owner = segments[0];
    const repository = segments[1].replace(/\.git$/, '');
    const isTreeUrl = segments[2] === 'tree';
    if (segments.length > 2 && !isTreeUrl) {
      throw new SkillOperationError('invalid-input', 'Provide a GitHub repository or tree URL.');
    }
    return {
      remoteUrl: `https://github.com/${owner}/${repository}.git`,
      canonicalWebBase: `https://github.com/${owner}/${repository}`,
      requestedRef: input.requestedRef,
      githubTreeSegments: isTreeUrl ? segments.slice(3) : null,
    };
  }
  if (sourceUrl.search !== '' || sourceUrl.hash !== '') {
    throw new SkillOperationError('invalid-input', 'Provide a Git remote URL without query data.');
  }
  const remoteUrl = sourceUrl.href.replace(/\/$/, '');
  return {
    remoteUrl,
    canonicalWebBase: toCanonicalWebBase(sourceUrl),
    requestedRef: input.requestedRef,
    githubTreeSegments: null,
  };
}

async function resolveGitLocator(
  locator: NormalizedGitLocator,
  runGit: GitCommandRunner,
  policy: SkillGitPolicy,
): Promise<ResolvedGitLocator> {
  let requestedRef = locator.requestedRef;
  let packagePathHint: string | null = null;
  const treeSegments = locator.githubTreeSegments;
  if (treeSegments) {
    if (treeSegments.length === 0) {
      throw new SkillOperationError('invalid-input', 'The GitHub tree URL is incomplete.');
    }
    if (requestedRef) {
      const refSegments = requestedRef.split('/');
      if (!hasSegmentPrefix(treeSegments, refSegments)) {
        throw new SkillOperationError('invalid-input', 'The GitHub tree URL does not match the ref.');
      }
      packagePathHint = toOptionalPackagePath(treeSegments.slice(refSegments.length));
    } else {
      const refs = await listRemoteRefs(locator.remoteUrl, runGit, policy);
      const matchedRef = refs.values().toArray().toSorted((left, right) => right.length - left.length).find((ref) => hasSegmentPrefix(treeSegments, ref.split('/')));
      if (matchedRef) {
        requestedRef = matchedRef;
        packagePathHint = toOptionalPackagePath(
          treeSegments.slice(matchedRef.split('/').length),
        );
      } else if ((/^[0-9a-f]{40,64}$/i).test(treeSegments[0])) {
        requestedRef = treeSegments[0];
        packagePathHint = toOptionalPackagePath(treeSegments.slice(1));
      } else {
        throw new SkillOperationError('source-unavailable', 'The GitHub tree ref was not found.');
      }
    }
  }
  const resolvedRevision = await resolveRemoteRevision(
    locator.remoteUrl,
    requestedRef,
    runGit,
    policy,
  );
  return { ...locator, requestedRef, resolvedRevision, packagePathHint };
}

async function listRemoteRefs(
  remoteUrl: string,
  runGit: GitCommandRunner,
  policy: SkillGitPolicy,
): Promise<Set<string>> {
  const result = await runGit({
    args: ['ls-remote', '--heads', '--tags', remoteUrl],
    timeoutMs: policy.commandTimeoutMs,
    maxOutputBytes: policy.maxCommandOutputBytes,
  });
  const refs = new Set<string>();
  for (const line of result.stdout.toString('utf8').split('\n')) {
    const separator = line.indexOf('\t');
    const ref = separator === -1 ? '' : line.slice(separator + 1).replace(/\^\{\}$/, '');
    if (ref.startsWith('refs/heads/')) {
      refs.add(ref.slice('refs/heads/'.length));
    } else if (ref.startsWith('refs/tags/')) {
      refs.add(ref.slice('refs/tags/'.length));
    }
  }
  return refs;
}

async function resolveRemoteRevision(
  remoteUrl: string,
  requestedRef: string | null,
  runGit: GitCommandRunner,
  policy: SkillGitPolicy,
): Promise<string> {
  if (requestedRef && (/^[0-9a-f]{40,64}$/i).test(requestedRef)) {
    return requestedRef.toLowerCase();
  }
  const args = requestedRef
    ? [
        'ls-remote',
        remoteUrl,
        requestedRef,
        `refs/heads/${requestedRef}`,
        `refs/tags/${requestedRef}`,
        `refs/tags/${requestedRef}^{}`,
      ]
    : ['ls-remote', '--symref', remoteUrl, 'HEAD'];
  const result = await runGit({
    args,
    timeoutMs: policy.commandTimeoutMs,
    maxOutputBytes: policy.maxCommandOutputBytes,
  });
  const refs = new Map<string, string>();
  for (const line of result.stdout.toString('utf8').split('\n')) {
    const match = (/^([0-9a-f]{40,64})\t(.+)$/).exec(line);
    if (match) {
      refs.set(match[2], match[1].toLowerCase());
    }
  }
  const resolved = requestedRef
    ? refs.get(`refs/tags/${requestedRef}^{}`)
    ?? refs.get(`refs/heads/${requestedRef}`)
    ?? refs.get(`refs/tags/${requestedRef}`)
    ?? refs.get(requestedRef)
    : refs.get('HEAD');
  if (!resolved) {
    throw new SkillOperationError('source-unavailable', 'The Git Source ref was not found.');
  }
  return resolved;
}

function parseGitTree(output: Buffer, maxEntries: number): GitTreeEntry[] {
  const records = output.toString('utf8').split('\0').filter(Boolean);
  if (records.length > maxEntries) {
    throw new SkillOperationError('resource-limit', 'The Git Source contains too many entries.');
  }
  return records.map((record) => {
    const match = (/^(\d{6}) (blob|tree|commit) ([0-9a-f]{40,64}) +([0-9-]+)\t(.+)$/).exec(record);
    if (!match) {
      throw new SkillOperationError('content-unavailable', 'The Git Source tree is invalid.');
    }
    const relativePath = normalizeGitTreePath(match[5]);
    const size = match[4] === '-' ? null : Number(match[4]);
    if (size !== null && (!Number.isSafeInteger(size) || size < 0)) {
      throw new SkillOperationError('content-unavailable', 'The Git Source tree is invalid.');
    }
    return {
      mode: match[1],
      type: match[2] as GitTreeEntry['type'],
      objectId: match[3],
      size,
      relativePath,
    };
  });
}

function discoverPackagePaths(
  tree: GitTreeEntry[],
  packagePathHint: string | null,
  maxDepth: number,
): Array<string | null> {
  const packagePaths = tree
    .filter((entry) => entry.type === 'blob' && path.posix.basename(entry.relativePath) === 'SKILL.md')
    .map((entry) => path.posix.dirname(entry.relativePath))
    .map((packagePath) => (packagePath === '.' ? null : packagePath))
    .filter((packagePath) => packagePath === null || packagePath.split('/').length <= maxDepth);
  const uniquePaths = [...new Set(packagePaths)];
  if (packagePathHint !== null) {
    return uniquePaths.includes(packagePathHint) ? [packagePathHint] : [];
  }
  return uniquePaths;
}

async function materializeGitPackage(options: {
  repositoryRoot: string;
  revision: string;
  packagePath: string | null;
  destination: string;
  tree: GitTreeEntry[];
  runGit: (args: string[]) => Promise<GitCommandResult>;
  policy: SkillGitPolicy;
}): Promise<void> {
  const prefix = options.packagePath === null ? '' : `${options.packagePath}/`;
  const entries = options.tree.filter((entry) => (
    options.packagePath === null || entry.relativePath.startsWith(prefix)
  )).map((entry) => ({
    ...entry,
    packageRelativePath: prefix === '' ? entry.relativePath : entry.relativePath.slice(prefix.length),
  })).filter((entry) => entry.packageRelativePath !== '');
  if (entries.length > options.policy.maxPackageEntries) {
    throw new SkillOperationError('resource-limit', 'The Skill Package contains too many entries.');
  }
  if (entries.every((entry) => !(entry.type === 'blob' && entry.packageRelativePath === 'SKILL.md'))) {
    throw new SkillOperationError('content-unavailable', 'The Git tree is not a recognized Skill Package.');
  }
  let totalBytes = 0;
  for (const entry of entries) {
    if (entry.type === 'commit' || !['040000', '100644', '100755', '120000'].includes(entry.mode)) {
      throw new SkillOperationError('content-unavailable', 'The Skill Package contains a special Git entry.');
    }
    if (entry.type === 'blob') {
      if (entry.size === null || entry.size > options.policy.maxFileBytes) {
        throw new SkillOperationError('resource-limit', 'A Skill Package file is too large.');
      }
      totalBytes += entry.size;
      if (totalBytes > options.policy.maxPackageBytes) {
        throw new SkillOperationError('resource-limit', 'The Skill Package is too large.');
      }
    }
  }
  await mkdir(options.destination, { mode: 0o700 });
  for (const entry of entries) {
    const destination = resolveContainedPath(options.destination, entry.packageRelativePath);
    if (entry.type === 'tree') {
      await mkdir(destination, { recursive: true, mode: 0o700 });
      await chmod(destination, 0o700);
      continue;
    }
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    const blobResult = await options.runGit([
      '-C',
      options.repositoryRoot,
      'cat-file',
      'blob',
      entry.objectId,
    ]);
    const blob = blobResult.stdout;
    if (entry.size !== blob.length) {
      throw new SkillOperationError('content-unavailable', 'A Git blob changed while being read.');
    }
    if (entry.mode === '120000') {
      const target = decodeLinkTarget(blob);
      assertContainedLinkTarget(options.destination, destination, target);
      await symlink(target, destination);
    } else {
      await writeFile(destination, blob, { flag: 'wx', mode: 0o600 });
    }
  }
}

export async function runGitCommand(request: GitCommandRequest): Promise<GitCommandResult> {
  const args = [
    '-c',
    `core.hooksPath=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`,
    '-c',
    'filter.lfs.smudge=',
    '-c',
    'filter.lfs.required=false',
    '-c',
    'submodule.recurse=false',
    ...request.args,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: request.cwd,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: createGitEnvironment(),
    });
    const stdout: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let isSettled = false;
    let isResourceCheckRunning = false;
    let timeout: ReturnType<typeof setTimeout>;
    let resourceInterval: ReturnType<typeof setInterval>;
    const finish = (error?: SkillOperationError): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      clearTimeout(timeout);
      clearInterval(resourceInterval);
      if (error) {
        child.kill('SIGKILL');
        reject(error);
      } else {
        resolve({ stdout: Buffer.concat(stdout) });
      }
    };
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > request.maxOutputBytes) {
        finish(new SkillOperationError('resource-limit', 'Git returned too much data.'));
        return;
      }
      stdout.push(Buffer.from(chunk));
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > request.maxOutputBytes) {
        finish(new SkillOperationError('resource-limit', 'Git returned too much data.'));
      }
    });
    child.on('error', () => {
      finish(new SkillOperationError('source-unavailable', 'Git is unavailable.'));
    });
    child.on('close', (code) => {
      if (isSettled) {
        return;
      }
      if (code === 0) {
        finish();
      } else {
        finish(new SkillOperationError('source-unavailable', 'The Git Source is unavailable.'));
      }
    });
    timeout = setTimeout(() => {
      finish(new SkillOperationError('operation-timeout', 'The Git operation timed out.'));
    }, request.timeoutMs);
    const checkResourceLimit = async (): Promise<void> => {
      const { resourceRoot, maxResourceBytes } = request;
      if (
        isResourceCheckRunning
        || !resourceRoot
        || maxResourceBytes === undefined
      ) {
        return;
      }
      isResourceCheckRunning = true;
      try {
        const size = await directorySize(resourceRoot, maxResourceBytes);
        if (size > maxResourceBytes) {
          finish(new SkillOperationError('resource-limit', 'The Git Source is too large.'));
        }
      } catch {
        finish(new SkillOperationError('filesystem-unavailable', 'Git staging is unavailable.'));
      } finally {
        isResourceCheckRunning = false;
      }
    };
    resourceInterval = setInterval(() => {
      void checkResourceLimit();
    }, 100);
  });
}

function createGitEnvironment(): Record<string, string | undefined> {
  const names = [
    'PATH',
    'HOME',
    'USERPROFILE',
    'XDG_CONFIG_HOME',
    'SSH_AUTH_SOCK',
    'SystemRoot',
    'TMPDIR',
    'TEMP',
    'TMP',
    'LANG',
  ] as const;
  const environment: Record<string, string | undefined> = {};
  for (const name of names) {
    if (process.env[name] !== undefined) {
      environment[name] = process.env[name];
    }
  }
  return {
    ...environment,
    LC_ALL: 'C',
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'Never',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_LFS_SKIP_SMUDGE: '1',
  };
}

async function directorySize(root: string, stopAfter: number): Promise<number> {
  let total = 0;
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(entryPath, stopAfter - total);
    } else if (entry.isFile()) {
      const entryStats = await stat(entryPath);
      total += entryStats.size;
    }
    if (total > stopAfter) {
      break;
    }
  }
  return total;
}

function normalizeGitTreePath(value: string): string {
  if (value === '' || value.includes('\\') || value.includes('\0')) {
    throw new SkillOperationError('content-unavailable', 'The Git Source contains an unsafe path.');
  }
  return parseSkillRelativePath(value).split(path.sep).join('/');
}

function toOptionalPackagePath(segments: string[]): string | null {
  if (segments.length === 0) {
    return null;
  }
  return parseSkillRelativePath(segments.join('/'));
}

function hasSegmentPrefix(value: string[], prefix: string[]): boolean {
  return prefix.every((segment, index) => value[index] === segment);
}

function repositoryName(remoteUrl: string): string {
  const pathname = remoteUrl.includes(':') && !remoteUrl.includes('://')
    ? remoteUrl.slice(remoteUrl.indexOf(':') + 1)
    : new URL(remoteUrl).pathname;
  return path.posix.basename(pathname).replace(/\.git$/, '') || 'skill';
}

function toCanonicalWebBase(sourceUrl: URL): string {
  if (sourceUrl.protocol === 'https:') {
    return sourceUrl.href.replace(/\.git\/?$/, '').replace(/\/$/, '');
  }
  const repositoryPath = sourceUrl.pathname.replace(/^\//, '').replace(/\.git$/, '');
  return `https://${sourceUrl.hostname}/${repositoryPath}`;
}

function buildCanonicalRevisionUrl(
  locator: ResolvedGitLocator,
  packagePath: string | null,
): string {
  const suffix = packagePath ? `/${packagePath}` : '';
  return `${locator.canonicalWebBase}/tree/${locator.resolvedRevision}${suffix}`;
}

function inferTrackingMode(requestedRef: string | null): SkillSourceTrackingMode {
  return requestedRef !== null && (/^[0-9a-f]{40,64}$/i).test(requestedRef)
    ? 'fixed'
    : 'tracked';
}

function resolveContainedPath(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const containment = path.relative(resolvedRoot, resolvedPath);
  if (
    containment === '..'
    || containment.startsWith(`..${path.sep}`)
    || path.isAbsolute(containment)
  ) {
    throw new SkillOperationError('content-unavailable', 'Git content escaped its staging root.');
  }
  return resolvedPath;
}

function decodeLinkTarget(content: Buffer): string {
  const target = content.toString('utf8');
  if (
    target === ''
    || target.includes('\0')
    || !Buffer.from(target, 'utf8').equals(content)
    || path.isAbsolute(target)
  ) {
    throw new SkillOperationError('content-unavailable', 'The Git Source contains an unsafe link.');
  }
  return target;
}

function assertContainedLinkTarget(packageRoot: string, linkPath: string, target: string): void {
  const resolvedTarget = path.resolve(path.dirname(linkPath), target);
  const containment = path.relative(path.resolve(packageRoot), resolvedTarget);
  if (
    containment === '..'
    || containment.startsWith(`..${path.sep}`)
    || path.isAbsolute(containment)
  ) {
    throw new SkillOperationError('content-unavailable', 'The Git Source contains an escaping link.');
  }
}

function validateGitPolicy(policy: SkillGitPolicy): SkillGitPolicy {
  for (const value of Object.values(policy)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error('Git policy is invalid.');
    }
  }
  return policy;
}

async function ignoreFailure(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // Startup recovery removes marker-owned remote staging after cleanup failures.
  }
}
