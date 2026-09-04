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
import type { InitialEntry } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { ThemeProvider } from '#/components/theme-provider';
import { TooltipProvider } from '#/components/ui/tooltip';
import { routes } from '#/router';

function createHealthResponse(status = 200) {
  return new Response(null, { status });
}

function createSettingsResponse(
  colorMode: 'dark' | 'light' | 'system' = 'system',
  status = 200,
) {
  return Response.json({
    status: 'SUCCESS',
    data: { colorMode },
  }, {
    status,
  });
}

function getRequestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.pathname : new URL(input.url).pathname;
}

function createDefaultFetchMock() {
  return vi.fn((input: RequestInfo | URL) => Promise.resolve(
    getRequestPath(input) === '/api/settings'
      ? createSettingsResponse()
      : createHealthResponse(),
  ));
}

function throwDeferredNotInitialized(): never {
  throw new Error('Deferred promise was not initialized');
}

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = throwDeferredNotInitialized;
  // The app's current TypeScript lib predates Promise.withResolvers.
  // eslint-disable-next-line unicorn/prefer-promise-with-resolvers
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

async function renderApp(initialEntries: InitialEntry | InitialEntry[]) {
  const queryClient = new QueryClient();
  const router = createMemoryRouter(routes, {
    initialEntries: Array.isArray(initialEntries)
      ? initialEntries
      : [initialEntries],
  });

  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

beforeEach(async () => {
  await page.viewport(1280, 800);
  document.title = 'Foundry';
  await cookieStore.delete({ name: 'sidebar_state', path: '/' });
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('light', 'dark');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('service health title', () => {
  test('moves from checking to healthy after an HTTP 200 response', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (getRequestPath(input) === '/api/settings') {
        return createSettingsResponse();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      return createHealthResponse();
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderApp('/dashboard');

    await expect.poll(() => document.title).toBe('Foundry · Checking…');

    await expect.poll(() => document.title).toBe('Foundry · Healthy');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/health', {
      cache: 'no-store',
    });
  });

  test.each([
    ['a non-200 response', () => Promise.resolve(createHealthResponse(503))],
    ['a network failure', () => Promise.reject(new TypeError('offline'))],
  ])('marks the service unhealthy after %s', async (_scenario, result) => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) =>
      (getRequestPath(input) === '/api/settings'
        ? Promise.resolve(createSettingsResponse())
        : result())));

    await renderApp('/dashboard');

    await expect.poll(() => document.title).toBe('Foundry · Unhealthy');
  });
});

