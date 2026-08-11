import type { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import { ProviderSubsystem } from './providers/provider-subsystem';
import { RuntimeSubsystem } from './runtimes/runtime-subsystem';
import { openFoundryDatabase } from './storage/foundry-database';
import { toFoundryStorageError } from './storage/storage-error';

export class FoundrySubsystem {
  private readonly providerSubsystem = new ProviderSubsystem();
  private readonly runtimeSubsystem = new RuntimeSubsystem();
  private database: Database.Database | undefined;

  initialize(databaseFilename: string, userHomeDirectory: string): void {
    try {
      this.database = openFoundryDatabase(databaseFilename);
      this.providerSubsystem.initialize(this.database);
      this.runtimeSubsystem.initialize(this.database, userHomeDirectory);
    } catch (error) {
      const storageError = toFoundryStorageError(error);
      console.error(`[storage] initialization failed with ${storageError.code}.`);
      this.providerSubsystem.initialize(storageError);
      this.runtimeSubsystem.initialize(storageError, userHomeDirectory);
    }
  }

  registerWindow(window: BrowserWindow): void {
    this.providerSubsystem.registerWindow(window);
    this.runtimeSubsystem.registerWindow(window);
  }

  close(): void {
    this.providerSubsystem.close();
    this.runtimeSubsystem.close();
    try {
      this.database?.close();
    } catch {
      console.error('[storage] database close failed.');
    }
    this.database = undefined;
  }
}
