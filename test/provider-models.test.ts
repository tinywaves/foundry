import { expect, it, vi } from 'vitest';
import { fetchProviderModels } from '../src/features/providers/models';

it('fetches OpenAI-compatible models', async () => {
  const fetchMock = vi.fn<typeof fetch>((_input, init) => {
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret');

    return Promise.resolve(Response.json({
      data: [
        { id: 'foundry-small', name: 'Foundry Small' },
        { id: 'foundry-large' },
      ],
    }));
  });

  const models = await fetchProviderModels({
    protocol: 'openai-compatible-chat-completions',
    baseURL: 'http://127.0.0.1:11434/v1/',
    apiKey: 'secret',
  }, fetchMock);

  expect(fetchMock).toHaveBeenCalledWith(
    'http://127.0.0.1:11434/v1/models',
    expect.any(Object),
  );
  expect(models).toEqual([
    { id: 'foundry-small', displayName: 'Foundry Small' },
    { id: 'foundry-large' },
  ]);
});
