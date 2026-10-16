import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { SideNav, SideNavSection } from '@astryxdesign/core/SideNav';
import { VStack } from '@astryxdesign/core/Stack';
import WindowTitlebar from '@renderer/components/window-titlebar';
import { settingsNavigationItem, sidebarNavigation } from '@renderer/navigation';
import MenuGroup from './menu-group';
import RoutedSideNavItem from './routed-side-nav-item';
import { styles } from './styles';

export default function SidebarLayout() {
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);
  const collapsible = {
    isCollapsed: isSideNavCollapsed,
    onCollapsedChange: setIsSideNavCollapsed,
  };

  return (
    <AppShell
      height="fill"
      variant="surface"
      contentPadding={0}
      xstyle={styles.appShell}
      topNav={<WindowTitlebar collapsible={collapsible} />}
      sideNav={(
        <SideNav
          collapsible={{ ...collapsible, hasButton: false }}
          xstyle={isSideNavCollapsed ? styles.sideNavCollapsed : styles.sideNav}
          footer={(
            <SideNavSection title="Account" isHeaderHidden>
              <RoutedSideNavItem {...settingsNavigationItem} />
            </SideNavSection>
          )}
        >
          <SideNavSection title="Main" isHeaderHidden>
            <VStack gap={0} xstyle={styles.compactNavItems}>
              {sidebarNavigation.map((node) => (
                node.kind === 'item'
                  ? <RoutedSideNavItem key={node.id} {...node} />
                  : (
                      <MenuGroup
                        key={node.id}
                        title={node.title}
                        icon={node.icon}
                        items={node.items}
                      />
                    )
              ))}
            </VStack>
          </SideNavSection>
        </SideNav>
      )}
    >
      <Layout
        height="fill"
        content={(
          <LayoutContent padding={4} xstyle={styles.contentNoVerticalPadding}>
            <Outlet />
          </LayoutContent>
        )}
      />
    </AppShell>
  );
}
