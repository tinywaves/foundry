import { app, shell, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import process from 'node:process';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { openFoundryDatabase } from './database';
import { CaptureService } from './base/captures';
import { ScrapeJobRunner } from './base/scrape-job-runner';
import type { CaptureFilter } from '../shared/base';
import { initializeLogger, log } from './logger';
import {
  ensureFoundryHome,
  getFoundryDatabasePath,
  getFoundrySettingsPath,
} from './paths';
import {
  fetchProviderModels,
  fetchModelsForInput,
  getProvider,
  listProviders,
  saveProvider,
  setProviderStatus,
} from './providers';
import type { ProviderInput } from '../shared/providers';
import {
  getCurrentUsedProviderIds,
  readSettings,
  updateBaseSettings,
  updateRegion,
  updateLanguage,
  updateSettings,
  updateTimezone,
  writeSettings,
} from './settings';
import type { LanguageMode, RegionCode, TimeZoneCode } from './settings';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    // Keep the sidebar in its desktop layout instead of letting AppShell
    // switch to its mobile navigation breakpoint while resizing.
    minWidth: 800,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 13 },
    }),
    ...(process.platform === 'linux' && { icon }),
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    if (process.platform === 'darwin') {
      mainWindow.setWindowButtonPosition({ x: 16, y: 13 });
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
void app.whenReady().then(() => {
  initializeLogger();
  // Set app user model id for windows
  electronApp.setAppUserModelId('foundry');

  const configFolderPath = ensureFoundryHome();
  const database = openFoundryDatabase(getFoundryDatabasePath());
  const settingsPath = getFoundrySettingsPath();
  const scrapeJobRunner = new ScrapeJobRunner(
    database.db,
    settingsPath,
    (event) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send('base:scrape-job-finished', event);
      }
    },
  );
  const captureService = new CaptureService(database.db, settingsPath, scrapeJobRunner);
  app.on('will-quit', () => {
    database.client.close();
  });

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.handle('window:toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return false;
    }

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }

    return window.isMaximized();
  });

  ipcMain.handle('settings:get', () => readSettings(settingsPath));
  ipcMain.handle('settings:get-config-folder', () => configFolderPath);
  ipcMain.handle('settings:set-theme', (_, theme: 'system' | 'light' | 'dark') => updateSettings(settingsPath, theme));
  ipcMain.handle('settings:set-language', (_, language: LanguageMode) => updateLanguage(settingsPath, language));
  ipcMain.handle('settings:set-region', (_, region: RegionCode) => updateRegion(settingsPath, region));
  ipcMain.handle('settings:set-timezone', (_, timezone: TimeZoneCode) => updateTimezone(settingsPath, timezone));
  ipcMain.handle('settings:set-base', (_, patch: Parameters<typeof updateBaseSettings>[1]) => {
    log.info('ipc_call', { channel: 'settings:set-base' });
    const settings = updateBaseSettings(settingsPath, patch);
    scrapeJobRunner.notifySettingsChanged();
    return settings;
  });
  ipcMain.handle('settings:open-config-folder', async () => {
    const configFolder = ensureFoundryHome();
    writeSettings(settingsPath, readSettings(settingsPath));
    const error = await shell.openPath(configFolder);
    if (error) {
      throw new Error(error);
    }
  });

  ipcMain.handle('providers:list', () => listProviders(
    database.db,
    getCurrentUsedProviderIds(settingsPath),
  ));
  ipcMain.handle('providers:get', (_, id: string) => getProvider(database.db, id));
  ipcMain.handle('providers:save', (_, input: ProviderInput, id?: string) => saveProvider(
    database.db,
    input,
    id,
  ));
  ipcMain.handle(
    'providers:set-status',
    (_, id: string, status: 'active' | 'disabled' | 'deleted') => setProviderStatus(
      database.db,
      id,
      status,
      getCurrentUsedProviderIds(settingsPath),
    ),
  );
  ipcMain.handle('providers:fetch-models', (_, id: string) => fetchProviderModels(database.db, id));
  ipcMain.handle(
    'providers:fetch-models-input',
    (_, input: Pick<ProviderInput, 'protocol' | 'baseURL' | 'apiKey'>) => fetchModelsForInput(input),
  );

  const handleBaseIpc = (
    channel: string,
    handler: (...args: unknown[]) => unknown,
  ) => {
    ipcMain.handle(channel, (_event, ...args: unknown[]) => {
      log.info('ipc_call', { channel });
      return handler(...args);
    });
  };

  handleBaseIpc('base:captures:list', (filter) => captureService.list(filter as CaptureFilter | undefined));
  handleBaseIpc('base:captures:create', (input) => (
    captureService.create(input as Parameters<typeof captureService.create>[0])
  ));
  handleBaseIpc('base:captures:recapture', (captureId) => (
    captureService.recapture(captureId as string)
  ));
  handleBaseIpc('base:captures:delete', (captureId) => (
    captureService.delete(captureId as string)
  ));
  handleBaseIpc('base:captures:update-note', (captureId, userNote) => (
    captureService.updateNote(captureId as string, userNote as string)
  ));
  handleBaseIpc('base:jobs:list', (captureId) => captureService.listJobs(captureId as string));

  createWindow();
  scrapeJobRunner.start();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
