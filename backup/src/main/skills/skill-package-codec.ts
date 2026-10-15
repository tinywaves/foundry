import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  open,
  readdir,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { Entry as ZipEntry, ZipFile as ZipReader } from 'yauzl';
import { fromBufferPromise as openZipBuffer } from 'yauzl';
import { ZipFile as ZipWriter } from 'yazl';

export const SKILL_PACKAGE_CONTENT_FORMAT = 'foundry-skill-zip-v1';
export const SKILL_PACKAGE_MAX_ENTRIES = 20_000;
export const SKILL_PACKAGE_MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;

const MAX_RELATIVE_PATH_BYTES = 4096;
const FIXED_ZIP_TIMESTAMP = new Date(1980, 0, 1, 0, 0, 0, 0);
const ZIP_UTF8_FLAG = 0x8_00;
const UNIX_DIRECTORY_MODE = 0o04_0755;
const UNIX_REGULAR_FILE_MODE = 0o10_0644;
const UNIX_EXECUTABLE_FILE_MODE = 0o10_0755;
const UNIX_SYMBOLIC_LINK_MODE = 0o12_0777;
const UNIX_FILE_TYPE_MASK = 0o17_0000;

export type SkillPackageCodecErrorCode
  = | 'invalid-archive'
    | 'invalid-root'
    | 'resource-limit'
    | 'unsafe-path'
    | 'unsupported-entry';

export class SkillPackageCodecError extends Error {
  constructor(
    readonly code: SkillPackageCodecErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SkillPackageCodecError';
  }
}

export interface SkillPackageCodecLimits {
  maxEntries: number;
  maxUncompressedBytes: number;
}

export type SkillPackageLogicalEntry
  = | {
    kind: 'directory';
    relativePath: string;
  }
  | {
    kind: 'file';
    relativePath: string;
    content: Buffer;
    executable: boolean;
  }
  | {
    kind: 'symbolic-link';
    relativePath: string;
    target: Buffer;
  };

export interface EncodedSkillPackage {
  format: typeof SKILL_PACKAGE_CONTENT_FORMAT;
  content: Buffer;
  fingerprint: string;
  entryCount: number;
  uncompressedBytes: number;
}

export interface InspectedSkillPackage {
  format: typeof SKILL_PACKAGE_CONTENT_FORMAT;
  entries: SkillPackageLogicalEntry[];
  fingerprint: string;
  entryCount: number;
  uncompressedBytes: number;
}

export interface InspectSkillPackageOptions {
  expectedFingerprint?: string;
  limits?: Partial<SkillPackageCodecLimits>;
}

export interface MaterializeSkillPackageOptions extends InspectSkillPackageOptions {}

const defaultLimits: SkillPackageCodecLimits = {
  maxEntries: SKILL_PACKAGE_MAX_ENTRIES,
  maxUncompressedBytes: SKILL_PACKAGE_MAX_UNCOMPRESSED_BYTES,
};

export async function encodeSkillPackage(
  packageRoot: string,
  limitsValue?: Partial<SkillPackageCodecLimits>,
): Promise<EncodedSkillPackage> {
  const limits = parseLimits(limitsValue);
  const entries = await readSkillPackageTree(packageRoot, limits);
  const uncompressedBytes = getUncompressedBytes(entries);
  const writer = new ZipWriter();
  const contentPromise = collectZipOutput(writer);

  try {
    for (const entry of entries) {
      const options = {
        mtime: FIXED_ZIP_TIMESTAMP,
        forceDosTimestamp: true,
      };
      if (entry.kind === 'directory') {
        writer.addEmptyDirectory(`${entry.relativePath}/`, {
          ...options,
          mode: UNIX_DIRECTORY_MODE,
        });
      } else if (entry.kind === 'file') {
        writer.addBuffer(entry.content, entry.relativePath, {
          ...options,
          mode: entry.executable ? UNIX_EXECUTABLE_FILE_MODE : UNIX_REGULAR_FILE_MODE,
          compressionLevel: 9,
        });
      } else {
        writer.addBuffer(entry.target, entry.relativePath, {
          ...options,
          mode: UNIX_SYMBOLIC_LINK_MODE,
          compress: false,
        });
      }
    }
    writer.end({ forceZip64Format: false, comment: '' });
    const content = await contentPromise;
    return {
      format: SKILL_PACKAGE_CONTENT_FORMAT,
      content,
      fingerprint: fingerprintSkillPackageEntries(entries),
      entryCount: entries.length,
      uncompressedBytes,
    };
  } catch (error) {
    if (error instanceof SkillPackageCodecError) {
      throw error;
    }
    throw new SkillPackageCodecError(
      'invalid-root',
      'The Skill Package could not be encoded.',
      { cause: error },
    );
  }
}

