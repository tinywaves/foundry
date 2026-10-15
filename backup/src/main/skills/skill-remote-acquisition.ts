import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  chmod,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { Entry, ZipFile } from 'yauzl';
import { openPromise as openZip } from 'yauzl';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillStorePaths } from './skill-store-paths';
import {
  parseSkillArtifactDigest,
  parseSkillCanonicalWebUrl,
  parseSkillId,
} from './skill-validation';

export interface SkillRemoteAcquisitionPolicy {
  requestTimeoutMs: number;
  maxRedirects: number;
  maxDownloadBytes: number;
  maxExtractedBytes: number;
  maxFileBytes: number;
  maxEntries: number;
}

export const defaultSkillRemoteAcquisitionPolicy: SkillRemoteAcquisitionPolicy = {
  requestTimeoutMs: 30_000,
  maxRedirects: 5,
  maxDownloadBytes: 10 * 1024 * 1024,
  maxExtractedBytes: 25 * 1024 * 1024,
  maxFileBytes: 10 * 1024 * 1024,
  maxEntries: 1000,
};

export interface SkillRemoteArchiveInput {
  url: string;
  expectedDigest: string | null;
}

export interface SkillAcquiredRemoteTree {
  operationId: string;
  contentRoot: string;
  artifactDigest: string;
  downloadedBytes: number;
  extractedBytes: number;
  entryCount: number;
}

export interface SkillRemoteWorkspace {
  operationId: string;
  operationRoot: string;
  contentRoot: string;
}

interface RemoteOperationMarker {
  version: 1;
  kind: 'remote-acquisition';
  phase: 'downloading' | 'extracting' | 'ready';
  operationId: string;
  createdAt: number;
}

interface DownloadResult {
  digest: string;
  byteLength: number;
}

interface ExtractionResult {
  byteLength: number;
  entryCount: number;
}

interface SkillRemoteAcquisitionOptions {
  createId?: () => string;
  now?: () => number;
  fetch?: typeof fetch;
  policy?: Partial<SkillRemoteAcquisitionPolicy>;
  removePath?: (targetPath: string) => Promise<void>;
}

export class SkillRemoteAcquisitionCoordinator {
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly fetch: typeof fetch;
  private readonly policy: SkillRemoteAcquisitionPolicy;
  private readonly removePath: (targetPath: string) => Promise<void>;

  constructor(
    private readonly paths: SkillStorePaths,
    options: SkillRemoteAcquisitionOptions = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
    this.fetch = options.fetch ?? globalThis.fetch;
    this.policy = validatePolicy({
      ...defaultSkillRemoteAcquisitionPolicy,
      ...options.policy,
    });
    this.removePath = options.removePath ?? removeTree;
  }

