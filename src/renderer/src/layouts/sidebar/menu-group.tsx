import { useState } from 'react';
import { SideNavItem } from '@astryxdesign/core';
import { VStack } from '@astryxdesign/core/Stack';
import type { NavigationItem } from '@renderer/navigation';
import RouterLink from './router-link';
import RoutedSideNavItem from './routed-side-nav-item';
import { styles } from './styles';

export default function MenuGroup({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: readonly NavigationItem[];
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const firstItem = items[0];

  return (
    <SideNavItem
      label={title}
      icon={icon}
      href={firstItem.href}
      as={RouterLink}
      collapsible={{
        isCollapsed,
        onCollapsedChange: setIsCollapsed,
      }}
      onClick={() => setIsCollapsed(false)}
      size="sm"
    >
      <VStack gap={0} xstyle={styles.compactNavItems}>
        {items.map((item) => (
          <RoutedSideNavItem
            key={item.label}
            label={item.label}
            icon={item.icon}
            href={item.href}
          />
        ))}
      </VStack>
    </SideNavItem>
  );
}
