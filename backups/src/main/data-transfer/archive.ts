import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import type { Entry } from 'yauzl';
import yazl from 'yazl';
import {
  databaseEntryPath,
  manifestEntryPath,
  settingsEntryPath,
} from './format';

const maximumArchiveBytes = 4 * 1024 * 1024 * 1024;
const maximumManifestBytes = 1024 * 1024;
const allowedEntries = new Set([
  manifestEntryPath,
  databaseEntryPath,
  settingsEntryPath,
]);

export type ArchiveInputFile = {
  entryPath: string;
  filePath: string;
};

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

      zip.on('error', fail);
      zip.on('end', resolve);
      zip.on('entry', (entry: Entry) => {
        void (async () => {
          try {
            if (!allowedEntries.has(entry.fileName)) {
              throw new Error('The Foundry archive contains an unexpected file');
            }
            if (entry.fileName.endsWith('/') || extractedPaths.has(entry.fileName)) {
              throw new Error('The Foundry archive contains an invalid file');
            }

            const maximumBytes = entry.fileName === manifestEntryPath
              ? maximumManifestBytes
              : maximumArchiveBytes;
            totalBytes += entry.uncompressedSize;
            if (entry.uncompressedSize > maximumBytes || totalBytes > maximumArchiveBytes) {
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
          } catch (error) {
            fail(error);
          }
        })();
      });
      zip.readEntry();
    });
  } catch (error) {
    await rm(outputDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    zip.close();
  }

  for (const requiredEntry of allowedEntries) {
    if (!extractedPaths.has(requiredEntry)) {
      await rm(outputDirectory, { recursive: true, force: true });
      throw new Error('The Foundry archive is incomplete');
    }
  }

  return Object.fromEntries(extractedPaths);
}
