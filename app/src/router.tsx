import type { RouteObject } from 'react-router';
import { Navigate, createHashRouter } from 'react-router';

import App from '#/app';
import { SidebarLayout } from '#/layouts/sidebar-layout';
import { StandaloneLayout } from '#/layouts/standalone-layout';
import { DashboardPage } from '#/pages/dashboard-page';
import { NotFoundPage } from '#/pages/not-found-page';
import { PromptsPage } from '#/pages/prompts-page';
import { SettingsPage } from '#/pages/settings-page';

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
        ],
      },
      {
        Component: StandaloneLayout,
        children: [
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
