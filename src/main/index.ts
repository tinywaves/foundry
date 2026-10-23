import { app, shell, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import process from 'node:process';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { openFoundryDatabase } from './database';
import { CaptureService } from './library/captures';
import { ScrapeJobRunner } from './library/scrape-job-runner';
import type { CaptureFilter } from '../shared/captures';
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
  formatCaptureCreationResult,
  formatRecordListResult,
  formatRecordResult,
  formatRecordTimes,
} from './ipc-format';
import {
  getCurrentUsedProviderIds,
  readSettings,
  updateLibrarySettings,
  updateLanguage,
  updateSettings,
  updateTimeFormat,
  updateTimezone,
  writeSettings,
} from './settings';
import type { LanguageMode, TimeFormatPattern, TimeZoneCode } from './settings';

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

  // HMR for the renderer when running under electron-vite.
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
        window.webContents.send('captures:scrape-job-finished', event);
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
  ipcMain.handle('settings:set-time-format', (_, timeFormat: TimeFormatPattern) => (
    updateTimeFormat(settingsPath, timeFormat)
  ));
  ipcMain.handle('settings:set-timezone', (_, timezone: TimeZoneCode) => updateTimezone(settingsPath, timezone));
  ipcMain.handle('settings:set-library', (_, patch: Parameters<typeof updateLibrarySettings>[1]) => {
    log.info('ipc_call', { channel: 'settings:set-library' });
    const settings = updateLibrarySettings(settingsPath, patch);
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

  ipcMain.handle('providers:list', () => {
    const settings = readSettings(settingsPath);
    return listProviders(
      database.db,
      getCurrentUsedProviderIds(settingsPath),
    ).map((provider) => formatRecordTimes(provider, settings));
  });
  ipcMain.handle('providers:get', (_, id: string) => {
    const provider = getProvider(database.db, id);
    return provider ? formatRecordTimes(provider, readSettings(settingsPath)) : null;
  });
  ipcMain.handle('providers:save', (_, input: ProviderInput, id?: string) => (
    formatRecordTimes(saveProvider(database.db, input, id), readSettings(settingsPath))
  ));
  ipcMain.handle(
    'providers:set-status',
    (_, id: string, status: 'active' | 'disabled' | 'deleted') => (
      formatRecordTimes(
        setProviderStatus(
          database.db,
          id,
          status,
          getCurrentUsedProviderIds(settingsPath),
        ),
        readSettings(settingsPath),
      )
    ),
  );
  ipcMain.handle('providers:fetch-models', (_, id: string) => fetchProviderModels(database.db, id));
  ipcMain.handle(
    'providers:fetch-models-input',
    (_, input: Pick<ProviderInput, 'protocol' | 'baseURL' | 'apiKey'>) => fetchModelsForInput(input),
  );

  const handleCaptureIpc = (
    channel: string,
    handler: (...args: unknown[]) => unknown,
  ) => {
    ipcMain.handle(channel, (_event, ...args: unknown[]) => {
      log.info('ipc_call', { channel });
      return handler(...args);
    });
  };

  handleCaptureIpc('captures:list', (filter) => {
    const settings = readSettings(settingsPath);
    return captureService.list(filter as CaptureFilter | undefined)
      .map((capture) => formatRecordTimes(capture, settings));
  });
  handleCaptureIpc('captures:count', () => captureService.counts());
  handleCaptureIpc('captures:get', (captureId) => {
    const settings = readSettings(settingsPath);
    const result = captureService.get(captureId as string);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true as const,
      data: {
        ...result.data,
        capture: formatRecordTimes(result.data.capture, settings),
      },
    };
  });
  handleCaptureIpc('captures:create', (input) => {
    const settings = readSettings(settingsPath);
    return formatCaptureCreationResult(
      captureService.create(input as Parameters<typeof captureService.create>[0]),
      settings,
    );
  });
  handleCaptureIpc('captures:recapture', (captureId) => {
    const settings = readSettings(settingsPath);
    return formatRecordResult(
      captureService.recapture(captureId as string),
      settings,
    );
  });
  handleCaptureIpc('captures:delete', (captureId) => (
    captureService.delete(captureId as string)
  ));
  handleCaptureIpc('captures:update-note', (captureId, userNote) => {
    const settings = readSettings(settingsPath);
    return formatRecordResult(
      captureService.updateNote(captureId as string, userNote as string),
      settings,
    );
  });
  handleCaptureIpc('captures:jobs:list', (captureId) => {
    const settings = readSettings(settingsPath);
    return formatRecordListResult(
      captureService.listJobs(captureId as string),
      settings,
    );
  });

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
