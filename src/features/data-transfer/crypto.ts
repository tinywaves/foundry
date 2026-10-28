import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  chmod,
  open,
  rm,
  stat,
} from 'node:fs/promises';
import { Transform } from 'node:stream';
import type { TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DataTransferError } from './errors';

const MAGIC = Buffer.from('FOUNDRYX', 'ascii');
const ENVELOPE_VERSION = 1;
const PREFIX_BYTES = 13;
const HEADER_MAXIMUM_BYTES = 64 * 1024;
const AUTH_TAG_BYTES = 16;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const KEY_BYTES = 32;
const CIPHER_NAME = 'aes-256-gcm';
const KDF_NAME = 'scrypt';
const SCRYPT_PARAMETERS = {
  N: 131_072,
  r: 8,
  p: 1,
} as const;

interface EnvelopeHeader {
  version: typeof ENVELOPE_VERSION;
  cipher: typeof CIPHER_NAME;
  kdf: {
    name: typeof KDF_NAME;
    salt: string;
    N: number;
    r: number;
    p: number;
    keyLength: number;
  };
  nonce: string;
}

export async function encryptExportFile(
  inputPath: string,
  outputPath: string,
  passphrase: string,
): Promise<void> {
  const salt = randomBytes(SALT_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const header: EnvelopeHeader = {
    version: ENVELOPE_VERSION,
    cipher: CIPHER_NAME,
    kdf: {
      name: KDF_NAME,
      salt: salt.toString('base64'),
      ...SCRYPT_PARAMETERS,
      keyLength: KEY_BYTES,
    },
    nonce: nonce.toString('base64'),
  };
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  const prefix = createPrefix(headerBytes.byteLength);
  const additionalData = Buffer.concat([prefix, headerBytes]);
  const key = await deriveKey(passphrase, salt, SCRYPT_PARAMETERS);

  try {
    const handle = await open(outputPath, 'w', 0o600);
    try {
      await handle.write(additionalData);
    } finally {
      await handle.close();
    }

    await pipeline(
      createReadStream(inputPath),
      createCipherTransform(key, nonce, additionalData),
      createWriteStream(outputPath, {
        flags: 'r+',
        mode: 0o600,
        start: additionalData.byteLength,
      }),
    );
    await chmod(outputPath, 0o600);
  } catch (error) {
    await rm(outputPath, { force: true });
    throw new DataTransferError(
      'IO_ERROR',
      'Unable to encrypt the Foundry export',
      { cause: error },
    );
  } finally {
    key.fill(0);
  }
}

export async function decryptExportFile(
  inputPath: string,
  outputPath: string,
  passphrase: string,
): Promise<void> {
  let key: Buffer | undefined;
  try {
    const fileStats = await stat(inputPath);
    const fileSize = fileStats.size;
    if (fileSize <= PREFIX_BYTES + AUTH_TAG_BYTES) {
      throw new Error('The export file is incomplete');
    }

    const source = await open(inputPath, 'r');
    let prefix: Buffer;
    let headerBytes: Buffer;
    let authenticationTag: Buffer;
    try {
      prefix = await readAt(source, PREFIX_BYTES, 0);
      if (!prefix.subarray(0, MAGIC.byteLength).equals(MAGIC)) {
        throw new Error('The export file signature is invalid');
      }
      if (prefix.readUInt8(MAGIC.byteLength) !== ENVELOPE_VERSION) {
        throw new Error('The export envelope version is unsupported');
      }

      const headerLength = prefix.readUInt32BE(MAGIC.byteLength + 1);
      if (headerLength === 0 || headerLength > HEADER_MAXIMUM_BYTES) {
        throw new Error('The export header is invalid');
      }
      if (fileSize <= PREFIX_BYTES + headerLength + AUTH_TAG_BYTES) {
        throw new Error('The export file is incomplete');
      }

      headerBytes = await readAt(source, headerLength, PREFIX_BYTES);
      authenticationTag = await readAt(
        source,
        AUTH_TAG_BYTES,
        fileSize - AUTH_TAG_BYTES,
      );
    } finally {
      await source.close();
    }

    const parsed: unknown = JSON.parse(headerBytes.toString('utf8'));
    const validated = validateHeader(parsed);
    key = await deriveKey(passphrase, validated.salt, validated.header.kdf);
    const additionalData = Buffer.concat([prefix, headerBytes]);

    await pipeline(
      createReadStream(inputPath, {
        start: PREFIX_BYTES + headerBytes.byteLength,
        end: fileSize - AUTH_TAG_BYTES - 1,
      }),
      createDecipherTransform(
        key,
        validated.nonce,
        additionalData,
        authenticationTag,
      ),
      createWriteStream(outputPath, { mode: 0o600 }),
    );
    await chmod(outputPath, 0o600);
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error instanceof DataTransferError
      ? error
      : new DataTransferError(
          'INVALID_PASSPHRASE',
          'The passphrase is incorrect or the export file is corrupted',
          { cause: error },
        );
  } finally {
    key?.fill(0);
  }
}

function createPrefix(headerLength: number): Buffer {
  const prefix = Buffer.alloc(PREFIX_BYTES);
  MAGIC.copy(prefix, 0);
  prefix.writeUInt8(ENVELOPE_VERSION, MAGIC.byteLength);
  prefix.writeUInt32BE(headerLength, MAGIC.byteLength + 1);
  return prefix;
}

function deriveKey(
  passphrase: string,
  salt: Buffer,
  parameters: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      passphrase,
      salt,
      KEY_BYTES,
      {
        ...parameters,
        maxmem: Math.max(64 * 1024 * 1024, 256 * parameters.N * parameters.r),
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

function createCipherTransform(
  key: Buffer,
  nonce: Buffer,
  additionalData: Buffer,
): Transform {
  const cipher = createCipheriv(CIPHER_NAME, key, nonce, {
    authTagLength: AUTH_TAG_BYTES,
  });
  cipher.setAAD(additionalData);

  return new Transform({
    transform(chunk: Buffer, _encoding, callback: TransformCallback) {
      try {
        callback(null, cipher.update(chunk));
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
    flush(callback: TransformCallback) {
      try {
        callback(null, Buffer.concat([cipher.final(), cipher.getAuthTag()]));
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });
}

function createDecipherTransform(
  key: Buffer,
  nonce: Buffer,
  additionalData: Buffer,
  authenticationTag: Buffer,
): Transform {
  const decipher = createDecipheriv(CIPHER_NAME, key, nonce, {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAAD(additionalData);

  return new Transform({
    transform(chunk: Buffer, _encoding, callback: TransformCallback) {
      try {
        callback(null, decipher.update(chunk));
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
    flush(callback: TransformCallback) {
      try {
        decipher.setAuthTag(authenticationTag);
        callback(null, decipher.final());
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });
}

function validateHeader(value: unknown): {
  header: EnvelopeHeader;
  salt: Buffer;
  nonce: Buffer;
} {
  if (!isRecord(value) || value.version !== ENVELOPE_VERSION) {
    throw new Error('Unsupported export envelope');
  }
  if (value.cipher !== CIPHER_NAME || !isRecord(value.kdf)) {
    throw new Error('Unsupported export encryption');
  }

  const kdf = value.kdf;
  if (
    kdf.name !== KDF_NAME
    || typeof kdf.salt !== 'string'
    || kdf.N !== SCRYPT_PARAMETERS.N
    || kdf.r !== SCRYPT_PARAMETERS.r
    || kdf.p !== SCRYPT_PARAMETERS.p
    || kdf.keyLength !== KEY_BYTES
    || typeof value.nonce !== 'string'
  ) {
    throw new Error('Invalid export key derivation parameters');
  }

  const salt = Buffer.from(kdf.salt, 'base64');
  const nonce = Buffer.from(value.nonce, 'base64');
  if (salt.byteLength !== SALT_BYTES || nonce.byteLength !== NONCE_BYTES) {
    throw new Error('Invalid export encryption parameters');
  }

  return {
    header: {
      version: ENVELOPE_VERSION,
      cipher: CIPHER_NAME,
      kdf: {
        name: KDF_NAME,
        salt: kdf.salt,
        N: kdf.N,
        r: kdf.r,
        p: kdf.p,
        keyLength: kdf.keyLength,
      },
      nonce: value.nonce,
    },
    salt,
    nonce,
  };
}

async function readAt(
  handle: Awaited<ReturnType<typeof open>>,
  length: number,
  position: number,
): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, position);
  if (bytesRead !== length) {
    throw new Error('Unexpected end of export file');
  }

  return buffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
