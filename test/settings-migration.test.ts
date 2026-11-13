import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/features/settings/contracts';
import { readStoredSettings, updateSettings } from '../src/features/settings/repository';
import { openFoundryDatabase } from '../src/storage/database';
import { createPreviousDatabase } from './helpers/previous-database';

it('upgrades an existing database and moves legacy settings into SQLite once', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-settings-migration-'));
  const databasePath = path.join(directory, 'foundry.sqlite');
  const legacyPath = path.join(directory, 'settings.json');
  const legacySettings = structuredClone(DEFAULT_SETTINGS);
  legacySettings.workspace.appearance['color-theme'] = 'dark';
  legacySettings.features.library.captures.firecrawl.apiKey = 'legacy-test-key';
  legacySettings.features.agent = { provider: 'existing-provider' };

  try {
    const previous = createPreviousDatabase(databasePath, 3);
    previous.close();
    await writeFile(legacyPath, JSON.stringify(legacySettings));

    const migrated = openFoundryDatabase(databasePath);
    try {
      expect(readStoredSettings(migrated.db)).toEqual(legacySettings);
      expect(existsSync(legacyPath)).toBe(false);
      updateSettings({ theme: 'light' }, migrated.db);
    } finally {
      migrated.client.close();
    }

    // An old leftover file must not replace settings already committed to SQLite.
    await writeFile(legacyPath, JSON.stringify(legacySettings));
    const reopened = openFoundryDatabase(databasePath);
    try {
      expect(readStoredSettings(reopened.db).workspace.appearance['color-theme']).toBe('light');
      expect(readStoredSettings(reopened.db).features.agent).toEqual({ provider: 'existing-provider' });
      expect(existsSync(legacyPath)).toBe(false);
    } finally {
      reopened.client.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('flattens the previous database JSON without losing feature settings', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-settings-flatten-'));
  const databasePath = path.join(directory, 'foundry.sqlite');
  const legacy = structuredClone(DEFAULT_SETTINGS);
  legacy.workspace.appearance['color-theme'] = 'dark';
  legacy.features.library.captures.fetchConcurrency = 4;
  legacy.features.agent = {
    'provider': 'existing-provider',
    'enabled': true,
    'models': ['one', 'two'],
    'a/b~c': { 'with.dot': 42 },
  };
  try {
    const previous = createPreviousDatabase(databasePath, 4);
    previous.prepare('INSERT INTO settings (id, payload) VALUES (?, ?)')
      .run('app', JSON.stringify(legacy));
    previous.close();

    const migrated = openFoundryDatabase(databasePath);
    try {
      expect(readStoredSettings(migrated.db)).toEqual(legacy);
      expect(migrated.client.prepare('SELECT key FROM settings WHERE key = ?').get('app'))
        .toBeUndefined();
      expect(migrated.client.prepare('SELECT value FROM settings WHERE key = ?')
        .get('/features/library/captures/fetchConcurrency')).toEqual({ value: '4' });
    } finally {
      migrated.client.close();
    }
    const reopened = openFoundryDatabase(databasePath);
    try {
      expect(readStoredSettings(reopened.db)).toEqual(legacy);
    } finally {
      reopened.client.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('keeps an unreadable legacy settings file and reports migration failure', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-settings-invalid-'));
  const legacyPath = path.join(directory, 'settings.json');
  try {
    await writeFile(legacyPath, '{invalid-json');
    expect(() => openFoundryDatabase(path.join(directory, 'foundry.sqlite'))).toThrow();
    expect(await readFile(legacyPath, 'utf8')).toBe('{invalid-json');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
