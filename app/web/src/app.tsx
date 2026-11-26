import { TooltipProvider } from './components/ui/tooltip';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';

import { MainLayout } from './app/main-layout';
import { mainRoutePaths } from './app/navigation';
import { SettingsLayout } from './app/settings-layout';
import { SettingsPage } from './features/settings/settings-page';
import { SettingsProvider } from './features/settings/settings-provider';

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
    <TooltipProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </TooltipProvider>
  );
}
