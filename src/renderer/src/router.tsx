import { createHashRouter, Navigate } from 'react-router-dom';
import App from './app';
import SidebarLayout from './layouts/sidebar';
import StandaloneLayout from './layouts/standalone';
import OverviewPage from './pages/overview';
import PromptsPage from './pages/library/prompts';
import SettingsPage from './pages/settings';
import NotFoundPage from './pages/not-found';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />,
      },
      {
        element: <SidebarLayout />,
        children: [
          { path: 'overview', element: <OverviewPage />, handle: { title: 'Overview' } },
          { path: 'prompts', element: <PromptsPage />, handle: { title: 'Prompts' } },
        ],
      },
      {
        element: <StandaloneLayout />,
        children: [
          { path: 'settings', element: <SettingsPage />, handle: { title: 'Settings' } },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
        ],
      },
    ],
  },
]);
