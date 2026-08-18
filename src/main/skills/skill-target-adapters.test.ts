import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { test } from 'vitest';
import { resolveBuiltInSkillTargets } from './skill-target-adapters';

test('resolves the approved global Distribution Targets in stable adapter order', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-targets-'));

  try {
    await mkdir(path.join(userHome, '.hermes'), { recursive: true });
    await writeFile(path.join(userHome, '.hermes', 'active_profile'), 'work\n');
    await mkdir(path.join(userHome, '.clawdbot'));

    const targets = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {
        CODEX_HOME: path.join(userHome, 'custom-codex'),
      },
      platform: process.platform,
    });

    assert.deepEqual(targets.map((target) => target.kind), [
      'generic-agent-skills',
      'claude-code',
      'gemini-cli',
      'opencode',
      'cursor',
      'github-copilot',
      'hermes',
      'openclaw',
      'codex-legacy',
    ]);
    assert.deepEqual(targets.map((target) => target.configuredPath), [
      path.join(userHome, '.agents', 'skills'),
      path.join(userHome, '.claude', 'skills'),
      path.join(userHome, '.gemini', 'skills'),
      path.join(userHome, '.config', 'opencode', 'skills'),
      path.join(userHome, '.cursor', 'skills'),
      path.join(userHome, '.copilot', 'skills'),
      path.join(userHome, '.hermes', 'profiles', 'work', 'skills'),
      path.join(userHome, '.clawdbot', 'skills'),
      path.join(userHome, 'custom-codex', 'skills'),
    ]);
    assert.deepEqual(
      targets.find((target) => target.kind === 'claude-code')?.excludedRootEntries,
      [{ name: 'synced', caseSensitive: false }],
    );
    assert.deepEqual(
      targets.find((target) => target.kind === 'codex-legacy')?.excludedRootEntries,
      [{ name: '.system', caseSensitive: true }],
    );
    assert.match(
      targets.at(-1)?.documentationUrl ?? '',
      /^https:\/\/developers\.openai\.com\/codex\/skills/,
    );
    assert.equal(targets.some((target) => target.displayName.toLowerCase().includes('goose')), false);
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});

test('honors explicit Hermes and OpenClaw runtime homes', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-target-overrides-'));

  try {
    const hermesHome = path.join(userHome, 'hermes-profile');
    const openClawState = path.join(userHome, 'openclaw-state');
    const targets = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {
        HERMES_HOME: hermesHome,
        OPENCLAW_STATE_DIR: openClawState,
      },
      platform: process.platform,
    });

    assert.equal(
      targets.find((target) => target.kind === 'hermes')?.configuredPath,
      path.join(hermesHome, 'skills'),
    );
    assert.equal(
      targets.find((target) => target.kind === 'openclaw')?.configuredPath,
      path.join(openClawState, 'skills'),
    );
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});

test('keeps only the first built-in Target when physical paths alias', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-target-aliases-'));

  try {
    const genericRoot = path.join(userHome, '.agents', 'skills');
    await mkdir(genericRoot, { recursive: true });
    await mkdir(path.join(userHome, '.claude'), { recursive: true });
    await symlink(genericRoot, path.join(userHome, '.claude', 'skills'));

    const targets = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {},
      platform: process.platform,
    });

    assert.equal(targets.some((target) => target.kind === 'generic-agent-skills'), true);
    assert.equal(targets.some((target) => target.kind === 'claude-code'), false);
    assert.equal(new Set(targets.map((target) => target.resolvedPathKey)).size, targets.length);
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});
