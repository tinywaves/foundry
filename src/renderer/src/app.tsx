import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavHeading, SideNavItem } from '@astryxdesign/core/SideNav';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { WindowDragRegion } from '@renderer/components/window-drag-region';
import { DashboardPage } from '@renderer/pages/dashboard-page';
import { ProvidersPage } from '@renderer/pages/providers-page';
import { SkillsPage } from '@renderer/pages/skills-page';
import { routePaths } from '@renderer/routes';
import foundryIcon from '../../../resources/icon.png?url';

const styles = stylex.create({
  brandHeading: {
    paddingInlineStart: spacingVars['--spacing-2'],
    paddingInlineEnd: spacingVars['--spacing-1'],
  },
  brandIcon: {
    display: 'block',
    width: spacingVars['--spacing-10'],
    height: spacingVars['--spacing-10'],
    objectFit: 'contain',
  },
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
            <SideNav
              collapsible={false}
              resizable={sidebarResizeConfig}
              header={(
                <SideNavHeading
                  as={Link}
                  heading="Foundry"
                  headingHref={routePaths.dashboard}
                  xstyle={styles.brandHeading}
                  icon={(
                    <img
                      {...stylex.props(styles.brandIcon)}
                      src={foundryIcon}
                      alt=""
                      draggable={false}
                    />
                  )}
                />
              )}
            >
              <VStack gap={1}>
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
                  label="Agents Switch"
                  icon="arrowsUpDown"
                  collapsible={{ defaultIsCollapsed: true }}
                >
                  <VStack gap={1}>
                    <SideNavItem
                      as={Link}
                      label="Providers"
                      href={routePaths.agentsSwitchProviders}
                      isSelected={pathname === routePaths.agentsSwitchProviders}
                      size="sm"
                    />
                  </VStack>
                </SideNavItem>
              </VStack>
            </SideNav>
          </StackItem>
        </VStack>
      )}
    >
      <VStack height="100%">
        <StackItem size="fill" isScrollable>
          <Routes>
            <Route path={routePaths.dashboard} element={<DashboardPage />} />
            <Route path={routePaths.skills} element={<SkillsPage />} />
            <Route
              path={routePaths.agentsSwitch}
              element={<Navigate to={routePaths.agentsSwitchProviders} replace />}
            />
            <Route path={routePaths.agentsSwitchProviders} element={<ProvidersPage />} />
            <Route path="*" element={<Navigate to={routePaths.dashboard} replace />} />
          </Routes>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
