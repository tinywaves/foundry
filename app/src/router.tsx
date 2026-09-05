import type { RouteObject } from 'react-router';
import { Navigate, createHashRouter } from 'react-router';

import App from '#/app';
import { SidebarLayout } from '#/layouts/sidebar-layout';
import { StandaloneLayout } from '#/layouts/standalone-layout';
import { McpsPage } from '#/pages/capabilities/mcps';
import { PromptsPage } from '#/pages/capabilities/prompts';
import { SkillsPage } from '#/pages/capabilities/skills';
import { DashboardPage } from '#/pages/dashboard';
import { ProviderAddPage } from '#/pages/execution/provider-add';
import { ProvidersPage } from '#/pages/execution/providers';
import { RuntimesPage } from '#/pages/execution/runtimes';
import { NotFoundPage } from '#/pages/not-found';
import { SettingsPage } from '#/pages/settings';

export const routes: RouteObject[] = [
  {
    Component: App,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        Component: SidebarLayout,
        children: [
          {
            path: 'dashboard',
            Component: DashboardPage,
          },
          {
            path: 'prompts',
            Component: PromptsPage,
          },
          {
            path: 'skills',
            Component: SkillsPage,
          },
          {
            path: 'mcps',
            Component: McpsPage,
          },
          {
            path: 'providers',
            Component: ProvidersPage,
          },
          {
            path: 'runtimes',
            Component: RuntimesPage,
          },
        ],
      },
      {
        Component: StandaloneLayout,
        children: [
          {
            path: 'providers/new',
            Component: ProviderAddPage,
          },
          {
            path: 'settings',
            Component: SettingsPage,
          },
          {
            path: '*',
            Component: NotFoundPage,
          },
        ],
      },
    ],
  },
];

export const router = createHashRouter(routes);
