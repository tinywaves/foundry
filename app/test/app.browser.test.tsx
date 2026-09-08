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
import type {
  CreateProviderRequest,
  Provider,
  ProviderSummary,
  RuntimeSummary,
} from '@dhzh/foundry-api-contract';
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

function createProvidersResponse(providers: ProviderSummary[] = [], status = 200) {
  return Response.json({
    status: 'SUCCESS',
    data: providers,
  }, {
    status,
  });
}

function createProviderResponse(provider: ProviderSummary, status = 201) {
  return Response.json({
    status: 'SUCCESS',
    data: provider,
  }, {
    status,
  });
}

function createProviderDetailResponse(provider: Provider, status = 200) {
  return Response.json({
    status: 'SUCCESS',
    data: provider,
  }, {
    status,
  });
}

function createProviderConnectionResponse(
  isSuccessful: boolean,
  message?: string,
) {
  return Response.json({
    status: isSuccessful ? 'SUCCESS' : 'PROVIDER_CONNECTION_FAILED',
    data: isSuccessful,
    ...(message && { message }),
  });
}

function createRuntimesResponse(runtimes: RuntimeSummary[], status = 200) {
  return Response.json({
    status: 'SUCCESS',
    data: runtimes,
  }, { status });
}

function createRuntimeSummaries(): RuntimeSummary[] {
  return [
    {
      appliedAt: null,
      detection: {
        configurationExists: true,
        configurationPath: '/Users/test/.codex/config.toml',
        executablePath: '/usr/local/bin/codex',
        message: null,
        status: 'detected',
        version: 'codex-cli 1.0.0',
      },
      managed: false,
      providerId: null,
      runtime: 'codex',
    },
    {
      appliedAt: null,
      detection: {
        configurationExists: false,
        configurationPath: '/Users/test/.claude/settings.json',
        executablePath: null,
        message: 'claude was not found in PATH.',
        status: 'not-detected',
        version: null,
      },
      managed: false,
      providerId: null,
      runtime: 'claude-code',
    },
  ];
}

function expectRuntimeIcons() {
  for (const runtime of ['claude-code', 'codex']) {
    const icon = document.querySelector<HTMLImageElement>(
      `img[data-runtime-icon="${CSS.escape(runtime)}"]`,
    );

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('alt')).toBe('');
    expect(icon?.getAttribute('src')).toBeTruthy();
  }
}

function createCodexProvider(
  overrides: Partial<ProviderSummary> = {},
): ProviderSummary {
  return {
    avatar: null,
    baseUrl: 'https://api.example.com/v1',
    id: 'provider-1',
    name: 'Example Provider',
    officialWebsite: 'https://example.com',
    remark: 'Example remark',
    runtime: 'codex',
    ...overrides,
  };
}

function getRequestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return new URL(input, 'http://localhost').pathname;
  }

  return input instanceof URL ? input.pathname : new URL(input.url).pathname;
}

function createDefaultFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    const requestPath = getRequestPath(input);
    if (requestPath === '/api/settings') {
      return Promise.resolve(createSettingsResponse());
    }
    if (requestPath === '/api/providers') {
      return Promise.resolve(createProvidersResponse());
    }
    if (requestPath === '/api/runtimes') {
      return Promise.resolve(createRuntimesResponse(createRuntimeSummaries()));
    }
    return Promise.resolve(createHealthResponse());
  });
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
  ])('renders the %s placeholder page', async (title, path, description) => {
    const screen = await renderApp(path);

    await expect.element(screen.getByText(description)).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: title }))
      .toHaveAttribute('aria-current', 'page');
  });

  test('previews and applies a Provider from the Runtime card', async () => {
    const provider = createCodexProvider({
      avatar: {
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        mimeType: 'image/png',
      },
    });
    const runtimes = createRuntimeSummaries();
    const longVersion = 'codex-cli 1.0.0 (build 2026.09.09-development-preview)';
    const longConfigurationPath = '/Users/test/.codex/environments/development/config.toml';
    runtimes[0].detection.version = longVersion;
    runtimes[0].detection.configurationPath = longConfigurationPath;
    runtimes[0].managed = true;
    runtimes[0].providerId = provider.id;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string'
        ? new URL(input, 'http://localhost')
        : (input instanceof URL ? input : new URL(input.url));
      if (url.pathname === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (url.pathname === '/api/runtimes' && init?.method === undefined) {
        return Promise.resolve(createRuntimesResponse(runtimes));
      }
      if (url.pathname === '/api/providers') {
        return Promise.resolve(createProvidersResponse(
          url.searchParams.get('runtime') === 'codex' ? [provider] : [],
        ));
      }
      if (url.pathname === '/api/runtimes/codex/preview') {
        return Promise.resolve(Response.json({
          status: 'SUCCESS',
          data: {
            changes: [
              {
                current: { kind: 'absent' },
                key: 'model_provider',
                operation: 'add',
                proposed: { kind: 'plain', value: 'foundry' },
              },
              {
                current: { kind: 'absent' },
                key: '[model_providers.foundry].experimental_bearer_token',
                operation: 'add',
                proposed: { kind: 'secret', value: 'codex-secret' },
              },
            ],
            file: {
              exists: true,
              hash: '0'.repeat(64),
              path: '/Users/test/.codex/config.toml',
            },
            kind: 'ready',
            providerKey: 'foundry',
            runtime: 'codex',
            target: { kind: 'provider', providerId: provider.id },
            unchanged: [],
          },
        }));
      }
      if (url.pathname === '/api/runtimes/codex/apply') {
        return Promise.resolve(Response.json({
          status: 'SUCCESS',
          data: {
            ...runtimes[0],
            appliedAt: 100,
            managed: true,
            providerId: provider.id,
          },
        }));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);

    const screen = await renderApp('/runtimes');

    await expect.element(screen.getByText(longVersion)).toBeVisible();
    await expect.element(screen.getByText('claude was not found in PATH.')).toBeVisible();
    const saveButtons = screen.getByRole('button', { name: 'Save' });
    await expect.element(saveButtons.nth(1)).not.toBeDisabled();

    const runtimeCards = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="runtime-grid"] > [data-slot="card"]',
      ),
    ];
    expect(runtimeCards).toHaveLength(2);
    const [codexCard, claudeCard] = runtimeCards;
    const codexBounds = codexCard.getBoundingClientRect();
    const claudeBounds = claudeCard.getBoundingClientRect();
    expect(codexBounds.top).toBe(claudeBounds.top);
    expect(Math.abs(codexBounds.width - claudeBounds.width)).toBeLessThan(1);
    expect(codexCard.querySelector('img[data-runtime-icon="codex"]')).not.toBeNull();
    expect(claudeCard.querySelector('img[data-runtime-icon="claude-code"]')).not.toBeNull();
    expect(codexCard.querySelector('[data-slot="badge"]')).toHaveTextContent('Detected');
    expect(claudeCard.querySelector('[data-slot="badge"]')).toHaveTextContent('Not detected');
    const metadataValues = codexCard.querySelectorAll<HTMLElement>(':scope dd > span');
    expect(metadataValues).toHaveLength(2);
    for (const value of metadataValues) {
      expect(getComputedStyle(value).textOverflow).toBe('ellipsis');
      expect(getComputedStyle(value).whiteSpace).toBe('nowrap');
      expect(value.scrollWidth).toBeGreaterThan(value.clientWidth);
      await expect.poll(() => value.tabIndex).toBe(0);
    }
    for (const value of [longVersion, longConfigurationPath]) {
      await page.getByText(value, { exact: true }).hover();
      await expect.poll(
        () => document.querySelector('[data-slot="tooltip-content"]')?.textContent,
      ).toContain(value);
      expect(document.querySelector('[data-slot="tooltip-content"] code'))
        .toHaveTextContent(value);
    }
    const managedFieldsButtons = screen.getByRole('button', {
      name: 'Managed fields',
    });
    await managedFieldsButtons.first().click();
    await expect.element(screen.getByRole('heading', {
      name: 'Codex fields managed by Foundry',
    })).toBeVisible();
    let managedFieldsDialog = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
    if (!managedFieldsDialog) {
      throw new Error('Expected the managed fields Dialog to be rendered.');
    }
    expect(managedFieldsDialog.querySelectorAll(':scope ul code')).toHaveLength(7);
    expect(managedFieldsDialog).toHaveTextContent('[model_providers.<key>].wire_api');
    await screen.getByRole('button', { name: 'Close' }).last().click();

    await managedFieldsButtons.nth(1).click();
    await expect.element(screen.getByRole('heading', {
      name: 'Claude Code fields managed by Foundry',
    })).toBeVisible();
    managedFieldsDialog = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
    if (!managedFieldsDialog) {
      throw new Error('Expected the managed fields Dialog to be rendered.');
    }
    expect(managedFieldsDialog.querySelectorAll(':scope ul code')).toHaveLength(29);
    expect(managedFieldsDialog).toHaveTextContent('env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
    expect(managedFieldsDialog).toHaveTextContent('env.ENABLE_TOOL_SEARCH');
    expect(managedFieldsDialog).toHaveTextContent('env.CLAUDE_CODE_EFFORT_LEVEL');
    expect(managedFieldsDialog).toHaveTextContent('env.DISABLE_AUTOUPDATER');
    expect(managedFieldsDialog).toHaveTextContent('attribution.commit');
    expect(managedFieldsDialog).toHaveTextContent('attribution.pr');
    expect(managedFieldsDialog).toHaveTextContent('attribution.sessionUrl');
    await screen.getByRole('button', { name: 'Close' }).last().click();

    for (const card of runtimeCards) {
      const buttons = card.querySelectorAll('button');
      const lastButton = buttons.item(buttons.length - 1);
      expect(card.getBoundingClientRect().bottom - lastButton.getBoundingClientRect().bottom)
        .toBeLessThan(32);
    }

    const providerSelect = screen.getByRole('combobox', { name: 'Provider' }).first();
    await expect.element(providerSelect).toHaveTextContent(provider.name);
    await expect.element(providerSelect).not.toHaveTextContent(provider.id);
    expect(codexCard.querySelector(
      ':scope [data-slot="select-value"] [data-slot="avatar-image"]',
    )).not.toBeNull();
    expect(claudeCard.querySelector(
      ':scope [data-slot="select-value"] img[data-runtime-icon="claude-code"]',
    )).not.toBeNull();
    await providerSelect.click();
    const providerOption = screen.getByRole('option', { name: 'Example Provider' });
    await expect.element(providerOption).toBeVisible();
    const selectItems = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    const officialItem = selectItems.find((item) => item.textContent.includes('Official Default'));
    const providerItem = selectItems.find((item) => item.textContent.includes(provider.name));
    expect(officialItem?.querySelector('img[data-runtime-icon="codex"]')).not.toBeNull();
    expect(providerItem?.querySelector('[data-slot="avatar-image"]')).not.toBeNull();
    const providerItemText = providerItem?.querySelector<HTMLElement>(
      '[data-slot="select-item-text"]',
    );
    expect(providerItemText).not.toBeNull();
    expect(getComputedStyle(providerItemText!)).toHaveProperty('alignItems', 'center');
    await providerOption.click();
    await saveButtons.first().click();

    await expect.element(screen.getByRole('heading', { name: 'Preview Changes' }))
      .toBeVisible();
    await expect.element(screen.getByText('model_provider', { exact: true })).toBeVisible();
    await expect.element(screen.getByText('••••••••')).toBeVisible();
    await screen.getByRole('button', { name: 'Show API Key' }).click();
    await expect.element(screen.getByText('"codex-secret"')).toBeVisible();
    await screen.getByRole('button', { name: 'Apply' }).click();
    await expect.element(screen.getByText('Runtime saved')).toBeVisible();
  });

  test('filters and renders Provider summaries', async () => {
    const provider = createCodexProvider();
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse([provider]));
      }
      if (requestPath === '/api/runtimes') {
        return Promise.resolve(createRuntimesResponse(createRuntimeSummaries()));
      }
      return Promise.resolve(createHealthResponse());
    }));

    const screen = await renderApp('/providers?runtime=codex');

    await expect.element(screen.getByTestId('page-title'))
      .toHaveTextContent('Providers');
    await expect.element(screen.getByText(
      'Saved model-service connections for each Runtime.',
    ))
      .toBeVisible();
    expectRuntimeIcons();
    await expect.element(screen.getByText('Example Provider')).toBeVisible();
    const baseUrlLink = screen.getByRole('link', { name: 'https://api.example.com/v1' });
    await expect.element(baseUrlLink).toHaveAttribute(
      'href',
      'https://api.example.com/v1',
    );
    await expect.element(baseUrlLink).toHaveAttribute('target', '_blank');
    await expect.element(screen.getByText('Example remark')).not.toBeInTheDocument();
    const providerActions = [
      'Apply Example Provider',
      'Test Example Provider connection',
      'Delete Example Provider',
    ];
    for (const action of providerActions) {
      await expect
        .element(screen.getByRole('button', { name: action }))
        .not
        .toBeDisabled();
    }
    const editLink = screen.getByRole('link', { name: 'Edit Example Provider' });
    await expect.element(editLink).toHaveAttribute(
      'href',
      '/providers/provider-1/edit',
    );
    const copyLink = screen.getByRole('link', { name: 'Copy Example Provider' });
    await expect.element(copyLink).toHaveAttribute(
      'href',
      '/providers/provider-1/copy',
    );
    await expect.element(screen.getByText('Configuration')).not.toBeInTheDocument();
    await expect.element(screen.getByText('API Key')).not.toBeInTheDocument();
  });

  test('shows pending and successful Provider connection feedback', async () => {
    const provider = createCodexProvider();
    const {
      promise: testResponse,
      resolve: resolveTestResponse,
    } = createDeferred<Response>();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === `/api/providers/${provider.id}/test-connection`
        && init?.method === 'POST') {
        return testResponse;
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse([provider]));
      }
      if (requestPath === '/api/runtimes') {
        return Promise.resolve(createRuntimesResponse(createRuntimeSummaries()));
      }
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    const screen = await renderApp('/providers?runtime=codex');
    const testButton = screen.getByRole('button', {
      name: 'Test Example Provider connection',
    });

    await testButton.click();
    await expect.element(testButton).toBeDisabled();
    await expect.element(screen.getByRole('status')).toBeVisible();

    resolveTestResponse(createProviderConnectionResponse(true));

    await expect.element(screen.getByText('Connection successful')).toBeVisible();
    await expect.element(testButton).not.toBeDisabled();
  });

  test('shows Provider connection failures in an anchored Popover', async () => {
    const provider = createCodexProvider();
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === `/api/providers/${provider.id}/test-connection`
        && init?.method === 'POST') {
        return Promise.resolve(createProviderConnectionResponse(
          false,
          'Authentication failed. Check the API key.',
        ));
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse([provider]));
      }
      if (requestPath === '/api/runtimes') {
        return Promise.resolve(createRuntimesResponse(createRuntimeSummaries()));
      }
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      return Promise.resolve(createHealthResponse());
    }));
    const screen = await renderApp('/providers?runtime=codex');

    await screen.getByRole('button', {
      name: 'Test Example Provider connection',
    }).click();

    await expect.element(screen.getByText('Connection failed')).toBeVisible();
    await expect.element(screen.getByText('Authentication failed. Check the API key.'))
      .toBeVisible();
    await screen.getByRole('button', { name: 'Close' }).click();
    await expect.element(screen.getByText('Connection failed')).not.toBeInTheDocument();
  });

  test('shows the enabled Provider as in use and allows reapplying it', async () => {
    const provider = createCodexProvider();
    const runtimes = createRuntimeSummaries();
    runtimes[0] = {
      ...runtimes[0],
      appliedAt: 100,
      managed: true,
      providerId: provider.id,
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse([provider]));
      }
      if (requestPath === '/api/runtimes') {
        return Promise.resolve(createRuntimesResponse(runtimes));
      }
      return Promise.resolve(createHealthResponse());
    }));

    const screen = await renderApp('/providers?runtime=codex');

    await expect.element(screen.getByText('In Use', { exact: true })).toBeVisible();
    const reapplyButton = screen.getByRole('button', { name: 'Reapply Example Provider' });
    await expect.element(reapplyButton).toHaveTextContent('Reapply');
    await expect.element(reapplyButton).not.toBeDisabled();
    await expect
      .element(screen.getByRole('button', { name: 'Delete Example Provider' }))
      .toBeDisabled();
    await expect.element(screen.getByText('Delete Provider?')).not.toBeInTheDocument();
  });

  test('confirms before deleting an available Provider', async () => {
    const provider = createCodexProvider();
    let isDeleted = false;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/providers/provider-1' && init?.method === 'DELETE') {
        isDeleted = true;
        return Promise.resolve(Response.json({
          status: 'SUCCESS',
          data: true,
        }));
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse(isDeleted ? [] : [provider]));
      }
      if (requestPath === '/api/runtimes') {
        return Promise.resolve(createRuntimesResponse(createRuntimeSummaries()));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);

    const screen = await renderApp('/providers?runtime=codex');
    const providerDeleteButton = screen.getByRole('button', { name: 'Delete Example Provider' });
    await providerDeleteButton.click();
    await expect.element(screen.getByText('Delete Provider?')).toBeVisible();
    await screen.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(screen.getByText('Delete Provider?')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/providers/provider-1',
      expect.objectContaining({ method: 'DELETE' }),
    );

    await providerDeleteButton.click();
    await screen.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect.element(screen.getByTestId('provider-provider-1')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Provider deleted')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith('/api/providers/provider-1', {
      method: 'DELETE',
    });
  });

  test('previews and applies a Provider from its card', async () => {
    const provider = createCodexProvider();
    const runtimes = createRuntimeSummaries();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string'
        ? new URL(input, 'http://localhost')
        : (input instanceof URL ? input : new URL(input.url));
      if (url.pathname === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (url.pathname === '/api/providers') {
        return Promise.resolve(createProvidersResponse([provider]));
      }
      if (url.pathname === '/api/runtimes' && init?.method === undefined) {
        return Promise.resolve(createRuntimesResponse(runtimes));
      }
      if (url.pathname === '/api/runtimes/codex/preview') {
        return Promise.resolve(Response.json({
          status: 'SUCCESS',
          data: {
            changes: [
              {
                current: { kind: 'absent' },
                key: 'model_provider',
                operation: 'add',
                proposed: { kind: 'plain', value: 'foundry' },
              },
            ],
            file: {
              exists: true,
              hash: '0'.repeat(64),
              path: '/Users/test/.codex/config.toml',
            },
            kind: 'ready',
            providerKey: 'foundry',
            runtime: 'codex',
            target: { kind: 'provider', providerId: provider.id },
            unchanged: [],
          },
        }));
      }
      if (url.pathname === '/api/runtimes/codex/apply') {
        return Promise.resolve(Response.json({
          status: 'SUCCESS',
          data: {
            ...runtimes[0],
            appliedAt: 100,
            managed: true,
            providerId: provider.id,
          },
        }));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);

    const screen = await renderApp('/providers?runtime=codex');

    await screen.getByRole('button', { name: 'Apply Example Provider' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Preview Changes' }))
      .toBeVisible();
    await screen.getByRole('button', { name: 'Apply' }).click();

    await expect.element(screen.getByText('In Use', { exact: true })).toBeVisible();
    const reapplyButton = screen.getByRole('button', { name: 'Reapply Example Provider' });
    await expect.element(reapplyButton).toHaveTextContent('Reapply');
    await expect.element(reapplyButton).not.toBeDisabled();
    await expect.element(screen.getByText('Runtime saved')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/runtimes/codex/preview',
      expect.objectContaining({
        body: JSON.stringify({
          target: { kind: 'provider', providerId: provider.id },
        }),
        method: 'POST',
      }),
    );
  });

  test('confirms before clearing a dirty Provider form for another Runtime', async () => {
    const screen = await renderApp('/providers/new');

    await expect.element(screen.getByRole('button', { name: 'Codex' })).toBeVisible();
    expectRuntimeIcons();
    await screen.getByRole('button', { name: 'Codex' }).click();
    await screen.getByLabelText('Name', { exact: true }).fill('Draft Provider');
    await screen.getByRole('button', { name: 'Claude Code' }).click();

    await expect.element(screen.getByText(
      'Changing the Runtime will clear the information you\'ve entered.',
    )).toBeVisible();
    await screen.getByRole('button', { name: 'Change Runtime' }).click();
    await expect.element(screen.getByLabelText('Name', { exact: true })).toHaveValue('');
    await expect.element(screen.getByLabelText('Protocol'))
      .toHaveValue('Anthropic Messages API');
  });

  test('keeps the Claude Code Provider form within the viewport', async () => {
    await page.viewport(640, 800);
    const screen = await renderApp('/providers/new');

    await screen.getByRole('button', { name: 'Claude Code' }).click();

    await expect.element(screen.getByLabelText('Auth Token', { exact: true }))
      .toBeVisible();
    const authTokenOption = screen.getByRole('button', { name: 'Auth Token' });
    const apiKeyOption = screen.getByRole('button', { name: 'API Key', exact: true });
    await expect.element(authTokenOption).toBeVisible();
    await expect.element(apiKeyOption).toBeVisible();
    await authTokenOption.hover();
    await expect.element(screen.getByText('Authorization: Bearer <xxx>'))
      .toBeVisible();
    await apiKeyOption.hover();
    await expect.element(screen.getByText('X-Api-Key: <xxx>'))
      .toBeVisible();
    await apiKeyOption.click();
    await expect.element(screen.getByLabelText('API Key', { exact: true }))
      .toBeVisible();
    await screen.getByRole('group', { name: 'Opus model' })
      .getByRole('button', { name: 'Advanced model options' })
      .click();

    expect(document.documentElement.scrollWidth)
      .toBeLessThanOrEqual(document.documentElement.clientWidth);
  });

  test('reveals lower-priority Claude model fields after entering a family Model ID', async () => {
    const screen = await renderApp('/providers/new');

    await screen.getByRole('button', { name: 'Claude Code' }).click();

    await expect.element(screen.getByLabelText('Default model')).toBeVisible();
    await expect.element(screen.getByLabelText('Default model'))
      .toHaveAttribute('required');

    const opusModel = screen.getByRole('group', { name: 'Opus model' });
    const advancedOptions = opusModel.getByRole('button', {
      name: 'Advanced model options',
    });

    await expect.element(opusModel.getByLabelText('Description')).not.toBeInTheDocument();
    await expect.element(advancedOptions).not.toBeDisabled();
    await advancedOptions.click();

    const capabilities = opusModel.getByRole('combobox', {
      name: 'Supported capabilities',
    });
    const description = opusModel.getByLabelText('Description');
    await expect.element(description).toBeVisible();
    await expect.element(description).toBeDisabled();
    await expect.element(capabilities).toBeDisabled();
    await opusModel.getByLabelText('Model ID').fill('claude-example');
    await expect.element(description).not.toBeDisabled();
    await expect.element(capabilities).not.toBeDisabled();
    await capabilities.click();
    await screen.getByRole('option', { name: 'Effort', exact: true }).click();
    await screen.getByRole('option', { name: 'Thinking', exact: true }).click();
    await expect.element(capabilities).toHaveTextContent('Effort, Thinking');
  });

  test('enables forcing Claude subagents only with a model override', async () => {
    const screen = await renderApp('/providers/new');

    await screen.getByRole('button', { name: 'Claude Code' }).click();

    const subagentModel = screen.getByRole('textbox', { name: 'Subagent model' });
    const forceSubagentModel = screen.getByRole('checkbox', {
      name: 'Force subagent model',
    });

    await expect.element(forceSubagentModel).not.toBeChecked();
    await expect.element(forceSubagentModel).toBeDisabled();
    await subagentModel.fill('claude-subagent');
    await expect.element(forceSubagentModel).not.toBeDisabled();
    await forceSubagentModel.click();
    await expect.element(forceSubagentModel).toBeChecked();
    await subagentModel.clear();
    await expect.element(forceSubagentModel).not.toBeChecked();
    await expect.element(forceSubagentModel).toBeDisabled();
  });

  test('creates a Claude Provider with its subagent force policy', async () => {
    let createdRequest: Extract<CreateProviderRequest, { runtime: 'claude-code' }>
      | undefined;
    let createdProvider: ProviderSummary | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/providers' && init?.method === 'POST') {
        createdRequest = JSON.parse(init.body as string) as Extract<
          CreateProviderRequest,
          { runtime: 'claude-code' }
        >;
        createdProvider = {
          avatar: createdRequest.avatar,
          baseUrl: createdRequest.configuration.baseUrl,
          id: 'created-provider',
          name: createdRequest.name,
          officialWebsite: createdRequest.officialWebsite,
          remark: createdRequest.remark,
          runtime: createdRequest.runtime,
        };
        return Promise.resolve(createProviderResponse(createdProvider));
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse(
          createdProvider ? [createdProvider] : [],
        ));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    const screen = await renderApp('/providers/new');

    await screen.getByRole('button', { name: 'Claude Code' }).click();
    await screen.getByLabelText('Name', { exact: true }).fill('Claude Gateway');
    await screen.getByLabelText('Base URL').fill('https://claude.example.com');
    await screen.getByLabelText('Auth Token', { exact: true }).fill('secret');
    await screen.getByLabelText('Default model').fill('default-model');
    await screen.getByRole('textbox', { name: 'Subagent model' })
      .fill('subagent-model');
    await screen.getByRole('checkbox', { name: 'Force subagent model' }).click();
    await screen.getByRole('checkbox', { name: 'Hide AI attribution' }).click();
    await screen.getByRole('checkbox', { name: 'Teammates mode' }).click();
    await screen.getByRole('checkbox', { name: 'Enable tool search' }).click();
    await screen.getByRole('checkbox', { name: 'Max effort thinking' }).click();
    await screen.getByRole('checkbox', { name: 'Disable auto-updater' }).click();
    await screen.getByRole('button', { name: 'Add Provider' }).click();

    await expect.element(screen.getByText('Claude Gateway')).toBeVisible();
    expect(createdRequest?.configuration).toMatchObject({
      defaultModel: 'default-model',
      subagentModel: 'subagent-model',
      subagentModelForce: true,
      hideAiAttribution: true,
      teammatesMode: true,
      enableToolSearch: true,
      maxEffortThinking: true,
      disableAutoUpdater: true,
    });
  });

  test('creates a Codex Provider and returns to its filtered list', async () => {
    let createdProvider: ProviderSummary | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/providers' && init?.method === 'POST') {
        const request = JSON.parse(init.body as string) as CreateProviderRequest;
        createdProvider = createCodexProvider({
          avatar: request.avatar,
          baseUrl: request.configuration.baseUrl,
          id: 'created-provider',
          name: request.name,
          officialWebsite: request.officialWebsite,
          remark: request.remark,
          runtime: request.runtime,
        });
        return Promise.resolve(createProviderResponse(createdProvider));
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse(
          createdProvider ? [createdProvider] : [],
        ));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    const screen = await renderApp('/providers/new');

    await screen.getByRole('button', { name: 'Codex' }).click();
    await screen.getByLabelText('Name', { exact: true }).fill('Created Provider');
    await screen.getByLabelText('Base URL').fill('https://created.example.com/v1');
    await screen.getByRole('textbox', { name: 'API Key', exact: true })
      .fill('created-secret');
    await screen.getByLabelText('Default model').fill('created-model');
    await screen.getByRole('button', { name: 'Add Provider' }).click();

    await expect.element(screen.getByText('Created Provider')).toBeVisible();
    await expect.element(screen.getByText('Provider created')).toBeVisible();
    const toastViewport = document.querySelector('[data-slot="toast-viewport"]');
    expect(toastViewport).toHaveClass('top-4');
    expect(toastViewport).not.toHaveClass('bottom-4');
    expect(fetchMock).toHaveBeenCalledWith('/api/providers', expect.objectContaining({
      method: 'POST',
    }));
  });

  test('edits a Provider with its complete local configuration', async () => {
    let provider = createCodexProvider();
    let updatedRequest: CreateProviderRequest | undefined;
    const detail: Provider = {
      avatar: provider.avatar,
      configuration: {
        apiKey: 'saved-secret',
        baseUrl: provider.baseUrl,
        defaultModel: 'example-model',
        protocol: 'responses',
        reviewModel: 'review-model',
      },
      createdAt: 1,
      id: provider.id,
      name: provider.name,
      officialWebsite: provider.officialWebsite,
      remark: provider.remark,
      runtime: 'codex',
      updatedAt: 1,
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === `/api/providers/${provider.id}` && init?.method === 'PUT') {
        updatedRequest = JSON.parse(init.body as string) as CreateProviderRequest;
        provider = createCodexProvider({
          baseUrl: updatedRequest.configuration.baseUrl,
          name: updatedRequest.name,
          officialWebsite: updatedRequest.officialWebsite,
          remark: updatedRequest.remark,
        });
        return Promise.resolve(createProviderResponse(provider, 200));
      }
      if (requestPath === `/api/providers/${provider.id}`) {
        return Promise.resolve(createProviderDetailResponse(detail));
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse([provider]));
      }
      if (requestPath === '/api/runtimes') {
        return Promise.resolve(createRuntimesResponse(createRuntimeSummaries()));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    const screen = await renderApp('/providers?runtime=codex');

    await screen.getByRole('link', { name: 'Edit Example Provider' }).click();

    await expect.element(screen.getByRole('heading', { name: 'Edit Provider' }))
      .toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Codex' })).toBeDisabled();
    await expect.element(screen.getByLabelText('Name', { exact: true }))
      .toHaveValue('Example Provider');
    await expect.element(screen.getByLabelText('Base URL'))
      .toHaveValue('https://api.example.com/v1');
    await expect.element(screen.getByRole('textbox', { name: 'API Key', exact: true }))
      .toHaveValue('saved-secret');

    await screen.getByLabelText('Name', { exact: true }).fill('Updated Provider');
    await screen.getByRole('button', { name: 'Save Changes' }).click();

    await expect.element(screen.getByText('Updated Provider')).toBeVisible();
    await expect.element(screen.getByText('Provider updated')).toBeVisible();
    expect(updatedRequest).toBeDefined();
    expect(updatedRequest?.configuration).toHaveProperty('apiKey', 'saved-secret');
  });

  test('creates a Provider from a complete copied configuration', async () => {
    const provider = createCodexProvider();
    let copiedProvider: ProviderSummary | undefined;
    let copiedRequest: CreateProviderRequest | undefined;
    const detail: Provider = {
      avatar: provider.avatar,
      configuration: {
        apiKey: 'saved-secret',
        baseUrl: provider.baseUrl,
        defaultModel: 'example-model',
        protocol: 'responses',
        reviewModel: 'review-model',
      },
      createdAt: 1,
      id: provider.id,
      name: provider.name,
      officialWebsite: provider.officialWebsite,
      remark: provider.remark,
      runtime: 'codex',
      updatedAt: 1,
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === `/api/providers/${provider.id}/copy`) {
        copiedRequest = JSON.parse(init?.body as string) as CreateProviderRequest;
        copiedProvider = createCodexProvider({
          id: 'provider-copy',
          name: copiedRequest.name,
        });
        return Promise.resolve(createProviderResponse(copiedProvider, 201));
      }
      if (requestPath === `/api/providers/${provider.id}`) {
        return Promise.resolve(createProviderDetailResponse(detail));
      }
      if (requestPath === '/api/providers') {
        return Promise.resolve(createProvidersResponse(
          copiedProvider ? [copiedProvider, provider] : [provider],
        ));
      }
      if (requestPath === '/api/runtimes') {
        return Promise.resolve(createRuntimesResponse(createRuntimeSummaries()));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    const screen = await renderApp('/providers?runtime=codex');

    await screen.getByRole('link', { name: 'Copy Example Provider' }).click();

    await expect.element(screen.getByRole('heading', { name: 'Create from Provider' }))
      .toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Codex' })).toBeDisabled();
    await expect.element(screen.getByLabelText('Name', { exact: true }))
      .toHaveValue('Example Provider Copy');
    await expect.element(screen.getByLabelText('Base URL'))
      .toHaveValue('https://api.example.com/v1');
    await expect.element(screen.getByRole('textbox', { name: 'API Key', exact: true }))
      .toHaveValue('saved-secret');

    await screen.getByRole('button', { name: 'Create Provider' }).click();

    await expect.element(screen.getByText('Example Provider Copy')).toBeVisible();
    await expect.element(screen.getByText('Provider created')).toBeVisible();
    expect(copiedRequest?.configuration).toHaveProperty('apiKey', 'saved-secret');
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

  test('confirms and downloads the Foundry Export from Settings', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/data/export') {
        return Promise.resolve(new Response('foundry export', {
          headers: {
            'content-disposition': 'attachment; filename="foundry-export-2026-09-08T123456.foundry"',
            'content-type': 'application/octet-stream',
          },
        }));
      }
      return Promise.resolve(createHealthResponse());
    });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:foundry-export');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let downloadedFile: { filename: string; url: string } | undefined;
    const clickLink = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function captureDownload(this: HTMLAnchorElement) {
        downloadedFile = { filename: this.download, url: this.href };
      });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const screen = await renderApp('/settings');

      await screen.getByRole('button', { name: 'Export Data' }).click();
      await expect.element(screen.getByRole('heading', { name: 'Export Foundry data?' }))
        .toBeVisible();
      await expect.element(screen.getByText(
        'The exported file includes Provider API keys. Keep it private and store it securely.',
      )).toBeVisible();
      expect(fetchMock).not.toHaveBeenCalledWith('/api/data/export', expect.anything());

      await screen.getByRole('button', { name: 'Export', exact: true }).click();

      await expect.element(screen.getByText('Data exported')).toBeVisible();
      expect(fetchMock).toHaveBeenCalledWith('/api/data/export', { cache: 'no-store' });
      expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
      expect(downloadedFile).toEqual({
        filename: 'foundry-export-2026-09-08T123456.foundry',
        url: 'blob:foundry-export',
      });
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:foundry-export');
    } finally {
      clickLink.mockRestore();
      createObjectUrl.mockRestore();
      revokeObjectUrl.mockRestore();
    }
  });

  test('reports a Foundry Export failure without starting a download', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/data/export') {
        return Promise.resolve(new Response(null, { status: 500 }));
      }
      return Promise.resolve(createHealthResponse());
    });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL');
    vi.stubGlobal('fetch', fetchMock);

    try {
      const screen = await renderApp('/settings');
      await screen.getByRole('button', { name: 'Export Data' }).click();
      await screen.getByRole('button', { name: 'Export', exact: true }).click();

      await expect.element(screen.getByText('Data could not be exported')).toBeVisible();
      expect(createObjectUrl).not.toHaveBeenCalled();
    } finally {
      createObjectUrl.mockRestore();
    }
  });

  test('confirms a Foundry Import and reports module results', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = getRequestPath(input);
      if (requestPath === '/api/settings') {
        return Promise.resolve(createSettingsResponse());
      }
      if (requestPath === '/api/data/import' && init?.method === 'POST') {
        return Promise.resolve(Response.json({
          status: 'SUCCESS',
          data: {
            modules: [
              { id: 'settings', importedItems: 1, status: 'imported' },
              {
                id: 'providers',
                importedItems: 0,
                message: 'Providers could not be imported.',
                status: 'failed',
              },
            ],
          },
        }));
      }
      return Promise.resolve(createHealthResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['foundry import'], 'backup.foundry', {
      type: 'application/octet-stream',
    });
    const openFilePicker = vi.spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});

    try {
      const screen = await renderApp('/settings');
      const importButton = screen.getByRole('button', { name: 'Import Data' });

      await importButton.click();
      expect(openFilePicker).toHaveBeenCalledOnce();
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input) {
        throw new Error('Foundry Import input is unavailable.');
      }
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });

      input.dispatchEvent(new Event('change', { bubbles: true }));

      await expect.element(screen.getByRole('heading', { name: 'Import Foundry data?' }))
        .toBeVisible();
      await expect.element(screen.getByText(
        'Application Settings will be replaced. Providers will be added, including duplicates.',
      )).toBeVisible();

      await screen.getByRole('button', { name: 'Import', exact: true }).click();

      await expect.element(screen.getByText('Data imported with issues')).toBeVisible();
      await expect.element(screen.getByText('Settings imported. Providers failed')).toBeVisible();
      expect(fetchMock).toHaveBeenCalledWith('/api/data/import', {
        body: file,
        headers: { 'content-type': 'application/octet-stream' },
        method: 'POST',
      });
    } finally {
      openFilePicker.mockRestore();
    }
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
