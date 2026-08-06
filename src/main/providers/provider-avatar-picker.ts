import { Buffer } from 'node:buffer';
import { open } from 'node:fs/promises';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import { dialog } from 'electron';
import type {
  ProviderAvatarSelection,
} from '../../shared/provider-contract';
import { invalidProviderField, ProviderOperationError } from './provider-error';
import {
  inferProviderAvatarMimeType,
  PROVIDER_MAX_AVATAR_BYTES,
} from './provider-validation';

const pickerFilters = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];

export function createProviderAvatarSelection(
  fileName: string,
  sourceBytes: Uint8Array,
): ProviderAvatarSelection {
  if (sourceBytes.byteLength === 0 || sourceBytes.byteLength > PROVIDER_MAX_AVATAR_BYTES) {
    return invalidProviderField('avatar.bytes', 'Avatar must be no larger than 2 MB.');
  }

  const mimeType = inferProviderAvatarMimeType(sourceBytes);
  if (mimeType === null) {
    return invalidProviderField('avatar.bytes', 'Choose a PNG, JPEG, or WebP image.');
  }

  const bytes = new Uint8Array(sourceBytes.byteLength);
  bytes.set(sourceBytes);
  return {
    fileName: path.basename(fileName),
    avatar: { mimeType, bytes },
  };
}

export async function readProviderAvatarFile(filePath: string): Promise<ProviderAvatarSelection> {
  let file;
  try {
    file = await open(filePath, 'r');
    const stats = await file.stat();
    if (!stats.isFile()) {
      return invalidProviderField('avatar.bytes', 'Choose an image file.');
    }
    if (stats.size === 0 || stats.size > PROVIDER_MAX_AVATAR_BYTES) {
      return invalidProviderField('avatar.bytes', 'Avatar must be no larger than 2 MB.');
    }

    const bytes = Buffer.alloc(stats.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const readResult = await file.read(bytes, offset, bytes.byteLength - offset, offset);
      const bytesRead = Number(readResult.bytesRead);
      if (bytesRead === 0) {
        break;
      }
      offset += bytesRead;
    }
    if (offset !== bytes.byteLength) {
      return invalidProviderField('avatar.bytes', 'The selected image could not be read.');
    }
    return createProviderAvatarSelection(filePath, bytes);
  } catch (error) {
    if (error instanceof ProviderOperationError) {
      throw error;
    }
    throw new ProviderOperationError('internal', 'The selected avatar could not be read.');
  } finally {
    if (file) {
      try {
        await file.close();
      } catch {
        // The read result is already determined; close failure must not expose the selected path.
      }
    }
  }
}

export async function selectProviderAvatar(
  parentWindow: BrowserWindow,
): Promise<ProviderAvatarSelection | null> {
  const result = await dialog.showOpenDialog(parentWindow, {
    title: 'Choose provider avatar',
    properties: ['openFile'],
    filters: pickerFilters,
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return readProviderAvatarFile(result.filePaths[0]);
}