export async function inspectSkillPackage(
  contentValue: Uint8Array,
  options: InspectSkillPackageOptions = {},
): Promise<InspectedSkillPackage> {
  const limits = parseLimits(options.limits);
  const content = Buffer.from(contentValue);
  let reader: ZipReader | undefined;

  try {
    reader = await openZipBuffer(content, {
      autoClose: false,
      decodeStrings: true,
      lazyEntries: true,
      strictFileNames: true,
      validateEntrySizes: true,
    });
    if (reader.entryCount > limits.maxEntries) {
      throw resourceLimitError('The Skill Package contains too many entries.');
    }

    const entries: SkillPackageLogicalEntry[] = [];
    const seenPaths = new Set<string>();
    let uncompressedBytes = 0;
    for await (const zipEntry of reader.eachEntry()) {
      if (entries.length >= limits.maxEntries) {
        throw resourceLimitError('The Skill Package contains too many entries.');
      }
      const kind = classifyZipEntry(zipEntry);
      const relativePath = parseZipEntryPath(zipEntry, kind);
      const pathKey = normalizePathKey(relativePath);
      if (seenPaths.has(pathKey)) {
        throw new SkillPackageCodecError(
          'unsafe-path',
          'The Skill Package contains duplicate normalized paths.',
        );
      }
      seenPaths.add(pathKey);

      if (kind === 'directory') {
        if (zipEntry.uncompressedSize !== 0 || zipEntry.compressedSize !== 0) {
          throw invalidArchiveError('A Skill Package directory contains unexpected data.');
        }
        entries.push({ kind, relativePath });
        continue;
      }

      assertBoundedEntrySize(zipEntry.uncompressedSize, uncompressedBytes, limits);
      const entryContent = await readZipEntry(reader, zipEntry, limits.maxUncompressedBytes);
      if (entryContent.length !== zipEntry.uncompressedSize) {
        throw invalidArchiveError('A Skill Package entry has an invalid size.');
      }
      if (crc32(entryContent) !== (zipEntry.crc32 >>> 0)) {
        throw invalidArchiveError('A Skill Package entry failed its CRC check.');
      }
      uncompressedBytes += entryContent.length;
      if (kind === 'file') {
        entries.push({
          kind,
          relativePath,
          content: entryContent,
          executable: getUnixMode(zipEntry) === UNIX_EXECUTABLE_FILE_MODE,
        });
      } else {
        if (entryContent.length === 0 || entryContent.includes(0)) {
          throw invalidArchiveError('A Skill Package symbolic link target is invalid.');
        }
        entries.push({ kind, relativePath, target: entryContent });
      }
    }

    sortLogicalEntries(entries);
    assertCanonicalTree(entries);
    const fingerprint = fingerprintSkillPackageEntries(entries);
    if (
      options.expectedFingerprint !== undefined
      && fingerprint !== options.expectedFingerprint
    ) {
      throw invalidArchiveError('The Skill Package fingerprint does not match its content.');
    }
    return {
      format: SKILL_PACKAGE_CONTENT_FORMAT,
      entries,
      fingerprint,
      entryCount: entries.length,
      uncompressedBytes,
    };
  } catch (error) {
    if (error instanceof SkillPackageCodecError) {
      throw error;
    }
    throw invalidArchiveError('The Skill Package archive could not be read.', error);
  } finally {
    reader?.close();
  }
}

export async function materializeSkillPackage(
  content: Uint8Array,
  destinationRoot: string,
  options: MaterializeSkillPackageOptions = {},
): Promise<InspectedSkillPackage> {
  const inspected = await inspectSkillPackage(content, options);
  await materializeInspectedSkillPackage(inspected, destinationRoot);
  return inspected;
}

export async function materializeInspectedSkillPackage(
  inspected: InspectedSkillPackage,
  destinationRoot: string,
): Promise<void> {
  let hasCreatedDestination = false;
  try {
    await mkdir(destinationRoot, { mode: 0o700 });
    hasCreatedDestination = true;
    const directories = inspected.entries
      .filter((entry): entry is Extract<SkillPackageLogicalEntry, { kind: 'directory' }> => (
        entry.kind === 'directory'
      ))
      .toSorted((left, right) => getPathDepth(left.relativePath) - getPathDepth(right.relativePath));
    for (const entry of directories) {
      await mkdir(resolveContainedPath(destinationRoot, entry.relativePath), { mode: 0o755 });
    }
    for (const entry of inspected.entries) {
      if (entry.kind === 'directory') {
        continue;
      }
      const destination = resolveContainedPath(destinationRoot, entry.relativePath);
      if (entry.kind === 'file') {
        const mode = entry.executable ? 0o755 : 0o644;
        await writeFile(destination, entry.content, { flag: 'wx', mode });
        await chmod(destination, mode);
      } else {
        await symlink(entry.target, destination);
      }
    }
    await chmod(destinationRoot, 0o755);
  } catch (error) {
    if (hasCreatedDestination) {
      await rm(destinationRoot, { recursive: true, force: true });
    }
    throw error;
  }
}

