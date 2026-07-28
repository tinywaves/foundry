import type { Ref } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  matchPath,
  useLocation,
  useNavigate,
} from 'react-router';
import type { LinkProps, Location } from 'react-router';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import SettingsPage from './pages/settings';

type SectionId = 'dashboard' | 'skills';

interface NavigationItem {
  id: SectionId;
  label: string;
  path: `/${SectionId}`;
}

const NAVIGATION = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'skills', label: 'Skills', path: '/skills' },
] as const satisfies readonly NavigationItem[];

const DEFAULT_SECTION = NAVIGATION[0];
const SETTINGS_PATH = '/settings';

interface SettingsLocationState {
  returnLocation?: Location;
}

interface RouterLinkProps extends Omit<LinkProps, 'to'> {
  href?: string;
  ref?: Ref<HTMLAnchorElement>;
}

function RouterLink({
  href = DEFAULT_SECTION.path,
  ref,
  ...props
}: RouterLinkProps) {
  return <Link ref={ref} to={href} {...props} />;
}

function SettingsRouterLink({
  href = SETTINGS_PATH,
  ref,
  ...props
}: RouterLinkProps) {
  const location = useLocation();

  return (
    <Link
      ref={ref}
      to={href}
      {...props}
      state={{ returnLocation: location }}
    />
  );
}

function Navigation() {
  const { pathname } = useLocation();

  return (
    <SideNav
      header={
        (
          <SideNavHeading
            heading="Foundry"
            superheading="Administration"
          />
        )
      }
      footer={
        (
          <SideNavItem
            as={SettingsRouterLink}
            href={SETTINGS_PATH}
            icon={<Icon icon="wrench" color="inherit" size="sm" />}
            label="Settings"
            size="sm"
          />
        )
      }
    >
      <SideNavSection title="Sections" isHeaderHidden>
        {NAVIGATION.map((navigationItem) => (
          <SideNavItem
            as={RouterLink}
            key={navigationItem.id}
            href={navigationItem.path}
            isSelected={matchPath(navigationItem.path, pathname) !== null}
            label={navigationItem.label}
          />
        ))}
      </SideNavSection>
    </SideNav>
  );
}

function SectionPlaceholder({ section }: { section: NavigationItem }) {
  return (
    <VStack as="section" gap={2} height="100%">
      <Heading level={1}>{section.label}</Heading>
      <Text as="p" type="supporting">
        This section is not implemented yet.
      </Text>
      <StackItem size="fill">
        <Center height="100%">
          <EmptyState
            title="Nothing here yet"
            description={`${section.label} content will be added in a future iteration.`}
            headingLevel={2}
          />
        </Center>
      </StackItem>
    </VStack>
  );
}

function SettingsRoutePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const settingsLocationState = location.state as SettingsLocationState | null;
  const returnLocation = settingsLocationState?.returnLocation;

  function returnToApp() {
    if (returnLocation) {
      void navigate(-1);

      return;
    }

    void navigate(DEFAULT_SECTION.path, { replace: true });
  }

  return (
    <AppShell
      contentPadding={6}
      height="fill"
      variant="section"
    >
      <VStack gap={6} height="100%">
        <Stack direction="horizontal">
          <Button
            icon={<Icon icon="chevronLeft" color="primary" size="sm" />}
            label="Back to app"
            onClick={returnToApp}
            size="sm"
            variant="ghost"
          />
        </Stack>
        <StackItem size="fill">
          <SettingsPage />
        </StackItem>
      </VStack>
    </AppShell>
  );
}

function ApplicationShell() {
  return (
    <AppShell
      contentPadding={6}
      height="fill"
      mobileNav={{ breakpoint: 'md' }}
      sideNav={<Navigation />}
      variant="section"
    >
      <Routes>
        <Route
          index
          element={<Navigate to={DEFAULT_SECTION.path} replace />}
        />
        {NAVIGATION.map((section) => (
          <Route
            key={section.id}
            path={section.path}
            element={<SectionPlaceholder section={section} />}
          />
        ))}
        <Route
          path="*"
          element={<Navigate to={DEFAULT_SECTION.path} replace />}
        />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path={SETTINGS_PATH} element={<SettingsRoutePage />} />
      <Route path="*" element={<ApplicationShell />} />
    </Routes>
  );
}
