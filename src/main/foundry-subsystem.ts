import type { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import { PromptSubsystem } from './prompts/prompt-subsystem';
import { ProviderSubsystem } from './providers/provider-subsystem';
import { RuntimeSubsystem } from './runtimes/runtime-subsystem';
import { SettingsSubsystem } from './settings/settings-subsystem';
import { SkillSubsystem } from './skills/skill-subsystem';
import { initializeFoundryDatabase } from './storage/foundry-database';
import { toFoundryStorageError } from './storage/storage-error';

export class FoundrySubsystem {
  private readonly promptSubsystem = new PromptSubsystem();
  private readonly providerSubsystem = new ProviderSubsystem();
  private readonly runtimeSubsystem = new RuntimeSubsystem();
  private readonly settingsSubsystem = new SettingsSubsystem();
  private readonly skillSubsystem = new SkillSubsystem();
  private database: Database.Database | undefined;

  async initialize(databaseFilename: string, userHomeDirectory: string): Promise<void> {
    try {
      this.database = await initializeFoundryDatabase(databaseFilename, { userHomeDirectory });
      this.promptSubsystem.initialize(this.database);
      this.providerSubsystem.initialize(this.database);
      this.runtimeSubsystem.initialize(this.database, userHomeDirectory);
      this.settingsSubsystem.initialize(this.database);
      await this.skillSubsystem.initialize(this.database, userHomeDirectory);
    } catch (error) {
      const storageError = toFoundryStorageError(error);
      console.error(`[storage] initialization failed with ${storageError.code}.`);
      this.promptSubsystem.initialize(storageError);
      this.providerSubsystem.initialize(storageError);
      this.runtimeSubsystem.initialize(storageError, userHomeDirectory);
      this.settingsSubsystem.initialize(storageError);
      await this.skillSubsystem.initialize(storageError, userHomeDirectory);
    }
  }

  registerWindow(window: BrowserWindow): void {
    this.promptSubsystem.registerWindow(window);
    this.providerSubsystem.registerWindow(window);
    this.runtimeSubsystem.registerWindow(window);
    this.settingsSubsystem.registerWindow(window);
    this.skillSubsystem.registerWindow(window);
  }

  async close(): Promise<void> {
    this.promptSubsystem.close();
    this.providerSubsystem.close();
    this.runtimeSubsystem.close();
    this.settingsSubsystem.close();
    await this.skillSubsystem.close();
    try {
      this.database?.close();
    } catch {
      console.error('[storage] database close failed.');
    }
    this.database = undefined;
  }
}
