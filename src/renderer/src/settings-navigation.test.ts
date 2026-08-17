import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  getSettingsBackNavigation,
  settingsDashboardNavigateOptions,
  settingsEntryNavigateOptions,
} from './settings-navigation';

test('records an app-shell source for Settings entry navigation', () => {
  assert.deepEqual(settingsEntryNavigateOptions, {
    state: { settingsEntrySource: 'app-shell' },
  });
});

test('returns through history for a recognized Settings entry', () => {
  assert.deepEqual(
    getSettingsBackNavigation(settingsEntryNavigateOptions.state),
    { kind: 'history' },
  );
});

test('falls back to Dashboard for direct or malformed Settings entries', () => {
  const fallback = {
    kind: 'path',
    options: settingsDashboardNavigateOptions,
    path: '/',
  };
  assert.deepEqual(getSettingsBackNavigation(undefined), fallback);
  assert.deepEqual(getSettingsBackNavigation(null), fallback);
  assert.deepEqual(getSettingsBackNavigation('app-shell'), fallback);
  assert.deepEqual(
    getSettingsBackNavigation({ settingsEntrySource: 'unknown' }),
    fallback,
  );
});
