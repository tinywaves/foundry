import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import type { RuntimeApiResult } from '../../shared/runtime-contract';
import { runtimeIpcChannels } from '../../shared/runtime-contract';
import type { ChatGptApplicationController } from './chatgpt-application-controller';
import { RuntimeOperationError, toRuntimeOperationError } from './runtime-error';
import type { RuntimeConfigurationApplier } from './runtime-configuration-applier';
import type { RuntimeConfigurationPreviewer } from './runtime-configuration-previewer';
import type { RuntimeRepository } from './runtime-repository';

interface RuntimeServices {
  applier: RuntimeConfigurationApplier;
  repository: RuntimeRepository;
  previewer: RuntimeConfigurationPreviewer;
}

type RuntimeBackend = RuntimeOperationError | RuntimeServices;

const runtimeChannels = Object.values(runtimeIpcChannels);

export class RuntimeIpcController {
  private readonly trustedWebContentsIds = new Set<number>();

  constructor(
    private readonly backend: RuntimeBackend,
    private readonly chatGptApplicationController: ChatGptApplicationController,
  ) {
    this.registerHandlers();
  }

  private handleRequest<T>(
    event: IpcMainInvokeEvent,
    operation: (services: RuntimeServices) => T,
  ): RuntimeApiResult<T> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new RuntimeOperationError('internal', 'Runtime request was rejected.').toApiError(),
      };
    }
    if (this.backend instanceof RuntimeOperationError) {
      return { ok: false, error: this.backend.toApiError() };
    }

    try {
      return { ok: true, value: operation(this.backend) };
    } catch (error) {
      return { ok: false, error: toRuntimeOperationError(error).toApiError() };
    }
  }

  private async handleAsyncRequest<T>(
    event: IpcMainInvokeEvent,
    operation: (services: RuntimeServices) => Promise<T>,
  ): Promise<RuntimeApiResult<T>> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new RuntimeOperationError('internal', 'Runtime request was rejected.').toApiError(),
      };
    }
    if (this.backend instanceof RuntimeOperationError) {
      return { ok: false, error: this.backend.toApiError() };
    }

    try {
      return { ok: true, value: await operation(this.backend) };
    } catch (error) {
      return { ok: false, error: toRuntimeOperationError(error).toApiError() };
    }
  }

  private isTrustedMainFrame(event: IpcMainInvokeEvent): boolean {
    return this.trustedWebContentsIds.has(event.sender.id)
      && event.senderFrame !== null
      && event.senderFrame === event.sender.mainFrame;
  }

  private registerHandlers(): void {
    ipcMain.handle(runtimeIpcChannels.list, (event) =>
      this.handleRequest(event, ({ repository }) => repository.listRuntimes()));
    ipcMain.handle(runtimeIpcChannels.previewConfiguration, (event, input: unknown) =>
      this.handleAsyncRequest(event, ({ previewer }) => previewer.preview(input)));
    ipcMain.handle(runtimeIpcChannels.applyConfiguration, (event, input: unknown) =>
      this.handleAsyncRequest(event, ({ applier }) => applier.apply(input)));
    ipcMain.handle(runtimeIpcChannels.getChatGptApplicationState, (event) =>
      this.handleIndependentAsyncRequest(
        event,
        () => this.chatGptApplicationController.getState(),
      ));
    ipcMain.handle(runtimeIpcChannels.restartChatGptApplication, (event) =>
      this.handleIndependentAsyncRequest(
        event,
        () => this.chatGptApplicationController.restart(),
      ));
  }

  private async handleIndependentAsyncRequest<T>(
    event: IpcMainInvokeEvent,
    operation: () => Promise<T>,
  ): Promise<RuntimeApiResult<T>> {
    if (!this.isTrustedMainFrame(event)) {
      return {
        ok: false,
        error: new RuntimeOperationError('internal', 'Runtime request was rejected.').toApiError(),
      };
    }

    try {
      return { ok: true, value: await operation() };
    } catch (error) {
      return { ok: false, error: toRuntimeOperationError(error).toApiError() };
    }
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
    for (const channel of runtimeChannels) {
      ipcMain.removeHandler(channel);
    }
  }
}
