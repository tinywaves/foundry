import { Outlet } from 'react-router';

import { useHealth } from '#/hooks/use-health';
import { Toaster } from '#/components/ui/toast';

export default function App() {
  useHealth();

  return (
    <Toaster>
      <Outlet />
    </Toaster>
  );
}
