import { AppShell } from '@astryxdesign/core/AppShell';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { Link, Outlet, useLocation } from 'react-router';
import { WindowDragRegion } from '@renderer/components/window-drag-region';
import {
  agentExtensionIcons,
  agentObservabilityIcons,
  agentRuntimeIcons,
  dashboardIcon,
} from '@renderer/navigation-icons';
import {
  agentExtensionDestinations,
  agentObservabilityDestinations,
  agentRuntimeDestinations,
  isDestinationSelected,
  routePaths,
} from '@renderer/routes';
import foundryIcon from '../../../../resources/icon.png?url';

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
  main: {
    minWidth: 0,
    minHeight: 0,
  },
});

const sidebarResizeConfig = {
  defaultWidth: 200,
  minWidth: 200,
  maxWidth: 400,
  autoSaveId: 'foundry-app-side-nav',
};

export function AppShellLayout() {
  const isMacOS = globalThis.api.platform === 'darwin';
  const { pathname } = useLocation();

  return (
    <AppShell
      height="fill"
      variant="section"
      contentPadding={0}
      mobileNav={{ breakpoint: 'none', hasToggle: false }}
      sideNav={(
        <VStack height="100%" xstyle={styles.sideNav}>
          {isMacOS ? <WindowDragRegion /> : null}
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
                      width={40}
                      height={40}
                      fetchPriority="high"
                      draggable={false}
                    />
                  )}
                />
              )}
            >
              <VStack gap={3}>
                <VStack gap={1}>
                  <SideNavItem
                    as={Link}
                    label="Dashboard"
                    icon={dashboardIcon}
                    href={routePaths.dashboard}
                    isSelected={pathname === routePaths.dashboard}
                  />
                </VStack>
                <SideNavSection title="Agent Extensions">
                  <VStack gap={1}>
                    {agentExtensionDestinations.map((destination) => (
                      <SideNavItem
                        key={destination.id}
                        as={Link}
                        label={destination.label}
                        icon={agentExtensionIcons[destination.id]}
                        href={destination.path}
                        isSelected={isDestinationSelected(pathname, destination.path)}
                      />
                    ))}
                  </VStack>
                </SideNavSection>
                <SideNavSection title="Agent Runtime">
                  <VStack gap={1}>
                    {agentRuntimeDestinations.map((destination) => (
                      <SideNavItem
                        key={destination.id}
                        as={Link}
                        label={destination.label}
                        icon={agentRuntimeIcons[destination.id]}
                        href={destination.path}
                        isSelected={pathname === destination.path}
                      />
                    ))}
                  </VStack>
                </SideNavSection>
                <SideNavSection title="Agent Observability">
                  <VStack gap={1}>
                    {agentObservabilityDestinations.map((destination) => (
                      <SideNavItem
                        key={destination.id}
                        as={Link}
                        label={destination.label}
                        icon={agentObservabilityIcons[destination.id]}
                        href={destination.path}
                        isSelected={pathname === destination.path}
                      />
                    ))}
                  </VStack>
                </SideNavSection>
              </VStack>
            </SideNav>
          </StackItem>
        </VStack>
      )}
    >
      <VStack height="100%">
        <StackItem
          as="main"
          size="fill"
          isScrollable
          xstyle={styles.main}
        >
          <Outlet />
        </StackItem>
      </VStack>
    </AppShell>
  );
}
