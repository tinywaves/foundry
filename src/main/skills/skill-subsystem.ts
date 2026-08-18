import type { BrowserWindow } from 'electron';
import { shell } from 'electron';
import type Database from 'better-sqlite3';
import type { FoundryStorageError } from '../storage/storage-error';
import { SkillClawHubProvider } from './skill-clawhub-provider';
import { SkillDiscoveryCoordinator } from './skill-discovery-coordinator';
import { toSkillOperationError } from './skill-error';
import { SkillFileCoordinator } from './skill-file-coordinator';
import { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import { createSkillFilesystemWatcher } from './skill-filesystem-watcher';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillIpcController } from './skill-ipc';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillRemoteAcquisitionCoordinator } from './skill-remote-acquisition';
import { SkillRemoteDiscoveryCoordinator } from './skill-remote-discovery-coordinator';
import { SkillProviderHttpClient } from './skill-provider-http-client';
import { SkillService } from './skill-service';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';
import { SkillSourceRepository } from './skill-source-repository';
import { SkillSkillsShProvider } from './skill-skills-sh-provider';
import { SkillOperationQueue } from './skill-operation-queue';
import { SkillTargetRepository } from './skill-target-repository';
import { SkillTargetMutationCoordinator } from './skill-target-mutation-coordinator';
import { SkillTrashCoordinator } from './skill-trash-coordinator';
import { SkillUpdateCoordinator } from './skill-update-coordinator';
import { resolveBuiltInSkillTargets } from './skill-target-adapters';
import { SkillWatchCoordinator } from './skill-watch-coordinator';
import { resolveSkillWatchPaths } from './skill-watch-paths';

export class SkillSubsystem {
  private ipcController: SkillIpcController | undefined;
  private service: SkillService | undefined;

  async initialize(
    database: Database.Database | FoundryStorageError,
    userHomeDirectory: string,
  ): Promise<void> {
    if (database instanceof Error) {
      const skillError = toSkillOperationError(database);
      console.error(`[skills] initialization failed with ${skillError.code}.`);
      this.ipcController = new SkillIpcController(skillError);
      return;
    }
    try {
      const paths = new SkillStorePaths(userHomeDirectory);
      const metadataRepository = new SkillMetadataRepository(database);
      const sourceRepository = new SkillSourceRepository(database);
      const targetRepository = new SkillTargetRepository(database);
      const installationRepository = new SkillInstallationRepository(database);
      const storeCoordinator = new SkillStoreCoordinator(paths, metadataRepository);
      await storeCoordinator.initialize();
      const remoteAcquisitionCoordinator = new SkillRemoteAcquisitionCoordinator(paths);
      await remoteAcquisitionCoordinator.initialize();
      const gitSourceCoordinator = new SkillGitSourceCoordinator({
        acquisition: remoteAcquisitionCoordinator,
        storeCoordinator,
        sourceRepository,
      });
      const providerHttpClient = new SkillProviderHttpClient();
      const clawHubProvider = new SkillClawHubProvider({
        httpClient: providerHttpClient,
        acquisition: remoteAcquisitionCoordinator,
        gitSourceCoordinator,
        storeCoordinator,
        sourceRepository,
      });
      const remoteDiscoveryCoordinator = new SkillRemoteDiscoveryCoordinator({
        clawHub: clawHubProvider,
        skillsSh: new SkillSkillsShProvider({
          httpClient: providerHttpClient,
          gitSourceCoordinator,
        }),
        gitSourceCoordinator,
        httpClient: providerHttpClient,
      });
      const updateCoordinator = new SkillUpdateCoordinator({
        metadataRepository,
        sourceRepository,
        storeCoordinator,
        gitSourceCoordinator,
        clawHubProvider,
      });
      const operationQueue = new SkillOperationQueue();
      const discoveryCoordinator = new SkillDiscoveryCoordinator({
        userHomeDirectory,
        targetRepository,
        installationRepository,
        storeCoordinator,
        operationQueue,
      });
      const targetMutationCoordinator = new SkillTargetMutationCoordinator({
        paths,
        metadataRepository,
        targetRepository,
        installationRepository,
        storeCoordinator,
        operationQueue,
      });
      await targetMutationCoordinator.initialize();
      const trashCoordinator = new SkillTrashCoordinator({
        paths,
        metadataRepository,
        installationRepository,
        operationQueue,
      });
      await trashCoordinator.initialize();
      let ipcController: SkillIpcController | undefined;
      const watchCoordinator = new SkillWatchCoordinator({
        reconcileStore: () => storeCoordinator.reconcileStorePackages(),
        scan: () => discoveryCoordinator.scan(),
        resolveWatchPaths: () => resolveSkillWatchPaths(paths, targetRepository),
        watchFactory: createSkillFilesystemWatcher,
        onChanged: (ownerIds, notification) => {
          ipcController?.notifyOwners(ownerIds, notification);
        },
      });
      this.service = new SkillService({
        paths,
        metadataRepository,
        targetRepository,
        installationRepository,
        storeCoordinator,
        sourceRepository,
        gitSourceCoordinator,
        remoteDiscoveryCoordinator,
        updateCoordinator,
        discoveryCoordinator,
        fileCoordinator: new SkillFileCoordinator(paths, metadataRepository),
        watchCoordinator,
        targetMutationCoordinator,
        trashCoordinator,
        resolveBuiltInTargets: () => resolveBuiltInSkillTargets({ userHomeDirectory }),
        revealPath: (targetPath) => shell.showItemInFolder(targetPath),
        openExternal: (url) => shell.openExternal(url),
      });
      ipcController = new SkillIpcController(this.service);
      this.ipcController = ipcController;
    } catch (error) {
      const skillError = toSkillOperationError(error);
      console.error(`[skills] initialization failed with ${skillError.code}.`);
      this.ipcController = new SkillIpcController(skillError);
    }
  }

  registerWindow(window: BrowserWindow): void {
    this.ipcController?.registerWindow(window);
  }

  async close(): Promise<void> {
    await this.ipcController?.dispose();
    await this.service?.dispose();
    this.ipcController = undefined;
    this.service = undefined;
  }
}
