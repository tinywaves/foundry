import { Outlet, useLocation } from 'react-router-dom';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import WindowTitlebar from '@renderer/components/window-titlebar';
import { styles } from './sidebar/styles';

export default function StandaloneLayout() {
  const { pathname } = useLocation();
  const isSettingsPage = pathname === '/settings';

  return (
    <AppShell
      height="fill"
      variant="surface"
      contentPadding={0}
      mobileNav={false}
      xstyle={styles.appShell}
      topNav={<WindowTitlebar showBackButton />}
    >
      <Layout
        height="fill"
        content={(
          <LayoutContent
            padding={isSettingsPage ? 0 : 4}
            isScrollable={!isSettingsPage}
            xstyle={isSettingsPage ? undefined : styles.contentNoVerticalPadding}
          >
            <Outlet />
          </LayoutContent>
        )}
      />
    </AppShell>
  );
}
