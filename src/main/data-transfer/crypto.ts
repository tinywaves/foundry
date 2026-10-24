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

const magic = Buffer.from('FOUNDRYX', 'ascii');
const envelopeVersion = 1;
const prefixBytes = 13;
const headerMaximumBytes = 64 * 1024;
const authenticationTagBytes = 16;
const saltBytes = 16;
const nonceBytes = 12;
const keyBytes = 32;
const cipherName = 'aes-256-gcm';
const kdfName = 'scrypt';
const scryptParameters = {
  N: 131_072,
  r: 8,
  p: 1,
} as const;

type EnvelopeHeader = {
  version: typeof envelopeVersion;
  cipher: typeof cipherName;
  kdf: {
    name: typeof kdfName;
    salt: string;
    N: number;
    r: number;
    p: number;
    keyLength: number;
  };
  nonce: string;
};

type ValidatedHeader = {
  header: EnvelopeHeader;
  salt: Buffer;
  nonce: Buffer;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHeader(value: unknown): ValidatedHeader {
  if (!isRecord(value) || value.version !== envelopeVersion) {
    throw new Error('Unsupported export envelope');
  }
  if (value.cipher !== cipherName || !isRecord(value.kdf)) {
    throw new Error('Unsupported export encryption');
  }

  const kdf = value.kdf;
  if (
    kdf.name !== kdfName
    || typeof kdf.salt !== 'string'
    || typeof kdf.N !== 'number'
    || !Number.isSafeInteger(kdf.N)
    || kdf.N !== scryptParameters.N
    || typeof kdf.r !== 'number'
    || !Number.isSafeInteger(kdf.r)
    || kdf.r !== scryptParameters.r
    || typeof kdf.p !== 'number'
    || !Number.isSafeInteger(kdf.p)
    || kdf.p !== scryptParameters.p
    || kdf.keyLength !== keyBytes
    || typeof value.nonce !== 'string'
  ) {
    throw new Error('Invalid export key derivation parameters');
  }

  const salt = Buffer.from(kdf.salt, 'base64');
  const nonce = Buffer.from(value.nonce, 'base64');
  if (salt.byteLength !== saltBytes || nonce.byteLength !== nonceBytes) {
    throw new Error('Invalid export encryption parameters');
  }

  return {
    header: {
      version: envelopeVersion,
      cipher: cipherName,
      kdf: {
        name: kdfName,
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

function deriveKey(
  passphrase: string,
  salt: Buffer,
  parameters: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      passphrase,
      salt,
      keyBytes,
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

function createPrefix(headerLength: number): Buffer {
  const prefix = Buffer.alloc(prefixBytes);
  magic.copy(prefix, 0);
  prefix.writeUInt8(envelopeVersion, magic.byteLength);
  prefix.writeUInt32BE(headerLength, magic.byteLength + 1);
  return prefix;
}

function createCipherTransform(
  key: Buffer,
  nonce: Buffer,
  additionalData: Buffer,
): Transform {
  const cipher = createCipheriv(cipherName, key, nonce, {
    authTagLength: authenticationTagBytes,
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
        callback(
          null,
          Buffer.concat([cipher.final(), cipher.getAuthTag()]),
        );
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
  const decipher = createDecipheriv(cipherName, key, nonce, {
    authTagLength: authenticationTagBytes,
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

export async function encryptExportFile(
  inputPath: string,
  outputPath: string,
  passphrase: string,
): Promise<void> {
  const salt = randomBytes(saltBytes);
  const nonce = randomBytes(nonceBytes);
  const header: EnvelopeHeader = {
    version: envelopeVersion,
    cipher: cipherName,
    kdf: {
      name: kdfName,
      salt: salt.toString('base64'),
      ...scryptParameters,
      keyLength: keyBytes,
    },
    nonce: nonce.toString('base64'),
  };
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  const prefix = createPrefix(headerBytes.byteLength);
  const additionalData = Buffer.concat([prefix, headerBytes]);
  const key = await deriveKey(passphrase, salt, scryptParameters);

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
    if (fileSize <= prefixBytes + authenticationTagBytes) {
      throw new Error('The export file is incomplete');
    }

    const source = await open(inputPath, 'r');
    let prefix: Buffer;
    let headerBytes: Buffer;
    let authenticationTag: Buffer;
    try {
      prefix = await readAt(source, prefixBytes, 0);
      if (!prefix.subarray(0, magic.byteLength).equals(magic)) {
        throw new Error('The export file signature is invalid');
      }
      if (prefix.readUInt8(magic.byteLength) !== envelopeVersion) {
        throw new Error('The export envelope version is unsupported');
      }
      const headerLength = prefix.readUInt32BE(magic.byteLength + 1);
      if (headerLength === 0 || headerLength > headerMaximumBytes) {
        throw new Error('The export header is invalid');
      }
      if (fileSize <= prefixBytes + headerLength + authenticationTagBytes) {
        throw new Error('The export file is incomplete');
      }
      headerBytes = await readAt(source, headerLength, prefixBytes);
      authenticationTag = await readAt(
        source,
        authenticationTagBytes,
        fileSize - authenticationTagBytes,
      );
    } finally {
      await source.close();
    }

    const parsedJson: unknown = JSON.parse(headerBytes.toString('utf8'));
    const validated = readHeader(parsedJson);
    key = await deriveKey(passphrase, validated.salt, validated.header.kdf);
    const additionalData = Buffer.concat([prefix, headerBytes]);
    const ciphertextStart = prefixBytes + headerBytes.byteLength;
    const ciphertextEnd = fileSize - authenticationTagBytes - 1;

    await pipeline(
      createReadStream(inputPath, {
        start: ciphertextStart,
        end: ciphertextEnd,
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
    if (error instanceof DataTransferError) {
      throw error;
    }
    throw new DataTransferError(
      'INVALID_PASSPHRASE',
      'The passphrase is incorrect or the export file is corrupted',
      { cause: error },
    );
  } finally {
    key?.fill(0);
  }
}