export async function fingerprintSkillPackageRoot(
  packageRoot: string,
  limitsValue?: Partial<SkillPackageCodecLimits>,
): Promise<string> {
  const entries = await readSkillPackageTree(packageRoot, parseLimits(limitsValue));
  return fingerprintSkillPackageEntries(entries);
}

export async function fingerprintLegacySkillPackageRoot(
  packageRoot: string,
  limitsValue?: Partial<SkillPackageCodecLimits>,
): Promise<string> {
  const entries = await readSkillPackageTree(packageRoot, parseLimits(limitsValue));
  const hash = createHash('sha256');
  hash.update('foundry-skill-package-v1\0');
  for (const entry of entries) {
    updateFramed(hash, Buffer.from(entry.kind));
    updateFramed(hash, Buffer.from(entry.relativePath));
    if (entry.kind === 'file') {
      updateFramed(hash, entry.content);
    } else if (entry.kind === 'symbolic-link') {
      updateFramed(hash, entry.target);
    }
  }
  return hash.digest('hex');
}

export function fingerprintSkillPackageEntries(entriesValue: SkillPackageLogicalEntry[]): string {
  const entries = [...entriesValue];
  sortLogicalEntries(entries);
  const hash = createHash('sha256');
  hash.update('foundry-skill-package-v2\0');
  for (const entry of entries) {
    updateFramed(hash, Buffer.from(entry.kind));
    updateFramed(hash, Buffer.from(entry.relativePath));
    if (entry.kind === 'file') {
      updateFramed(hash, Buffer.from(entry.executable ? 'executable' : 'regular'));
      updateFramed(hash, entry.content);
    } else if (entry.kind === 'symbolic-link') {
      updateFramed(hash, entry.target);
    }
  }
  return `v2:${hash.digest('hex')}`;
}

async function readSkillPackageTree(
  packageRoot: string,
  limits: SkillPackageCodecLimits,
): Promise<SkillPackageLogicalEntry[]> {
  let resolvedRoot: string;
  try {
    resolvedRoot = await realpath(packageRoot);
    const rootStats = await lstat(resolvedRoot);
    if (!rootStats.isDirectory()) {
      throw new SkillPackageCodecError(
        'invalid-root',
        'Skill Package root must resolve to a directory.',
      );
    }
  } catch (error) {
    if (error instanceof SkillPackageCodecError) {
      throw error;
    }
    throw new SkillPackageCodecError(
      'invalid-root',
      'Skill Package root must resolve to a readable directory.',
      { cause: error },
    );
  }

  const entries: SkillPackageLogicalEntry[] = [];
  const seenPaths = new Set<string>();
  let uncompressedBytes = 0;

  async function visit(relativeDirectory: string): Promise<void> {
    const absoluteDirectory = resolveContainedPath(resolvedRoot, relativeDirectory);
    const children = await readdir(absoluteDirectory, {
      encoding: 'buffer',
      withFileTypes: true,
    });
    for (const child of children) {
      const name = decodeUtf8(child.name, 'Skill Package paths must be valid UTF-8.');
      const relativePath = relativeDirectory === '' ? name : `${relativeDirectory}/${name}`;
      validateRelativePath(relativePath);
      const pathKey = normalizePathKey(relativePath);
      if (seenPaths.has(pathKey)) {
        throw new SkillPackageCodecError(
          'unsafe-path',
          'The Skill Package contains duplicate normalized paths.',
        );
      }
      seenPaths.add(pathKey);
      if (entries.length >= limits.maxEntries) {
        throw resourceLimitError('The Skill Package contains too many entries.');
      }

      const absolutePath = resolveContainedPath(resolvedRoot, relativePath);
      const stats = await lstat(absolutePath);
      if (stats.isDirectory()) {
        entries.push({ kind: 'directory', relativePath });
        await visit(relativePath);
      } else if (stats.isFile()) {
        const content = await readRegularFileWithoutFollowing(absolutePath);
        assertBoundedEntrySize(content.length, uncompressedBytes, limits);
        uncompressedBytes += content.length;
        entries.push({
          kind: 'file',
          relativePath,
          content,
          executable: (stats.mode & 0o111) !== 0,
        });
      } else if (stats.isSymbolicLink()) {
        const target = await readlink(absolutePath, { encoding: 'buffer' });
        assertBoundedEntrySize(target.length, uncompressedBytes, limits);
        uncompressedBytes += target.length;
        entries.push({ kind: 'symbolic-link', relativePath, target });
      } else {
        throw new SkillPackageCodecError(
          'unsupported-entry',
          `Unsupported Skill Package entry: ${relativePath}`,
        );
      }
    }
  }

  try {
    await visit('');
  } catch (error) {
    if (error instanceof SkillPackageCodecError) {
      throw error;
    }
    throw new SkillPackageCodecError(
      'invalid-root',
      'The Skill Package tree could not be read safely.',
      { cause: error },
    );
  }
  sortLogicalEntries(entries);
  assertCanonicalTree(entries);
  return entries;
}

