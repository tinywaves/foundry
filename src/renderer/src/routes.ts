export const routePaths = {
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
} as const;

export const agentExtensionDestinations = [
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
] as const;

export const agentRuntimeDestinations = [
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
] as const;

export const agentObservabilityDestinations = [
  {
    id: 'sessions',
    label: 'Sessions',
    path: routePaths.agentObservabilitySessions,
  },
] as const;
