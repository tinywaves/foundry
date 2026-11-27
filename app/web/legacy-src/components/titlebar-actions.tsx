import { useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  TitlebarActionsContext,
  useTitlebarActionsContext,
} from './titlebar-actions-context';

export function TitlebarActionsProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  return (
    <TitlebarActionsContext value={{ target, setTarget }}>
      {children}
    </TitlebarActionsContext>
  );
}

export function TitlebarActions({ children }: { children: ReactNode }) {
  const { target } = useTitlebarActionsContext();
  return target ? createPortal(children, target) : null;
}
