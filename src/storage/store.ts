import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DEFAULT_SETTINGS, normalizeSettings } from '../features/settings/contracts';
import type { FoundrySettings } from '../features/settings/contracts';
import { privateDirectory, syncDirectory, writeJsonAtomic } from './files';
import { STORAGE_FORMAT_VERSION } from './models';
import type { Collections, StorageSnapshot } from './models';

const COLLECTIONS = ['providers', 'captures', 'fetchJobs'] as const;
type Collection = keyof Collections;
interface Change {
  file: string;
  value: unknown;
}
interface Journal {
  changes: Change[];
}
function isAbandonedLock(directory: string): boolean {
  try {
    const owner = JSON.parse(readFileSync(path.join(directory, 'owner.json'), 'utf8')) as {
      pid: unknown;
    };
    if (typeof owner.pid !== 'number' || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) {
      throw new Error('Invalid lock owner');
    }
    try {
      process.kill(owner.pid, 0);
      return false;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ESRCH';
    }
  } catch {
    return Date.now() - statSync(directory).mtimeMs > 30_000;
  }
}
/**
Owns direct JSON file reads, process locking, atomic writes and redo recovery.
*/
export class FoundryStorage {
  private changes: Map<string, unknown> | null = null;
  private closed = false;
  private lockDepth = 0;
  readonly formatVersion = STORAGE_FORMAT_VERSION;
  constructor(readonly path: string) {
    privateDirectory(path);
    for (const collection of COLLECTIONS) {
      privateDirectory(this.collectionPath(collection));
    }
  }

  private collectionPath(collection: Collection): string {
    return path.join(this.path, collection === 'fetchJobs' ? 'fetch-jobs' : collection);
  }

  private recordPath(collection: Collection, id: string): string {
    if (!id || id.length > 200) {
      throw new Error('Invalid storage record ID');
    }
    return path.relative(this.path, path.join(this.collectionPath(collection), `${createHash('sha256').update(id).digest('hex')}.json`));
  }

  private locked<T>(action: () => T): T {
    if (this.closed) {
      throw new Error('Foundry storage is closed');
    }
    if (this.lockDepth > 0) {
      return action();
    }
    const directory = path.join(this.path, '.lock');
    const started = Date.now();
    for (;;) {
      try {
        mkdirSync(directory, { mode: 0o700 });
        try {
          writeFileSync(path.join(directory, 'owner.json'), JSON.stringify({ pid: process.pid }), { mode: 0o600 });
        } catch (error) {
          rmSync(directory, { recursive: true, force: true });
          throw error;
        }
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        this.recoverLock(directory);
        if (Date.now() - started > 10_000) {
          throw new Error('Foundry storage is busy in another process', { cause: error });
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
    }
    try {
      this.recover();
      this.lockDepth = 1;
      return action();
    } finally {
      this.lockDepth = 0;
      rmSync(directory, { recursive: true, force: true });
    }
  }

  private recoverLock(directory: string): void {
    try {
      const original = statSync(directory);
      if (!isAbandonedLock(directory)) {
        return;
      }
      const recoveryPath = path.join(directory, 'recovering');
      try {
        mkdirSync(recoveryPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          const recovery = statSync(recoveryPath);
          if (isAbandonedLock(recoveryPath) && statSync(recoveryPath).ino === recovery.ino) {
            rmSync(recoveryPath, { recursive: true, force: true });
          }
        }
        return;
      }
      writeFileSync(path.join(recoveryPath, 'owner.json'), JSON.stringify({ pid: process.pid }), { mode: 0o600, flag: 'wx' });
      // Recheck after acquiring the recovery guard: a contender may have
      // replaced the abandoned directory while this process was waiting.
      if (statSync(directory).ino !== original.ino || !isAbandonedLock(directory)) {
        rmSync(recoveryPath, { recursive: true, force: true });
        return;
      }
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Another process acquired/reclaimed the lock; retry normally.
    }
  }

  private recover(): void {
    const filename = path.join(this.path, '.transaction.json');
    if (!existsSync(filename)) {
      return;
    }
    const journal = JSON.parse(readFileSync(filename, 'utf8')) as Journal;
    this.applyJournal(journal);
  }

  private applyJournal(journal: Journal): void {
    for (const change of journal.changes) {
      const filename = path.resolve(this.path, change.file);
      const relative = path.relative(this.path, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative)
        || !(/^(?:settings\.json|(?:providers|captures|fetch-jobs)[/\\][^/\\]+\.json)$/u).test(relative)) {
        throw new Error('Invalid storage recovery journal');
      }
      if (change.value === null) {
        rmSync(filename, { force: true });
        syncDirectory(path.dirname(filename));
      } else {
        writeJsonAtomic(filename, change.value);
      }
    }
    rmSync(path.join(this.path, '.transaction.json'), { force: true });
    syncDirectory(this.path);
  }

  private readRecord<K extends Collection>(collection: K, filename: string): Collections[K] | undefined {
    let value: unknown;
    if (this.changes?.has(filename)) {
      value = this.changes.get(filename);
      if (value === null) {
        return undefined;
      }
    } else {
      const absolutePath = path.join(this.path, filename);
      if (!existsSync(absolutePath)) {
        return undefined;
      }
      value = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
    }
    const row = value as Collections[K];
    if (this.recordPath(collection, row.id) !== filename) {
      throw new Error('Invalid Foundry record');
    }
    return structuredClone(row);
  }

  all<K extends Collection>(collection: K): Array<Collections[K]> {
    return this.locked(() => {
      const directory = this.collectionPath(collection);
      const files = new Set(readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => path.relative(this.path, path.join(directory, entry.name))));
      if (this.changes) {
        const relativeDirectory = path.relative(this.path, directory);
        for (const filename of this.changes.keys()) {
          if (path.dirname(filename) === relativeDirectory) {
            files.add(filename);
          }
        }
      }
      const records: Array<Collections[K]> = [];
      for (const filename of files) {
        const row = this.readRecord(collection, filename);
        if (row) {
          records.push(row);
        }
      }
      return records;
    });
  }

