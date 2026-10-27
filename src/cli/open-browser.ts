import { spawn } from 'node:child_process';
import process from 'node:process';

export function openInBrowser(url: string): void {
  let command = 'xdg-open';
  let args = [url];

  if (process.platform === 'darwin') {
    command = 'open';
  } else if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', url];
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });

  child.on('error', (error) => {
    console.error(`Unable to open the browser: ${error.message}`);
  });
  child.unref();
}
