import { spawn } from 'node:child_process';
import process from 'node:process';

export function openPath(targetPath: string): void {
  const command = process.platform === 'darwin'
    ? 'open'
    : (process.platform === 'win32'
        ? 'explorer'
        : 'xdg-open');
  const child = spawn(command, [targetPath], {
    detached: true,
    stdio: 'ignore',
  });

  child.on('error', (error) => {
    console.error(`Unable to open ${targetPath}: ${error.message}`);
  });
  child.unref();
}
