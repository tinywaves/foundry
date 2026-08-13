import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  agentExtensionDestinations,
  agentObservabilityDestinations,
  agentRuntimeDestinations,
  routePaths,
} from './routes';

test('defines the canonical Agent navigation paths', () => {
  assert.deepEqual(routePaths, {
    dashboard: '/',
    agentExtensions: '/agent-extensions',
    agentExtensionsSkills: '/agent-extensions/skills',
    agentExtensionsMcpServers: '/agent-extensions/mcp-servers',
    agentExtensionsPromptTemplates: '/agent-extensions/prompt-templates',
    agentRuntime: '/agent-runtime',
    agentRuntimeRuntimes: '/agent-runtime/runtimes',
    agentRuntimeProviders: '/agent-runtime/providers',
    agentObservability: '/agent-observability',
    agentObservabilitySessions: '/agent-observability/sessions',
  });
});

test('orders the Agent Extensions destinations', () => {
  assert.deepEqual(agentExtensionDestinations, [
    {
      id: 'skills',
      label: 'Skills',
      path: routePaths.agentExtensionsSkills,
    },
    {
      id: 'mcpServers',
      label: 'MCP Servers',
      path: routePaths.agentExtensionsMcpServers,
    },
    {
      id: 'promptTemplates',
      label: 'Prompt Templates',
      path: routePaths.agentExtensionsPromptTemplates,
    },
  ]);
});

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

test('defines Sessions as the Agent Observability destination', () => {
  assert.deepEqual(agentObservabilityDestinations, [
    {
      id: 'sessions',
      label: 'Sessions',
      path: routePaths.agentObservabilitySessions,
    },
  ]);
});
