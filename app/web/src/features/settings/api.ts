import type { SettingsPatch, SettingsPayload } from '@dhzh/foundry-shared';

const settingsPath = '/api/settings';

export function getSettings(signal?: AbortSignal): Promise<SettingsPayload> {
  return requestSettings<SettingsPayload>({ signal });
}

export function updateSettings(patch: SettingsPatch): Promise<SettingsPayload> {
  return requestSettings<SettingsPayload>({
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export function openConfigFolder(): Promise<Pick<SettingsPayload, 'configFolder'>> {
  return requestSettings({ method: 'POST' }, `${settingsPath}/config-folder/open`);
}

async function requestSettings<T>(init?: RequestInit, path = settingsPath): Promise<T> {
  const response = await fetch(path, init);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as {
      error?: { message?: string };
    };
    return payload.error?.message
      ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
