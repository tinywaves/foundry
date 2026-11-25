import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, mkdirSync, rmSync } from 'node:fs';
import { chmod, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type { FoundryStorage } from '../../storage/store';
import { STORAGE_FORMAT_VERSION } from '../../storage/models';
import type { StorageSnapshot } from '../../storage/models';
import { validateSnapshot } from '../../storage/validation';
import type { FetchJobRunner } from '../captures/runner';
import { DATA_EXPORT_ARCHIVE_VERSION, DATA_EXPORT_SETTINGS_VERSION } from './contracts';
import type { DataTransferStatus, ExportOutcome, ImportPreview } from './contracts';
import { createFoundryArchive, extractFoundryArchive } from './archive';
import { decryptExportFile, encryptExportFile } from './crypto';
import { DataTransferError } from './errors';
import type { WorkspaceMutationGate } from './workspace-mutation';
import { DATA_ENTRY_PATH, MANIFEST_ENTRY_PATH, parseExportManifest } from './format';
import type { ExportManifest, FileRecord } from './format';

interface StagedImport {
  snapshotPath: string;
  directory: string;
  preview: ImportPreview;
}
export interface DataTransferUploadTarget {
  filePath: string;
  cleanup: () => Promise<void>;
}
export class DataTransferService {
  private busy = false;
  private readonly stagedImports = new Map<string, StagedImport>();
  constructor(private readonly storage: FoundryStorage, private readonly runner: FetchJobRunner, private readonly temporaryRoot: string, private readonly appVersion: string, readonly workspaceMutationGate: WorkspaceMutationGate, private readonly onStatusChanged: (status: DataTransferStatus) => void = () => {}) {}
  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.busy || !this.workspaceMutationGate.tryBeginTransfer()) {
      throw new DataTransferError('BUSY', 'Another data transfer is in progress');
    }
    this.busy = true;
    try {
      this.onStatusChanged(this.getStatus());
      return await operation();
    } finally {
      this.busy = false;
      this.workspaceMutationGate.endTransfer();
      this.onStatusChanged(this.getStatus());
    }
  }

  private async createWorkDirectory(prefix: string): Promise<string> {
    await mkdir(this.temporaryRoot, { recursive: true, mode: 0o700 });
    await ensureDirectoryMode(this.temporaryRoot);
    const directory = path.join(this.temporaryRoot, `${prefix}-${randomUUID()}`);
    await mkdir(directory, { mode: 0o700 });
    await ensureDirectoryMode(directory);
    return directory;
  }

  private async removeQuietly(targetPath: string): Promise<void> {
    try {
      await rm(targetPath, { recursive: true, force: true });
    } catch {}
  }

  async createUploadTarget(): Promise<DataTransferUploadTarget> {
    const directory = await this.createWorkDirectory('upload');
    return { filePath: path.join(directory, 'archive.foundry-backup'), cleanup: () => this.removeQuietly(directory) };
  }

  cleanupStaleTransfers(): void {
    rmSync(this.temporaryRoot, { recursive: true, force: true });
    mkdirSync(this.temporaryRoot, { recursive: true, mode: 0o700 });
    this.stagedImports.clear();
  }

  getStatus(): DataTransferStatus {
    return { activeJobCount: this.storage.all('fetchJobs').filter((job) => isActiveJob(job)).length, isBusy: this.busy };
  }

  async createExport(passphrase: string): Promise<ExportOutcome> {
    assertPassphrase(passphrase);
    return this.runExclusive(async () => {
      const directory = await this.createWorkDirectory('export');
      const snapshotPath = path.join(directory, 'foundry.json');
      const manifestPath = path.join(directory, MANIFEST_ENTRY_PATH);
      const archivePath = path.join(directory, 'foundry.zip');
      const destinationPath = path.join(this.temporaryRoot, `foundry-${randomUUID()}.foundry-backup`);
      this.runner.pause();
      try {
        const snapshot = this.storage.snapshot();
        assertNoActiveJobs(snapshot);
        validateSnapshot(snapshot);
        await writeFile(snapshotPath, JSON.stringify(snapshot), { mode: 0o600 });
        const manifest: ExportManifest = {
          format: 'foundry.snapshot',
          archiveVersion: DATA_EXPORT_ARCHIVE_VERSION,
          appVersion: this.appVersion,
          createdAt: new Date().toISOString(),
          data: { ...await fileRecord(snapshotPath, DATA_ENTRY_PATH), formatVersion: STORAGE_FORMAT_VERSION },
        };
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
        await createFoundryArchive([{ entryPath: MANIFEST_ENTRY_PATH, filePath: manifestPath }, { entryPath: DATA_ENTRY_PATH, filePath: snapshotPath }], archivePath);
        await encryptExportFile(archivePath, destinationPath, passphrase);
        return { filePath: destinationPath, ...countRecords(snapshot) };
      } finally {
        this.runner.resume();
        await this.removeQuietly(directory);
      }
    });
  }

  async inspectImport(sourcePath: string, passphrase: string, originalFileName = path.basename(sourcePath)): Promise<ImportPreview> {
    assertPassphrase(passphrase);
    return this.runExclusive(async () => {
      assertNoActiveJobs(this.storage.snapshot());
      const previous = this.stagedImports.values().toArray();
      this.stagedImports.clear();
      await Promise.all(previous.map((item) => this.removeQuietly(item.directory)));
      const importId = randomUUID();
      const directory = await this.createWorkDirectory(`import-${importId}`);
      const zipPath = path.join(directory, 'archive.zip');
      try {
        await decryptExportFile(sourcePath, zipPath, passphrase);
        const extracted = await extractFoundryArchive(zipPath, path.join(directory, 'extracted'));
        const manifest = parseExportManifest(JSON.parse(await readFile(extracted[MANIFEST_ENTRY_PATH], 'utf8')) as unknown);
        if (manifest.data.formatVersion > STORAGE_FORMAT_VERSION) {
          throw new DataTransferError('NEWER_SCHEMA', 'The archive was created by a newer Foundry version');
        }
        const expected = new Set([MANIFEST_ENTRY_PATH, DATA_ENTRY_PATH]);
        await assertFileRecord(extracted[DATA_ENTRY_PATH], manifest.data);
        const snapshot: unknown = JSON.parse(await readFile(extracted[DATA_ENTRY_PATH], 'utf8'));
        validateSnapshot(snapshot);
        if (snapshot.formatVersion !== manifest.data.formatVersion) {
          throw new DataTransferError('INVALID_ARCHIVE', 'The JSON data format does not match its manifest');
        }
        if (Object.keys(extracted).some((entry) => !expected.has(entry))) {
          throw new DataTransferError('INVALID_ARCHIVE', 'Unexpected archive file');
        }
        assertNoActiveJobs(snapshot);
        const snapshotPath = path.join(directory, 'staged.json');
        await writeFile(snapshotPath, JSON.stringify(snapshot), { mode: 0o600 });
        const preview: ImportPreview = {
          importId,
          fileName: path.basename(originalFileName),
          exportedAt: manifest.createdAt,
          appVersion: manifest.appVersion,
          dataFormatVersion: snapshot.formatVersion,
          settingsVersion: DATA_EXPORT_SETTINGS_VERSION,
          ...countRecords(snapshot),
        };
        this.stagedImports.set(importId, { snapshotPath, directory, preview });
        await rm(zipPath, { force: true });
        return preview;
      } catch (error) {
        await this.removeQuietly(directory);
        if (error instanceof DataTransferError) {
          throw error;
        }
        throw new DataTransferError('INVALID_ARCHIVE', error instanceof Error ? error.message : 'The Foundry export could not be inspected', { cause: error });
      }
    });
  }

  async cancelImport(importId: string): Promise<void> {
    const staged = this.stagedImports.get(importId);
    if (!staged) {
      return;
    }
    this.stagedImports.delete(importId);
    await this.removeQuietly(staged.directory);
  }

  async commitImport(importId: string): Promise<void> {
    const staged = this.stagedImports.get(importId);
    if (!staged) {
      throw new DataTransferError('IMPORT_NOT_FOUND', 'The import session has expired');
    }
    return this.runExclusive(async () => {
      this.runner.pause();
      try {
        const snapshot: unknown = JSON.parse(await readFile(staged.snapshotPath, 'utf8'));
        validateSnapshot(snapshot);
        assertNoActiveJobs(snapshot);
        this.storage.transaction(() => {
          assertNoActiveJobs(this.storage.snapshot());
          this.storage.replace(snapshot);
        });
        this.stagedImports.delete(importId);
        await this.removeQuietly(staged.directory);
      } finally {
        this.runner.resume();
        this.runner.notifySettingsChanged();
      }
    });
  }

  async removeExportFile(filePath: string): Promise<void> {
    if (path.dirname(filePath) === this.temporaryRoot) {
      await rm(filePath, { force: true });
    }
  }
}
function assertPassphrase(value: string): void {
  if (!value) {
    throw new DataTransferError('PASSPHRASE_REQUIRED', 'Enter a passphrase');
  }
}
function isActiveJob(job: StorageSnapshot['fetchJobs'][number]): boolean {
  return !job.deletedAt && ['pending', 'running'].includes(job.status);
}
function assertNoActiveJobs(snapshot: StorageSnapshot): void {
  if (snapshot.fetchJobs.some((job) => isActiveJob(job))) {
    throw new DataTransferError('ACTIVE_JOBS', 'Finish active fetch jobs before transferring data');
  }
}
function countRecords(snapshot: StorageSnapshot) {
  return {
    providerCount: snapshot.providers.length,
    captureCount: snapshot.captures.length,
    jobCount: snapshot.fetchJobs.length,
  };
}
async function fileRecord(filename: string, entryPath: string): Promise<FileRecord> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) {
    hash.update(chunk);
  }
  const stats = await stat(filename);
  return { path: entryPath, bytes: stats.size, sha256: hash.digest('hex') };
}
async function assertFileRecord(filename: string, record: FileRecord): Promise<void> {
  const actual = await fileRecord(filename, record.path);
  if (actual.bytes !== record.bytes || actual.sha256 !== record.sha256) {
    throw new DataTransferError('INVALID_ARCHIVE', 'An archived file failed its integrity validation');
  }
}
function ensureDirectoryMode(directory: string): Promise<void> {
  return process.platform === 'win32' ? Promise.resolve() : chmod(directory, 0o700);
}