async function readRegularFileWithoutFollowing(filePath: string): Promise<Buffer> {
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new SkillPackageCodecError(
        'unsupported-entry',
        'A Skill Package file changed type while being read.',
      );
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

function classifyZipEntry(entry: ZipEntry): SkillPackageLogicalEntry['kind'] {
  if (entry.isEncrypted() || !entry.canDecodeFileData()) {
    throw new SkillPackageCodecError(
      'unsupported-entry',
      'The Skill Package archive entry uses unsupported encoding.',
    );
  }
  if ((entry.versionMadeBy >>> 8) !== 3) {
    throw new SkillPackageCodecError(
      'unsupported-entry',
      'The Skill Package archive entry has no valid Unix mode.',
    );
  }
  const mode = getUnixMode(entry);
  const fileType = mode & UNIX_FILE_TYPE_MASK;
  const isNamedDirectory = entry.fileName.endsWith('/');
  if (mode === UNIX_DIRECTORY_MODE && fileType === (UNIX_DIRECTORY_MODE & UNIX_FILE_TYPE_MASK)) {
    if (!isNamedDirectory) {
      throw invalidArchiveError('A Skill Package directory entry has an invalid path.');
    }
    return 'directory';
  }
  if (
    [UNIX_REGULAR_FILE_MODE, UNIX_EXECUTABLE_FILE_MODE].includes(mode)
    && fileType === (UNIX_REGULAR_FILE_MODE & UNIX_FILE_TYPE_MASK)
  ) {
    if (isNamedDirectory) {
      throw invalidArchiveError('A Skill Package file entry has an invalid path.');
    }
    return 'file';
  }
  if (mode === UNIX_SYMBOLIC_LINK_MODE) {
    if (isNamedDirectory) {
      throw invalidArchiveError('A Skill Package link entry has an invalid path.');
    }
    return 'symbolic-link';
  }
  throw new SkillPackageCodecError(
    'unsupported-entry',
    'The Skill Package archive contains an unsupported entry type or mode.',
  );
}

function parseZipEntryPath(
  entry: ZipEntry,
  kind: SkillPackageLogicalEntry['kind'],
): string {
  const rawName = entry.fileNameRaw;
  const decodedName = decodeUtf8(rawName, 'Skill Package archive paths must be valid UTF-8.');
  if (
    entry.fileName !== decodedName
    || ((entry.generalPurposeBitFlag & ZIP_UTF8_FLAG) === 0 && !isAscii(rawName))
  ) {
    throw new SkillPackageCodecError(
      'unsafe-path',
      'The Skill Package archive path encoding is invalid.',
    );
  }
  const relativePath = kind === 'directory'
    ? decodedName.slice(0, -1)
    : decodedName;
  validateRelativePath(relativePath);
  return relativePath;
}

function validateRelativePath(value: string): void {
  const segments = value.split('/');
  if (
    value === ''
    || value.startsWith('/')
    || value.includes('\\')
    || value.includes(':')
    || hasControlCharacters(value)
    || Buffer.byteLength(value, 'utf8') > MAX_RELATIVE_PATH_BYTES
    || segments.some((segment) => ['', '.', '..'].includes(segment))
  ) {
    throw new SkillPackageCodecError(
      'unsafe-path',
      'The Skill Package contains an unsafe path.',
    );
  }
}

function assertCanonicalTree(entries: SkillPackageLogicalEntry[]): void {
  const entriesByPath = new Map(entries.map((entry) => [entry.relativePath, entry]));
  const manifest = entriesByPath.get('SKILL.md');
  if (manifest?.kind !== 'file') {
    throw new SkillPackageCodecError(
      'invalid-root',
      'The Skill Package root must contain a regular SKILL.md file.',
    );
  }
  for (const entry of entries) {
    const segments = entry.relativePath.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      const parent = entriesByPath.get(segments.slice(0, index).join('/'));
      if (parent?.kind !== 'directory') {
        throw invalidArchiveError('A Skill Package entry has no explicit parent directory.');
      }
    }
  }
}

