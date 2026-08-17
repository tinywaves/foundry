import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  ApplicationColorMode,
  SettingsApi,
} from '../../shared/settings-contract';
import {
  loadInitialApplicationSettings,
  persistApplicationColorMode,
} from './application-settings-model';

function createSettingsApi(overrides: Partial<SettingsApi> = {}): SettingsApi {
  return {
    getApplicationSettings: () => Promise.resolve({
      ok: true,
      value: { colorMode: 'system' },
    }),
    updateApplicationColorMode: (colorMode) => Promise.resolve({
      ok: true,
      value: { colorMode },
    }),
    ...overrides,
  };
}

test('restores every successful persisted application color mode', async () => {
  const colorModes: ApplicationColorMode[] = ['light', 'dark', 'system'];
  for (const colorMode of colorModes) {
    const settings = await loadInitialApplicationSettings(createSettingsApi({
      getApplicationSettings: () => Promise.resolve({
        ok: true,
        value: { colorMode },
      }),
    }));
    assert.deepEqual(settings, { colorMode });
  }
});

test('falls back to System for a typed startup failure', async () => {
  const settings = await loadInitialApplicationSettings(createSettingsApi({
    getApplicationSettings: () => Promise.resolve({
      ok: false,
      error: {
        code: 'storage-unavailable',
        message: 'Settings storage is unavailable.',
      },
    }),
  }));
  assert.deepEqual(settings, { colorMode: 'system' });
});

test('falls back to System when the startup request rejects', async () => {
  const settings = await loadInitialApplicationSettings(createSettingsApi({
    getApplicationSettings: () => Promise.reject(new Error('Unexpected rejection')),
  }));
  assert.deepEqual(settings, { colorMode: 'system' });
});

test('persists the selected color mode without surfacing typed failures or rejections', async () => {
  let persistedColorMode: ApplicationColorMode | undefined;
  await persistApplicationColorMode(createSettingsApi({
    updateApplicationColorMode: (colorMode) => {
      persistedColorMode = colorMode;
      return Promise.resolve({ ok: true, value: { colorMode } });
    },
  }), 'dark');
  assert.equal(persistedColorMode, 'dark');

  await assert.doesNotReject(persistApplicationColorMode(createSettingsApi({
    updateApplicationColorMode: () => Promise.resolve({
      ok: false,
      error: {
        code: 'storage-unavailable',
        message: 'Settings storage is unavailable.',
      },
    }),
  }), 'light'));
  await assert.doesNotReject(persistApplicationColorMode(createSettingsApi({
    updateApplicationColorMode: () => Promise.reject(new Error('Unexpected rejection')),
  }), 'system'));
});
