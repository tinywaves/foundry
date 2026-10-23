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
  getLabel,
}: {
  title: string;
  icon: NavigationItem['icon'];
  items: readonly NavigationItem[];
  getLabel: (id: string, fallback: string) => string;
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
            key={item.id}
            label={getLabel(item.id, item.label)}
            icon={item.icon}
            href={item.href}
          />
        ))}
      </VStack>
    </SideNavItem>
  );
}