  private async reconcileInterruptedOperations(): Promise<void> {
    const entries = await readdir(this.paths.remoteOperations, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        throw recoveryError();
      }
      const operationId = parseRecoveryOperationId(entry.name);
      const operationRoot = path.join(this.paths.remoteOperations, operationId);
      const marker = await readOperationMarker(operationRoot);
      if (marker.operationId !== operationId) {
        throw recoveryError();
      }
      await this.removePath(operationRoot);
    }
  }

  async initialize(): Promise<void> {
    await this.reconcileInterruptedOperations();
  }

  async createWorkspace(): Promise<SkillRemoteWorkspace> {
    const operationId = parseSkillId(this.createId());
    const operationRoot = path.join(this.paths.remoteOperations, operationId);
    const contentRoot = path.join(operationRoot, 'content');
    const marker: RemoteOperationMarker = {
      version: 1,
      kind: 'remote-acquisition',
      phase: 'extracting',
      operationId,
      createdAt: this.now(),
    };
    let isOperationOwned = false;
    try {
      await mkdir(operationRoot, { mode: 0o700 });
      isOperationOwned = true;
      await writeOperationMarker(operationRoot, marker);
      await mkdir(contentRoot, { mode: 0o700 });
      return { operationId, operationRoot, contentRoot };
    } catch (error) {
      if (isOperationOwned) {
        await ignoreFailure(() => this.removePath(operationRoot));
      }
      throw toRemoteAcquisitionError(error);
    }
  }

  async acquireZip(input: SkillRemoteArchiveInput): Promise<SkillAcquiredRemoteTree> {
    const remoteUrl = parseSkillCanonicalWebUrl(input.url);
    const expectedDigest = parseSkillArtifactDigest(input.expectedDigest);
    const operationId = parseSkillId(this.createId());
    const operationRoot = path.join(this.paths.remoteOperations, operationId);
    const archivePath = path.join(operationRoot, 'artifact.zip');
    const contentRoot = path.join(operationRoot, 'content');
    const marker: RemoteOperationMarker = {
      version: 1,
      kind: 'remote-acquisition',
      phase: 'downloading',
      operationId,
      createdAt: this.now(),
    };
    let isOperationOwned = false;
    try {
      await mkdir(operationRoot, { mode: 0o700 });
      isOperationOwned = true;
      await writeOperationMarker(operationRoot, marker);
      const download = await downloadRemoteFile({
        url: remoteUrl,
        destination: archivePath,
        fetch: this.fetch,
        policy: this.policy,
      });
      if (expectedDigest !== null && download.digest !== expectedDigest) {
        throw new SkillOperationError(
          'content-unavailable',
          'The remote artifact did not match its expected digest.',
        );
      }
      marker.phase = 'extracting';
      await writeOperationMarker(operationRoot, marker);
      await mkdir(contentRoot, { mode: 0o700 });
      const extraction = await extractZipArchive(archivePath, contentRoot, this.policy);
      marker.phase = 'ready';
      await writeOperationMarker(operationRoot, marker);
      return {
        operationId,
        contentRoot,
        artifactDigest: download.digest,
        downloadedBytes: download.byteLength,
        extractedBytes: extraction.byteLength,
        entryCount: extraction.entryCount,
      };
    } catch (error) {
      if (isOperationOwned) {
        await ignoreFailure(() => this.removePath(operationRoot));
      }
      throw toRemoteAcquisitionError(error);
    }
  }

  async release(operationIdValue: unknown): Promise<void> {
    const operationId = parseSkillId(operationIdValue);
    const operationRoot = path.join(this.paths.remoteOperations, operationId);
    try {
      const marker = await readOperationMarker(operationRoot);
      if (marker.operationId !== operationId) {
        throw recoveryError();
      }
      await this.removePath(operationRoot);
    } catch (error) {
      throw toRemoteAcquisitionError(error);
    }
  }
}

async function downloadRemoteFile(options: {
  url: string;
  destination: string;
  fetch: typeof fetch;
  policy: SkillRemoteAcquisitionPolicy;
}): Promise<DownloadResult> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), options.policy.requestTimeoutMs);
  let response: Response | undefined;
  let currentUrl = options.url;
  try {
    for (let redirectCount = 0; redirectCount <= options.policy.maxRedirects; redirectCount += 1) {
      response = await options.fetch(currentUrl, {
        redirect: 'manual',
        signal: abortController.signal,
        headers: { Accept: 'application/zip, application/octet-stream;q=0.9' },
      });
      if (!isRedirect(response.status)) {
        break;
      }
      if (redirectCount === options.policy.maxRedirects) {
        throw new SkillOperationError('resource-limit', 'The remote artifact redirected too many times.');
      }
      const location = response.headers.get('location');
      if (!location) {
        throw new SkillOperationError('source-unavailable', 'The remote artifact redirect is invalid.');
      }
      currentUrl = parseSkillCanonicalWebUrl(new URL(location, currentUrl).href);
    }
    if (!response) {
      throw new SkillOperationError('network-unavailable', 'The remote artifact is unavailable.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new SkillOperationError(
        'authentication-required',
        'The remote artifact requires authentication.',
      );
    }
    if (response.status === 429) {
      throw new SkillOperationError('rate-limited', 'The remote source is rate limited.');
    }
    if (!response.ok || !response.body) {
      throw new SkillOperationError('source-unavailable', 'The remote artifact is unavailable.');
    }
    const contentLength = parseContentLength(response.headers.get('content-length'));
    if (contentLength !== null && contentLength > options.policy.maxDownloadBytes) {
      throw new SkillOperationError('resource-limit', 'The remote artifact is too large.');
    }
    const fileHandle = await open(options.destination, 'wx', 0o600);
    const hash = createHash('sha256');
    let byteLength = 0;
    try {
      for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        byteLength += buffer.length;
        if (byteLength > options.policy.maxDownloadBytes) {
          throw new SkillOperationError('resource-limit', 'The remote artifact is too large.');
        }
        hash.update(buffer);
        await writeAll(fileHandle, buffer);
      }
    } finally {
      await fileHandle.close();
    }
    return { digest: hash.digest('hex'), byteLength };
  } catch (error) {
    if (isAbortError(error)) {
      throw new SkillOperationError('operation-timeout', 'The remote artifact request timed out.');
    }
    if (error instanceof SkillOperationError) {
      throw error;
    }
    throw new SkillOperationError('network-unavailable', 'The remote artifact is unavailable.');
  } finally {
    clearTimeout(timeout);
  }
}

