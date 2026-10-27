import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { ZipFile } from 'yazl';
import type { SkillApiErrorCode } from '../../shared/skill-contract';
import { SkillOperationError } from './skill-error';
import {
  SkillRemoteAcquisitionCoordinator,
} from './skill-remote-acquisition';
import { SkillStorePaths } from './skill-store-paths';

const operationId = '00000000-0000-4000-8000-000000000801';

interface ZipEntryFixture {
  name: string;
  content?: string;
  mode?: number;
  directory?: boolean;
}

async function createZip(entries: ZipEntryFixture[]): Promise<Buffer> {
  const archive = new ZipFile();
  for (const entry of entries) {
    if (entry.directory) {
      archive.addEmptyDirectory(entry.name, { mode: entry.mode });
    } else {
      archive.addBuffer(Buffer.from(entry.content ?? ''), entry.name, { mode: entry.mode });
    }
  }
  archive.end();
  const chunks: Buffer[] = [];
  for await (const chunk of archive.outputStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function responseFetch(
  archive: Buffer,
  status = 200,
  headers: Record<string, string> = {},
): typeof fetch {
  const fetchResponse: typeof fetch = () => Promise.resolve(new Response(toResponseBody(archive), {
    status,
    headers: {
      'content-length': String(archive.length),
      ...headers,
    },
  }));
  return fetchResponse;
}

function assertSkillError(
  operation: () => Promise<unknown>,
  code: SkillApiErrorCode,
): Promise<void> {
  return assert.rejects(operation, (error: unknown) => (
    error instanceof SkillOperationError && error.code === code
  ));
}

test('downloads, verifies, and extracts a bounded ZIP into private staging', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-remote-acquire-'));
  try {
    const archive = await createZip([
      { name: 'example/', directory: true },
      { name: 'example/SKILL.md', content: '# Example\n' },
      { name: 'example/references/guide.md', content: 'Guide\n' },
      {
        name: 'example/guide-link',
        content: 'references/guide.md',
        mode: 40_960 | 0o777,
      },
    ]);
    const digest = createHash('sha256').update(archive).digest('hex');
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const coordinator = new SkillRemoteAcquisitionCoordinator(paths, {
      createId: () => operationId,
      fetch: responseFetch(archive),
      now: () => 10,
    });
    await coordinator.initialize();

    const acquired = await coordinator.acquireZip({
      url: 'https://downloads.example.com/example.zip',
      expectedDigest: digest,
    });
    assert.equal(acquired.operationId, operationId);
    assert.equal(acquired.artifactDigest, digest);
    assert.equal(acquired.entryCount, 4);
    assert.equal(acquired.extractedBytes, 35);
    assert.equal(
      await readFile(path.join(acquired.contentRoot, 'example', 'SKILL.md'), 'utf8'),
      '# Example\n',
    );
    const manifestStats = await stat(path.join(acquired.contentRoot, 'example', 'SKILL.md'));
    assert.equal(manifestStats.mode & 0o777, 0o600);
    assert.equal(
      await readlink(path.join(acquired.contentRoot, 'example', 'guide-link')),
      'references/guide.md',
    );

    await coordinator.release(acquired.operationId);
    await assert.rejects(access(path.join(paths.remoteOperations, operationId)));
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});

test('validates every redirect and rejects digest mismatches without retaining staging', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-remote-redirect-'));
  try {
    const archive = await createZip([{ name: 'SKILL.md', content: '# Example\n' }]);
    const requestedUrls: string[] = [];
    const fetch: typeof globalThis.fetch = (input) => {
      let url: string;
      if (input instanceof Request) {
        url = input.url;
      } else if (input instanceof URL) {
        url = input.href;
      } else {
        url = input;
      }
      requestedUrls.push(url);
      if (requestedUrls.length === 1) {
        return Promise.resolve(new Response(null, {
          status: 302,
          headers: { location: 'https://cdn.example.com/example.zip' },
        }));
      }
      return Promise.resolve(new Response(toResponseBody(archive), { status: 200 }));
    };
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const coordinator = new SkillRemoteAcquisitionCoordinator(paths, {
      createId: () => operationId,
      fetch,
    });
    await assertSkillError(() => coordinator.acquireZip({
      url: 'https://downloads.example.com/example.zip',
      expectedDigest: 'f'.repeat(64),
    }), 'content-unavailable');
    assert.deepEqual(requestedUrls, [
      'https://downloads.example.com/example.zip',
      'https://cdn.example.com/example.zip',
    ]);
    assert.deepEqual(await readdir(paths.remoteOperations), []);
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});

test('enforces downloaded, expanded, per-file, and entry-count limits', async () => {
  const archive = await createZip([
    { name: 'SKILL.md', content: 'x'.repeat(64) },
    { name: 'guide.md', content: 'guide' },
  ]);
  const cases = [
    { policy: { maxDownloadBytes: 8 }, code: 'resource-limit' as const },
    { policy: { maxExtractedBytes: 32 }, code: 'resource-limit' as const },
    { policy: { maxFileBytes: 32 }, code: 'resource-limit' as const },
    { policy: { maxEntries: 1 }, code: 'resource-limit' as const },
  ];
  for (const [index, fixture] of cases.entries()) {
    const userHome = await mkdtemp(path.join(tmpdir(), `foundry-remote-limit-${index}-`));
    try {
      const paths = new SkillStorePaths(userHome);
      await paths.initialize();
      const coordinator = new SkillRemoteAcquisitionCoordinator(paths, {
        createId: () => operationId,
        fetch: responseFetch(archive),
        policy: fixture.policy,
      });
      await assertSkillError(() => coordinator.acquireZip({
        url: 'https://downloads.example.com/example.zip',
        expectedDigest: null,
      }), fixture.code);
      assert.deepEqual(await readdir(paths.remoteOperations), []);
    } finally {
      await rm(userHome, { recursive: true, force: true });
    }
  }
});

test('rejects archive traversal and symbolic-link entries', async () => {
  const normalArchive = await createZip([{ name: 'evil.txt', content: 'escape' }]);
  const traversalArchive = replaceAllBytes(normalArchive, 'evil.txt', '../x.txt');
  const symlinkArchive = await createZip([
    { name: 'SKILL.md', content: '# Example\n' },
    { name: 'linked', content: '../outside', mode: 40_960 | 0o777 },
  ]);
  for (const [index, archive] of [traversalArchive, symlinkArchive].entries()) {
    const userHome = await mkdtemp(path.join(tmpdir(), `foundry-remote-entry-${index}-`));
    try {
      const paths = new SkillStorePaths(userHome);
      await paths.initialize();
      const coordinator = new SkillRemoteAcquisitionCoordinator(paths, {
        createId: () => operationId,
        fetch: responseFetch(archive),
      });
      await assertSkillError(() => coordinator.acquireZip({
        url: 'https://downloads.example.com/example.zip',
        expectedDigest: null,
      }), 'content-unavailable');
      assert.deepEqual(await readdir(paths.remoteOperations), []);
    } finally {
      await rm(userHome, { recursive: true, force: true });
    }
  }
});

test('removes marker-owned interrupted operations and preserves ambiguous staging', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-remote-recovery-'));
  try {
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const operationRoot = path.join(paths.remoteOperations, operationId);
    await mkdir(operationRoot, { mode: 0o700 });
    await writeFile(path.join(operationRoot, 'operation.json'), JSON.stringify({
      version: 1,
      kind: 'remote-acquisition',
      phase: 'extracting',
      operationId,
      createdAt: 10,
    }));
    await writeFile(path.join(operationRoot, 'artifact.zip'), 'partial');
    await new SkillRemoteAcquisitionCoordinator(paths).initialize();
    assert.deepEqual(await readdir(paths.remoteOperations), []);

    await mkdir(operationRoot, { mode: 0o700 });
    await writeFile(path.join(operationRoot, 'operation.json'), '{invalid');
    await assertSkillError(
      () => new SkillRemoteAcquisitionCoordinator(paths).initialize(),
      'filesystem-unavailable',
    );
    const operationStats = await stat(operationRoot);
    assert.equal(operationStats.isDirectory(), true);
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});

test('maps aborted requests to a stable timeout without exposing the URL', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-remote-timeout-'));
  try {
    const fetch = ((_input: string | URL | Request, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('sensitive request detail', 'AbortError'));
        });
      })
    )) as typeof globalThis.fetch;
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const coordinator = new SkillRemoteAcquisitionCoordinator(paths, {
      createId: () => operationId,
      fetch,
      policy: { requestTimeoutMs: 5 },
    });
    await assertSkillError(() => coordinator.acquireZip({
      url: 'https://private.example.com/archive.zip?token=secret',
      expectedDigest: null,
    }), 'operation-timeout');
    assert.deepEqual(await readdir(paths.remoteOperations), []);
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});

function replaceAllBytes(input: Buffer, search: string, replacement: string): Buffer {
  assert.equal(Buffer.byteLength(search), Buffer.byteLength(replacement));
  const output = Buffer.from(input);
  const searchBuffer = Buffer.from(search);
  const replacementBuffer = Buffer.from(replacement);
  let offset = output.indexOf(searchBuffer);
  let replacements = 0;
  while (offset !== -1) {
    replacementBuffer.copy(output, offset);
    offset += replacementBuffer.length;
    replacements += 1;
    offset = output.indexOf(searchBuffer, offset);
  }
  assert.ok(replacements >= 2);
  return output;
}

function toResponseBody(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(buffer.length);
  body.set(buffer);
  return body;
}
