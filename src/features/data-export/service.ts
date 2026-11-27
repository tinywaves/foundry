import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DATA_BACKUP_ENTRY, DATA_BACKUP_FORMAT, DATA_BACKUP_VERSION } from '@dhzh/foundry-shared';
import type { DataBackupManifest } from '@dhzh/foundry-shared';

import packageJson from '../../../package.json' with { type: 'json' };
import type { FoundryStorage } from '../../storage/store';
import { createFoundryArchive } from '../../lib/backup/archive';
import { encryptExportFile } from '../../lib/backup/crypto';
import { removeBackupDirectory } from '../../lib/backup/temporary';
import { readExportData } from './repository';

export class DataExportService {
  constructor(private readonly storage: FoundryStorage) {}

  async createExport(passphrase: string) {
    const data = readExportData(this.storage);
    const directory = await mkdtemp(path.join(tmpdir(), 'foundry-export-'));
    try {
      const createdAt = new Date().toISOString();
      const dataJSON = JSON.stringify(data, null, 2);
      const dataPath = path.join(directory, 'foundry.json');
      const manifestPath = path.join(directory, 'manifest.json');
      const archivePath = path.join(directory, 'foundry.zip');
      const encryptedPath = path.join(directory, 'foundry.foundry-backup');
      const manifest: DataBackupManifest = {
        format: DATA_BACKUP_FORMAT,
        archiveVersion: DATA_BACKUP_VERSION,
        appVersion: packageJson.version,
        createdAt,
        data: {
          path: DATA_BACKUP_ENTRY,
          bytes: Buffer.byteLength(dataJSON, 'utf8'),
          sha256: createHash('sha256').update(dataJSON).digest('hex'),
        },
      };
      await writeFile(dataPath, dataJSON, { mode: 0o600 });
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
      await createFoundryArchive([
        { entryPath: 'manifest.json', filePath: manifestPath },
        { entryPath: DATA_BACKUP_ENTRY, filePath: dataPath },
      ], archivePath);
      await encryptExportFile(archivePath, encryptedPath, passphrase);
      return {
        fileName: `foundry-${createdAt.replaceAll(':', '-')}.foundry-backup`,
        contents: await readFile(encryptedPath),
      };
    } finally {
      await removeBackupDirectory(directory);
    }
  }
}