describe('application routing and layouts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createDefaultFetchMock());
  });

  test('waits for Application Settings before rendering a route', async () => {
    const {
      promise: settingsResponse,
      resolve: resolveSettings,
    } = createDeferred<Response>();
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) =>
      (getRequestPath(input) === '/api/settings'
        ? settingsResponse
        : Promise.resolve(createHealthResponse()))));

    const screen = await renderApp('/dashboard');

    await expect.element(screen.getByRole('status', { name: 'Loading Foundry' }))
      .toBeVisible();
    await expect
      .element(screen.getByText('Dashboard content will be added here.'))
      .not
      .toBeInTheDocument();

    resolveSettings(createSettingsResponse());

    await expect.element(screen.getByText('Dashboard content will be added here.'))
      .toBeVisible();
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

  test('opens settings from the header and returns to the previous page', async () => {
    const screen = await renderApp('/prompts');
    await expect.element(screen.getByText('Prompt management will be added here.'))
      .toBeVisible();
    const settingsButton = document.querySelector(
      '[data-testid="settings-button"]',
    );

    expect(settingsButton).toBeInstanceOf(HTMLButtonElement);
    (settingsButton as HTMLButtonElement).click();
    await expect.element(screen.getByRole('heading', { name: 'Settings' }))
      .toBeVisible();
    await expect.element(screen.getByRole('heading', { name: 'Color mode' }))
      .toBeVisible();
    await expect.element(screen.getByText('Appearance')).not.toBeInTheDocument();

    const backLink = document.querySelector(
      '[data-testid="standalone-back"]',
    );
    expect(backLink).toBeInstanceOf(HTMLAnchorElement);
    (backLink as HTMLAnchorElement).click();
    await expect
      .element(screen.getByText('Prompt management will be added here.'))
      .toBeVisible();
  });

  test('renders capability and execution navigation groups', async () => {
    const screen = await renderApp('/dashboard');

    await expect.element(screen.getByText('Capabilities')).toBeVisible();
    await expect.element(screen.getByText('Execution')).toBeVisible();
  });

  test.each([
    ['Skills', '/skills', 'Local skill management will be added here.'],
    ['MCPs', '/mcps', 'MCP server management will be added here.'],
    [
      'Providers',
      '/providers',
      'Model provider management will be added here.',
    ],
    [
      'Runtimes',
      '/runtimes',
      'Local agent runtime management will be added here.',
    ],
  ])('renders the %s placeholder page', async (title, path, description) => {
    const screen = await renderApp(path);

    await expect.element(screen.getByText(description)).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: title }))
      .toHaveAttribute('aria-current', 'page');
  });

  test('renders settings with standalone navigation', async () => {
    const screen = await renderApp({
      pathname: '/settings',
      state: { returnTo: '/prompts' },
    });

    await expect.element(screen.getByRole('heading', { name: 'Settings' }))
      .toBeVisible();
    await expect.element(screen.getByRole('heading', { name: 'Color mode' }))
      .toBeVisible();
    await expect.element(screen.getByText('Appearance')).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole('button', { name: 'Toggle Sidebar' }))
      .not
      .toBeInTheDocument();

    const backLink = document.querySelector(
      '[data-testid="standalone-back"]',
    );
    expect(backLink).toBeInstanceOf(HTMLAnchorElement);
    (backLink as HTMLAnchorElement).click();
    await expect
      .element(screen.getByText('Prompt management will be added here.'))
      .toBeVisible();
  });

  test('persists Color Mode before applying it to the application', async () => {
    const {
      promise: updateResponse,
      resolve: resolveUpdate,
    } = createDeferred<Response>();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (getRequestPath(input) === '/api/settings' && init?.method === 'PATCH') {
        return updateResponse;
      }
      if (getRequestPath(input) === '/api/settings') {
        return Promise.resolve(createSettingsResponse('light'));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);

    const screen = await renderApp('/settings');
    const darkMode = screen.getByRole('button', { name: 'Dark' });

    expect(localStorage.getItem('theme')).toBeNull();
    await expect.element(screen.getByRole('button', { name: 'System' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Light' })).toBeVisible();
    await darkMode.click();

    expect(document.documentElement.classList.contains('light')).toBe(true);
    await expect.element(darkMode).toBeDisabled();
    await expect.element(screen.getByRole('status', { name: 'Saving Color Mode' }))
      .toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith('/api/settings', {
      body: JSON.stringify({ colorMode: 'dark' }),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    });

    resolveUpdate(createSettingsResponse('dark'));

    await expect
      .poll(() => document.documentElement.classList.contains('dark'))
      .toBe(true);
    await expect.element(darkMode).not.toBeDisabled();
  });

  test('keeps the current Color Mode when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (getRequestPath(input) === '/api/settings' && init?.method === 'PATCH') {
        return Promise.resolve(createSettingsResponse('dark', 500));
      }
      if (getRequestPath(input) === '/api/settings') {
        return Promise.resolve(createSettingsResponse('light'));
      }
      return Promise.resolve(createHealthResponse());
    }));

    const screen = await renderApp('/settings');
    await screen.getByRole('button', { name: 'Dark' }).click();

    await expect.element(screen.getByText('Color Mode was not saved')).toBeVisible();
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('renders an independent not found page and returns to the previous page', async () => {
    const screen = await renderApp({
      pathname: '/missing',
      state: { returnTo: '/skills' },
    });

    await expect
      .element(screen.getByRole('heading', {
        name: 'This page doesn\'t exist',
      }))
      .toBeVisible();
    await expect.element(screen.getByText('/missing')).toBeVisible();
    expect(
      document.querySelector('[data-testid="not-found-dashboard"]'),
    ).toBeInstanceOf(HTMLAnchorElement);
    const backLink = document.querySelector(
      '[data-testid="standalone-back"]',
    );
    expect(backLink).toBeInstanceOf(HTMLAnchorElement);
    (backLink as HTMLAnchorElement).click();
    await expect
      .element(screen.getByText('Local skill management will be added here.'))
      .toBeVisible();
  });

  test('returns to the dashboard from the not found recovery action', async () => {
    const screen = await renderApp('/missing');
    await expect.element(screen.getByRole('heading', {
      name: 'This page doesn\'t exist',
    })).toBeVisible();
    const dashboardLink = document.querySelector(
      '[data-testid="not-found-dashboard"]',
    );

    expect(dashboardLink).toBeInstanceOf(HTMLAnchorElement);
    (dashboardLink as HTMLAnchorElement).click();
    await expect
      .element(screen.getByText('Dashboard content will be added here.'))
      .toBeVisible();
  });
});

describe('responsive sidebar', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createDefaultFetchMock());
  });

  test('does not render a resize-style sidebar rail', async () => {
    await renderApp('/dashboard');

    expect(document.querySelector('[data-sidebar="rail"]')).toBeNull();
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
    await expect
      .poll(async () => {
        const sidebarState = await cookieStore.get('sidebar_state');
        return sidebarState?.value;
      })
      .toBe('false');

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
