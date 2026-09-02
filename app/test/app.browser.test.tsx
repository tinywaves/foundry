import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { page } from 'vitest/browser';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import { render } from 'vitest-browser-react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { ThemeProvider } from '#/components/theme-provider';
import { TooltipProvider } from '#/components/ui/tooltip';
import { routes } from '#/router';

function createHealthResponse(status = 200) {
  return new Response(null, { status });
}

async function renderApp(initialPath: string) {
  const queryClient = new QueryClient();
  const router = createMemoryRouter(routes, {
    initialEntries: [initialPath],
  });

  return render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

beforeEach(async () => {
  await page.viewport(1280, 800);
  document.title = 'Foundry';
  document.cookie = 'sidebar_state=; path=/; max-age=0';
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('light', 'dark');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('service health title', () => {
  test('moves from checking to healthy after one HTTP 200 response', async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return createHealthResponse();
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderApp('/dashboard');

    await expect.poll(() => document.title).toBe('Foundry · Checking…');

    await expect.poll(() => document.title).toBe('Foundry · Healthy');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/health', {
      cache: 'no-store',
    });
  });

  test.each([
    ['a non-200 response', () => Promise.resolve(createHealthResponse(503))],
    ['a network failure', () => Promise.reject(new TypeError('offline'))],
  ])('marks the service unhealthy after %s', async (_scenario, result) => {
    vi.stubGlobal('fetch', vi.fn(result));

    await renderApp('/dashboard');

    await expect.poll(() => document.title).toBe('Foundry · Unhealthy');
  });
});

describe('application routing and layouts', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(createHealthResponse())),
    );
  });

  test('redirects the root route to the dashboard', async () => {
    const screen = await renderApp('/');

    await expect
      .element(screen.getByText('Dashboard content will be added here.'))
      .toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: 'Dashboard', exact: true }))
      .toHaveAttribute('aria-current', 'page');
  });

  test('navigates between sidebar pages', async () => {
    const screen = await renderApp('/dashboard');

    await screen.getByRole('link', { name: 'Prompts' }).click();

    await expect
      .element(screen.getByText('Prompt management will be added here.'))
      .toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: 'Prompts' }))
      .toHaveAttribute('aria-current', 'page');
  });

  test('renders settings without sidebar navigation', async () => {
    const screen = await renderApp('/settings');

    await expect
      .element(screen.getByText('Choose how Foundry looks on this device.'))
      .toBeVisible();
    await expect
      .element(screen.getByRole('button', { name: 'Toggle Sidebar' }))
      .not
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole('link', { name: 'Dashboard' }))
      .not
      .toBeInTheDocument();
  });

  test('toggles and persists the application theme from settings', async () => {
    const screen = await renderApp('/settings');
    const themeSwitch = screen.getByRole('switch', { name: 'Dark mode' });

    await themeSwitch.click();

    await expect
      .poll(() => document.documentElement.classList.contains('dark'))
      .toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    await themeSwitch.click();

    await expect
      .poll(() => document.documentElement.classList.contains('light'))
      .toBe(true);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  test('renders an independent not found page and returns to dashboard', async () => {
    const screen = await renderApp('/missing');

    await expect.element(screen.getByText('Page not found')).toBeVisible();
    await screen.getByRole('button', { name: 'Back to dashboard' }).click();
    await expect
      .element(screen.getByText('Dashboard content will be added here.'))
      .toBeVisible();
  });
});

describe('responsive sidebar', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(createHealthResponse())),
    );
  });

  test('persists the collapsed state and exposes navigation tooltips', async () => {
    const screen = await renderApp('/dashboard');
    const trigger = page.getByTestId('sidebar-trigger');

    await trigger.click();

    await expect
      .poll(() =>
        getComputedStyle(page.getByTestId('app-sidebar').element()).width,
      )
      .toBe('48px');
    expect(document.cookie).toContain('sidebar_state=false');

    await screen
      .getByRole('link', { name: 'Dashboard', exact: true })
      .hover();
    await expect
      .element(page.getByText('Dashboard', { exact: true }).last())
      .toBeVisible();
  });

  test('uses a mobile drawer and closes it after navigation', async () => {
    await page.viewport(390, 844);
    const screen = await renderApp('/dashboard');

    await page.getByTestId('sidebar-trigger').click();

    await expect.element(screen.getByRole('dialog')).toBeVisible();
    await screen.getByRole('link', { name: 'Prompts' }).click();
    await expect
      .element(screen.getByText('Prompt management will be added here.'))
      .toBeVisible();
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });
});
