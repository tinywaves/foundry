import { createHashRouter, Navigate } from 'react-router-dom';
import App from './app';
import SidebarLayout from './layouts/sidebar';
import StandaloneLayout from './layouts/standalone';
import OverviewPage from './pages/overview';
import PromptsPage from './pages/library/prompts';
import SettingsPage from './pages/settings';
import NotFoundPage from './pages/not-found';
import ProvidersPage from './pages/providers';
import ProviderFormPage from './pages/providers/form';
import CapturesPage from './pages/base/captures';
import JobsPage from './pages/base/jobs';

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
          {
            path: 'base/captures',
            element: <CapturesPage />,
            handle: {
              title: 'Base',
              description: 'Collect links first, then organize them later.',
            },
          },
          { path: 'prompts', element: <PromptsPage />, handle: { title: 'Prompts' } },
          {
            path: 'providers',
            element: <ProvidersPage />,
            handle: {
              title: 'Providers',
              description: 'Manage the model service connections used by Foundry.',
            },
          },
        ],
      },
      {
        element: <StandaloneLayout />,
        children: [
          {
            path: 'base/captures/:captureId/jobs',
            element: <JobsPage />,
            handle: {
              title: 'Jobs',
              description: 'Review scrape history and errors for this capture.',
            },
          },
          { path: 'settings', element: <SettingsPage />, handle: { title: 'Settings' } },
          {
            path: 'providers/new',
            element: <ProviderFormPage />,
            handle: {
              title: 'New provider',
              description: 'Connect a model service using one of Foundry\'s supported protocols.',
            },
          },
          {
            path: 'providers/:providerId',
            element: <ProviderFormPage />,
            handle: {
              title: 'Edit provider',
              description: 'Connect a model service using one of Foundry\'s supported protocols.',
            },
          },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
        ],
      },
    ],
  },
]);
