import { net } from 'electron';
import type { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import { openProviderDatabase } from './provider-database';
import { toProviderOperationError } from './provider-error';
import { ProviderIpcController } from './provider-ipc';
import { ProviderRepository } from './provider-repository';
import { ProviderConnectionTester } from './provider-connection-tester';

export class ProviderSubsystem {
  private database: Database.Database | undefined;
  private ipcController: ProviderIpcController | undefined;

  initialize(databaseFilename: string): void {
    const connectionTester = new ProviderConnectionTester((url, init) => net.fetch(url, init));
    try {
      this.database = openProviderDatabase(databaseFilename);
      this.ipcController = new ProviderIpcController(
        new ProviderRepository(this.database),
        connectionTester,
      );
    } catch (error) {
      const providerError = toProviderOperationError(error);
      console.error(`[providers] initialization failed with ${providerError.code}.`);
      this.ipcController = new ProviderIpcController(providerError, connectionTester);
    }
  }

  registerWindow(window: BrowserWindow): void {
    this.ipcController?.registerWindow(window);
  }

  close(): void {
    this.ipcController?.dispose();
    this.ipcController = undefined;
    try {
      this.database?.close();
    } catch {
      console.error('[providers] database close failed.');
    }
    this.database = undefined;
  }
}
