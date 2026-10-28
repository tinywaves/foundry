import Database from 'better-sqlite3';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, mkdirSync, rmSync } from 'node:fs';
import {
  chmod,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  CURRENT_DATABASE_SCHEMA_VERSION,
  openFoundryDatabase,
  readDatabaseSchemaVersion,
} from '../../storage/database';
import type { FoundryDatabase } from '../../storage/database';
import { captures, providers, scrapeJobs } from '../../storage/schema';
import { readStoredSettings, writeSettings } from '../settings/repository';
import type { ScrapeJobRunner } from '../captures/runner';
import {
  DATA_EXPORT_SETTINGS_VERSION,
} from './contracts';
import type {
  DataTransferStatus,
  ExportOutcome,
  ImportPreview,
} from './contracts';
import { createFoundryArchive, extractFoundryArchive } from './archive';
import { decryptExportFile, encryptExportFile } from './crypto';
import { DataTransferError } from './errors';
import {
  DATABASE_ENTRY_PATH,
  MANIFEST_ENTRY_PATH,
  parseExportManifest,
  SETTINGS_ENTRY_PATH,
} from './format';
import type { ExportManifest, FileRecord } from './format';

interface StagedImport {
  databasePath: string;
  directory: string;
  preview: ImportPreview;
  settingsPath: string;
}

export class DataTransferService {
  private busy = false;
  private readonly stagedImports = new Map<string, StagedImport>();

