import { getFoundrySettingsPath } from '../../storage/paths';
import { readStoredSettings } from '../settings/repository';

export function getCurrentUsedProviderIds(
  settingsPath = getFoundrySettingsPath(),
): Set<string> {
  const settings = readStoredSettings(settingsPath);
  const usedProviderIds = new Set<string>();

  for (const feature of Object.values(settings.features)) {
    if (
      isRecord(feature)
      && typeof feature.provider === 'string'
      && feature.provider.trim().length > 0
    ) {
      usedProviderIds.add(feature.provider);
    }
  }

  return usedProviderIds;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
