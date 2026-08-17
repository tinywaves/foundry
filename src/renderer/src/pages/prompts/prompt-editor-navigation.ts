import { routePaths } from '../../routes';

export const promptEditorListPath = routePaths.agentExtensionsPrompts;
export const promptEditorListNavigateOptions = { replace: true } as const;

export type PromptEditorSource = 'list' | 'view';

interface PromptEditorNavigationState {
  promptEditorSource: PromptEditorSource;
}

interface PromptEditorHistoryBackNavigation {
  kind: 'history';
  label: string;
}

interface PromptEditorPathBackNavigation {
  kind: 'path';
  label: string;
  options: typeof promptEditorListNavigateOptions;
  path: string;
}

export type PromptEditorBackNavigation
  = | PromptEditorHistoryBackNavigation
    | PromptEditorPathBackNavigation;

export function getPromptEditorNavigateOptions(source: PromptEditorSource) {
  return {
    state: {
      promptEditorSource: source,
    } satisfies PromptEditorNavigationState,
  };
}

function isPromptEditorNavigationState(
  state: unknown,
): state is PromptEditorNavigationState {
  if (typeof state !== 'object' || state === null) {
    return false;
  }
  const source = (state as Record<string, unknown>).promptEditorSource;
  return source === 'list' || source === 'view';
}

export function getPromptEditorBackNavigation(
  state: unknown,
): PromptEditorBackNavigation {
  if (isPromptEditorNavigationState(state)) {
    return {
      kind: 'history',
      label: state.promptEditorSource === 'view'
        ? 'Back to Prompt'
        : 'Back to Prompts',
    };
  }
  return {
    kind: 'path',
    label: 'Back to Prompts',
    options: promptEditorListNavigateOptions,
    path: promptEditorListPath,
  };
}

interface PromptEditorExitState {
  isRestoring: boolean;
  isSaving: boolean;
  isVersionLoading: boolean;
}

export function isPromptEditorExitDisabled({
  isRestoring,
  isSaving,
  isVersionLoading,
}: PromptEditorExitState): boolean {
  return isSaving || isVersionLoading || isRestoring;
}
