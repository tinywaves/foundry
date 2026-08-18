import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { test } from 'vitest';
import { PromptRepository } from '../prompts/prompt-repository';
import { ProviderRepository } from '../providers/provider-repository';
import { RuntimeRepository } from '../runtimes/runtime-repository';
import { SettingsRepository } from '../settings/settings-repository';
import { FOUNDRY_SCHEMA_VERSION, openFoundryDatabase } from './foundry-database';
import type { FoundryStorageErrorCode } from './storage-error';
import { FoundryStorageError } from './storage-error';

function createCodexInput() {
  return {
    runtime: 'codex' as const,
    name: 'Migrated Provider',
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'migration-secret',
    remark: 'Keep this row',
    officialWebsite: null,
    modelConfig: { version: 1 as const, defaultModel: 'gpt-default' },
  };
}

function dropSkillSchema(database: Database.Database): void {
  database.exec(`
    DROP TABLE skill_update_candidates;
    DROP TABLE skill_sources;
    DROP TABLE skill_distribution_records;
    DROP TABLE skill_installations;
    DROP TABLE skill_revisions;
    DROP TABLE skill_targets;
    DROP TABLE skill_packages;
  `);
}

function dropRemoteSkillSchema(database: Database.Database): void {
  database.exec(`
    DROP TABLE skill_update_candidates;
    DROP TABLE skill_sources;
  `);
}

function assertStorageError(
  operation: () => unknown,
  code: FoundryStorageErrorCode,
): FoundryStorageError {
  let caught: FoundryStorageError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof FoundryStorageError)) {
      return false;
    }
    caught = error;
    return error.code === code;
  });
  assert.ok(caught);
  return caught;
}

test('creates the complete Foundry schema in migration order', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    assert.equal(FOUNDRY_SCHEMA_VERSION, 7);
    assert.equal(database.pragma('user_version', { simple: true }), FOUNDRY_SCHEMA_VERSION);
    assert.equal(database.pragma('quick_check', { simple: true }), 'ok');
    const tables = database.prepare<[], { name: string }>(`
      SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name
    `).all().map((row) => row.name);
    assert.deepEqual(tables, [
      'application_settings',
      'prompt_versions',
      'prompts',
      'providers',
      'runtime_applications',
      'skill_distribution_records',
      'skill_installations',
      'skill_packages',
      'skill_revisions',
      'skill_sources',
      'skill_targets',
      'skill_update_candidates',
    ]);
  } finally {
    database.close();
  }
});

