import type { Ref } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  matchPath,
  useLocation,
} from 'react-router';
import type { LinkProps } from 'react-router';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import SettingsPage from './pages/settings';

type SectionId = 'dashboard' | 'skills' | 'settings';

interface NavigationItem {
  id: SectionId;
  label: string;
  path: `/${SectionId}`;
}

const NAVIGATION = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'skills', label: 'Skills', path: '/skills' },
  { id: 'settings', label: 'Settings', path: '/settings' },
] as const satisfies readonly NavigationItem[];

const DEFAULT_SECTION = NAVIGATION[0];

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

export default function App() {
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
            element={
              section.id === 'settings'
                ? <SettingsPage />
                : <SectionPlaceholder section={section} />
            }
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