  get<K extends Collection>(collection: K, id: string): Collections[K] | undefined {
    return this.locked(() => this.readRecord(collection, this.recordPath(collection, id)));
  }

  readSettings(): FoundrySettings {
    return this.locked(() => {
      if (this.changes?.has('settings.json')) {
        return structuredClone(this.changes.get('settings.json')) as FoundrySettings;
      }
      const filename = path.join(this.path, 'settings.json');
      return existsSync(filename)
        ? normalizeSettings(JSON.parse(readFileSync(filename, 'utf8')) as unknown)
        : structuredClone(DEFAULT_SETTINGS);
    });
  }

  put<K extends Collection>(collection: K, record: Collections[K]): void {
    if (!this.changes) {
      throw new Error('Storage writes require a transaction');
    }
    this.changes.set(this.recordPath(collection, record.id), structuredClone(record));
  }

  setSettings(settings: FoundrySettings): void {
    if (!this.changes) {
      throw new Error('Storage writes require a transaction');
    }
    this.changes.set('settings.json', normalizeSettings(structuredClone(settings)));
  }

  transaction<T>(action: (storage: FoundryStorage) => T): T {
    return this.locked(() => {
      if (this.changes) {
        return action(this);
      }
      this.changes = new Map();
      let isCommitted = false;
      try {
        const result = action(this);
        if (result instanceof Promise) {
          throw new TypeError('Storage transactions must be synchronous');
        }
        if (this.changes.size > 0) {
          const journal: Journal = { changes: [...this.changes].map(([file, value]) => ({ file, value })) };
          writeJsonAtomic(path.join(this.path, '.transaction.json'), journal);
          isCommitted = true;
          this.applyJournal(journal);
        }
        return result;
      } catch (error) {
        if (isCommitted) {
          // A durable journal exists: recover it before accepting another call.
          this.recover();
        }
        throw error;
      } finally {
        this.changes = null;
      }
    });
  }

  snapshot(): StorageSnapshot {
    return this.locked(() => ({
      formatVersion: STORAGE_FORMAT_VERSION,
      settings: this.readSettings(),
      providers: this.all('providers'),
      captures: this.all('captures'),
      fetchJobs: this.all('fetchJobs'),
    }));
  }

  replace(snapshot: StorageSnapshot): void {
    this.transaction(() => {
      for (const collection of COLLECTIONS) {
        const current = this.all(collection);
        for (const row of current) {
          this.changes?.set(this.recordPath(collection, row.id), null);
        }
        const imported = snapshot[collection];
        for (const row of imported) {
          this.put(collection, row);
        }
      }
      this.setSettings(snapshot.settings);
    });
  }

  close(): void {
    this.closed = true;
  }
}
