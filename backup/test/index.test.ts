import { expect, it } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };
import { getVersion } from '../src';

it('returns the package version', () => {
  expect(getVersion()).toBe(packageJson.version);
});
