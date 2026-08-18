import { Buffer } from 'node:buffer';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import type {
  SkillFileReadResult,
  SkillFileTarget,
  SkillPackageFileEntry,
  SkillRevisionFileTarget,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillMetadataRepository } from './skill-metadata-repository';
import type { SkillStorePaths } from './skill-store-paths';
import {
  parseSkillFileTarget,
  parseSkillId,
  parseSkillRevisionFileTarget,
} from './skill-validation';

const DEFAULT_MAXIMUM_ENTRIES = 10_000;
const DEFAULT_MAXIMUM_READ_BYTES = 1024 * 1024;

interface SkillFileCoordinatorOptions {
  maximumEntries?: number;
  maximumReadBytes?: number;
}

export class SkillFileCoordinator {
  private readonly maximumEntries: number;
  private readonly maximumReadBytes: number;

  constructor(
    private readonly paths: SkillStorePaths,
    private readonly repository: SkillMetadataRepository,
    options: SkillFileCoordinatorOptions = {},
  ) {
    this.maximumEntries = parsePositiveBound(
      options.maximumEntries ?? DEFAULT_MAXIMUM_ENTRIES,
    );
    this.maximumReadBytes = parsePositiveBound(
      options.maximumReadBytes ?? DEFAULT_MAXIMUM_READ_BYTES,
    );
  }

  private getPackageRoot(skillIdValue: unknown): string {
    const skillId = parseSkillId(skillIdValue);
    this.repository.getActivePackage(skillId);
    return path.join(this.paths.packages, skillId);
  }

  private getRevisionRoot(input: SkillRevisionFileTarget): string {
    this.repository.getRevision(input.skillId, input.revisionId);
    return path.join(this.paths.revisions, input.skillId, input.revisionId);
  }

