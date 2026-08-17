import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  ApplicationColorMode,
  SettingsApiErrorCode,
} from '../../shared/settings-contract';
import { applicationColorModes } from '../../shared/settings-contract';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SettingsOperationError } from './settings-error';
import { SettingsRepository } from './settings-repository';

function openTestRepository() {
  const database = openFoundryDatabase(':memory:');
  return {
    database,
    repository: new SettingsRepository(database),
  };
}

function assertSettingsError(
  operation: () => unknown,
  code: SettingsApiErrorCode,
): SettingsOperationError {
  let caught: SettingsOperationError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof SettingsOperationError)) {
      return false;
    }
    caught = error;
    return error.code === code;
  });
  assert.ok(caught);
  return caught;
}

test('returns System without materializing an absent application settings row', () => {
  const { database, repository } = openTestRepository();
  try {
    assert.deepEqual(repository.getApplicationSettings(), { colorMode: 'system' });
    assert.equal(
      database.prepare('SELECT COUNT(*) FROM application_settings').pluck().get(),
      0,
    );
  } finally {
    database.close();
  }
});

test('persists every supported color mode in one reusable settings row', () => {
  const { database, repository } = openTestRepository();
  try {
    for (const colorMode of applicationColorModes) {
      assert.deepEqual(repository.updateApplicationColorMode(colorMode), { colorMode });
      assert.deepEqual(repository.getApplicationSettings(), { colorMode });
    }
    assert.deepEqual(
      database.prepare<[], { color_mode: ApplicationColorMode; id: number }>(`
        SELECT id, color_mode FROM application_settings
      `).get(),
      { id: 1, color_mode: 'system' },
    );
  } finally {
    database.close();
  }
});

test('rejects unsupported updates and enforces storage constraints without mutation', () => {
  const { database, repository } = openTestRepository();
  try {
    assertSettingsError(
      () => repository.updateApplicationColorMode('sepia'),
      'invalid-input',
    );
    assert.equal(
      database.prepare('SELECT COUNT(*) FROM application_settings').pluck().get(),
      0,
    );
    assert.throws(
      () => database.prepare(`
        INSERT INTO application_settings (id, color_mode) VALUES (2, 'dark')
      `).run(),
      /CHECK constraint failed/,
    );
    assert.throws(
      () => database.prepare(`
        INSERT INTO application_settings (id, color_mode) VALUES (1, 'sepia')
      `).run(),
      /CHECK constraint failed/,
    );
  } finally {
    database.close();
  }
});

test('reports an invalid stored color mode as corruption', () => {
  const { database, repository } = openTestRepository();
  try {
    database.pragma('ignore_check_constraints = ON');
    database.prepare(`
      INSERT INTO application_settings (id, color_mode) VALUES (1, 'sepia')
    `).run();
    database.pragma('ignore_check_constraints = OFF');

    const error = assertSettingsError(
      () => repository.getApplicationSettings(),
      'storage-corrupt',
    );
    assert.equal(error.message.includes('sepia'), false);
  } finally {
    database.close();
  }
});
