import { routePaths } from '../../routes';

export const promptEditorListPath = routePaths.agentExtensionsPrompts;
export const promptEditorListNavigateOptions = { replace: true } as const;

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
