export interface PromptVersionSelectionContext {
  currentVersion: number;
  isDirty: boolean;
  requestedVersion: number;
  selectedVersion?: number;
}

export type PromptVersionSelectionAction
  = | { type: 'confirm-discard'; version: number }
    | { type: 'load'; version: number }
    | { type: 'none' }
    | { type: 'show-current' };

export function getPromptVersionSelectionAction({
  currentVersion,
  isDirty,
  requestedVersion,
  selectedVersion,
}: PromptVersionSelectionContext): PromptVersionSelectionAction {
  if (requestedVersion === currentVersion) {
    return { type: 'show-current' };
  }
  if (requestedVersion === selectedVersion) {
    return { type: 'none' };
  }
  if (isDirty) {
    return { type: 'confirm-discard', version: requestedVersion };
  }
  return { type: 'load', version: requestedVersion };
}