  private async walkDirectory(
    packageRoot: string,
    relativeDirectory: string,
    results: SkillPackageFileEntry[],
  ): Promise<void> {
    const directoryPath = relativeDirectory
      ? path.join(packageRoot, ...relativeDirectory.split('/'))
      : packageRoot;
    const entries = await readdir(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= this.maximumEntries) {
        throw new SkillOperationError(
          'content-unavailable',
          'The Skill Package contains too many file entries to display.',
        );
      }
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const entryPath = path.join(directoryPath, entry.name);
      let entryStats: Awaited<ReturnType<typeof lstat>>;
      try {
        entryStats = await lstat(entryPath);
      } catch {
        results.push({ relativePath, kind: 'unreadable', size: null });
        continue;
      }
      if (entryStats.isSymbolicLink()) {
        results.push({ relativePath, kind: 'symbolic-link', size: null });
        continue;
      }
      if (entryStats.isDirectory()) {
        results.push({ relativePath, kind: 'directory', size: null });
        await this.walkDirectory(packageRoot, relativePath, results);
        continue;
      }
      if (entryStats.isFile()) {
        results.push({ relativePath, kind: 'file', size: entryStats.size });
        continue;
      }
      throw new SkillOperationError(
        'content-unavailable',
        'The Skill Package contains an unsupported file entry.',
      );
    }
  }

  private async readFileFromRoot(
    packageRoot: string,
    input: SkillFileTarget,
  ): Promise<SkillFileReadResult> {
    await assertPackageRoot(packageRoot);
    const resolvedRoot = await realpath(packageRoot);
    let candidate = resolvedRoot;
    const segments = input.relativePath.split('/');
    for (const [index, segment] of segments.entries()) {
      candidate = path.join(candidate, segment);
      let stats: Awaited<ReturnType<typeof lstat>>;
      try {
        stats = await lstat(candidate);
      } catch (error) {
        if (hasFilesystemCode(error, 'ENOENT')) {
          return { status: 'missing', relativePath: input.relativePath, size: null };
        }
        if (isUnreadableFilesystemError(error)) {
          return { status: 'unreadable', relativePath: input.relativePath, size: null };
        }
        throw error;
      }
      const isFinalSegment = index === segments.length - 1;
      if (stats.isSymbolicLink()) {
        if (isFinalSegment) {
          return { status: 'symbolic-link', relativePath: input.relativePath, size: null };
        }
        throw new SkillOperationError('invalid-input', 'Symbolic-link traversal is not allowed.');
      }
      if (!isFinalSegment && !stats.isDirectory()) {
        throw new SkillOperationError('invalid-input', 'The package file path is invalid.');
      }
    }
    let resolvedFile: string;
    try {
      resolvedFile = await realpath(candidate);
    } catch (error) {
      if (hasFilesystemCode(error, 'ENOENT')) {
        return { status: 'missing', relativePath: input.relativePath, size: null };
      }
      if (isUnreadableFilesystemError(error)) {
        return { status: 'unreadable', relativePath: input.relativePath, size: null };
      }
      throw error;
    }
    if (!isContainedPath(resolvedRoot, resolvedFile)) {
      throw new SkillOperationError('invalid-input', 'The package file path is invalid.');
    }
    let file: Awaited<ReturnType<typeof open>>;
    try {
      file = await open(resolvedFile, constants.O_RDONLY | constants.O_NOFOLLOW);
    } catch (error) {
      if (hasFilesystemCode(error, 'ENOENT')) {
        return { status: 'missing', relativePath: input.relativePath, size: null };
      }
      if (isUnreadableFilesystemError(error)) {
        return { status: 'unreadable', relativePath: input.relativePath, size: null };
      }
      throw error;
    }
    try {
      const stats = await file.stat();
      if (!stats.isFile()) {
        throw new SkillOperationError('invalid-input', 'Select a regular package file.');
      }
      if (stats.size > this.maximumReadBytes) {
        return { status: 'oversized', relativePath: input.relativePath, size: stats.size };
      }
      const readResult = await readBoundedFile(file, this.maximumReadBytes);
      if (readResult.status === 'oversized') {
        return {
          status: 'oversized',
          relativePath: input.relativePath,
          size: readResult.size,
        };
      }
      const decoded = decodeUtf8(readResult.content);
      return decoded === null
        ? {
            status: 'binary',
            relativePath: input.relativePath,
            size: readResult.content.byteLength,
          }
        : {
            status: 'text',
            relativePath: input.relativePath,
            content: decoded,
            size: readResult.content.byteLength,
          };
    } catch (error) {
      if (isUnreadableFilesystemError(error)) {
        return { status: 'unreadable', relativePath: input.relativePath, size: null };
      }
      throw error;
    } finally {
      await file.close();
    }
  }

  async listPackageFiles(skillIdValue: unknown): Promise<SkillPackageFileEntry[]> {
    try {
      const packageRoot = this.getPackageRoot(skillIdValue);
      await assertPackageRoot(packageRoot);
      const entries: SkillPackageFileEntry[] = [];
      await this.walkDirectory(packageRoot, '', entries);
      entries.sort((left, right) => Buffer.compare(
        Buffer.from(left.relativePath),
        Buffer.from(right.relativePath),
      ));
      return entries;
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  async readPackageFile(inputValue: unknown): Promise<SkillFileReadResult> {
    try {
      const input = parseSkillFileTarget(inputValue);
      const packageRoot = this.getPackageRoot(input.skillId);
      return await this.readFileFromRoot(packageRoot, input);
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  async listRevisionFiles(
    skillIdValue: unknown,
    revisionIdValue: unknown,
  ): Promise<SkillPackageFileEntry[]> {
    const input = parseSkillRevisionFileTarget({
      skillId: skillIdValue,
      revisionId: revisionIdValue,
      relativePath: 'SKILL.md',
    });
    try {
      const revisionRoot = this.getRevisionRoot(input);
      await assertPackageRoot(revisionRoot);
      const entries: SkillPackageFileEntry[] = [];
      await this.walkDirectory(revisionRoot, '', entries);
      entries.sort((left, right) => Buffer.compare(
        Buffer.from(left.relativePath),
        Buffer.from(right.relativePath),
      ));
      return entries;
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  async readRevisionFile(inputValue: unknown): Promise<SkillFileReadResult> {
    try {
      const input = parseSkillRevisionFileTarget(inputValue);
      return await this.readFileFromRoot(this.getRevisionRoot(input), input);
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }
}

async function assertPackageRoot(packageRoot: string): Promise<void> {
  const stats = await lstat(packageRoot);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new SkillOperationError(
      'content-unavailable',
      'The Store Working Copy is unavailable.',
    );
  }
}

type BoundedFileReadResult
  = | { status: 'complete'; content: Buffer }
    | { status: 'oversized'; size: number };

async function readBoundedFile(
  file: Awaited<ReturnType<typeof open>>,
  maximumBytes: number,
): Promise<BoundedFileReadResult> {
  const chunks: Buffer[] = [];
  let bytesRead = 0;
  while (bytesRead <= maximumBytes) {
    const chunk = Buffer.alloc(Math.min(64 * 1024, maximumBytes + 1 - bytesRead));
    const result = await file.read(chunk, 0, chunk.length, bytesRead);
    if (result.bytesRead === 0) {
      return { status: 'complete', content: Buffer.concat(chunks, bytesRead) };
    }
    chunks.push(chunk.subarray(0, result.bytesRead));
    bytesRead += result.bytesRead;
  }
  const latestStats = await file.stat();
  return { status: 'oversized', size: Math.max(bytesRead, latestStats.size) };
}

function decodeUtf8(content: Buffer): string | null {
  if (content.includes(0)) {
    return null;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    return null;
  }
}

function isContainedPath(rootPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === ''
    || (!path.isAbsolute(relativePath)
      && relativePath !== '..'
      && !relativePath.startsWith(`..${path.sep}`));
}

function parsePositiveBound(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('Skill file bound is invalid.');
  }
  return value;
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}

function isUnreadableFilesystemError(error: unknown): boolean {
  return ['EACCES', 'EPERM', 'EIO'].some((code) => hasFilesystemCode(error, code));
}
