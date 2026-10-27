import Database from 'better-sqlite3';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  chmod,
  mkdir,
  readFile,
  rename,
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
} from '../database';
import type { FoundryDatabase } from '../database';
import { captures, providers, scrapeJobs } from '../database/schema';
import type { ScrapeJobRunner } from '../library/scrape-job-runner';
import { log } from '../logger';
import { readSettings, writeSettings } from '../settings';
import {
  dataExportSettingsVersion,
} from '../../shared/data-transfer';
import type {
  DataTransferStatus,
  ExportDataOutcome,
  ImportCommitOutcome,
  ImportPreview,
} from '../../shared/data-transfer';
import { createFoundryArchive, extractFoundryArchive } from './archive';
import { decryptExportFile, encryptExportFile } from './crypto';
import { DataTransferError } from './errors';
import {
  databaseEntryPath,
  manifestEntryPath,
  parseExportManifest,
  settingsEntryPath,
} from './format';
import type { ExportFileRecord, ExportManifest } from './format';

type DatabaseState = FoundryDatabase['db'];

type StagedImport = {
  databasePath: string;
  directory: string;
  preview: ImportPreview;
  settingsPath: string;
};

function assertPassphrase(passphrase: string): void {
  if (passphrase.length === 0) {
    throw new DataTransferError(
      'PASSPHRASE_REQUIRED',
      'Enter a passphrase',
    );
  }
}

function activeJobCount(db: DatabaseState): number {
  return db.select({ total: count() })
    .from(scrapeJobs)
    .where(and(
      inArray(scrapeJobs.status, ['pending', 'running']),
      isNull(scrapeJobs.deletedAt),
    ))
    .get()
    ?.total ?? 0;
}

function assertNoActiveJobs(db: DatabaseState): void {
  if (activeJobCount(db) > 0) {
    throw new DataTransferError(
      'ACTIVE_JOBS',
      'Finish active scrape jobs before transferring data',
    );
  }
}

function assertTerminalArchiveJobs(db: DatabaseState): void {
  if (activeJobCount(db) > 0) {
    throw new DataTransferError(
      'ARCHIVE_HAS_ACTIVE_JOBS',
      'The archive contains unfinished scrape jobs',
    );
  }
}

function countRecords(db: DatabaseState) {
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

async function fileRecord(filePath: string, entryPath: string): Promise<ExportFileRecord> {
  const fileStats = await stat(filePath);
  return {
    path: entryPath,
    bytes: fileStats.size,
    sha256: await sha256File(filePath),
  };
}

async function assertFileRecord(filePath: string, record: ExportFileRecord): Promise<void> {
  const fileStats = await stat(filePath);
  if (fileStats.size !== record.bytes) {
    throw new DataTransferError(
      'INVALID_ARCHIVE',
      'An archived file has an unexpected size',
    );
  }
  if (await sha256File(filePath) !== record.sha256) {
    throw new DataTransferError(
      'INVALID_ARCHIVE',
      'An archived file failed its checksum validation',
    );
  }
}

function assertDatabaseIntegrity(databasePath: string): void {
  const client = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  try {
    const integrity = client.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      throw new DataTransferError(
        'INVALID_ARCHIVE',
        'The archived database failed its integrity check',
      );
    }
    const foreignKeyIssues = client.pragma('foreign_key_check') as unknown[];
    if (foreignKeyIssues.length > 0) {
      throw new DataTransferError(
        'INVALID_ARCHIVE',
        'The archived database contains invalid references',
      );
    }
  } finally {
    client.close();
  }
}

function validateCapturePointers(db: DatabaseState): void {
  const rows = db.select({
    id: captures.id,
    latestSuccessfulJobId: captures.latestSuccessfulJobId,
    deletedAt: captures.deletedAt,
  }).from(captures).all();

  for (const row of rows) {
    if (!row.latestSuccessfulJobId || row.deletedAt) {
      continue;
    }
    const job = db.select({
      captureId: scrapeJobs.captureId,
      status: scrapeJobs.status,
    }).from(scrapeJobs).where(eq(scrapeJobs.id, row.latestSuccessfulJobId)).get();
    if (job?.captureId !== row.id || job.status !== 'succeeded') {
      throw new DataTransferError(
        'INVALID_ARCHIVE',
        'A capture points to an invalid successful scrape job',
      );
    }
  }
}