async function extractZipArchive(
  archivePath: string,
  destinationRoot: string,
  policy: SkillRemoteAcquisitionPolicy,
): Promise<ExtractionResult> {
  let zipFile: ZipFile | undefined;
  try {
    zipFile = await openZip(archivePath, {
      autoClose: false,
      decodeStrings: true,
      lazyEntries: true,
      strictFileNames: true,
      validateEntrySizes: true,
    });
    if (zipFile.entryCount > policy.maxEntries) {
      throw new SkillOperationError('resource-limit', 'The remote archive contains too many entries.');
    }
    const seenPaths = new Set<string>();
    let byteLength = 0;
    let entryCount = 0;
    for await (const entry of zipFile.eachEntry()) {
      entryCount += 1;
      if (entryCount > policy.maxEntries) {
        throw new SkillOperationError('resource-limit', 'The remote archive contains too many entries.');
      }
      const kind = classifyZipEntry(entry);
      const relativePath = normalizeZipEntryPath(entry.fileName, kind === 'directory');
      const pathKey = relativePath.normalize('NFC').toLowerCase();
      if (seenPaths.has(pathKey)) {
        throw new SkillOperationError('content-unavailable', 'The remote archive contains duplicate paths.');
      }
      seenPaths.add(pathKey);
      const destination = resolveContainedPath(destinationRoot, relativePath);
      if (kind === 'directory') {
        await mkdir(destination, { recursive: true, mode: 0o700 });
        await chmod(destination, 0o700);
        continue;
      }
      if (
        entry.uncompressedSize > policy.maxFileBytes
        || byteLength + entry.uncompressedSize > policy.maxExtractedBytes
      ) {
        throw new SkillOperationError('resource-limit', 'The remote archive expands beyond its limit.');
      }
      await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
      const readStream = await zipFile.openReadStreamPromise(entry);
      if (kind === 'symbolic-link') {
        const linkContent = await readBoundedStream(
          readStream,
          policy.maxFileBytes,
          policy.maxExtractedBytes - byteLength,
        );
        if (linkContent.length !== entry.uncompressedSize) {
          throw new SkillOperationError('content-unavailable', 'The remote archive entry is incomplete.');
        }
        const target = decodeLinkTarget(linkContent);
        assertContainedLinkTarget(destinationRoot, destination, target);
        await symlink(target, destination);
        byteLength += linkContent.length;
        continue;
      }
      const fileHandle = await open(destination, 'wx', 0o600);
      let fileBytes = 0;
      try {
        for await (const chunk of readStream) {
          const buffer = Buffer.from(chunk);
          fileBytes += buffer.length;
          if (
            fileBytes > policy.maxFileBytes
            || byteLength + fileBytes > policy.maxExtractedBytes
          ) {
            throw new SkillOperationError(
              'resource-limit',
              'The remote archive expands beyond its limit.',
            );
          }
          await writeAll(fileHandle, buffer);
        }
      } finally {
        await fileHandle.close();
      }
      if (fileBytes !== entry.uncompressedSize) {
        throw new SkillOperationError('content-unavailable', 'The remote archive entry is incomplete.');
      }
      byteLength += fileBytes;
    }
    return { byteLength, entryCount };
  } catch (error) {
    if (error instanceof SkillOperationError) {
      throw error;
    }
    throw new SkillOperationError('content-unavailable', 'The remote archive could not be read.');
  } finally {
    zipFile?.close();
  }
}

function classifyZipEntry(entry: Entry): 'directory' | 'file' | 'symbolic-link' {
  if (entry.isEncrypted() || !entry.canDecodeFileData()) {
    throw new SkillOperationError('content-unavailable', 'The remote archive entry is unsupported.');
  }
  const isNamedDirectory = entry.fileName.endsWith('/');
  const originPlatform = entry.versionMadeBy >>> 8;
  if (originPlatform === 3) {
    const fileType = (entry.externalFileAttributes >>> 16) & 61_440;
    if (![0, 16_384, 32_768, 40_960].includes(fileType)) {
      throw new SkillOperationError('content-unavailable', 'The remote archive contains a special entry.');
    }
    if ((fileType === 16_384) !== isNamedDirectory && fileType !== 0) {
      throw new SkillOperationError('content-unavailable', 'The remote archive entry type is invalid.');
    }
  }
  const hasDosDirectoryFlag = (entry.externalFileAttributes & 0x10) === 0x10;
  if (hasDosDirectoryFlag !== isNamedDirectory && originPlatform !== 3) {
    throw new SkillOperationError('content-unavailable', 'The remote archive entry type is invalid.');
  }
  const unixFileType = (entry.externalFileAttributes >>> 16) & 61_440;
  if (unixFileType === 40_960) {
    return 'symbolic-link';
  }
  return isNamedDirectory ? 'directory' : 'file';
}

