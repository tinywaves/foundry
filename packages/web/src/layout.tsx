import { Outlet, Link } from 'react-router';

export default function Layout() {
  return (
    <div className="h-screen">
      <Link to="/json-view">Json View</Link>
      <Outlet />
    </div>
  );
}