function validateArchiveRows(db: DatabaseState): void {
  const providerProtocols = new Set([
    'openai-responses',
    'anthropic-messages',
    'openai-compatible-chat-completions',
  ]);
  const providerStatuses = new Set(['active', 'disabled', 'deleted']);
  const jobStatuses = new Set(['pending', 'running', 'succeeded', 'failed']);
  const fetchers = new Set(['firecrawl', 'deepseek']);

  for (const provider of db.select().from(providers).all()) {
    if (
      !providerProtocols.has(provider.protocol)
      || !providerStatuses.has(provider.status)
    ) {
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

export class DataTransferService {
  private busy = false;
  private restartRequired = false;
  private readonly stagedImports = new Map<string, StagedImport>();

  constructor(
    private readonly database: FoundryDatabase,
    private readonly settingsPath: string,
    private readonly runner: ScrapeJobRunner,
    private readonly temporaryRoot: string,
    private readonly appVersion: string,
  ) {}

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isBusy()) {
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
    } catch (error) {
      log.warn('data_transfer_cleanup_failed', {
        path: targetPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  isBusy(): boolean {
    return this.busy || this.restartRequired;
  }

  getStatus(): DataTransferStatus {
    return {
      activeJobCount: activeJobCount(this.database.db),
      isBusy: this.isBusy(),
    };
  }

  async cleanupStaleTransfers(): Promise<void> {
    await rm(this.temporaryRoot, { recursive: true, force: true });
    await mkdir(this.temporaryRoot, { recursive: true, mode: 0o700 });
    await ensureDirectoryMode(this.temporaryRoot);
    this.stagedImports.clear();
  }

  async exportData(destinationPath: string, passphrase: string): Promise<ExportDataOutcome> {
    assertPassphrase(passphrase);

    return this.runExclusive(async () => {
      const workDirectory = await this.createWorkDirectory('export');
      const databaseSnapshotPath = path.join(workDirectory, 'foundry.sqlite');
      const settingsSnapshotPath = path.join(workDirectory, 'settings.json');
      const manifestPath = path.join(workDirectory, manifestEntryPath);
      const archivePath = path.join(workDirectory, 'foundry.zip');
      const temporaryOutputPath = path.join(
        path.dirname(destinationPath),
        `.${path.basename(destinationPath)}.${randomUUID()}.tmp`,
      );

      this.runner.pause();
      try {
        assertNoActiveJobs(this.database.db);
        await this.database.client.backup(databaseSnapshotPath);
        await ensureFileMode(databaseSnapshotPath);
        writeSettings(settingsSnapshotPath, readSettings(this.settingsPath));

        const recordCounts = countRecords(this.database.db);
        const databaseSchemaVersion = readDatabaseSchemaVersion(databaseSnapshotPath);
        if (databaseSchemaVersion !== CURRENT_DATABASE_SCHEMA_VERSION) {
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
            ...await fileRecord(databaseSnapshotPath, databaseEntryPath),
            schemaVersion: databaseSchemaVersion,
          },
          settings: {
            ...await fileRecord(settingsSnapshotPath, settingsEntryPath),
            version: dataExportSettingsVersion,
          },
        };
        await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
          mode: 0o600,
        });
        await createFoundryArchive([
          { entryPath: manifestEntryPath, filePath: manifestPath },
          { entryPath: databaseEntryPath, filePath: databaseSnapshotPath },
          { entryPath: settingsEntryPath, filePath: settingsSnapshotPath },
        ], archivePath);
        await encryptExportFile(archivePath, temporaryOutputPath, passphrase);
        await rm(destinationPath, { force: true });
        await rename(temporaryOutputPath, destinationPath);
        await ensureFileMode(destinationPath);

        return {
          status: 'exported' as const,
          filePath: destinationPath,
          providerCount: recordCounts.providers,
          captureCount: recordCounts.captures,
          jobCount: recordCounts.jobs,
        };
      } finally {
        this.runner.resume();
        await this.removeQuietly(temporaryOutputPath);
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
        const manifestJson = JSON.parse(
          await readFile(extracted[manifestEntryPath], 'utf8'),
        ) as unknown;
        const manifest = parseExportManifest(manifestJson);
        if (manifest.database.schemaVersion > CURRENT_DATABASE_SCHEMA_VERSION) {
          throw new DataTransferError(
            'NEWER_SCHEMA',
            'The archive was created by a newer Foundry version',
          );
        }

        const databasePath = extracted[databaseEntryPath];
        const settingsPath = extracted[settingsEntryPath];
        await assertFileRecord(databasePath, manifest.database);
        await assertFileRecord(settingsPath, manifest.settings);

        const storedSchemaVersion = readDatabaseSchemaVersion(databasePath);
        if (storedSchemaVersion !== manifest.database.schemaVersion) {
          throw new DataTransferError(
            'INVALID_ARCHIVE',
            'The archived database schema does not match its manifest',
          );
        }
        assertDatabaseIntegrity(databasePath);

        JSON.parse(await readFile(settingsPath, 'utf8'));
        readSettings(settingsPath);

        stagedDatabase = openFoundryDatabase(databasePath);
        assertTerminalArchiveJobs(stagedDatabase.db);
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
          settingsPath,
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

  async commitImport(importId: string): Promise<ImportCommitOutcome> {
    const staged = this.stagedImports.get(importId);
    if (!staged) {
      throw new DataTransferError('IMPORT_NOT_FOUND', 'The import session has expired');
    }

    return this.runExclusive(async () => {
      this.runner.pause();
      const previousSettings = readSettings(this.settingsPath);
      let isSettingsWritten = false;
      let isDatabaseCommitted = false;
      let stagedDatabase: FoundryDatabase | undefined;

      try {
        assertNoActiveJobs(this.database.db);
        stagedDatabase = openFoundryDatabase(staged.databasePath);
        assertTerminalArchiveJobs(stagedDatabase.db);
        validateCapturePointers(stagedDatabase.db);
        validateArchiveRows(stagedDatabase.db);

        const providerRows = stagedDatabase.db.select().from(providers).all();
        const captureRows = stagedDatabase.db.select().from(captures).all();
        const jobRows = stagedDatabase.db.select().from(scrapeJobs).all();
        const importedSettings = readSettings(staged.settingsPath);

        writeSettings(this.settingsPath, importedSettings);
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
        isDatabaseCommitted = true;
        this.restartRequired = true;
        this.stagedImports.delete(importId);
        await this.removeQuietly(staged.directory);
        return { status: 'imported' as const };
      } catch (error) {
        if (isSettingsWritten && !isDatabaseCommitted) {
          try {
            writeSettings(this.settingsPath, previousSettings);
          } catch (restoreError) {
            log.error('data_transfer_settings_restore_failed', {
              error: restoreError instanceof Error ? restoreError.message : String(restoreError),
            });
          }
        }
        if (!isDatabaseCommitted) {
          this.runner.resume();
        }
        throw error;
      } finally {
        stagedDatabase?.client.close();
      }
    });
  }
}
