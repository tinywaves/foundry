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
import { useI18n } from '@renderer/i18n/use-i18n';

export default function SidebarLayout() {
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);
  const { t } = useI18n();
  const navigationLabel = (id: string, fallback: string) => {
    const labels: Record<string, string> = {
      overview: t('navigation.overview'),
      captures: t('navigation.captures'),
      prompts: t('navigation.prompts'),
      providers: t('navigation.providers'),
      settings: t('navigation.settings'),
      library: t('navigation.library'),
    };
    return labels[id] ?? fallback;
  };
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
            <SideNavSection title={t('navigation.account')} isHeaderHidden>
              <RoutedSideNavItem {...settingsNavigationItem} label={navigationLabel(settingsNavigationItem.id, settingsNavigationItem.label)} />
            </SideNavSection>
          )}
        >
          <SideNavSection title={t('navigation.main')} isHeaderHidden>
            <VStack gap={0} xstyle={styles.compactNavItems}>
              {sidebarNavigation.map((node) => (
                node.kind === 'item'
                  ? <RoutedSideNavItem key={node.id} {...node} label={navigationLabel(node.id, node.label)} />
                  : (
                      <MenuGroup
                        key={node.id}
                        title={navigationLabel(node.id, node.title)}
                        icon={node.icon}
                        items={node.items}
                        getLabel={navigationLabel}
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
