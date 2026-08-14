import type { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import type { FoundryStorageError } from '../storage/storage-error';
import { toPromptOperationError } from './prompt-error';
import { PromptIpcController } from './prompt-ipc';
import { PromptRepository } from './prompt-repository';

export class PromptSubsystem {
  private ipcController: PromptIpcController | undefined;

  initialize(database: Database.Database | FoundryStorageError): void {
    if (database instanceof Error) {
      const promptError = toPromptOperationError(database);
      console.error(`[prompts] initialization failed with ${promptError.code}.`);
      this.ipcController = new PromptIpcController(promptError);
      return;
    }
    this.ipcController = new PromptIpcController(new PromptRepository(database));
  }

  registerWindow(window: BrowserWindow): void {
    this.ipcController?.registerWindow(window);
  }

  close(): void {
    this.ipcController?.dispose();
    this.ipcController = undefined;
  }
}
