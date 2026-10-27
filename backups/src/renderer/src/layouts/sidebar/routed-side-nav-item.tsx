import { useLocation } from 'react-router-dom';
import { SideNavItem } from '@astryxdesign/core/SideNav';
import type { NavigationItem } from '@renderer/navigation';
import RouterLink from './router-link';

export default function RoutedSideNavItem({
  label,
  icon,
  href,
}: Pick<NavigationItem, 'label' | 'icon' | 'href'>) {
  const { pathname } = useLocation();

  return (
    <SideNavItem
      label={label}
      icon={icon}
      href={href}
      as={RouterLink}
      isSelected={pathname === href}
      size="sm"
    />
  );
}
