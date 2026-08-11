import assert from 'node:assert/strict';
import { test } from 'vitest';
import { agentRuntimeDestinations, routePaths } from './routes';

test('keeps Runtimes first and preserves the direct Providers destination', () => {
  assert.equal(routePaths.agentRuntimeRuntimes, '/agent-runtime/runtimes');
  assert.equal(routePaths.agentRuntimeProviders, '/agent-runtime/providers');
  assert.deepEqual(agentRuntimeDestinations, [
    {
      id: 'runtimes',
      label: 'Runtimes',
      path: routePaths.agentRuntimeRuntimes,
    },
    {
      id: 'providers',
      label: 'Providers',
      path: routePaths.agentRuntimeProviders,
    },
  ]);
});
