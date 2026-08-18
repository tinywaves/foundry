import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { constants } from 'node:fs';
import { lstat, open, readdir, readlink } from 'node:fs/promises';
import path from 'node:path';

interface PackageEntry {
  kind: 'directory' | 'file' | 'symbolic-link';
  relativePath: string;
  absolutePath: string;
}

export async function fingerprintSkillPackage(packageRoot: string): Promise<string> {
  const rootStats = await lstat(packageRoot);
  if (!rootStats.isDirectory()) {
    throw new Error('Skill Package root must be a directory.');
  }

  const entries = await collectEntries(packageRoot);
  entries.sort((left, right) => Buffer.compare(
    Buffer.from(left.relativePath),
    Buffer.from(right.relativePath),
  ));

  const hash = createHash('sha256');
  hash.update('foundry-skill-package-v1\0');
  for (const entry of entries) {
    updateFramed(hash, Buffer.from(entry.kind));
    updateFramed(hash, Buffer.from(entry.relativePath));
    if (entry.kind === 'file') {
      updateFramed(hash, await readRegularFileWithoutFollowing(entry.absolutePath));
    } else if (entry.kind === 'symbolic-link') {
      updateFramed(hash, await readlink(entry.absolutePath, { encoding: 'buffer' }));
    }
  }
  return hash.digest('hex');
}

async function readRegularFileWithoutFollowing(filePath: string): Promise<Buffer> {
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const fileStats = await handle.stat();
    if (!fileStats.isFile()) {
      throw new Error('Skill Package file entry changed type while being read.');
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function collectEntries(packageRoot: string): Promise<PackageEntry[]> {
  const entries: PackageEntry[] = [];

  async function visit(relativeDirectory: string): Promise<void> {
    const absoluteDirectory = resolveContainedPath(packageRoot, relativeDirectory);
    const children = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const child of children) {
      const relativePath = toFingerprintPath(path.join(relativeDirectory, child.name));
      const absolutePath = resolveContainedPath(packageRoot, relativePath);
      if (child.isDirectory()) {
        entries.push({ kind: 'directory', relativePath, absolutePath });
        await visit(relativePath);
      } else if (child.isFile()) {
        entries.push({ kind: 'file', relativePath, absolutePath });
      } else if (child.isSymbolicLink()) {
        entries.push({ kind: 'symbolic-link', relativePath, absolutePath });
      } else {
        throw new Error(`Unsupported Skill Package entry: ${relativePath}`);
      }
    }
  }

  await visit('');
  return entries;
}

function resolveContainedPath(packageRoot: string, relativePath: string): string {
  const resolvedRoot = path.resolve(packageRoot);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const containment = path.relative(resolvedRoot, resolvedPath);
  if (containment === '..' || containment.startsWith(`..${path.sep}`) || path.isAbsolute(containment)) {
    throw new Error('Skill Package traversal escaped its root.');
  }
  return resolvedPath;
}

function toFingerprintPath(value: string): string {
  return value.split(path.sep).join('/');
}

function updateFramed(hash: ReturnType<typeof createHash>, value: Buffer): void {
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(value.length));
  hash.update(length);
  hash.update(value);
}
