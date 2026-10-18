import { readFileSync } from 'node:fs';

export type FoundrySettings = {
  features?: Record<string, { provider?: string | null }>;
};

/**
 * Reads provider references through one seam so the settings shape can evolve
 * without changing Provider lifecycle checks.
 */
export function getCurrentUsedProviderIds(settingsPath: string): Set<string> {
  let settings: FoundrySettings;
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as FoundrySettings;
  } catch {
    return new Set();
  }

  const usedProviderIds = new Set<string>();
  const features = Object.values(settings.features ?? {});
  for (const feature of features) {
    if (typeof feature.provider === 'string' && feature.provider.trim()) {
      usedProviderIds.add(feature.provider);
    }
  }
  return usedProviderIds;
}