async function readZipEntry(
  reader: ZipReader,
  entry: ZipEntry,
  maxBytes: number,
): Promise<Buffer> {
  const stream = await reader.openReadStreamPromise(entry);
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    byteLength += buffer.length;
    if (byteLength > entry.uncompressedSize || byteLength > maxBytes) {
      throw resourceLimitError('A Skill Package archive entry expands beyond its limit.');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, byteLength);
}

function collectZipOutput(writer: ZipWriter): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let byteLength = 0;
    writer.once('error', reject);
    writer.outputStream.on('data', (chunk) => {
      const buffer = Buffer.from(chunk);
      byteLength += buffer.length;
      chunks.push(buffer);
    });
    writer.outputStream.once('error', reject);
    writer.outputStream.once('end', () => resolve(Buffer.concat(chunks, byteLength)));
  });
}

function parseLimits(value: Partial<SkillPackageCodecLimits> | undefined): SkillPackageCodecLimits {
  const limits = { ...defaultLimits, ...value };
  if (
    !Number.isSafeInteger(limits.maxEntries)
    || limits.maxEntries < 1
    || limits.maxEntries > SKILL_PACKAGE_MAX_ENTRIES
    || !Number.isSafeInteger(limits.maxUncompressedBytes)
    || limits.maxUncompressedBytes < 1
    || limits.maxUncompressedBytes > SKILL_PACKAGE_MAX_UNCOMPRESSED_BYTES
  ) {
    throw new SkillPackageCodecError('resource-limit', 'Skill Package codec limits are invalid.');
  }
  return limits;
}

function assertBoundedEntrySize(
  entryBytes: number,
  currentBytes: number,
  limits: SkillPackageCodecLimits,
): void {
  if (
    !Number.isSafeInteger(entryBytes)
    || entryBytes < 0
    || entryBytes > limits.maxUncompressedBytes - currentBytes
  ) {
    throw resourceLimitError('The Skill Package expands beyond its size limit.');
  }
}

function getUncompressedBytes(entries: SkillPackageLogicalEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.kind === 'file') {
      total += entry.content.length;
    } else if (entry.kind === 'symbolic-link') {
      total += entry.target.length;
    }
  }
  return total;
}

function getUnixMode(entry: ZipEntry): number {
  return (entry.externalFileAttributes >>> 16) & 0xFF_FF;
}

function sortLogicalEntries(entries: SkillPackageLogicalEntry[]): void {
  entries.sort((left, right) => Buffer.compare(
    Buffer.from(left.relativePath),
    Buffer.from(right.relativePath),
  ));
}

function normalizePathKey(value: string): string {
  return value.normalize('NFC').toLowerCase();
}

function resolveContainedPath(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...relativePath.split('/'));
  const containment = path.relative(resolvedRoot, resolvedPath);
  if (
    containment === '..'
    || containment.startsWith(`..${path.sep}`)
    || path.isAbsolute(containment)
  ) {
    throw new SkillPackageCodecError(
      'unsafe-path',
      'The Skill Package path escaped its root.',
    );
  }
  return resolvedPath;
}

function decodeUtf8(value: Buffer, message: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(value);
  } catch (error) {
    throw new SkillPackageCodecError('unsafe-path', message, { cause: error });
  }
}

function isAscii(value: Buffer): boolean {
  return value.every((byte) => byte < 0x80);
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1F || codePoint === 0x7F)) {
      return true;
    }
  }
  return false;
}

function getPathDepth(value: string): number {
  return value.split('/').length;
}

function updateFramed(hash: ReturnType<typeof createHash>, value: Buffer): void {
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(value.length));
  hash.update(length);
  hash.update(value);
}

function resourceLimitError(message: string): SkillPackageCodecError {
  return new SkillPackageCodecError('resource-limit', message);
}

function invalidArchiveError(message: string, cause?: unknown): SkillPackageCodecError {
  return new SkillPackageCodecError('invalid-archive', message, { cause });
}

function crc32(value: Buffer): number {
  let crc = 0xFF_FF_FF_FF;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xED_B8_83_20 : 0);
    }
  }
  return (crc ^ 0xFF_FF_FF_FF) >>> 0;
}
