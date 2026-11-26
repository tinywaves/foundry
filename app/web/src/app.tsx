import { TooltipProvider } from './components/ui/tooltip';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';

import { MainLayout } from './app/main-layout';
import { mainRoutePaths, settingsRoutePaths } from './app/navigation';
import { SettingsLayout } from './app/settings-layout';

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
    children: settingsRoutePaths.map((path) => ({
      path,
      element: <EmptyPage />,
    })),
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}
