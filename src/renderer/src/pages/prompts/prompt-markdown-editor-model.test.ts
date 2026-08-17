import { describe, expect, it } from 'vitest';
import { getPromptContentLineSeparator } from './prompt-markdown-editor-model';

describe('getPromptContentLineSeparator', () => {
  it.each([
    ['', '\n'],
    ['first\nsecond', '\n'],
    ['first\r\nsecond', '\r\n'],
    ['first\rsecond', '\r'],
  ] as const)('returns the uniform separator for %j', (value, expected) => {
    expect(getPromptContentLineSeparator(value)).toBe(expected);
  });

  it.each([
    'first\r\nsecond\nthird',
    'first\r\nsecond\rthird',
    'first\nsecond\rthird',
  ])('leaves mixed separators to CodeMirror for %j', (value) => {
    expect(getPromptContentLineSeparator(value)).toBeUndefined();
  });
});
