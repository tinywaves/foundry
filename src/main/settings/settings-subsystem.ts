import type { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import type { FoundryStorageError } from '../storage/storage-error';
import { toSettingsOperationError } from './settings-error';
import { SettingsIpcController } from './settings-ipc';
import { SettingsRepository } from './settings-repository';

export class SettingsSubsystem {
  private ipcController: SettingsIpcController | undefined;

  initialize(database: Database.Database | FoundryStorageError): void {
    if (database instanceof Error) {
      const settingsError = toSettingsOperationError(database);
      console.error(`[settings] initialization failed with ${settingsError.code}.`);
      this.ipcController = new SettingsIpcController(settingsError);
      return;
    }
    this.ipcController = new SettingsIpcController(new SettingsRepository(database));
  }

  registerWindow(window: BrowserWindow): void {
    this.ipcController?.registerWindow(window);
  }

  close(): void {
    this.ipcController?.dispose();
    this.ipcController = undefined;
  }
}
