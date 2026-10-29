import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import type { Entry } from 'yauzl';
import yazl from 'yazl';
import {
  DATABASE_ENTRY_PATH,
  MANIFEST_ENTRY_PATH,
  SETTINGS_ENTRY_PATH,
} from './format';

export const MAXIMUM_ARCHIVE_BYTES = 4 * 1024 * 1024 * 1024;
const MAXIMUM_MANIFEST_BYTES = 1024 * 1024;
const ALLOWED_ENTRIES = new Set([
  MANIFEST_ENTRY_PATH,
  DATABASE_ENTRY_PATH,
  SETTINGS_ENTRY_PATH,
]);

export interface ArchiveInputFile {
  entryPath: string;
  filePath: string;
}

export async function createFoundryArchive(
  files: readonly ArchiveInputFile[],
  outputPath: string,
): Promise<void> {
  const zip = new yazl.ZipFile();
  for (const file of files) {
    zip.addFile(file.filePath, file.entryPath, { compress: true });
  }
  zip.end();
  await pipeline(zip.outputStream, createWriteStream(outputPath, { mode: 0o600 }));
}

export async function extractFoundryArchive(
  zipPath: string,
  outputDirectory: string,
): Promise<Record<string, string>> {
  const zip = await openZip(zipPath);
  const extractedPaths = new Map<string, string>();
  let totalBytes = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      const fail = (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const extractEntry = async (entry: Entry): Promise<void> => {
        if (!ALLOWED_ENTRIES.has(entry.fileName)) {
          throw new Error('The Foundry archive contains an unexpected file');
        }
        if (entry.fileName.endsWith('/') || extractedPaths.has(entry.fileName)) {
          throw new Error('The Foundry archive contains an invalid file');
        }

        const maximumBytes = entry.fileName === MANIFEST_ENTRY_PATH
          ? MAXIMUM_MANIFEST_BYTES
          : MAXIMUM_ARCHIVE_BYTES;
        totalBytes += entry.uncompressedSize;
        if (entry.uncompressedSize > maximumBytes || totalBytes > MAXIMUM_ARCHIVE_BYTES) {
          throw new Error('The Foundry archive is too large');
        }

        const destinationPath = path.join(outputDirectory, entry.fileName);
        await mkdir(path.dirname(destinationPath), { recursive: true });
        await pipeline(
          await openEntryStream(zip, entry),
          createWriteStream(destinationPath, { mode: 0o600 }),
        );
        extractedPaths.set(entry.fileName, destinationPath);
        zip.readEntry();
      };

      zip.on('error', fail);
      zip.on('end', resolve);
      zip.on('entry', (entry: Entry) => {
        void extractEntry(entry).catch(fail);
      });

      zip.readEntry();
    });
  } catch (error) {
    await rm(outputDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    zip.close();
  }

  for (const requiredEntry of ALLOWED_ENTRIES) {
    if (!extractedPaths.has(requiredEntry)) {
      await rm(outputDirectory, { recursive: true, force: true });
      throw new Error('The Foundry archive is incomplete');
    }
  }

  return Object.fromEntries(extractedPaths);
}

function openZip(zipPath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      zipPath,
      {
        autoClose: false,
        lazyEntries: true,
        strictFileNames: true,
      },
      (error, zip) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(zip);
      },
    );
  });
}

function openEntryStream(
  zip: yauzl.ZipFile,
  entry: Entry,
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stream);
    });
  });
}
