import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { FoundryEvent } from '../shared/events';
import { parseFoundryEvent } from '../shared/events';

export type FoundryEventConnectionStatus = 'connecting' | 'open';

type FoundryEventSubscriber = (event: FoundryEvent) => void;

interface FoundryEventsContextValue {
  status: FoundryEventConnectionStatus;
  subscribe: (subscriber: FoundryEventSubscriber) => () => void;
}

const FoundryEventsContext = createContext<FoundryEventsContextValue | null>(null);
FoundryEventsContext.displayName = 'FoundryEventsContext';

export function FoundryEventsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FoundryEventConnectionStatus>('connecting');
  const subscribersRef = useRef(new Set<FoundryEventSubscriber>());

  const subscribe = useCallback((subscriber: FoundryEventSubscriber) => {
    subscribersRef.current.add(subscriber);
    return () => {
      subscribersRef.current.delete(subscriber);
    };
  }, []);

  useEffect(() => {
    // EventSource is a browser API; the Node lint environment does not model DOM globals.
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const source = new EventSource('/api/events');
    const handleOpen = (): void => {
      setStatus('open');
    };
    const handleError = (): void => {
      setStatus('connecting');
    };
    const handleFoundry = (message: Event): void => {
      const event = parseFoundryEvent((message as MessageEvent<string>).data);
      if (!event) {
        return;
      }

      for (const subscriber of subscribersRef.current) {
        subscriber(event);
      }
    };

    source.addEventListener('open', handleOpen);
    source.addEventListener('error', handleError);
    source.addEventListener('foundry', handleFoundry);

    return () => {
      source.removeEventListener('open', handleOpen);
      source.removeEventListener('error', handleError);
      source.removeEventListener('foundry', handleFoundry);
      source.close();
    };
  }, []);

  return (
    <FoundryEventsContext value={{ status, subscribe }}>
      {children}
    </FoundryEventsContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFoundryEvents(): FoundryEventsContextValue {
  const context = use(FoundryEventsContext);
  if (!context) {
    throw new Error('useFoundryEvents must be used within FoundryEventsProvider');
  }

  return context;
}
