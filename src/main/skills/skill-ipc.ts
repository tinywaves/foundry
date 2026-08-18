import type {
  BrowserWindow,
  IpcMainInvokeEvent,
  WebContents,
} from 'electron';
import { BrowserWindow as ElectronBrowserWindow, dialog, ipcMain } from 'electron';
import type { SkillApiResult, SkillChangedNotification } from '../../shared/skill-contract';
import { skillIpcChannels } from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import { isTrustedSkillMainFrame } from './skill-ipc-trust';
import type { SkillService } from './skill-service';

type SkillBackend = SkillOperationError | SkillService;

const skillRequestChannels = [
  skillIpcChannels.listStorePackages,
  skillIpcChannels.getStorePackage,
  skillIpcChannels.listTargets,
  skillIpcChannels.listInstallations,
  skillIpcChannels.importExisting,
  skillIpcChannels.beginWatchSession,
  skillIpcChannels.endWatchSession,
  skillIpcChannels.listPackageFiles,
  skillIpcChannels.readPackageFile,
  skillIpcChannels.revealPackage,
  skillIpcChannels.revealTarget,
  skillIpcChannels.openTargetDocumentation,
  skillIpcChannels.selectCustomTargetDirectory,
  skillIpcChannels.createCustomTarget,
  skillIpcChannels.updateTargetPolicy,
  skillIpcChannels.resetBuiltInTargetPolicy,
  skillIpcChannels.removeCustomTarget,
  skillIpcChannels.preflightDistribution,
  skillIpcChannels.distribute,
  skillIpcChannels.restoreInstallation,
  skillIpcChannels.promoteInstallation,
  skillIpcChannels.importInstallationAsNew,
  skillIpcChannels.uninstall,
  skillIpcChannels.listRevisions,
  skillIpcChannels.listRevisionFiles,
  skillIpcChannels.readRevisionFile,
  skillIpcChannels.movePackageToTrash,
  skillIpcChannels.listTrash,
  skillIpcChannels.restoreTrashedPackage,
  skillIpcChannels.removeTrashedPackage,
  skillIpcChannels.emptyTrash,
  skillIpcChannels.listSources,
  skillIpcChannels.browseRemoteSkills,
  skillIpcChannels.searchRemoteSkills,
  skillIpcChannels.getRemoteSkillDetails,
  skillIpcChannels.resolveDirectoryResult,
  skillIpcChannels.resolveGitSource,
  skillIpcChannels.addRemoteCandidate,
  skillIpcChannels.openRemoteResult,
  skillIpcChannels.openSource,
  skillIpcChannels.checkSourceForUpdates,
  skillIpcChannels.checkPackageForUpdates,
  skillIpcChannels.applyUpdate,
] as const;

export class SkillIpcController {
  private readonly trustedWebContents = new Map<number, WebContents>();

  constructor(private readonly backend: SkillBackend) {
    this.registerHandlers();
  }

  private async handleRequest<T>(
    event: IpcMainInvokeEvent,
    operation: (service: SkillService) => T | Promise<T>,
  ): Promise<SkillApiResult<T>> {
    if (!isTrustedSkillMainFrame(new Set(this.trustedWebContents.keys()), event)) {
      return {
        ok: false,
        error: new SkillOperationError('internal', 'Skills request was rejected.').toApiError(),
      };
    }
    if (this.backend instanceof SkillOperationError) {
      return { ok: false, error: this.backend.toApiError() };
    }
    try {
      return { ok: true, value: await operation(this.backend) };
    } catch (error) {
      return { ok: false, error: toSkillOperationError(error).toApiError() };
    }
  }

