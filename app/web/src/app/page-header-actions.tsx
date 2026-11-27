import {
  use,
  useCallback,
  createContext,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { PropsWithChildren } from 'react';

interface PageHeaderActionsContextValue {
  container: HTMLDivElement | null;
  setContainer: (container: HTMLDivElement | null) => void;
}

const PageHeaderActionsContext
  = createContext<PageHeaderActionsContextValue | null>(null);
PageHeaderActionsContext.displayName = 'PageHeaderActionsContext';

export function PageHeaderActionsProvider({ children }: PropsWithChildren) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <PageHeaderActionsContext value={{ container, setContainer }}>
      {children}
    </PageHeaderActionsContext>
  );
}

export function PageHeaderActionsSlot() {
  const context = use(PageHeaderActionsContext);
  if (!context) {
    throw new Error('PageHeaderActionsSlot must be used within PageHeaderActionsProvider');
  }
  const setContainer = context.setContainer;
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, [setContainer]);

  return (
    <div
      ref={containerRef}
      className="ml-auto flex shrink-0 items-center gap-2 px-4"
    />
  );
}

export function PageHeaderActions({ children }: PropsWithChildren) {
  const context = use(PageHeaderActionsContext);

  return context?.container
    ? createPortal(children, context.container)
    : null;
}
