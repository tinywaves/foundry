import { Outlet } from 'react-router';

import { useHealth } from '#/hooks/use-health';

export default function App() {
  useHealth();

  return <Outlet />;
}
