import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillFileCoordinator } from './skill-file-coordinator';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';

const packageId = '00000000-0000-4000-8000-000000000701';
const revisionId = '00000000-0000-4000-8000-000000000702';
const operationId = '00000000-0000-4000-8000-000000000703';
const secondPackageId = '00000000-0000-4000-8000-000000000704';
const secondRevisionId = '00000000-0000-4000-8000-000000000705';
const secondOperationId = '00000000-0000-4000-8000-000000000706';

test('lists package files and reads only bounded regular text files by relative path', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-files-'));
  const source = path.join(userHome, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(path.join(source, 'references'), { recursive: true });
    await writeFile(path.join(source, 'SKILL.md'), '# Package\n');
    await writeFile(path.join(source, 'references', 'guide.md'), 'Guide\n');
    await writeFile(path.join(source, 'large.txt'), '1234567');
    await writeFile(path.join(source, 'binary.dat'), Buffer.from([0, 1, 2, 3]));
    await symlink('SKILL.md', path.join(source, 'manifest-link'));
    await symlink('references', path.join(source, 'reference-link'));
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const initializedStore = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 10,
    });
    await initializedStore.initialize();
    await initializedStore.importPackage(source);
    const files = new SkillFileCoordinator(paths, repository, { maximumReadBytes: 6 });

    assert.deepEqual(await files.listPackageFiles(packageId), [
      { relativePath: 'SKILL.md', kind: 'file', size: 10 },
      { relativePath: 'binary.dat', kind: 'file', size: 4 },
      { relativePath: 'large.txt', kind: 'file', size: 7 },
      { relativePath: 'manifest-link', kind: 'symbolic-link', size: null },
      { relativePath: 'reference-link', kind: 'symbolic-link', size: null },
      { relativePath: 'references', kind: 'directory', size: null },
      { relativePath: 'references/guide.md', kind: 'file', size: 6 },
    ]);
    assert.deepEqual(await files.readPackageFile({
      skillId: packageId,
      relativePath: 'references/guide.md',
    }), {
      status: 'text',
      relativePath: 'references/guide.md',
      content: 'Guide\n',
      size: 6,
    });
    assert.deepEqual(await files.readPackageFile({
      skillId: packageId,
      relativePath: 'binary.dat',
    }), {
      status: 'binary',
      relativePath: 'binary.dat',
      size: 4,
    });
    assert.deepEqual(await files.readPackageFile({
      skillId: packageId,
      relativePath: 'large.txt',
    }), {
      status: 'oversized',
      relativePath: 'large.txt',
      size: 7,
    });
    assert.deepEqual(await files.readPackageFile({
      skillId: packageId,
      relativePath: 'manifest-link',
    }), {
      status: 'symbolic-link',
      relativePath: 'manifest-link',
      size: null,
    });
    assert.deepEqual(await files.readPackageFile({
      skillId: packageId,
      relativePath: 'missing.md',
    }), {
      status: 'missing',
      relativePath: 'missing.md',
      size: null,
    });
    await assert.rejects(() => files.readPackageFile({
      skillId: packageId,
      relativePath: '../outside',
    }));
    await assert.rejects(() => files.readPackageFile({
      skillId: packageId,
      relativePath: 'reference-link/guide.md',
    }));

    assert.deepEqual(await files.listRevisionFiles(packageId, revisionId), [
      { relativePath: 'SKILL.md', kind: 'file', size: 10 },
      { relativePath: 'binary.dat', kind: 'file', size: 4 },
      { relativePath: 'large.txt', kind: 'file', size: 7 },
      { relativePath: 'manifest-link', kind: 'symbolic-link', size: null },
      { relativePath: 'reference-link', kind: 'symbolic-link', size: null },
      { relativePath: 'references', kind: 'directory', size: null },
      { relativePath: 'references/guide.md', kind: 'file', size: 6 },
    ]);
    assert.deepEqual(await files.readRevisionFile({
      skillId: packageId,
      revisionId,
      relativePath: 'SKILL.md',
    }), {
      status: 'oversized',
      relativePath: 'SKILL.md',
      size: 10,
    });
    await writeFile(
      path.join(paths.packages, packageId, 'references', 'guide.md'),
      'Changed\n',
    );
    assert.deepEqual(await files.readRevisionFile({
      skillId: packageId,
      revisionId,
      relativePath: 'references/guide.md',
    }), {
      status: 'text',
      relativePath: 'references/guide.md',
      content: 'Guide\n',
      size: 6,
    });

    const secondSource = path.join(userHome, 'second-source');
    await mkdir(secondSource);
    await writeFile(path.join(secondSource, 'SKILL.md'), '# Other\n');
    const secondIds = [secondPackageId, secondRevisionId, secondOperationId];
    const secondStore = new SkillStoreCoordinator(paths, repository, {
      createId: () => secondIds.shift()!,
      now: () => 20,
    });
    await secondStore.importPackage(secondSource);
    await assert.rejects(() => files.listRevisionFiles(packageId, secondRevisionId));
    await assert.rejects(() => files.readRevisionFile({
      skillId: packageId,
      revisionId: secondRevisionId,
      relativePath: 'SKILL.md',
    }));

    const unreadablePath = path.join(paths.packages, packageId, 'references', 'guide.md');
    if (process.platform !== 'win32' && (process.getuid?.() ?? 0) !== 0) {
      await chmod(unreadablePath, 0o000);
      assert.deepEqual(await files.readPackageFile({
        skillId: packageId,
        relativePath: 'references/guide.md',
      }), {
        status: 'unreadable',
        relativePath: 'references/guide.md',
        size: null,
      });
      await chmod(unreadablePath, 0o600);
    }

    const storePackagePath = path.join(paths.packages, packageId);
    await rm(storePackagePath, { recursive: true });
    await symlink(source, storePackagePath);
    await assert.rejects(() => files.listPackageFiles(packageId));
    await assert.rejects(() => files.readPackageFile({
      skillId: packageId,
      relativePath: 'SKILL.md',
    }));
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});
