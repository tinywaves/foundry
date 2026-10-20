import { app, shell, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import process from 'node:process';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { openFoundryDatabase } from './database';
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
  updateLanguage,
  updateSettings,
} from './settings';
import type { LanguageMode } from './settings';

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
  // Set app user model id for windows
  electronApp.setAppUserModelId('foundry');

  const database = openFoundryDatabase(path.join(app.getPath('userData'), 'foundry.sqlite'));
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
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
  ipcMain.handle('settings:set-theme', (_, theme: 'system' | 'light' | 'dark') => updateSettings(settingsPath, theme));
  ipcMain.handle('settings:set-language', (_, language: LanguageMode) => updateLanguage(settingsPath, language));

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

  createWindow();

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
