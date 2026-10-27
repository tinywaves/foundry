import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { ZipFile } from 'yazl';
import {
  encodeSkillPackage,
  inspectSkillPackage,
  materializeSkillPackage,
  SkillPackageCodecError,
} from './skill-package-codec';

const fixedTimestamp = new Date(1980, 0, 1);

test('encodes deterministically and round trips every supported entry fact', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-codec-'));
  const packageRoot = path.join(temporaryRoot, 'package');
  const destinationRoot = path.join(temporaryRoot, 'materialized');

  try {
    await mkdir(path.join(packageRoot, 'empty'), { recursive: true });
    await mkdir(path.join(packageRoot, 'scripts'));
    await writeFile(path.join(packageRoot, 'SKILL.md'), '# Example\n');
    await writeFile(path.join(packageRoot, 'scripts', 'run.sh'), '#!/bin/sh\necho ready\n');
    await chmod(path.join(packageRoot, 'scripts', 'run.sh'), 0o755);
    await symlink('scripts/run.sh', path.join(packageRoot, 'run'));

    const first = await encodeSkillPackage(packageRoot);
    const second = await encodeSkillPackage(packageRoot);

    assert.match(first.fingerprint, /^v2:[0-9a-f]{64}$/);
    assert.deepEqual(second.content, first.content);
    assert.equal(second.fingerprint, first.fingerprint);

    const materialized = await materializeSkillPackage(
      first.content,
      destinationRoot,
      { expectedFingerprint: first.fingerprint },
    );
    assert.equal(materialized.fingerprint, first.fingerprint);
    assert.equal(await readFile(path.join(destinationRoot, 'SKILL.md'), 'utf8'), '# Example\n');
    assert.equal(await readlink(path.join(destinationRoot, 'run')), 'scripts/run.sh');
    const emptyDirectoryStats = await lstat(path.join(destinationRoot, 'empty'));
    const executableStats = await lstat(path.join(destinationRoot, 'scripts', 'run.sh'));
    assert.equal(emptyDirectoryStats.isDirectory(), true);
    assert.notEqual(executableStats.mode & 0o111, 0);

    const reencoded = await encodeSkillPackage(destinationRoot);
    assert.deepEqual(reencoded.content, first.content);
    assert.equal(reencoded.fingerprint, first.fingerprint);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('resolves a symbolic-link package root and retains internal symbolic links', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-codec-root-link-'));
  const entityRoot = path.join(temporaryRoot, 'entity');
  const linkedRoot = path.join(temporaryRoot, 'linked');

  try {
    await mkdir(entityRoot);
    await writeFile(path.join(entityRoot, 'SKILL.md'), '# Linked\n');
    await symlink('SKILL.md', path.join(entityRoot, 'manifest-link'));
    await symlink(entityRoot, linkedRoot);

    const encoded = await encodeSkillPackage(linkedRoot);
    const inspected = await inspectSkillPackage(encoded.content);

    assert.deepEqual(
      inspected.entries.map((entry) => [entry.relativePath, entry.kind]),
      [
        ['SKILL.md', 'file'],
        ['manifest-link', 'symbolic-link'],
      ],
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('enforces entry and uncompressed-byte limits at encoding boundaries', async () => {
  const packageRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-codec-limits-'));

  try {
    await writeFile(path.join(packageRoot, 'SKILL.md'), '1234');
    const atBoundary = await encodeSkillPackage(packageRoot, {
      maxEntries: 1,
      maxUncompressedBytes: 4,
    });
    assert.equal(atBoundary.uncompressedBytes, 4);

    await assert.rejects(
      encodeSkillPackage(packageRoot, { maxEntries: 1, maxUncompressedBytes: 3 }),
      matchesCodecError('resource-limit'),
    );
    await writeFile(path.join(packageRoot, 'extra.txt'), 'x');
    await assert.rejects(
      encodeSkillPackage(packageRoot, { maxEntries: 1, maxUncompressedBytes: 5 }),
      matchesCodecError('resource-limit'),
    );
  } finally {
    await rm(packageRoot, { recursive: true, force: true });
  }
});

test('rejects roots without a regular SKILL.md', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-codec-manifest-'));

  try {
    await writeFile(path.join(temporaryRoot, 'README.md'), 'No manifest');
    await assert.rejects(encodeSkillPackage(temporaryRoot), matchesCodecError('invalid-root'));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('rejects duplicate normalized paths, missing parents, and malformed Unix modes', async () => {
  const duplicate = await createZip([
    { name: 'SKILL.md', mode: 0o10_0644, content: '# Example\n' },
    { name: 'A.txt', mode: 0o10_0644, content: 'first' },
    { name: 'a.txt', mode: 0o10_0644, content: 'second' },
  ]);
  await assert.rejects(inspectSkillPackage(duplicate), matchesCodecError('unsafe-path'));

  const missingParent = await createZip([
    { name: 'SKILL.md', mode: 0o10_0644, content: '# Example\n' },
    { name: 'nested/file.txt', mode: 0o10_0644, content: 'value' },
  ]);
  await assert.rejects(inspectSkillPackage(missingParent), matchesCodecError('invalid-archive'));

  const malformedMode = await createZip([{ name: 'SKILL.md', mode: 0o10_0600, content: '# Example\n' }]);
  await assert.rejects(inspectSkillPackage(malformedMode), matchesCodecError('unsupported-entry'));

  const unsupportedType = await createZip([
    { name: 'SKILL.md', mode: 0o10_0644, content: '# Example\n' },
    { name: 'pipe', mode: 0o01_0644, content: '' },
  ]);
  await assert.rejects(inspectSkillPackage(unsupportedType), matchesCodecError('unsupported-entry'));
});

test('rejects unsafe and invalid UTF-8 archive paths', async () => {
  const archive = await createZip([
    { name: 'SKILL.md', mode: 0o10_0644, content: '# Example\n' },
    { name: 'evil.txt', mode: 0o10_0644, content: 'value' },
  ]);

  const traversal = replaceAllBytes(archive, Buffer.from('evil.txt'), Buffer.from('../x.txt'));
  await assert.rejects(inspectSkillPackage(traversal), matchesCodecError());

  const invalidUtf8Name = Buffer.from([0x62, 0x61, 0x64, 0xFF, 0x2E, 0x74, 0x78, 0x74]);
  const invalidUtf8 = replaceAllBytes(archive, Buffer.from('evil.txt'), invalidUtf8Name);
  await assert.rejects(inspectSkillPackage(invalidUtf8), matchesCodecError());
});

test('validates CRC, declared limits, and expected fingerprints before materializing', async () => {
  const archive = await createZip([{ name: 'SKILL.md', mode: 0o10_0644, content: '# Example\n' }]);
  const centralDirectory = archive.indexOf(Buffer.from([0x50, 0x4B, 0x01, 0x02]));
  assert.notEqual(centralDirectory, -1);
  const corrupted = Buffer.from(archive);
  corrupted.writeUInt32LE((corrupted.readUInt32LE(centralDirectory + 16) ^ 1) >>> 0, centralDirectory + 16);

  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-codec-corrupt-'));
  const destination = path.join(temporaryRoot, 'destination');
  try {
    await assert.rejects(
      materializeSkillPackage(corrupted, destination),
      matchesCodecError('invalid-archive'),
    );
    await assert.rejects(lstat(destination), { code: 'ENOENT' });

    await assert.rejects(
      inspectSkillPackage(archive, { limits: { maxEntries: 1, maxUncompressedBytes: 1 } }),
      matchesCodecError('resource-limit'),
    );
    await assert.rejects(
      inspectSkillPackage(archive, { expectedFingerprint: `v2:${'0'.repeat(64)}` }),
      matchesCodecError('invalid-archive'),
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

interface TestZipEntry {
  name: string;
  mode: number;
  content: string;
}

function createZip(entries: TestZipEntry[]): Promise<Buffer> {
  const writer = new ZipFile();
  const output = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    writer.once('error', reject);
    writer.outputStream.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    writer.outputStream.once('error', reject);
    writer.outputStream.once('end', () => resolve(Buffer.concat(chunks)));
  });
  for (const entry of entries) {
    writer.addBuffer(Buffer.from(entry.content), entry.name, {
      mtime: fixedTimestamp,
      forceDosTimestamp: true,
      mode: entry.mode,
    });
  }
  writer.end();
  return output;
}

function replaceAllBytes(source: Buffer, search: Buffer, replacement: Buffer): Buffer {
  assert.equal(search.length, replacement.length);
  const result = Buffer.from(source);
  let replacements = 0;
  let nextOffset = result.indexOf(search);
  while (nextOffset !== -1) {
    replacement.copy(result, nextOffset);
    nextOffset = result.indexOf(search, nextOffset + replacement.length);
    replacements += 1;
  }
  assert.equal(replacements, 2);
  return result;
}

function matchesCodecError(code?: SkillPackageCodecError['code']): (error: unknown) => boolean {
  return (error) => (
    error instanceof SkillPackageCodecError
    && (code === undefined || error.code === code)
  );
}
