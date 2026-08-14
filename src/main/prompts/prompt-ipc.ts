import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { clipboard, ipcMain } from 'electron';
import type { PromptApiResult } from '../../shared/prompt-contract';
import { promptIpcChannels } from '../../shared/prompt-contract';
import { PromptOperationError, toPromptOperationError } from './prompt-error';
import type { PromptRepository } from './prompt-repository';

type PromptBackend = PromptOperationError | PromptRepository;

const promptChannels = Object.values(promptIpcChannels);

export class PromptIpcController {
  private readonly trustedWebContentsIds = new Set<number>();

  constructor(private readonly backend: PromptBackend) {
    this.registerHandlers();
  }

  private handleRequest<T>(
    event: IpcMainInvokeEvent,
    operation: (repository: PromptRepository) => T,
  ): PromptApiResult<T> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new PromptOperationError('internal', 'Prompt request was rejected.').toApiError(),
      };
    }
    if (this.backend instanceof PromptOperationError) {
      return { ok: false, error: this.backend.toApiError() };
    }

    try {
      return { ok: true, value: operation(this.backend) };
    } catch (error) {
      return { ok: false, error: toPromptOperationError(error).toApiError() };
    }
  }

  private isTrustedMainFrame(event: IpcMainInvokeEvent): boolean {
    return this.trustedWebContentsIds.has(event.sender.id)
      && event.senderFrame !== null
      && event.senderFrame === event.sender.mainFrame;
  }

  private registerHandlers(): void {
    ipcMain.handle(promptIpcChannels.list, (event) =>
      this.handleRequest(event, (repository) => repository.listPrompts()));
    ipcMain.handle(promptIpcChannels.get, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.getPrompt(id)));
    ipcMain.handle(promptIpcChannels.create, (event, input: unknown) =>
      this.handleRequest(event, (repository) => repository.createPrompt(input)));
    ipcMain.handle(promptIpcChannels.update, (event, input: unknown) =>
      this.handleRequest(event, (repository) => repository.updatePrompt(input)));
    ipcMain.handle(promptIpcChannels.moveToTrash, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.movePromptToTrash(id)));
    ipcMain.handle(promptIpcChannels.listVersions, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.listPromptVersions(id)));
    ipcMain.handle(promptIpcChannels.getVersion, (event, target: unknown) =>
      this.handleRequest(event, (repository) => repository.getPromptVersion(target)));
    ipcMain.handle(promptIpcChannels.restoreVersion, (event, target: unknown) =>
      this.handleRequest(event, (repository) => repository.restorePromptVersion(target)));
    ipcMain.handle(promptIpcChannels.copy, (event, id: unknown) =>
      this.handleRequest(event, (repository) => {
        clipboard.writeText(repository.getPrompt(id).content);
      }));
    ipcMain.handle(promptIpcChannels.copyVersion, (event, target: unknown) =>
      this.handleRequest(event, (repository) => {
        clipboard.writeText(repository.getPromptVersion(target).content);
      }));
    ipcMain.handle(promptIpcChannels.listTrash, (event) =>
      this.handleRequest(event, (repository) => repository.listTrashedPrompts()));
    ipcMain.handle(promptIpcChannels.getTrashed, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.getTrashedPrompt(id)));
    ipcMain.handle(promptIpcChannels.restoreTrashed, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.restoreTrashedPrompt(id)));
    ipcMain.handle(promptIpcChannels.removeFromTrash, (event, id: unknown) =>
      this.handleRequest(event, (repository) => repository.removePromptFromTrash(id)));
    ipcMain.handle(promptIpcChannels.emptyTrash, (event) =>
      this.handleRequest(event, (repository) => repository.emptyPromptTrash()));
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
    for (const channel of promptChannels) {
      ipcMain.removeHandler(channel);
    }
  }
}
