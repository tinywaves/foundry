import type { Provider } from '@dhzh/foundry-api-contract';
import { describe, expect, it, vi } from 'vitest';

import { HttpProviderConnectionTester } from '../src/server/providers/connection-tester';

const codexProvider = {
  avatar: null,
  configuration: {
    apiKey: 'codex-secret',
    baseUrl: 'https://codex.example.com/v1/',
    defaultModel: 'model',
    protocol: 'responses',
    reviewModel: null,
  },
  createdAt: 1,
  id: 'codex-provider',
  name: 'Codex Provider',
  officialWebsite: null,
  remark: null,
  runtime: 'codex',
  updatedAt: 1,
} satisfies Provider;

const claudeProvider = {
  avatar: null,
  configuration: {
    apiKey: 'claude-secret',
    apiKeyHeader: 'x-api-key',
    baseUrl: 'https://claude.example.com/api/v1',
    defaultModel: 'model',
    disableAutoUpdater: false,
    enableToolSearch: false,
    fableModel: null,
    haikuModel: null,
    hideAiAttribution: false,
    maxEffortThinking: false,
    opusModel: null,
    protocol: 'messages',
    sonnetModel: null,
    subagentModel: null,
    subagentModelForce: false,
    teammatesMode: false,
  },
  createdAt: 1,
  id: 'claude-provider',
  name: 'Claude Provider',
  officialWebsite: null,
  remark: null,
  runtime: 'claude-code',
  updatedAt: 1,
} satisfies Provider;

describe('HttpProviderConnectionTester', () => {
  it('accepts any 2xx response from the models endpoint', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      '<html>response structure is irrelevant</html>',
      { status: 200 },
    ));

    await expect(new HttpProviderConnectionTester(fetcher).testProvider(codexProvider))
      .resolves
      .toEqual({ successful: true });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      'https://codex.example.com/v1/models',
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
    const headers = fetcher.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer codex-secret');
  });

  it.each([300, 302, 400, 401, 403, 402, 408, 429, 500])(
    'fails without fallback when the models endpoint returns %i',
    async (status) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));

      const result = await new HttpProviderConnectionTester(fetcher)
        .testProvider(codexProvider);

      expect(result.successful).toBe(false);
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it.each([404, 405, 501])(
    'falls back to the exact Base URL when the models endpoint returns %i',
    async (status) => {
      const fetcher = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(new Response(null, { status: 500 }));

      await expect(new HttpProviderConnectionTester(fetcher).testProvider(codexProvider))
        .resolves
        .toEqual({ successful: true });
      expect(fetcher).toHaveBeenNthCalledWith(
        2,
        codexProvider.configuration.baseUrl,
        expect.objectContaining({ method: 'GET', redirect: 'manual' }),
      );
    },
  );

  it('fails when the Base URL fallback cannot establish an HTTP connection', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockRejectedValueOnce(new TypeError('connection refused'));

    await expect(new HttpProviderConnectionTester(fetcher).testProvider(codexProvider))
      .resolves
      .toEqual({
        message: 'The Provider could not be reached: connection refused.',
        successful: false,
      });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not fall back when the models request cannot establish a connection', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValue(new TypeError('connection refused'));

    await expect(new HttpProviderConnectionTester(fetcher).testProvider(codexProvider))
      .resolves
      .toEqual({
        message: 'The Provider could not be reached: connection refused.',
        successful: false,
      });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('fails immediately when the models request times out', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

    await expect(new HttpProviderConnectionTester(fetcher).testProvider(codexProvider))
      .resolves
      .toEqual({ message: 'The connection timed out.', successful: false });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('uses the Claude models URL and saved API key header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null));

    await new HttpProviderConnectionTester(fetcher).testProvider(claudeProvider);

    expect(fetcher).toHaveBeenCalledWith(
      'https://claude.example.com/api/v1/models',
      expect.any(Object),
    );
    const headers = fetcher.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('x-api-key')).toBe('claude-secret');
    expect(headers.get('anthropic-version')).toBe('2023-06-01');
  });
});
