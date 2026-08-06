import type { IpcMainInvokeEvent } from 'electron';
import { BrowserWindow, clipboard, ipcMain } from 'electron';
import type { ProviderApiResult } from '../../shared/provider-contract';
import { providerIpcChannels } from '../../shared/provider-contract';
import { ProviderOperationError, toProviderOperationError } from './provider-error';
import { selectProviderAvatar } from './provider-avatar-picker';
import type { ProviderConnectionTester } from './provider-connection-tester';
import type { ProviderRepository } from './provider-repository';

type ProviderBackend = ProviderOperationError | ProviderRepository;

const providerChannels = Object.values(providerIpcChannels);

export class ProviderIpcController {
  private readonly trustedWebContentsIds = new Set<number>();

  constructor(
    private readonly backend: ProviderBackend,
    private readonly connectionTester: ProviderConnectionTester,
  ) {
    this.registerHandlers();
  }

  private async handleAsyncRequest<T>(
    event: IpcMainInvokeEvent,
    operation: (repository: ProviderRepository) => Promise<T>,
  ): Promise<ProviderApiResult<T>> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new ProviderOperationError('internal', 'Provider request was rejected.').toApiError(),
      };
    }
    if (this.backend instanceof ProviderOperationError) {
      return { ok: false, error: this.backend.toApiError() };
    }

    try {
      return { ok: true, value: await operation(this.backend) };
    } catch (error) {
      return { ok: false, error: toProviderOperationError(error).toApiError() };
    }
  }

  private handleRequest<T>(
    event: IpcMainInvokeEvent,
    operation: (repository: ProviderRepository) => T,
  ): ProviderApiResult<T> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new ProviderOperationError('internal', 'Provider request was rejected.').toApiError(),
      };
    }
    if (this.backend instanceof ProviderOperationError) {
      return { ok: false, error: this.backend.toApiError() };
    }

    try {
      return { ok: true, value: operation(this.backend) };
    } catch (error) {
      return { ok: false, error: toProviderOperationError(error).toApiError() };
    }
  }

  private isTrustedMainFrame(event: IpcMainInvokeEvent): boolean {
    return this.trustedWebContentsIds.has(event.sender.id)
      && event.senderFrame !== null
      && event.senderFrame === event.sender.mainFrame;
  }

  private async handleAvatarSelection(
    event: IpcMainInvokeEvent,
  ): Promise<ProviderApiResult<Awaited<ReturnType<typeof selectProviderAvatar>>>> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new ProviderOperationError('internal', 'Provider request was rejected.').toApiError(),
      };
    }

    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    if (parentWindow === null) {
      return {
        ok: false,
        error: new ProviderOperationError('internal', 'Provider request was rejected.').toApiError(),
      };
    }

    try {
      return { ok: true, value: await selectProviderAvatar(parentWindow) };
    } catch (error) {
      return { ok: false, error: toProviderOperationError(error).toApiError() };
    }
  }

  private registerHandlers(): void {
    ipcMain.handle(providerIpcChannels.list, (event, runtime: unknown) =>
      this.handleRequest(event, (repository) => repository.listProviders(runtime)));
    ipcMain.handle(providerIpcChannels.getForEdit, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.getProviderForEdit(id)));
    ipcMain.handle(providerIpcChannels.getAvatar, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.getProviderAvatar(id)));
    ipcMain.handle(providerIpcChannels.selectAvatar, (event) => this.handleAvatarSelection(event));
    ipcMain.handle(providerIpcChannels.create, (event, input: unknown) =>
      this.handleRequest(event, (repository) => repository.createProvider(input)));
    ipcMain.handle(providerIpcChannels.update, (event, input: unknown) =>
      this.handleRequest(event, (repository) => repository.updateProvider(input)));
    ipcMain.handle(providerIpcChannels.delete, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.deleteProvider(id)));
    ipcMain.handle(providerIpcChannels.revealApiKey, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.getProviderApiKey(id)));
    ipcMain.handle(providerIpcChannels.copyApiKey, (event, id: unknown) =>
      this.handleRequest(event, (repository) => {
        const apiKey = repository.getProviderApiKey(id);
        if (apiKey === null) {
          throw new ProviderOperationError('invalid-input', 'Provider does not have an API key.');
        }
        clipboard.writeText(apiKey);
      }));
    ipcMain.handle(providerIpcChannels.testSavedConnection, (event, id: unknown) =>
      this.handleAsyncRequest(event, async (repository) => {
        const target = repository.getProviderConnectionTarget(id);
        const summary = await this.connectionTester.test(target);
        return repository.recordProviderConnectionSummary(target, summary);
      }));
    ipcMain.handle(providerIpcChannels.testDraftConnection, (event, input: unknown) =>
      this.handleAsyncRequest(event, async () => this.connectionTester.test(input)));
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
    for (const channel of providerChannels) {
      ipcMain.removeHandler(channel);
    }
  }
}