  constructor(
    private readonly database: FoundryDatabase,
    private readonly settingsPath: string,
    private readonly runner: ScrapeJobRunner,
    private readonly temporaryRoot: string,
    private readonly appVersion: string,
  ) {}

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.busy) {
      throw new DataTransferError('BUSY', 'Another data transfer is in progress');
    }

    this.busy = true;
    try {
      return await operation();
    } finally {
      this.busy = false;
    }
  }

  private async createWorkDirectory(prefix: string): Promise<string> {
    await mkdir(this.temporaryRoot, { recursive: true, mode: 0o700 });
    await ensureDirectoryMode(this.temporaryRoot);
    const directory = path.join(this.temporaryRoot, `${prefix}-${randomUUID()}`);
    await mkdir(directory, { recursive: false, mode: 0o700 });
    await ensureDirectoryMode(directory);
    return directory;
  }

  private async clearStagedImports(): Promise<void> {
    const staged = this.stagedImports.values().toArray();
    this.stagedImports.clear();
    await Promise.all(staged.map((item) => this.removeQuietly(item.directory)));
  }

  private async removeQuietly(targetPath: string): Promise<void> {
    try {
      await rm(targetPath, { recursive: true, force: true });
    } catch {}
  }

  cleanupStaleTransfers(): void {
    rmSync(this.temporaryRoot, { recursive: true, force: true });
    mkdirSync(this.temporaryRoot, { recursive: true, mode: 0o700 });
    this.stagedImports.clear();
  }

  getStatus(): DataTransferStatus {
    return {
      activeJobCount: countActiveJobs(this.database.db),
      isBusy: this.busy,
    };
  }

  async createExport(passphrase: string): Promise<ExportOutcome> {
    assertPassphrase(passphrase);

    return this.runExclusive(async () => {
      const workDirectory = await this.createWorkDirectory('export');
      const databaseSnapshotPath = path.join(workDirectory, 'foundry.sqlite');
      const settingsSnapshotPath = path.join(workDirectory, SETTINGS_ENTRY_PATH);
      const manifestPath = path.join(workDirectory, MANIFEST_ENTRY_PATH);
      const archivePath = path.join(workDirectory, 'foundry.zip');
      const destinationPath = path.join(
        this.temporaryRoot,
        `foundry-${Date.now()}.foundry-backup`,
      );

      this.runner.pause();
      try {
        assertNoActiveJobs(this.database.db);
        await this.database.client.backup(databaseSnapshotPath);
        await ensureFileMode(databaseSnapshotPath);
        writeSettings(readStoredSettings(this.settingsPath), settingsSnapshotPath);
        await ensureFileMode(settingsSnapshotPath);

        const recordCounts = countRecords(this.database.db);
        const schemaVersion = readDatabaseSchemaVersion(databaseSnapshotPath);
        if (schemaVersion !== CURRENT_DATABASE_SCHEMA_VERSION) {
          throw new DataTransferError(
            'IO_ERROR',
            'The database snapshot has an unexpected schema version',
          );
        }

        const manifest: ExportManifest = {
          format: 'foundry.snapshot',
          archiveVersion: 1,
          appVersion: this.appVersion,
          createdAt: new Date().toISOString(),
          database: {
            ...await fileRecord(databaseSnapshotPath, DATABASE_ENTRY_PATH),
            schemaVersion,
          },
          settings: {
            ...await fileRecord(settingsSnapshotPath, SETTINGS_ENTRY_PATH),
            version: DATA_EXPORT_SETTINGS_VERSION,
          },
        };
        await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
          mode: 0o600,
        });
        await createFoundryArchive([
          { entryPath: MANIFEST_ENTRY_PATH, filePath: manifestPath },
          { entryPath: DATABASE_ENTRY_PATH, filePath: databaseSnapshotPath },
          { entryPath: SETTINGS_ENTRY_PATH, filePath: settingsSnapshotPath },
        ], archivePath);
        await encryptExportFile(archivePath, destinationPath, passphrase);
        await ensureFileMode(destinationPath);

        return {
          filePath: destinationPath,
          providerCount: recordCounts.providers,
          captureCount: recordCounts.captures,
          jobCount: recordCounts.jobs,
        };
      } finally {
        this.runner.resume();
        await this.removeQuietly(workDirectory);
      }
    });
  }

  async inspectImport(sourcePath: string, passphrase: string): Promise<ImportPreview> {
    assertPassphrase(passphrase);

    return this.runExclusive(async () => {
      assertNoActiveJobs(this.database.db);
      await this.clearStagedImports();

      const importId = randomUUID();
      const directory = await this.createWorkDirectory(`import-${importId}`);
      const zipPath = path.join(directory, 'archive.zip');
      const extractedDirectory = path.join(directory, 'extracted');
      let stagedDatabase: FoundryDatabase | undefined;

      try {
        await mkdir(extractedDirectory, { recursive: false, mode: 0o700 });
        await decryptExportFile(sourcePath, zipPath, passphrase);
        const extracted = await extractFoundryArchive(zipPath, extractedDirectory);
        const manifest = parseExportManifest(JSON.parse(
          await readFile(extracted[MANIFEST_ENTRY_PATH], 'utf8'),
        ) as unknown);

        if (manifest.database.schemaVersion > CURRENT_DATABASE_SCHEMA_VERSION) {
          throw new DataTransferError(
            'NEWER_SCHEMA',
            'The archive was created by a newer Foundry version',
          );
        }

        const databasePath = extracted[DATABASE_ENTRY_PATH];
        const importedSettingsPath = extracted[SETTINGS_ENTRY_PATH];
        await assertFileRecord(databasePath, manifest.database);
        await assertFileRecord(importedSettingsPath, manifest.settings);

        const storedSchemaVersion = readDatabaseSchemaVersion(databasePath);
        if (storedSchemaVersion !== manifest.database.schemaVersion) {
          throw new DataTransferError(
            'INVALID_ARCHIVE',
            'The archived database schema does not match its manifest',
          );
        }

        assertDatabaseIntegrity(databasePath);
        readStoredSettings(importedSettingsPath);
        stagedDatabase = openFoundryDatabase(databasePath);
        assertNoActiveJobs(stagedDatabase.db);
        validateCapturePointers(stagedDatabase.db);
        validateArchiveRows(stagedDatabase.db);
        const recordCounts = countRecords(stagedDatabase.db);

        const preview: ImportPreview = {
          importId,
          fileName: path.basename(sourcePath),
          exportedAt: manifest.createdAt,
          appVersion: manifest.appVersion,
          databaseSchemaVersion: manifest.database.schemaVersion,
          settingsVersion: manifest.settings.version,
          providerCount: recordCounts.providers,
          captureCount: recordCounts.captures,
          jobCount: recordCounts.jobs,
        };
        this.stagedImports.set(importId, {
          databasePath,
          directory,
          preview,
          settingsPath: importedSettingsPath,
        });
        await rm(zipPath, { force: true });
        return preview;
      } catch (error) {
        this.stagedImports.delete(importId);
        await this.removeQuietly(directory);
        throw error instanceof DataTransferError
          ? error
          : new DataTransferError(
              'INVALID_ARCHIVE',
              'The Foundry export could not be inspected',
              { cause: error },
            );
      } finally {
        stagedDatabase?.client.close();
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
      throw new DataTransferError(
        'IMPORT_NOT_FOUND',
        'The import session has expired',
      );
    }

    return this.runExclusive(async () => {
      this.runner.pause();
      const previousSettings = readStoredSettings(this.settingsPath);
      let isSettingsWritten = false;

      try {
        assertNoActiveJobs(this.database.db);
        const stagedDatabase = openFoundryDatabase(staged.databasePath);

        try {
          assertNoActiveJobs(stagedDatabase.db);
          validateCapturePointers(stagedDatabase.db);
          validateArchiveRows(stagedDatabase.db);

          const providerRows = stagedDatabase.db.select().from(providers).all();
          const captureRows = stagedDatabase.db.select().from(captures).all();
          const jobRows = stagedDatabase.db.select().from(scrapeJobs).all();
          const importedSettings = readStoredSettings(staged.settingsPath);

          writeSettings(importedSettings, this.settingsPath);
          isSettingsWritten = true;
          this.database.db.transaction((tx) => {
            tx.delete(scrapeJobs).run();
            tx.delete(captures).run();
            tx.delete(providers).run();
            if (providerRows.length > 0) {
              tx.insert(providers).values(providerRows).run();
            }
            if (captureRows.length > 0) {
              tx.insert(captures).values(captureRows).run();
            }
            if (jobRows.length > 0) {
              tx.insert(scrapeJobs).values(jobRows).run();
            }
          });
        } finally {
          stagedDatabase.client.close();
        }

        this.stagedImports.delete(importId);
        await this.removeQuietly(staged.directory);
      } catch (error) {
        if (isSettingsWritten) {
          writeSettings(previousSettings, this.settingsPath);
        }
        throw error;
      } finally {
        this.runner.resume();
        this.runner.notifySettingsChanged();
      }
    });
  }

  async removeExportFile(filePath: string): Promise<void> {
    if (path.dirname(filePath) !== this.temporaryRoot) {
      return;
    }
    await rm(filePath, { force: true });
  }
}

function assertPassphrase(passphrase: string): void {
  if (passphrase.length === 0) {
    throw new DataTransferError('PASSPHRASE_REQUIRED', 'Enter a passphrase');
  }
}

function countActiveJobs(db: FoundryDatabase['db']): number {
  return db
    .select({ total: count() })
    .from(scrapeJobs)
    .where(and(
      inArray(scrapeJobs.status, ['pending', 'running']),
      isNull(scrapeJobs.deletedAt),
    ))
    .get()
    ?.total ?? 0;
}

function assertNoActiveJobs(db: FoundryDatabase['db']): void {
  if (countActiveJobs(db) > 0) {
    throw new DataTransferError(
      'ACTIVE_JOBS',
      'Finish active scrape jobs before transferring data',
    );
  }
}

function countRecords(db: FoundryDatabase['db']) {
  return {
    providers: db.select({ total: count() }).from(providers).get()?.total ?? 0,
    captures: db.select({ total: count() }).from(captures).get()?.total ?? 0,
    jobs: db.select({ total: count() }).from(scrapeJobs).get()?.total ?? 0,
  };
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function fileRecord(filePath: string, entryPath: string): Promise<FileRecord> {
  const fileStats = await stat(filePath);
  return {
    path: entryPath,
    bytes: fileStats.size,
    sha256: await sha256File(filePath),
  };
}

async function assertFileRecord(filePath: string, record: FileRecord): Promise<void> {
  const fileStats = await stat(filePath);
  if (
    fileStats.size !== record.bytes
    || await sha256File(filePath) !== record.sha256
  ) {
    throw new DataTransferError(
      'INVALID_ARCHIVE',
      'An archived file failed its integrity validation',
    );
  }
}

function assertDatabaseIntegrity(databasePath: string): void {
  const client = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  try {
    if (client.pragma('integrity_check', { simple: true }) !== 'ok') {
      throw new DataTransferError(
        'INVALID_ARCHIVE',
        'The archived database failed its integrity check',
      );
    }
    if ((client.pragma('foreign_key_check') as unknown[]).length > 0) {
      throw new DataTransferError(
        'INVALID_ARCHIVE',
        'The archived database contains invalid references',
      );
    }
  } finally {
    client.close();
  }
}

function validateCapturePointers(db: FoundryDatabase['db']): void {
  for (const capture of db.select().from(captures).all()) {
    if (!capture.latestSuccessfulJobId || capture.deletedAt) {
      continue;
    }
    const job = db
      .select({
        captureId: scrapeJobs.captureId,
        status: scrapeJobs.status,
      })
      .from(scrapeJobs)
      .where(eq(scrapeJobs.id, capture.latestSuccessfulJobId))
      .get();
    if (job?.captureId !== capture.id || job.status !== 'succeeded') {
      throw new DataTransferError(
        'INVALID_ARCHIVE',
        'A capture points to an invalid successful scrape job',
      );
    }
  }
}

function validateArchiveRows(db: FoundryDatabase['db']): void {
  const protocols = new Set([
    'openai-responses',
    'anthropic-messages',
    'openai-compatible-chat-completions',
  ]);
  const statuses = new Set(['active', 'disabled', 'deleted']);
  const jobStatuses = new Set(['pending', 'running', 'succeeded', 'failed']);
  const fetchers = new Set(['firecrawl', 'deepseek']);

  for (const provider of db.select().from(providers).all()) {
    if (!protocols.has(provider.protocol) || !statuses.has(provider.status)) {
      throw new DataTransferError('INVALID_ARCHIVE', 'A provider record is invalid');
    }
    try {
      if (!Array.isArray(JSON.parse(provider.customModels))) {
        throw new TypeError('Custom models must be an array');
      }
    } catch {
      throw new DataTransferError(
        'INVALID_ARCHIVE',
        'A provider custom model list is invalid',
      );
    }
  }

  for (const capture of db.select().from(captures).all()) {
    try {
      const url = new URL(capture.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported URL protocol');
      }
    } catch {
      throw new DataTransferError('INVALID_ARCHIVE', 'A capture URL is invalid');
    }
  }

  for (const job of db.select().from(scrapeJobs).all()) {
    if (!jobStatuses.has(job.status) || !fetchers.has(job.fetcher)) {
      throw new DataTransferError('INVALID_ARCHIVE', 'A scrape job record is invalid');
    }
  }
}

function ensureDirectoryMode(directory: string): Promise<void> {
  return process.platform === 'win32' ? Promise.resolve() : chmod(directory, 0o700);
}

function ensureFileMode(filePath: string): Promise<void> {
  return process.platform === 'win32' ? Promise.resolve() : chmod(filePath, 0o600);
}
