import { net } from 'electron';
import type { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import type { FoundryStorageError } from '../storage/storage-error';
import { toProviderOperationError } from './provider-error';
import { ProviderIpcController } from './provider-ipc';
import { ProviderRepository } from './provider-repository';
import { ProviderConnectionTester } from './provider-connection-tester';

export class ProviderSubsystem {
  private ipcController: ProviderIpcController | undefined;

  initialize(database: Database.Database | FoundryStorageError): void {
    const connectionTester = new ProviderConnectionTester((url, init) => net.fetch(url, init));
    if (database instanceof Error) {
      const providerError = toProviderOperationError(database);
      console.error(`[providers] initialization failed with ${providerError.code}.`);
      this.ipcController = new ProviderIpcController(providerError, connectionTester);
      return;
    }
    this.ipcController = new ProviderIpcController(
      new ProviderRepository(database),
      connectionTester,
    );
  }

  registerWindow(window: BrowserWindow): void {
    this.ipcController?.registerWindow(window);
  }

  close(): void {
    this.ipcController?.dispose();
    this.ipcController = undefined;
  }
}