function normalizeZipEntryPath(fileName: string, isDirectory: boolean): string {
  const value = isDirectory ? fileName.slice(0, -1) : fileName;
  const segments = value.split('/');
  if (
    value === ''
    || value.startsWith('/')
    || value.includes('\\')
    || value.includes(':')
    || hasControlCharacters(value)
    || Buffer.byteLength(value, 'utf8') > 4096
    || segments.some((segment) => ['', '.', '..'].includes(segment))
  ) {
    throw new SkillOperationError('content-unavailable', 'The remote archive contains an unsafe path.');
  }
  return segments.join(path.sep);
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
    throw new SkillOperationError('content-unavailable', 'Remote content escaped its staging root.');
  }
  return resolvedPath;
}

async function writeOperationMarker(
  operationRoot: string,
  marker: RemoteOperationMarker,
): Promise<void> {
  const markerPath = path.join(operationRoot, 'operation.json');
  const temporaryPath = path.join(operationRoot, 'operation.json.tmp');
  await writeFile(temporaryPath, JSON.stringify(marker), { encoding: 'utf8', mode: 0o600 });
  await rm(markerPath, { force: true });
  await rename(temporaryPath, markerPath);
}

async function readOperationMarker(operationRoot: string): Promise<RemoteOperationMarker> {
  try {
    const marker = JSON.parse(await readFile(path.join(operationRoot, 'operation.json'), 'utf8'));
    if (
      typeof marker !== 'object'
      || marker === null
      || marker.version !== 1
      || marker.kind !== 'remote-acquisition'
      || !['downloading', 'extracting', 'ready'].includes(marker.phase)
      || !Number.isSafeInteger(marker.createdAt)
      || marker.createdAt < 0
    ) {
      throw recoveryError();
    }
    return {
      version: 1,
      kind: 'remote-acquisition',
      phase: marker.phase,
      operationId: parseRecoveryOperationId(marker.operationId),
      createdAt: marker.createdAt,
    };
  } catch (error) {
    if (error instanceof SkillOperationError) {
      throw error;
    }
    throw recoveryError();
  }
}

function parseRecoveryOperationId(value: unknown): string {
  try {
    return parseSkillId(value);
  } catch {
    throw recoveryError();
  }
}

function validatePolicy(policy: SkillRemoteAcquisitionPolicy): SkillRemoteAcquisitionPolicy {
  for (const value of Object.values(policy)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error('Remote acquisition policy is invalid.');
    }
  }
  return policy;
}

function parseContentLength(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
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

async function writeAll(fileHandle: Awaited<ReturnType<typeof open>>, buffer: Buffer): Promise<void> {
  let offset = 0;
  while (offset < buffer.length) {
    const result = await fileHandle.write(buffer, offset, buffer.length - offset, null);
    offset += result.bytesWritten;
  }
}

async function readBoundedStream(
  stream: Readable,
  maxEntryBytes: number,
  remainingBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    byteLength += buffer.length;
    if (byteLength > maxEntryBytes || byteLength > remainingBytes) {
      throw new SkillOperationError('resource-limit', 'The remote archive expands beyond its limit.');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function decodeLinkTarget(content: Buffer): string {
  const target = content.toString('utf8');
  if (
    target === ''
    || target.includes('\0')
    || !Buffer.from(target, 'utf8').equals(content)
    || path.isAbsolute(target)
  ) {
    throw new SkillOperationError('content-unavailable', 'The remote archive contains an unsafe link.');
  }
  return target;
}

function assertContainedLinkTarget(root: string, linkPath: string, target: string): void {
  const resolvedTarget = path.resolve(path.dirname(linkPath), target);
  const containment = path.relative(path.resolve(root), resolvedTarget);
  if (
    containment === '..'
    || containment.startsWith(`..${path.sep}`)
    || path.isAbsolute(containment)
  ) {
    throw new SkillOperationError('content-unavailable', 'The remote archive contains an escaping link.');
  }
}

async function removeTree(targetPath: string): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
}

async function ignoreFailure(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // Recovery handles operation-owned staging left behind after a failed cleanup.
  }
}

function recoveryError(): SkillOperationError {
  return new SkillOperationError(
    'filesystem-unavailable',
    'Remote Skill staging requires recovery.',
  );
}

function toRemoteAcquisitionError(error: unknown): SkillOperationError {
  if (error instanceof SkillOperationError) {
    return error;
  }
  return toSkillOperationError(error);
}
