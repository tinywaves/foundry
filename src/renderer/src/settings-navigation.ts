import { routePaths } from './routes';

interface SettingsNavigationState {
  settingsEntrySource: 'app-shell';
}

interface SettingsHistoryBackNavigation {
  kind: 'history';
}

interface SettingsPathBackNavigation {
  kind: 'path';
  options: typeof settingsDashboardNavigateOptions;
  path: typeof routePaths.dashboard;
}

export type SettingsBackNavigation
  = | SettingsHistoryBackNavigation
    | SettingsPathBackNavigation;

export const settingsEntryNavigateOptions = {
  state: {
    settingsEntrySource: 'app-shell',
  } satisfies SettingsNavigationState,
} as const;

export const settingsDashboardNavigateOptions = { replace: true } as const;

function isSettingsNavigationState(
  state: unknown,
): state is SettingsNavigationState {
  if (typeof state !== 'object' || state === null) {
    return false;
  }
  return (state as Record<string, unknown>).settingsEntrySource === 'app-shell';
}

export function getSettingsBackNavigation(
  state: unknown,
): SettingsBackNavigation {
  if (isSettingsNavigationState(state)) {
    return { kind: 'history' };
  }
  return {
    kind: 'path',
    options: settingsDashboardNavigateOptions,
    path: routePaths.dashboard,
  };
}
