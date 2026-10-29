import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { BundledSkillCopyService } from '../src/features/settings/skill-copy-service';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('copies the skill into every selected user-level target', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-skill-copy-'));
  const skillRoot = await createSkillSource(directory);
  const service = new BundledSkillCopyService({
    skillRoot,
    homeDirectory: directory,
  });

  try {
    const result = await service.copyToTargets(['agents', 'claude']);
    expect(result).toEqual({
      installed: [
        {
          target: 'agents',
          destination: join(directory, '.agents', 'skills', 'foundry'),
        },
        {
          target: 'claude',
          destination: join(directory, '.claude', 'skills', 'foundry'),
        },
      ],
    });
    for (const item of result.installed) {
      expect(await readFile(join(item.destination, 'SKILL.md'), 'utf8'))
        .toContain('name: foundry');
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('replaces only the selected existing target', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-skill-replace-'));
  const skillRoot = await createSkillSource(directory);
  const agentsDestination = join(directory, '.agents', 'skills', 'foundry');
  const claudeDestination = join(directory, '.claude', 'skills', 'foundry');
  await mkdir(agentsDestination, { recursive: true });
  await mkdir(claudeDestination, { recursive: true });
  await writeFile(join(agentsDestination, 'stale.md'), 'stale');
  await writeFile(join(claudeDestination, 'keep.md'), 'keep');
  const service = new BundledSkillCopyService({
    skillRoot,
    homeDirectory: directory,
  });

  try {
    await service.copyToTargets(['agents']);
    await expect(
      readFile(join(agentsDestination, 'stale.md'), 'utf8'),
    ).rejects.toThrow();
    expect(await readFile(join(claudeDestination, 'keep.md'), 'utf8')).toBe('keep');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('copies selected targets through the API', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-skill-http-'));
  const skillRoot = await createSkillSource(directory);
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  const service = new BundledSkillCopyService({
    skillRoot,
    homeDirectory: directory,
  });
  const app = createApiApp(database, { settingsSkillCopyService: service });

  try {
    const response = await app.request('/api/settings/skill-copy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targets: ['agents', 'claude'] }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      installed: [
        {
          target: 'agents',
          destination: join(directory, '.agents', 'skills', 'foundry'),
        },
        {
          target: 'claude',
          destination: join(directory, '.claude', 'skills', 'foundry'),
        },
      ],
    });
  } finally {
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});

async function createSkillSource(directory: string): Promise<string> {
  const skillRoot = join(directory, 'source', 'foundry');
  await mkdir(join(skillRoot, 'references'), { recursive: true });
  await writeFile(join(skillRoot, 'SKILL.md'), '---\nname: foundry\n---\n');
  await writeFile(join(skillRoot, 'references', 'usage.md'), '# Usage\n');
  return skillRoot;
}
