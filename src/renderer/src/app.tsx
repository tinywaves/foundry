import { AppShell } from '@astryxdesign/core/AppShell';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import {
  colorVars,
  radiusVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import {
  Link as RouterLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router';
import { WindowDragRegion } from '@renderer/components/window-drag-region';
import {
  agentExtensionIcons,
  agentObservabilityIcons,
  agentRuntimeIcons,
  dashboardIcon,
} from '@renderer/navigation-icons';
import { DashboardPage } from '@renderer/pages/dashboard-page';
import { McpServersPage } from '@renderer/pages/mcp-servers-page';
import { PromptCreatePage, PromptEditPage } from '@renderer/pages/prompt-editor-page';
import { PromptTrashPage } from '@renderer/pages/prompt-trash-page';
import { PromptTrashViewPage } from '@renderer/pages/prompt-trash-view-page';
import { PromptViewPage } from '@renderer/pages/prompt-view-page';
import { PromptsPage } from '@renderer/pages/prompts-page';
import { ProvidersPage } from '@renderer/pages/providers-page';
import { RuntimesPage } from '@renderer/pages/runtimes-page';
import { SessionsPage } from '@renderer/pages/sessions-page';
import { SkillsPage } from '@renderer/pages/skills-page';
import {
  agentExtensionDestinations,
  agentObservabilityDestinations,
  agentRuntimeDestinations,
  isDestinationSelected,
  routePatterns,
  routePaths,
} from '@renderer/routes';
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
  skipLink: {
    position: 'fixed',
    zIndex: 1,
    insetBlockStart: spacingVars['--spacing-2'],
    insetInlineStart: spacingVars['--spacing-2'],
    paddingBlock: spacingVars['--spacing-1'],
    paddingInline: spacingVars['--spacing-2'],
    borderRadius: radiusVars['--radius-element'],
    backgroundColor: colorVars['--color-background-surface'],
    transform: {
      'default': 'translateY(-200%)',
      ':focus-visible': 'translateY(0)',
    },
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
};

export default function App() {
  const isMacOS = globalThis.api.platform === 'darwin';
  const { pathname } = useLocation();

  return (
    <>
      <AstryxLink
        as="a"
        href="#main-content"
        isStandalone
        xstyle={styles.skipLink}
      >
        Skip to Main Content
      </AstryxLink>
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
                    as={RouterLink}
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
                      as={RouterLink}
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
                          as={RouterLink}
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
                          as={RouterLink}
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
                          as={RouterLink}
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
            id="main-content"
            tabIndex={-1}
            size="fill"
            isScrollable
            xstyle={styles.main}
          >
            <Routes>
              <Route path={routePaths.dashboard} element={<DashboardPage />} />
              <Route
                path={routePaths.agentExtensions}
                element={<Navigate to={routePaths.agentExtensionsSkills} replace />}
              />
              <Route path={routePaths.agentExtensionsSkills} element={<SkillsPage />} />
              <Route
                path={routePaths.agentExtensionsMcpServers}
                element={<McpServersPage />}
              />
              <Route
                path={routePaths.agentExtensionsPrompts}
                element={<PromptsPage />}
              />
              <Route
                path={routePaths.agentExtensionsPromptsNew}
                element={<PromptCreatePage />}
              />
              <Route
                path={routePaths.agentExtensionsPromptsTrash}
                element={<PromptTrashPage />}
              />
              <Route
                path={routePatterns.agentExtensionsTrashedPrompt}
                element={<PromptTrashViewPage />}
              />
              <Route
                path={routePatterns.agentExtensionsPromptEdit}
                element={<PromptEditPage />}
              />
              <Route
                path={routePatterns.agentExtensionsPrompt}
                element={<PromptViewPage />}
              />
              <Route
                path={routePaths.agentRuntime}
                element={<Navigate to={routePaths.agentRuntimeRuntimes} replace />}
              />
              <Route path={routePaths.agentRuntimeRuntimes} element={<RuntimesPage />} />
              <Route path={routePaths.agentRuntimeProviders} element={<ProvidersPage />} />
              <Route
                path={routePaths.agentObservability}
                element={<Navigate to={routePaths.agentObservabilitySessions} replace />}
              />
              <Route
                path={routePaths.agentObservabilitySessions}
                element={<SessionsPage />}
              />
              <Route path="*" element={<Navigate to={routePaths.dashboard} replace />} />
            </Routes>
          </StackItem>
        </VStack>
      </AppShell>
    </>
  );
}
