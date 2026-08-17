import type { RouteObject } from 'react-router';
import { Navigate } from 'react-router';
import { AppShellLayout } from '@renderer/layouts/app-shell-layout';
import { FullWindowLayout } from '@renderer/layouts/full-window-layout';
import { DashboardPage } from '@renderer/pages/dashboard-page';
import { McpServersPage } from '@renderer/pages/mcp-servers-page';
import { PromptCreatePage, PromptEditPage } from '@renderer/pages/prompt-editor-page';
import { PromptTrashPage } from '@renderer/pages/prompt-trash-page';
import { PromptTrashViewPage } from '@renderer/pages/prompt-trash-view-page';
import { PromptViewPage } from '@renderer/pages/prompt-view-page';
import { PromptsPage } from '@renderer/pages/prompts-page';
import { ProvidersPage } from '@renderer/pages/providers-page';
import { RuntimesPage } from '@renderer/pages/runtimes-page';
import { SettingsPage } from '@renderer/pages/settings-page';
import { SessionsPage } from '@renderer/pages/sessions-page';
import { SkillsPage } from '@renderer/pages/skills-page';
import { routePatterns, routePaths } from '@renderer/routes';

const routeLayoutIds = {
  appShell: 'app-shell-layout',
  fullWindow: 'full-window-layout',
} as const;

const appShellRoutes: RouteObject[] = [
  {
    path: routePaths.dashboard,
    element: <DashboardPage />,
  },
  {
    path: routePaths.agentExtensions,
    element: <Navigate to={routePaths.agentExtensionsSkills} replace />,
  },
  {
    path: routePaths.agentExtensionsSkills,
    element: <SkillsPage />,
  },
  {
    path: routePaths.agentExtensionsMcpServers,
    element: <McpServersPage />,
  },
  {
    path: routePaths.agentExtensionsPrompts,
    element: <PromptsPage />,
  },
  {
    path: routePaths.agentExtensionsPromptsTrash,
    element: <PromptTrashPage />,
  },
  {
    path: routePaths.agentRuntime,
    element: <Navigate to={routePaths.agentRuntimeRuntimes} replace />,
  },
  {
    path: routePaths.agentRuntimeRuntimes,
    element: <RuntimesPage />,
  },
  {
    path: routePaths.agentRuntimeProviders,
    element: <ProvidersPage />,
  },
  {
    path: routePaths.agentObservability,
    element: <Navigate to={routePaths.agentObservabilitySessions} replace />,
  },
  {
    path: routePaths.agentObservabilitySessions,
    element: <SessionsPage />,
  },
  {
    path: '*',
    element: <Navigate to={routePaths.dashboard} replace />,
  },
];

const fullWindowRoutes: RouteObject[] = [
  {
    path: routePaths.settings,
    element: <SettingsPage />,
  },
  {
    path: routePaths.agentExtensionsPromptsNew,
    element: <PromptCreatePage />,
  },
  {
    path: routePatterns.agentExtensionsTrashedPrompt,
    element: <PromptTrashViewPage />,
  },
  {
    path: routePatterns.agentExtensionsPromptEdit,
    element: <PromptEditPage />,
  },
  {
    path: routePatterns.agentExtensionsPrompt,
    element: <PromptViewPage />,
  },
];

export const foundryRoutes: RouteObject[] = [
  {
    id: routeLayoutIds.appShell,
    Component: AppShellLayout,
    children: appShellRoutes,
  },
  {
    id: routeLayoutIds.fullWindow,
    Component: FullWindowLayout,
    children: fullWindowRoutes,
  },
];
