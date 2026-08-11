export const routePaths = {
  dashboard: '/',
  skills: '/skills',
  agentRuntime: '/agent-runtime',
  agentRuntimeRuntimes: '/agent-runtime/runtimes',
  agentRuntimeProviders: '/agent-runtime/providers',
} as const;

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
