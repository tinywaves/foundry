import log from 'electron-log/main';

export function initializeLogger(): void {
  log.initialize();
  log.transports.console.level = 'debug';
  log.transports.file.level = 'info';
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.errorHandler.startCatching();
}

export { default as log } from 'electron-log/main';
