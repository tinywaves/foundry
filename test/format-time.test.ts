import { expect, it } from 'vitest';
import { formatTimestamp } from '../app/web/src/lib/format-time';
import type { SettingsSnapshot } from '../app/web/src/shared/settings';

function settings(
  timeZone: SettingsSnapshot['workspace']['language-region']['time-zone'],
  timeFormat: SettingsSnapshot['workspace']['language-region']['time-format'],
): SettingsSnapshot {
  return {
    workspace: {
      'appearance': { 'color-theme': 'system' },
      'language-region': {
        'language': 'en-US',
        'time-zone': timeZone,
        'time-format': timeFormat,
      },
    },
    features: {
      library: {
        captures: {
          fetcher: null,
          maxAttempts: 1,
          scrapeConcurrency: 1,
          firecrawl: { apiKey: '', hasApiKey: false, shouldClearApiKey: false },
          deepseek: { apiKey: '', hasApiKey: false, shouldClearApiKey: false },
        },
      },
    },
  };
}

it('formats timestamps with the configured time zone and pattern', () => {
  const value = '2026-10-28T03:04:05.000Z';

  expect(formatTimestamp(value, settings('UTC', 'YYYY-MM-DD HH:mm:ss')))
    .toBe('2026-10-28 03:04:05');
  expect(formatTimestamp(value, settings('Asia/Shanghai', 'MM/DD/YYYY hh:mm:ss A')))
    .toBe('10/28/2026 11:04:05 AM');
  expect(formatTimestamp('not-a-date', settings('UTC', 'YYYY-MM-DD')))
    .toBe('');
});
