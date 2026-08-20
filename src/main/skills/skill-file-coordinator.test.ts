import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillFileCoordinator } from './skill-file-coordinator';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';

const packageId = '00000000-0000-4000-8000-000000000251';

test('lists and reads only bounded content from the selected Package BLOB', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-files-'));
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');
  try {
    await mkdir(path.join(source, 'references'), { recursive: true });
    await writeFile(path.join(source, 'SKILL.md'), '# Example\n');
    await writeFile(path.join(source, 'references', 'binary.bin'), Buffer.from([0, 1, 2]));
    await symlink('SKILL.md', path.join(source, 'manifest-link'));
    const store = new SkillStoreCoordinator(new SkillMetadataRepository(database), {
      createId: () => packageId,
    });
    await store.importPackage(source);
    const files = new SkillFileCoordinator(store);

    const entries = await files.listPackageFiles(packageId);
    assert.equal(entries.some((entry) => entry.relativePath === 'references'), true);
    assert.deepEqual(await files.readPackageFile({ skillId: packageId, relativePath: 'SKILL.md' }), {
      status: 'text',
      relativePath: 'SKILL.md',
      content: '# Example\n',
      size: 10,
    });
    const binary = await files.readPackageFile({
      skillId: packageId,
      relativePath: 'references/binary.bin',
    });
    assert.equal(binary.status, 'binary');
    const symbolicLink = await files.readPackageFile({
      skillId: packageId,
      relativePath: 'manifest-link',
    });
    assert.equal(symbolicLink.status, 'symbolic-link');
    const missing = await files.readPackageFile({
      skillId: packageId,
      relativePath: 'missing.md',
    });
    assert.equal(missing.status, 'missing');
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
