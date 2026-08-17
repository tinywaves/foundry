export const routePaths = {
  dashboard: '/',
  settings: '/settings',
  agentExtensions: '/agent-extensions',
  agentExtensionsSkills: '/agent-extensions/skills',
  agentExtensionsMcpServers: '/agent-extensions/mcp-servers',
  agentExtensionsPrompts: '/agent-extensions/prompts',
  agentExtensionsPromptsNew: '/agent-extensions/prompts/new',
  agentExtensionsPromptsTrash: '/agent-extensions/prompts/trash',
  agentExtensionsTrashedPrompt: (promptId: string) => (
    `/agent-extensions/prompts/trash/${promptId}`
  ),
  agentExtensionsPrompt: (promptId: string) => `/agent-extensions/prompts/${promptId}`,
  agentExtensionsPromptEdit: (promptId: string) => (
    `/agent-extensions/prompts/${promptId}/edit`
  ),
  agentRuntime: '/agent-runtime',
  agentRuntimeRuntimes: '/agent-runtime/runtimes',
  agentRuntimeProviders: '/agent-runtime/providers',
  agentObservability: '/agent-observability',
  agentObservabilitySessions: '/agent-observability/sessions',
} as const;

export const routePatterns = {
  agentExtensionsPrompt: '/agent-extensions/prompts/:promptId',
  agentExtensionsPromptEdit: '/agent-extensions/prompts/:promptId/edit',
  agentExtensionsTrashedPrompt: '/agent-extensions/prompts/trash/:promptId',
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
    id: 'prompts',
    label: 'Prompts',
    path: routePaths.agentExtensionsPrompts,
  },
] as const;

export function isDestinationSelected(pathname: string, destinationPath: string): boolean {
  return pathname === destinationPath || pathname.startsWith(`${destinationPath}/`);
}

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
