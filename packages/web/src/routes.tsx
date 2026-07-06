import { createHashRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/pages/dashboard';
import { SettingsPage } from '@/pages/settings';
import { ToolDetailPage } from '@/pages/tools/detail';
import { ToolsIndexPage } from '@/pages/tools/index';

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'settings', element: <SettingsPage /> },
      {
        path: 'tools',
        children: [
          { index: true, element: <ToolsIndexPage /> },
          { path: ':toolId', element: <ToolDetailPage /> },
        ],
      },
    ],
  },
]);
