import { createHash } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DATA_BACKUP_ENTRY } from '@dhzh/foundry-shared';

import type { FoundryStorage } from '../../storage/store';
import { extractFoundryArchive } from '../../lib/backup/archive';
import { decryptExportFile } from '../../lib/backup/crypto';
import { BackupCryptoError } from '../../lib/backup/errors';
import { removeBackupDirectory } from '../../lib/backup/temporary';
import { DataImportError, parseDataBackupManifest, parseImportData } from './contracts';
import { replaceImportedData } from './repository';

export class DataImportService {
  constructor(private readonly storage: FoundryStorage) {}

  async importData(sourcePath: string, passphrase: string): Promise<void> {
    const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-'));
    try {
      const zipPath = path.join(directory, 'backup.zip');
      await decryptExportFile(sourcePath, zipPath, passphrase);
      const files = await extractFoundryArchive(zipPath, path.join(directory, 'extracted'));
      const manifest = parseDataBackupManifest(JSON.parse(await readFile(files['manifest.json'], 'utf8')));
      const bytes = await readFile(files[DATA_BACKUP_ENTRY]);
      if (bytes.byteLength !== manifest.data.bytes || createHash('sha256').update(bytes).digest('hex') !== manifest.data.sha256) {
        throw new DataImportError('INVALID_BACKUP', 'Backup checksum does not match');
      }
      const data = parseImportData(JSON.parse(bytes.toString('utf8')));
      try {
        replaceImportedData(this.storage, data);
      } catch {
        throw new DataImportError('IMPORT_FAILED', 'Unable to import data');
      }
    } catch (error) {
      if (error instanceof DataImportError) {
        throw error;
      }
      if (error instanceof BackupCryptoError) {
        throw error.code === 'INVALID_PASSPHRASE'
          ? new DataImportError('INVALID_PASSPHRASE', 'Incorrect passphrase or corrupted backup')
          : new DataImportError('IMPORT_FAILED', 'Unable to read or decrypt the backup file');
      }
      throw new DataImportError('INVALID_BACKUP', 'The backup is invalid or unsupported');
    } finally {
      await removeBackupDirectory(directory);
    }
  }
}
