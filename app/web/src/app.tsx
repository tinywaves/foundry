import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';

import { MainLayout } from './app/main-layout';
import { mainRoutePaths } from './app/navigation';
import { SettingsLayout } from './app/settings-layout';
import { SettingsPage } from './features/settings/settings-page';
import { SettingsProvider } from './features/settings/state/settings-provider';
import { useSettings } from './features/settings/state/use-settings';
import { queryClient } from './lib/query-client';

function EmptyPage() {
  return null;
}

const router = createHashRouter([
  {
    element: <MainLayout />,
    children: mainRoutePaths.map((path) => ({
      path,
      element: <EmptyPage />,
    })),
  },
  {
    element: <SettingsLayout />,
    children: [
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { theme } = useSettings();

  return (
    <>
      <RouterProvider router={router} />
      <Toaster theme={theme} />
    </>
  );
}
