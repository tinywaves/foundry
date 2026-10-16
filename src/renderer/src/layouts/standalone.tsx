import { Outlet } from 'react-router-dom';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import WindowTitlebar from '@renderer/components/window-titlebar';
import { styles } from './sidebar/styles';

export default function StandaloneLayout() {
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
          <LayoutContent padding={4} xstyle={styles.contentNoVerticalPadding}>
            <Outlet />
          </LayoutContent>
        )}
      />
    </AppShell>
  );
}
