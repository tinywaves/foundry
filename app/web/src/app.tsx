import { useState } from 'react';
import type { ComponentProps, ReactNode, Ref } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  NavLink,
  Navigate,
  Outlet,
  createHashRouter,
  useLocation,
  useMatches,
  useNavigate,
  RouterProvider,
} from 'react-router-dom';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import {
  SideNav,
  SideNavCollapseButton,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import type { SideNavCollapseButtonProps } from '@astryxdesign/core/SideNav';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Theme } from '@astryxdesign/core/theme';
import {
  ChatBubbleLeftIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderIcon,
  LinkIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import * as stylex from '@stylexjs/stylex';
import { foundryTheme } from './astryx-themes';
import {
  TitlebarActionsProvider,
} from './components/titlebar-actions';
import { useTitlebarActionsTarget } from './components/titlebar-actions-context';
import { I18nProvider, useI18n } from './i18n';
import type { TranslationKey } from './i18n';
import { FoundryEventsProvider } from './lib/foundry-events';
import { queryClient } from './lib/query-client';
import OverviewPage from './features/overview/overview-page';
import PromptsPage from './features/prompts/prompts-page';
import SettingsPage from './features/settings/settings-page';
import ProvidersPage from './features/providers/provider-page';
import ProviderFormPage from './features/providers/provider-form';
import CapturesPage from './features/captures/capture-page';
import CaptureDetailDialog from './features/captures/capture-detail-dialog';
import JobsPage from './features/captures/jobs-page';
import { CaptureRealtimeBridge } from './features/captures/realtime';
import { DataTransferRealtimeBridge } from './features/data-transfer/realtime';
import { ProvidersRealtimeBridge } from './features/providers/realtime';
import { SettingsRealtimeBridge } from './features/settings/realtime';
import { getSettings, settingsKeys } from './features/settings/api';

const styles = stylex.create({
  appShell: {
    fontFamily: 'Poppins, sans-serif',
  },
  sideNav: { width: 'calc(var(--spacing-4) * 12.5) !important' },
  sideNavCollapsed: { width: 'var(--spacing-12) !important' },
  compactNavItems: {
    rowGap: 'calc(var(--spacing-0-5) / 2)',
  },
  titlebar: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    height: 'calc(var(--spacing-4) * 2.5)',
    minHeight: 'calc(var(--spacing-4) * 2.5)',
    paddingInlineStart: 'var(--spacing-4)',
    paddingInlineEnd: 'var(--spacing-4)',
    userSelect: 'none',
  },
  titlebarContent: {
    minWidth: 0,
  },
  title: {
    'flex': '0 1 auto',
    'minWidth': 0,
    'maxWidth': '35%',
    '@media (max-width: 840px)': {
      maxWidth: '30%',
    },
  },
  description: {
    'minWidth': 0,
    'flexShrink': 1,
    '@media (max-width: 840px)': {
      display: 'none',
    },
  },
  actions: {
    flexShrink: 0,
  },
});

const titlebarStyle = stylex.props(styles.titlebar);

const appIcons = {
  overview: Squares2X2Icon,
  captures: LinkIcon,
  prompts: DocumentTextIcon,
  library: FolderIcon,
  providers: Square3Stack3DIcon,
  chat: ChatBubbleLeftIcon,
  settings: Cog6ToothIcon,
} as const;

type AppIconName = keyof typeof appIcons;

type NavigationItem = {
  kind: 'item';
  id: string;
  label: string;
  href: string;
  icon: (typeof appIcons)[AppIconName];
};

type NavigationSection = {
  kind: 'section';
  id: string;
  title: string;
  icon: (typeof appIcons)[AppIconName];
  items: readonly NavigationItem[];
};

const sidebarNavigation: ReadonlyArray<NavigationItem | NavigationSection> = [
  {
    kind: 'item',
    id: 'overview',
    label: 'Overview',
    href: '/overview',
    icon: appIcons.overview,
  },
  {
    kind: 'section',
    id: 'library',
    title: 'Library',
    icon: appIcons.library,
    items: [
      {
        kind: 'item',
        id: 'prompts',
        label: 'Prompts',
        href: '/library/prompts',
        icon: appIcons.prompts,
      },
      {
        kind: 'item',
        id: 'captures',
        label: 'Captures',
        href: '/library/captures',
        icon: appIcons.captures,
      },
    ],
  },
  {
    kind: 'item',
    id: 'providers',
    label: 'Providers',
    href: '/providers',
    icon: appIcons.providers,
  },
];

const settingsNavigationItem: NavigationItem = {
  kind: 'item',
  id: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: appIcons.settings,
};

function RouterLink({
  href = '/',
  ref,
  ...props
}: Omit<ComponentProps<typeof NavLink>, 'to'> & {
  href?: string;
  ref?: Ref<HTMLAnchorElement>;
}) {
  return <NavLink ref={ref} to={href} {...props} />;
}

function RoutedSideNavItem({
  label,
  icon,
  href,
}: Pick<NavigationItem, 'label' | 'icon' | 'href'>) {
  const { pathname } = useLocation();

  return (
    <SideNavItem
      label={label}
      icon={icon}
      href={href}
      as={RouterLink}
      isSelected={pathname === href}
      size="sm"
    />
  );
}

