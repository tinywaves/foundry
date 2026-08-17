import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import type { SettingsApiResult } from '../../shared/settings-contract';
import { settingsIpcChannels } from '../../shared/settings-contract';
import { SettingsOperationError, toSettingsOperationError } from './settings-error';
import type { SettingsRepository } from './settings-repository';

type SettingsBackend = SettingsOperationError | SettingsRepository;

const settingsChannels = Object.values(settingsIpcChannels);

export class SettingsIpcController {
  private readonly trustedWebContentsIds = new Set<number>();

  constructor(private readonly backend: SettingsBackend) {
    this.registerHandlers();
  }

  private handleRequest<T>(
    event: IpcMainInvokeEvent,
    operation: (repository: SettingsRepository) => T,
  ): SettingsApiResult<T> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new SettingsOperationError('internal', 'Settings request was rejected.').toApiError(),
      };
    }
    if (this.backend instanceof SettingsOperationError) {
      return { ok: false, error: this.backend.toApiError() };
    }

    try {
      return { ok: true, value: operation(this.backend) };
    } catch (error) {
      return { ok: false, error: toSettingsOperationError(error).toApiError() };
    }
  }

  private isTrustedMainFrame(event: IpcMainInvokeEvent): boolean {
    return this.trustedWebContentsIds.has(event.sender.id)
      && event.senderFrame !== null
      && event.senderFrame === event.sender.mainFrame;
  }

  private registerHandlers(): void {
    ipcMain.handle(settingsIpcChannels.get, (event) =>
      this.handleRequest(event, (repository) => repository.getApplicationSettings()));
    ipcMain.handle(settingsIpcChannels.updateColorMode, (event, colorMode: unknown) =>
      this.handleRequest(event, (repository) => (
        repository.updateApplicationColorMode(colorMode)
      )));
  }

  registerWindow(window: BrowserWindow): void {
    const { webContents } = window;
    this.trustedWebContentsIds.add(webContents.id);
    webContents.once('destroyed', () => {
      this.trustedWebContentsIds.delete(webContents.id);
    });
  }

  dispose(): void {
    this.trustedWebContentsIds.clear();
    for (const channel of settingsChannels) {
      ipcMain.removeHandler(channel);
    }
  }
}
