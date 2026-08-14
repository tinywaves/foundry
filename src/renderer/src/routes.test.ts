import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  agentExtensionDestinations,
  agentObservabilityDestinations,
  agentRuntimeDestinations,
  isDestinationSelected,
  routePatterns,
  routePaths,
} from './routes';

test('defines the canonical Agent navigation paths', () => {
  assert.equal(routePaths.dashboard, '/');
  assert.equal(routePaths.agentExtensions, '/agent-extensions');
  assert.equal(routePaths.agentExtensionsSkills, '/agent-extensions/skills');
  assert.equal(routePaths.agentExtensionsMcpServers, '/agent-extensions/mcp-servers');
  assert.equal(routePaths.agentExtensionsPrompts, '/agent-extensions/prompts');
  assert.equal(routePaths.agentExtensionsPromptsNew, '/agent-extensions/prompts/new');
  assert.equal(routePaths.agentExtensionsPromptsTrash, '/agent-extensions/prompts/trash');
  assert.equal(
    routePaths.agentExtensionsTrashedPrompt('prompt-1'),
    '/agent-extensions/prompts/trash/prompt-1',
  );
  assert.equal(
    routePaths.agentExtensionsPrompt('prompt-1'),
    '/agent-extensions/prompts/prompt-1',
  );
  assert.equal(
    routePaths.agentExtensionsPromptEdit('prompt-1'),
    '/agent-extensions/prompts/prompt-1/edit',
  );
  assert.deepEqual(routePatterns, {
    agentExtensionsPrompt: '/agent-extensions/prompts/:promptId',
    agentExtensionsPromptEdit: '/agent-extensions/prompts/:promptId/edit',
    agentExtensionsTrashedPrompt: '/agent-extensions/prompts/trash/:promptId',
  });
  assert.equal(routePaths.agentRuntime, '/agent-runtime');
  assert.equal(routePaths.agentRuntimeRuntimes, '/agent-runtime/runtimes');
  assert.equal(routePaths.agentRuntimeProviders, '/agent-runtime/providers');
  assert.equal(routePaths.agentObservability, '/agent-observability');
  assert.equal(routePaths.agentObservabilitySessions, '/agent-observability/sessions');
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
      id: 'prompts',
      label: 'Prompts',
      path: routePaths.agentExtensionsPrompts,
    },
  ]);
});

test('selects the Prompts destination for its nested routes only', () => {
  assert.equal(
    isDestinationSelected(
      routePaths.agentExtensionsPrompts,
      routePaths.agentExtensionsPrompts,
    ),
    true,
  );
  assert.equal(
    isDestinationSelected(
      routePaths.agentExtensionsPrompt('prompt-1'),
      routePaths.agentExtensionsPrompts,
    ),
    true,
  );
  assert.equal(
    isDestinationSelected(
      routePaths.agentExtensionsPromptsTrash,
      routePaths.agentExtensionsPrompts,
    ),
    true,
  );
  assert.equal(
    isDestinationSelected(
      '/agent-extensions/prompts-extra',
      routePaths.agentExtensionsPrompts,
    ),
    false,
  );
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
