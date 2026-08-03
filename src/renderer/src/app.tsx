import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { WindowDragRegion } from '@renderer/components/window-drag-region';
import { AgentsSwitchPage } from '@renderer/pages/agents-switch-page';
import { DashboardPage } from '@renderer/pages/dashboard-page';
import { SkillsPage } from '@renderer/pages/skills-page';
import { routePaths } from '@renderer/routes';

const styles = stylex.create({
  sideNav: {
    overflowX: 'clip',
  },
});

const sidebarResizeConfig = {
  defaultWidth: 260,
  minWidth: 200,
  maxWidth: 400,
};

export default function App() {
  const isMacOS = globalThis.electron.process.platform === 'darwin';
  const { pathname } = useLocation();

  return (
    <AppShell
      height="fill"
      variant="section"
      contentPadding={0}
      mobileNav={{ breakpoint: 'none', hasToggle: false }}
      sideNav={(
        <VStack height="100%" xstyle={styles.sideNav}>
          {isMacOS && <WindowDragRegion />}
          <StackItem size="fill">
            <SideNav collapsible={false} resizable={sidebarResizeConfig}>
              <SideNavItem
                as={Link}
                label="Dashboard"
                icon="viewColumns"
                href={routePaths.dashboard}
                isSelected={pathname === routePaths.dashboard}
              />
              <SideNavItem
                as={Link}
                label="Skills"
                icon="wrench"
                href={routePaths.skills}
                isSelected={pathname === routePaths.skills}
              />
              <SideNavItem
                as={Link}
                label="Agents Switch"
                icon="arrowsUpDown"
                href={routePaths.agentsSwitch}
                isSelected={pathname === routePaths.agentsSwitch}
              />
            </SideNav>
          </StackItem>
        </VStack>
      )}
    >
      <VStack height="100%">
        {isMacOS && <WindowDragRegion />}
        <StackItem size="fill" isScrollable>
          <Routes>
            <Route path={routePaths.dashboard} element={<DashboardPage />} />
            <Route path={routePaths.skills} element={<SkillsPage />} />
            <Route path={routePaths.agentsSwitch} element={<AgentsSwitchPage />} />
            <Route path="*" element={<Navigate to={routePaths.dashboard} replace />} />
          </Routes>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