function MenuGroup({
  title,
  icon,
  items,
  getLabel,
}: {
  title: string;
  icon: NavigationItem['icon'];
  items: readonly NavigationItem[];
  getLabel: (id: string, fallback: string) => string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const firstItem = items[0];

  return (
    <SideNavItem
      label={title}
      icon={icon}
      href={firstItem.href}
      as={RouterLink}
      collapsible={{
        isCollapsed,
        onCollapsedChange: setIsCollapsed,
      }}
      onClick={() => setIsCollapsed(false)}
      size="sm"
    >
      <VStack gap={0} xstyle={styles.compactNavItems}>
        {items.map((item) => (
          <RoutedSideNavItem
            key={item.id}
            label={getLabel(item.id, item.label)}
            icon={item.icon}
            href={item.href}
          />
        ))}
      </VStack>
    </SideNavItem>
  );
}

function isRouteHandle(value: unknown): value is {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
} {
  return typeof value === 'object'
    && value !== null
    && 'titleKey' in value
    && typeof value.titleKey === 'string';
}

function WindowTitlebar({
  collapsible,
  showBackButton = false,
}: Partial<Pick<SideNavCollapseButtonProps, 'collapsible'>> & {
  showBackButton?: boolean;
}) {
  const matches = useMatches();
  const navigate = useNavigate();
  const { t } = useI18n();
  const setTitlebarActionsTarget = useTitlebarActionsTarget();
  const titleHandle = matches.findLast((match) => isRouteHandle(match.handle))?.handle;

  return (
    <header {...titlebarStyle} aria-label={t('navigation.windowTitlebar')}>
      {showBackButton && (
        <IconButton
          label={t('navigation.back')}
          icon={<Icon icon="chevronLeft" />}
          variant="ghost"
          size="sm"
          tooltip={t('navigation.back')}
          onClick={() => navigate(-1)}
        />
      )}
      {collapsible && (
        <SideNavCollapseButton
          collapsible={collapsible}
          size="sm"
        >
          <Icon icon={collapsible.isCollapsed ? 'chevronsRight' : 'chevronsLeft'} size="sm" />
        </SideNavCollapseButton>
      )}
      {isRouteHandle(titleHandle) && (
        <HStack gap={2} vAlign="center" width="100%" xstyle={styles.titlebarContent}>
          <Text type="large" weight="semibold" maxLines={1} textWrap="nowrap" xstyle={styles.title}>
            {t(titleHandle.titleKey)}
          </Text>
          {titleHandle.descriptionKey && (
            <Text type="supporting" maxLines={1} textWrap="nowrap" xstyle={styles.description}>
              {t(titleHandle.descriptionKey)}
            </Text>
          )}
          <StackItem size="fill" />
          <HStack
            ref={setTitlebarActionsTarget}
            vAlign="center"
            xstyle={styles.actions}
          />
        </HStack>
      )}
    </header>
  );
}

function SidebarLayout() {
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
              <RoutedSideNavItem
                {...settingsNavigationItem}
                label={navigationLabel(settingsNavigationItem.id, settingsNavigationItem.label)}
              />
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
          <LayoutContent padding={4}>
            <Outlet />
          </LayoutContent>
        )}
      />
    </AppShell>
  );
}

function StandaloneLayout() {
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
          >
            <Outlet />
          </LayoutContent>
        )}
      />
    </AppShell>
  );
}

function NotFoundPage() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  return (
    <VStack gap={2}>
      <Text type="supporting">
        {t('navigation.notFound')}
        :
        {pathname}
      </Text>
    </VStack>
  );
}

function RootLayout() {
  return <Outlet />;
}

function routeHandle(titleKey: TranslationKey, descriptionKey?: TranslationKey) {
  return { titleKey, descriptionKey };
}

const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />,
      },
      {
        element: <SidebarLayout />,
        children: [
          {
            path: 'overview',
            element: <OverviewPage />,
            handle: routeHandle('navigation.overview'),
          },
          {
            path: 'library/captures',
            element: <CapturesPage />,
            handle: routeHandle('navigation.captures', 'navigation.capturesDescription'),
          },
          {
            path: 'library/prompts',
            element: <PromptsPage />,
            handle: routeHandle('navigation.prompts'),
          },
          {
            path: 'providers',
            element: <ProvidersPage />,
            handle: routeHandle('navigation.providers', 'navigation.providersDescription'),
          },
        ],
      },
      {
        element: <StandaloneLayout />,
        children: [
          {
            path: 'library/captures/:captureId',
            element: <CaptureDetailDialog />,
            handle: routeHandle(
              'navigation.captureDetails',
              'navigation.captureDetailsDescription',
            ),
          },
          {
            path: 'library/captures/:captureId/jobs',
            element: <JobsPage />,
            handle: routeHandle('navigation.jobs', 'navigation.jobsDescription'),
          },
          {
            path: 'settings',
            element: <SettingsPage />,
            handle: routeHandle('navigation.settings'),
          },
          {
            path: 'providers/new',
            element: <ProviderFormPage />,
            handle: routeHandle('navigation.newProvider', 'providers.formDescription'),
          },
          {
            path: 'providers/:providerId',
            element: <ProviderFormPage />,
            handle: routeHandle('navigation.editProvider', 'providers.formDescription'),
          },
          {
            path: '*',
            element: <NotFoundPage />,
            handle: routeHandle('navigation.notFound'),
          },
        ],
      },
    ],
  },
]);

function AppTheme({ children }: { children: ReactNode }) {
  const settingsQuery = useQuery({
    queryKey: settingsKeys.current(),
    queryFn: getSettings,
  });
  const mode = settingsQuery.data?.workspace.appearance['color-theme'] ?? 'system';

  return (
    <Theme theme={foundryTheme} mode={mode}>
      {children}
    </Theme>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FoundryEventsProvider>
        <TitlebarActionsProvider>
          <CaptureRealtimeBridge />
          <DataTransferRealtimeBridge />
          <ProvidersRealtimeBridge />
          <SettingsRealtimeBridge />
          <AppTheme>
            <I18nProvider>
              <RouterProvider router={router} />
            </I18nProvider>
          </AppTheme>
        </TitlebarActionsProvider>
      </FoundryEventsProvider>
    </QueryClientProvider>
  );
}
