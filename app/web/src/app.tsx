import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { NavLink, Navigate, Outlet, createHashRouter, useLocation, useMatches, useNavigate, RouterProvider } from 'react-router-dom';
import { ArrowLeft, PanelLeft, ChevronRight, MessagesSquare, Settings, FileText, Folder, Link, Layers, LayoutGrid } from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import { Button } from './components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarInset, SidebarProvider, useSidebar } from './components/ui/sidebar';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';
import { TitlebarActionsProvider } from './components/titlebar-actions';
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
import SessionsPage from './features/sessions/sessions-page';
import CaptureDetailDialog from './features/captures/capture-detail-dialog';
import JobsPage from './features/captures/jobs-page';
import { CaptureRealtimeBridge } from './features/captures/realtime';
import { DataTransferRealtimeBridge } from './features/data-transfer/realtime';
import { ProvidersRealtimeBridge } from './features/providers/realtime';
import { SettingsRealtimeBridge } from './features/settings/realtime';
import { getSettings, settingsKeys } from './features/settings/api';

const navigation = [
  { id: 'overview', href: '/overview', icon: LayoutGrid, key: 'navigation.overview' },
  { id: 'sessions', href: '/library/sessions', icon: MessagesSquare, key: 'navigation.sessions' },
  { id: 'prompts', href: '/library/prompts', icon: FileText, key: 'navigation.prompts' },
  { id: 'captures', href: '/library/captures', icon: Link, key: 'navigation.captures' },
  { id: 'providers', href: '/providers', icon: Layers, key: 'navigation.providers' },
] as const;

function isRouteHandle(value: unknown): value is { titleKey: TranslationKey; descriptionKey?: TranslationKey } {
  return typeof value === 'object' && value !== null && 'titleKey' in value && typeof value.titleKey === 'string';
}
function WindowTitlebar({ standalone = false }: { standalone?: boolean }) {
  const matches = useMatches();
  const navigate = useNavigate();
  const { t } = useI18n();
  const sidebar = useSidebar();
  const setTitlebarActionsTarget = useTitlebarActionsTarget();
  const handle = matches.findLast((match) => isRouteHandle(match.handle))?.handle;
  return (
    <header className="flex h-10 min-h-10 items-center gap-2 px-4 select-none" aria-label={t('navigation.windowTitlebar')}>
      {standalone
        ? (
            <Button variant="ghost" size="icon-sm" aria-label={t('navigation.back')} onClick={() => navigate(-1)}>
              <ArrowLeft />
            </Button>
          )
        : (
            <Button variant="ghost" size="icon-sm" aria-label={t('navigation.openNavigation')} onClick={sidebar.toggleSidebar}>
              <PanelLeft />
            </Button>
          )}
      {isRouteHandle(handle) && (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="min-w-0 max-w-[35%] shrink truncate text-base font-semibold max-[840px]:max-w-[30%]">{t(handle.titleKey)}</span>
          {handle.descriptionKey && <span className="min-w-0 shrink truncate text-xs text-muted-foreground max-[840px]:hidden">{t(handle.descriptionKey)}</span>}
          <div ref={setTitlebarActionsTarget} className="ml-auto flex shrink-0 items-center gap-2" />
        </div>
      )}
    </header>
  );
}
function Navigation() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const [libraryOpen, setLibraryOpen] = useState(true);
  const closeMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const overview = navigation[0];
  const providers = navigation[4];
  const item = (node: typeof navigation[number]) => (
    <SidebarMenuItem key={node.id}>
      <SidebarMenuButton aria-label={t(node.key)} size="sm" isActive={pathname === node.href} tooltip={t(node.key)} render={<NavLink to={node.href} onClick={closeMobile} />}>
        <node.icon />
        <span>{t(node.key)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {item(overview)}
              <SidebarMenuItem>
                <SidebarMenuButton
                  aria-label={t('navigation.library')}
                  size="sm"
                  tooltip={t('navigation.library')}
                  render={(
                    <NavLink
                      to="/library/sessions"
                      onClick={() => {
                        setLibraryOpen(true);
                        closeMobile();
                      }}
                    />
                  )}
                >
                  <Folder />
                  <span>{t('navigation.library')}</span>
                </SidebarMenuButton>
                <SidebarMenuAction aria-label={t('navigation.library')} aria-expanded={libraryOpen} onClick={() => setLibraryOpen(!libraryOpen)}>
                  <ChevronRight className={libraryOpen ? 'rotate-90' : ''} />
                </SidebarMenuAction>
                {state === 'collapsed' && !isMobile
                  ? <SidebarMenu>{navigation.slice(1, 4).map((node) => item(node))}</SidebarMenu>
                  : libraryOpen && (
                    <SidebarMenuSub>
                      {navigation.slice(1, 4).map((node) => (
                        <SidebarMenuSubItem key={node.id}>
                          <SidebarMenuSubButton isActive={pathname === node.href} render={<NavLink to={node.href} onClick={closeMobile} />}>
                            <node.icon className="size-4" />
                            <span>{t(node.key)}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
              </SidebarMenuItem>
              {item(providers)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton aria-label={t('navigation.settings')} size="sm" tooltip={t('navigation.settings')} render={<NavLink to="/settings" onClick={closeMobile} />}>
              <Settings />
              <span>{t('navigation.settings')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
function SidebarLayout() {
  return (
    <SidebarProvider className="h-dvh min-h-0" style={{ '--sidebar-width': '200px', '--sidebar-width-icon': '48px' } as CSSProperties}>
      <Navigation />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <WindowTitlebar />
        <main className="min-h-0 flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
function StandaloneLayout() {
  const { pathname } = useLocation();
  return (
    <SidebarProvider className="h-dvh min-h-0">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <WindowTitlebar standalone />
        <main className={pathname === '/settings' ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-auto p-4'}>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
function NotFoundPage() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  return (
    <p className="text-sm text-muted-foreground">
      {t('navigation.notFound')}
      :
      {' '}
      {pathname}
    </p>
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
            path: 'library/sessions',
            element: <SessionsPage />,
            handle: routeHandle('navigation.sessions', 'navigation.sessionsDescription'),
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
  const settingsQuery = useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings });
  const mode = settingsQuery.data?.workspace.appearance['color-theme'] ?? 'system';
  return <ThemeProvider attribute="class" forcedTheme={mode === 'system' ? undefined : mode} defaultTheme="system" enableSystem disableTransitionOnChange>{children}</ThemeProvider>;
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
            <TooltipProvider>
              <I18nProvider>
                <RouterProvider router={router} />
              </I18nProvider>
              <Toaster />
            </TooltipProvider>
          </AppTheme>
        </TitlebarActionsProvider>
      </FoundryEventsProvider>
    </QueryClientProvider>
  );
}
