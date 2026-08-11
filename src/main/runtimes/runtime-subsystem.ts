import type { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import type { FoundryStorageError } from '../storage/storage-error';
import { ProviderRepository } from '../providers/provider-repository';
import { RuntimeConfigurationApplier } from './runtime-configuration-applier';
import { RuntimeConfigurationPreviewer } from './runtime-configuration-previewer';
import { toRuntimeOperationError } from './runtime-error';
import { RuntimeIpcController } from './runtime-ipc';
import { RuntimeRepository } from './runtime-repository';

export class RuntimeSubsystem {
  private ipcController: RuntimeIpcController | undefined;

  initialize(
    database: Database.Database | FoundryStorageError,
    userHomeDirectory: string,
  ): void {
    if (database instanceof Error) {
      const runtimeError = toRuntimeOperationError(database);
      console.error(`[runtimes] initialization failed with ${runtimeError.code}.`);
      this.ipcController = new RuntimeIpcController(runtimeError);
      return;
    }
    const repository = new RuntimeRepository(database);
    const previewer = new RuntimeConfigurationPreviewer(
      userHomeDirectory,
      new ProviderRepository(database),
    );
    this.ipcController = new RuntimeIpcController({
      applier: new RuntimeConfigurationApplier(previewer, repository),
      repository,
      previewer,
    });
  }

  registerWindow(window: BrowserWindow): void {
    this.ipcController?.registerWindow(window);
  }

  close(): void {
    this.ipcController?.dispose();
    this.ipcController = undefined;
  }
}