  private registerHandlers(): void {
    ipcMain.handle(skillIpcChannels.listStorePackages, (event) =>
      this.handleRequest(event, (service) => service.listStorePackages()));
    ipcMain.handle(skillIpcChannels.getStorePackage, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.getStorePackage(skillId)));
    ipcMain.handle(skillIpcChannels.listTargets, (event) =>
      this.handleRequest(event, (service) => service.listTargets()));
    ipcMain.handle(skillIpcChannels.listInstallations, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.listInstallations(input)));
    ipcMain.handle(skillIpcChannels.importExisting, (event) =>
      this.handleRequest(event, (service) => service.importExisting()));
    ipcMain.handle(skillIpcChannels.beginWatchSession, (event) =>
      this.handleRequest(event, (service) => service.beginWatchSession(event.sender.id)));
    ipcMain.handle(skillIpcChannels.endWatchSession, (event, sessionId: unknown) =>
      this.handleRequest(event, (service) => (
        service.endWatchSession(event.sender.id, sessionId)
      )));
    ipcMain.handle(skillIpcChannels.listPackageFiles, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.listPackageFiles(skillId)));
    ipcMain.handle(skillIpcChannels.readPackageFile, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.readPackageFile(input)));
    ipcMain.handle(skillIpcChannels.revealPackage, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.revealPackage(skillId)));
    ipcMain.handle(skillIpcChannels.revealTarget, (event, targetId: unknown) =>
      this.handleRequest(event, (service) => service.revealTarget(targetId)));
    ipcMain.handle(skillIpcChannels.openTargetDocumentation, (event, targetId: unknown) =>
      this.handleRequest(event, (service) => service.openTargetDocumentation(targetId)));
    ipcMain.handle(skillIpcChannels.selectCustomTargetDirectory, (event) =>
      this.handleRequest(event, async (service) => {
        const parentWindow = ElectronBrowserWindow.fromWebContents(event.sender);
        if (!parentWindow) {
          throw new SkillOperationError('internal', 'Skills request was rejected.');
        }
        const selection = await dialog.showOpenDialog(parentWindow, {
          properties: ['openDirectory', 'createDirectory'],
        });
        if (selection.canceled || selection.filePaths.length !== 1) {
          return null;
        }
        return service.registerCustomTargetCandidate(event.sender.id, selection.filePaths[0]);
      }));
    ipcMain.handle(skillIpcChannels.createCustomTarget, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.createCustomTarget(event.sender.id, input)));
    ipcMain.handle(skillIpcChannels.updateTargetPolicy, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.updateTargetPolicy(input)));
    ipcMain.handle(skillIpcChannels.resetBuiltInTargetPolicy, (event, targetId: unknown) =>
      this.handleRequest(event, (service) => service.resetBuiltInTargetPolicy(targetId)));
    ipcMain.handle(skillIpcChannels.removeCustomTarget, (event, targetId: unknown) =>
      this.handleRequest(event, (service) => service.removeCustomTarget(targetId)));
    ipcMain.handle(skillIpcChannels.preflightDistribution, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.preflightDistribution(input)));
    ipcMain.handle(skillIpcChannels.distribute, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.distribute(input)));
    ipcMain.handle(skillIpcChannels.restoreInstallation, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.restoreInstallation(input)));
    ipcMain.handle(skillIpcChannels.promoteInstallation, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.promoteInstallation(input)));
    ipcMain.handle(skillIpcChannels.importInstallationAsNew, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.importInstallationAsNew(input)));
    ipcMain.handle(skillIpcChannels.uninstall, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.uninstall(input)));
    ipcMain.handle(skillIpcChannels.listRevisions, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.listRevisions(skillId)));
    ipcMain.handle(
      skillIpcChannels.listRevisionFiles,
      (event, skillId: unknown, revisionId: unknown) => this.handleRequest(
        event,
        (service) => service.listRevisionFiles(skillId, revisionId),
      ),
    );
    ipcMain.handle(skillIpcChannels.readRevisionFile, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.readRevisionFile(input)));
    ipcMain.handle(skillIpcChannels.movePackageToTrash, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.movePackageToTrash(skillId)));
    ipcMain.handle(skillIpcChannels.listTrash, (event) =>
      this.handleRequest(event, (service) => service.listTrash()));
    ipcMain.handle(skillIpcChannels.restoreTrashedPackage, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.restoreTrashedPackage(skillId)));
    ipcMain.handle(skillIpcChannels.removeTrashedPackage, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.removeTrashedPackage(skillId)));
    ipcMain.handle(skillIpcChannels.emptyTrash, (event) =>
      this.handleRequest(event, (service) => service.emptyTrash()));
    ipcMain.handle(skillIpcChannels.listSources, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.listSources(skillId)));
    ipcMain.handle(skillIpcChannels.browseRemoteSkills, (event, input: unknown) =>
      this.handleRequest(event, (service) => (
        service.browseRemoteSkills(event.sender.id, input)
      )));
    ipcMain.handle(skillIpcChannels.searchRemoteSkills, (event, input: unknown) =>
      this.handleRequest(event, (service) => (
        service.searchRemoteSkills(event.sender.id, input)
      )));
    ipcMain.handle(skillIpcChannels.getRemoteSkillDetails, (event, input: unknown) =>
      this.handleRequest(event, (service) => (
        service.getRemoteSkillDetails(event.sender.id, input)
      )));
    ipcMain.handle(skillIpcChannels.resolveDirectoryResult, (event, input: unknown) =>
      this.handleRequest(event, (service) => (
        service.resolveDirectoryResult(event.sender.id, input)
      )));
    ipcMain.handle(skillIpcChannels.resolveGitSource, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.resolveGitSource(event.sender.id, input)));
    ipcMain.handle(skillIpcChannels.addRemoteCandidate, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.addRemoteCandidate(event.sender.id, input)));
    ipcMain.handle(skillIpcChannels.openRemoteResult, (event, input: unknown) =>
      this.handleRequest(event, (service) => (
        service.openRemoteResult(event.sender.id, input)
      )));
    ipcMain.handle(skillIpcChannels.openSource, (event, sourceId: unknown) =>
      this.handleRequest(event, (service) => service.openSource(sourceId)));
    ipcMain.handle(skillIpcChannels.checkSourceForUpdates, (event, sourceId: unknown) =>
      this.handleRequest(event, (service) => service.checkSourceForUpdates(sourceId)));
    ipcMain.handle(skillIpcChannels.checkPackageForUpdates, (event, skillId: unknown) =>
      this.handleRequest(event, (service) => service.checkPackageForUpdates(skillId)));
    ipcMain.handle(skillIpcChannels.applyUpdate, (event, input: unknown) =>
      this.handleRequest(event, (service) => service.applyUpdate(input)));
  }

  notifyOwners(
    ownerIds: ReadonlySet<number>,
    notification: SkillChangedNotification,
  ): void {
    for (const ownerId of ownerIds) {
      this.trustedWebContents.get(ownerId)?.send(skillIpcChannels.changed, notification);
    }
  }

  registerWindow(window: BrowserWindow): void {
    const { webContents } = window;
    this.trustedWebContents.set(webContents.id, webContents);
    if (!(this.backend instanceof SkillOperationError)) {
      this.backend.registerWindowOwner(webContents.id);
    }
    webContents.once('destroyed', () => {
      this.trustedWebContents.delete(webContents.id);
      if (!(this.backend instanceof SkillOperationError)) {
        void this.backend.releaseWindowOwner(webContents.id);
      }
    });
  }

  async dispose(): Promise<void> {
    const ownerIds = this.trustedWebContents.keys().toArray();
    this.trustedWebContents.clear();
    for (const channel of skillRequestChannels) {
      ipcMain.removeHandler(channel);
    }
    const service = this.backend;
    if (!(service instanceof SkillOperationError)) {
      await Promise.all(ownerIds.map((ownerId) => service.releaseWindowOwner(ownerId)));
    }
  }
}
