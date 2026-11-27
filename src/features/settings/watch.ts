import { watch } from 'node:fs';

export function watchSettings(directory: string, onChanged: () => void): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const watcher = watch(directory, { persistent: false }, (_event, filename) => {
    if (filename !== null && filename !== 'settings.json') {
      return;
    }
    clearTimeout(timeout);
    timeout = setTimeout(onChanged, 30);
    timeout.unref();
  });
  watcher.on('error', () => {
    console.error('Unable to watch Foundry settings');
  });
  return () => {
    clearTimeout(timeout);
    watcher.close();
  };
}
