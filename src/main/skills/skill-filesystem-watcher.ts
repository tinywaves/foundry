import { watch } from 'chokidar';
import type { SkillWatchFactory } from './skill-watch-coordinator';

export const createSkillFilesystemWatcher: SkillWatchFactory = (
  paths,
  onChange,
  onError,
) => {
  const watcher = watch([...paths], {
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 25,
    },
    followSymlinks: false,
    ignoreInitial: true,
    persistent: true,
  });
  watcher.on('all', () => onChange());
  watcher.on('error', () => onError());
  return { close: () => watcher.close() };
};
