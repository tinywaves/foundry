import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { ProviderOperationError } from './provider-error';
import {
  createProviderAvatarSelection,
  readProviderAvatarFile,
} from './provider-avatar-picker';
import { PROVIDER_MAX_AVATAR_BYTES } from './provider-validation';

const pngBytes = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const jpegBytes = Uint8Array.from([0xFF, 0xD8, 0xFF]);
const webpBytes = Uint8Array.from([
  0x52,
  0x49,
  0x46,
  0x46,
  0x00,
  0x00,
  0x00,
  0x00,
  0x57,
  0x45,
  0x42,
  0x50,
]);

function assertAvatarError(operation: () => unknown): ProviderOperationError {
  let caught: ProviderOperationError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof ProviderOperationError)) {
      return false;
    }
    caught = error;
    return error.code === 'invalid-input' && error.fields?.[0]?.field === 'avatar.bytes';
  });
  assert.ok(caught);
  return caught;
}

test('infers accepted avatar MIME types and exposes only a basename', () => {
  assert.deepEqual(createProviderAvatarSelection('/private/folder/avatar.png', pngBytes), {
    fileName: 'avatar.png',
    avatar: { mimeType: 'image/png', bytes: pngBytes },
  });
  assert.equal(createProviderAvatarSelection('avatar.jpg', jpegBytes).avatar.mimeType, 'image/jpeg');
  assert.equal(createProviderAvatarSelection('avatar.webp', webpBytes).avatar.mimeType, 'image/webp');
});

test('rejects empty, unsupported, and oversized avatar payloads', () => {
  assertAvatarError(() => createProviderAvatarSelection('empty.png', new Uint8Array()));
  assertAvatarError(() => createProviderAvatarSelection(
    'spoofed.png',
    Uint8Array.from([0x47, 0x49, 0x46, 0x38]),
  ));
  assertAvatarError(() => createProviderAvatarSelection(
    'oversized.png',
    new Uint8Array(PROVIDER_MAX_AVATAR_BYTES + 1),
  ));
});

test('reads selected avatar bytes without returning its filesystem path', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-avatar-picker-'));
  const filename = path.join(directory, 'private-avatar.png');
  try {
    writeFileSync(filename, pngBytes);
    const selection = await readProviderAvatarFile(filename);
    assert.equal(selection.fileName, 'private-avatar.png');
    assert.equal(JSON.stringify(selection).includes(directory), false);
    assert.deepEqual(selection.avatar, { mimeType: 'image/png', bytes: pngBytes });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
