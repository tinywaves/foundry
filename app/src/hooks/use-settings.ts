import type {
  ApplicationSettings,
  SettingsResponse,
  UpdateApplicationSettingsRequest,
} from '@dhzh/foundry-api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const settingsQueryKey = ['settings'] as const;

async function readSettingsResponse(response: Response): Promise<ApplicationSettings> {
  if (!response.ok) {
    throw new Error('The Foundry Server could not load Application Settings.');
  }

  const result = await response.json() as SettingsResponse;
  return result.data;
}

async function getApplicationSettings(): Promise<ApplicationSettings> {
  return readSettingsResponse(await fetch('/api/settings', { cache: 'no-store' }));
}

async function updateApplicationSettings(
  update: UpdateApplicationSettingsRequest,
): Promise<ApplicationSettings> {
  return readSettingsResponse(await fetch('/api/settings', {
    body: JSON.stringify(update),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  }));
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: getApplicationSettings,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Infinity,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateApplicationSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQueryKey, settings);
    },
  });
}
