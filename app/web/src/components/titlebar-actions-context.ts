import { createContext, use } from 'react';

export interface TitlebarActionsContextValue {
  target: HTMLElement | null;
  setTarget: (target: HTMLElement | null) => void;
}

export const TitlebarActionsContext = createContext<TitlebarActionsContextValue | null>(null);
TitlebarActionsContext.displayName = 'TitlebarActionsContext';

export function useTitlebarActionsContext(): TitlebarActionsContextValue {
  const context = use(TitlebarActionsContext);
  if (!context) {
    throw new Error('Titlebar actions must be used within TitlebarActionsProvider');
  }

  return context;
}

export function useTitlebarActionsTarget() {
  return useTitlebarActionsContext().setTarget;
}
