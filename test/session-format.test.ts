import { expect, it } from 'vitest';
import { formatDirectoryParent, formatRelativeTime } from '../app/web/src/features/sessions/format';

it('shortens home-directory parents while retaining useful directory context', () => {
  expect(formatDirectoryParent('/Users/example/Developer/personal/foundry')).toBe('~/Developer/personal');
  expect(formatDirectoryParent('/home/example/work/repo/')).toBe('~/work');
  expect(formatDirectoryParent('C:\\Users\\example\\Developer\\repo')).toBe('~/Developer');
  expect(formatDirectoryParent('/Users/example/repo')).toBe('~');
  expect(formatDirectoryParent('/Users/example')).toBe('~');
  expect(formatDirectoryParent('/workspace/repo')).toBe('/workspace');
  expect(formatDirectoryParent('/repo')).toBe('/');
  expect(formatDirectoryParent('repo')).toBe('');
  expect(formatDirectoryParent('')).toBe('');
});

it('formats recent activity in the selected locale without rounding it into the future', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');
  expect(formatRelativeTime('2026-11-26T11:59:45Z', 'en-US', now)).toBe('now');
  expect(formatRelativeTime('2026-11-26T11:58:30Z', 'en-US', now)).toBe('1 minute ago');
  expect(formatRelativeTime('2026-11-26T10:01:00Z', 'zh-CN', now)).toBe('1小时前');
  expect(formatRelativeTime('2026-11-25T12:00:00Z', 'zh-CN', now)).toBe('昨天');
  expect(formatRelativeTime('2026-11-24T12:00:00Z', 'zh-CN', now)).toBe('前天');
  expect(formatRelativeTime('2026-11-23T12:00:00Z', 'zh-CN', now)).toBe('3天前');
  expect(formatRelativeTime('2026-11-26T13:00:00Z', 'en-US', now)).toBe('in 1 hour');
  expect(formatRelativeTime('invalid', 'en-US', now)).toBe('');
});