test('upgrades a version 4 database without changing existing domain data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-v4-upgrade-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    const versionFourDatabase = openFoundryDatabase(filename);
    const provider = new ProviderRepository(versionFourDatabase).createProvider(createCodexInput());
    new RuntimeRepository(versionFourDatabase).recordProviderApplication('codex', provider.id);
    const prompt = new PromptRepository(versionFourDatabase).createPrompt({
      title: 'Migrated Prompt',
      description: 'Keep this Prompt',
      content: 'Preserve this exact content.\n',
    });
    new SettingsRepository(versionFourDatabase).updateApplicationColorMode('dark');
    dropSkillSchema(versionFourDatabase);
    versionFourDatabase.pragma('user_version = 4');
    versionFourDatabase.close();

    const upgradedDatabase = openFoundryDatabase(filename);
    try {
      assert.equal(
        upgradedDatabase.pragma('user_version', { simple: true }),
        FOUNDRY_SCHEMA_VERSION,
      );
      assert.equal(
        new ProviderRepository(upgradedDatabase).getProviderForEdit(provider.id).apiKey,
        'migration-secret',
      );
      assert.equal(
        new RuntimeRepository(upgradedDatabase).listRuntimes()[0]?.providerId,
        provider.id,
      );
      assert.deepEqual(new PromptRepository(upgradedDatabase).getPrompt(prompt.id), prompt);
      assert.deepEqual(
        new SettingsRepository(upgradedDatabase).getApplicationSettings(),
        { colorMode: 'dark' },
      );
      assert.equal(
        upgradedDatabase.prepare<[], number>(`
          SELECT COUNT(*) FROM sqlite_schema
          WHERE type = 'table' AND name LIKE 'skill_%'
        `).pluck().get(),
        7,
      );
    } finally {
      upgradedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('upgrades version 5 Skill Installations with their distribution paths preserved', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-v5-upgrade-'));
  const filename = path.join(directory, 'foundry.sqlite');
  const packageId = '00000000-0000-4000-8000-000000000501';
  const targetId = '00000000-0000-4000-8000-000000000502';
  const installationId = '00000000-0000-4000-8000-000000000503';
  const fingerprint = 'a'.repeat(64);

  try {
    const versionFiveDatabase = openFoundryDatabase(filename);
    versionFiveDatabase.prepare(`
      INSERT INTO skill_packages (
        id, distribution_name, normalized_distribution_name,
        store_observation, store_fingerprint, store_observed_at, created_at, updated_at
      ) VALUES (?, 'Nested Skill', 'nested skill', 'available', ?, 10, 10, 10)
    `).run(packageId, fingerprint);
    versionFiveDatabase.prepare(`
      INSERT INTO skill_targets (
        id, kind, display_name, configured_path, resolved_path, resolved_path_key,
        is_built_in, is_writable, is_enabled, policy_source, max_scan_depth,
        allow_symlink_escape, sort_order, created_at, updated_at
      ) VALUES (
        ?, 'generic-agent-skills', 'Agent Skills', '/tmp/skills', '/tmp/skills',
        '/tmp/skills', 1, 1, 1, 'adapter-default', 4, 0, 0, 10, 10
      )
    `).run(targetId);
    versionFiveDatabase.prepare(`
      INSERT INTO skill_installations (
        id, package_id, target_id, distribution_name, normalized_distribution_name,
        relative_path, relative_path_key, target_observation, target_fingerprint,
        target_observed_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, 'Nested Skill', 'nested skill', 'group/nested-skill',
        'group/nested-skill', 'available', ?, 10, 10, 10
      )
    `).run(installationId, packageId, targetId, fingerprint);
    versionFiveDatabase.exec(`
      DROP INDEX skill_installations_active_relative_path_idx;
      DROP TRIGGER skill_installations_relative_path_insert_check;
      DROP TRIGGER skill_installations_relative_path_update_check;
      ALTER TABLE skill_installations DROP COLUMN relative_path_key;
      ALTER TABLE skill_installations DROP COLUMN relative_path;
    `);
    dropRemoteSkillSchema(versionFiveDatabase);
    versionFiveDatabase.pragma('user_version = 5');
    versionFiveDatabase.close();

    const upgradedDatabase = openFoundryDatabase(filename);
    try {
      const installation = upgradedDatabase.prepare<[string], {
        distribution_name: string;
        relative_path: string;
        relative_path_key: string;
      }>(`
        SELECT distribution_name, relative_path, relative_path_key
        FROM skill_installations WHERE id = ?
      `).get(installationId);
      assert.deepEqual(installation, {
        distribution_name: 'Nested Skill',
        relative_path: 'Nested Skill',
        relative_path_key: 'nested skill',
      });
      assert.equal(
        upgradedDatabase.pragma('user_version', { simple: true }),
        FOUNDRY_SCHEMA_VERSION,
      );
    } finally {
      upgradedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('upgrades version 6 Skills data with remote source tables added', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-v6-upgrade-'));
  const filename = path.join(directory, 'foundry.sqlite');
  const packageId = '00000000-0000-4000-8000-000000000601';
  const fingerprint = 'c'.repeat(64);
  try {
    const versionSixDatabase = openFoundryDatabase(filename);
    versionSixDatabase.prepare(`
      INSERT INTO skill_packages (
        id, distribution_name, normalized_distribution_name,
        store_observation, store_fingerprint, store_observed_at, created_at, updated_at
      ) VALUES (?, 'Remote Ready', 'remote ready', 'available', ?, 10, 10, 10)
    `).run(packageId, fingerprint);
    dropRemoteSkillSchema(versionSixDatabase);
    versionSixDatabase.pragma('user_version = 6');
    versionSixDatabase.close();

    const upgradedDatabase = openFoundryDatabase(filename);
    try {
      assert.equal(
        upgradedDatabase.pragma('user_version', { simple: true }),
        FOUNDRY_SCHEMA_VERSION,
      );
      assert.equal(
        upgradedDatabase.prepare('SELECT distribution_name FROM skill_packages WHERE id = ?')
          .pluck().get(packageId),
        'Remote Ready',
      );
      assert.deepEqual(
        upgradedDatabase.prepare<[], { name: string }>(`
          SELECT name FROM sqlite_schema
          WHERE type = 'table' AND name IN ('skill_sources', 'skill_update_candidates')
          ORDER BY name
        `).all().map((row) => row.name),
        ['skill_sources', 'skill_update_candidates'],
      );
    } finally {
      upgradedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('upgrades a version 3 database without changing existing domain data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-v3-upgrade-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    const versionThreeDatabase = openFoundryDatabase(filename);
    const provider = new ProviderRepository(versionThreeDatabase).createProvider(createCodexInput());
    new RuntimeRepository(versionThreeDatabase).recordProviderApplication('codex', provider.id);
    const prompt = new PromptRepository(versionThreeDatabase).createPrompt({
      title: 'Migrated Prompt',
      description: 'Keep this Prompt',
      content: 'Preserve this exact content.\n',
    });
    dropSkillSchema(versionThreeDatabase);
    versionThreeDatabase.exec('DROP TABLE application_settings;');
    versionThreeDatabase.pragma('user_version = 3');
    versionThreeDatabase.close();

    const upgradedDatabase = openFoundryDatabase(filename);
    try {
      assert.equal(
        upgradedDatabase.pragma('user_version', { simple: true }),
        FOUNDRY_SCHEMA_VERSION,
      );
      assert.equal(
        new ProviderRepository(upgradedDatabase).getProviderForEdit(provider.id).apiKey,
        'migration-secret',
      );
      assert.deepEqual(new RuntimeRepository(upgradedDatabase).listRuntimes()[0], {
        runtime: 'codex',
        status: 'provider',
        providerId: provider.id,
        appliedAt: upgradedDatabase.prepare<[], number>(`
          SELECT applied_at FROM runtime_applications WHERE runtime = 'codex'
        `).pluck().get(),
      });
      assert.deepEqual(new PromptRepository(upgradedDatabase).getPrompt(prompt.id), prompt);
      assert.equal(
        upgradedDatabase.prepare('SELECT COUNT(*) FROM prompt_versions').pluck().get(),
        1,
      );
      assert.equal(
        upgradedDatabase.prepare('SELECT COUNT(*) FROM application_settings').pluck().get(),
        0,
      );
    } finally {
      upgradedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('upgrades a version 2 database without changing Provider or Runtime Application data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-v2-upgrade-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    const versionTwoDatabase = openFoundryDatabase(filename);
    const provider = new ProviderRepository(versionTwoDatabase).createProvider(createCodexInput());
    new RuntimeRepository(versionTwoDatabase).recordProviderApplication('codex', provider.id);
    dropSkillSchema(versionTwoDatabase);
    versionTwoDatabase.exec(`
      DROP TABLE application_settings;
      DROP TABLE prompt_versions;
      DROP TABLE prompts;
    `);
    versionTwoDatabase.pragma('user_version = 2');
    versionTwoDatabase.close();

    const upgradedDatabase = openFoundryDatabase(filename);
    try {
      assert.equal(
        upgradedDatabase.pragma('user_version', { simple: true }),
        FOUNDRY_SCHEMA_VERSION,
      );
      assert.equal(new ProviderRepository(upgradedDatabase).getProviderForEdit(provider.id).name, provider.name);
      assert.deepEqual(new RuntimeRepository(upgradedDatabase).listRuntimes()[0], {
        runtime: 'codex',
        status: 'provider',
        providerId: provider.id,
        appliedAt: upgradedDatabase.prepare<[], number>(`
          SELECT applied_at FROM runtime_applications WHERE runtime = 'codex'
        `).pluck().get(),
      });
      const promptTables = upgradedDatabase.prepare<[], { name: string }>(`
        SELECT name FROM sqlite_schema
        WHERE type = 'table' AND name IN ('prompts', 'prompt_versions')
        ORDER BY name
      `).all().map((row) => row.name);
      assert.deepEqual(promptTables, ['prompt_versions', 'prompts']);
    } finally {
      upgradedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('upgrades a version 1 database without changing Provider data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-upgrade-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    const versionOneDatabase = openFoundryDatabase(filename);
    const created = new ProviderRepository(versionOneDatabase).createProvider(createCodexInput());
    dropSkillSchema(versionOneDatabase);
    versionOneDatabase.exec(`
      DROP TABLE prompt_versions;
      DROP TABLE prompts;
      DROP TABLE runtime_applications;
      DROP TABLE application_settings;
    `);
    versionOneDatabase.pragma('user_version = 1');
    versionOneDatabase.close();

    const upgradedDatabase = openFoundryDatabase(filename);
    try {
      assert.equal(
        upgradedDatabase.pragma('user_version', { simple: true }),
        FOUNDRY_SCHEMA_VERSION,
      );
      const row = upgradedDatabase.prepare<[string], {
        api_key: string;
        name: string;
        remark: string;
      }>('SELECT api_key, name, remark FROM providers WHERE id = ?').get(created.id);
      assert.deepEqual(row, {
        api_key: 'migration-secret',
        name: 'Migrated Provider',
        remark: 'Keep this row',
      });
      assert.deepEqual(new ProviderRepository(upgradedDatabase).listProviders('codex'), [
        {
          ...created,
          isInUse: false,
        },
      ]);
    } finally {
      upgradedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects future versions and rolls back a blocked migration without changing data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-version-'));
  const futureFilename = path.join(directory, 'future.sqlite');
  const blockedFilename = path.join(directory, 'blocked.sqlite');
  try {
    const futureDatabase = new Database(futureFilename);
    futureDatabase.exec('CREATE TABLE sentinel (value TEXT NOT NULL); INSERT INTO sentinel VALUES (\'keep\');');
    futureDatabase.pragma(`user_version = ${FOUNDRY_SCHEMA_VERSION + 1}`);
    futureDatabase.close();

    assertStorageError(
      () => openFoundryDatabase(futureFilename),
      'unsupported-database-version',
    );
    const unchangedFutureDatabase = new Database(futureFilename, { readonly: true });
    assert.equal(
      unchangedFutureDatabase.pragma('user_version', { simple: true }),
      FOUNDRY_SCHEMA_VERSION + 1,
    );
    assert.equal(
      unchangedFutureDatabase.prepare('SELECT value FROM sentinel').pluck().get(),
      'keep',
    );
    unchangedFutureDatabase.close();

    const blockedDatabase = new Database(blockedFilename);
    blockedDatabase.exec(
      'CREATE TABLE providers (sentinel TEXT NOT NULL); INSERT INTO providers VALUES (\'keep\');',
    );
    blockedDatabase.close();
    assertStorageError(() => openFoundryDatabase(blockedFilename), 'storage-unavailable');
    const unchangedBlockedDatabase = new Database(blockedFilename, { readonly: true });
    assert.equal(unchangedBlockedDatabase.pragma('user_version', { simple: true }), 0);
    assert.equal(
      unchangedBlockedDatabase.prepare('SELECT sentinel FROM providers').pluck().get(),
      'keep',
    );
    unchangedBlockedDatabase.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rolls back the entire version 5 migration when a later Skills table is blocked', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-v5-rollback-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    const versionFourDatabase = openFoundryDatabase(filename);
    dropSkillSchema(versionFourDatabase);
    versionFourDatabase.exec(`
      CREATE TABLE skill_targets (sentinel TEXT NOT NULL);
      INSERT INTO skill_targets VALUES ('keep');
    `);
    versionFourDatabase.pragma('user_version = 4');
    versionFourDatabase.close();

    assertStorageError(() => openFoundryDatabase(filename), 'storage-unavailable');

    const unchangedDatabase = new Database(filename, { readonly: true });
    try {
      assert.equal(unchangedDatabase.pragma('user_version', { simple: true }), 4);
      assert.equal(
        unchangedDatabase.prepare('SELECT sentinel FROM skill_targets').pluck().get(),
        'keep',
      );
      assert.equal(
        unchangedDatabase.prepare<[], number>(`
          SELECT COUNT(*) FROM sqlite_schema
          WHERE type = 'table' AND name IN ('skill_packages', 'skill_revisions')
        `).pluck().get(),
        0,
      );
    } finally {
      unchangedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('maps unreadable database content to a non-sensitive corruption error', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-corrupt-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    writeFileSync(filename, 'not a sqlite database');
    const error = assertStorageError(() => openFoundryDatabase(filename), 'storage-corrupt');
    assert.equal(error.message.includes('not a sqlite database'), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
