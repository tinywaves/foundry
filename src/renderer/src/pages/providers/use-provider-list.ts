import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import { createProviderAvatarUrl } from './provider-avatar-url';

type ProviderListState
  = | {
    runtime: ProviderRuntime;
    revision: number;
    status: 'loading';
  }
  | {
    runtime: ProviderRuntime;
    revision: number;
    status: 'success';
    providers: ProviderSummary[];
  }
  | {
    runtime: ProviderRuntime;
    revision: number;
    status: 'error';
    message: string;
  };

interface ProviderAvatarUrlState {
  runtime: ProviderRuntime;
  revision: number;
  urls: Record<string, string>;
}

function revokeObjectUrls(objectUrls: Map<string, string>): void {
  for (const url of objectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrls.clear();
}

export function useProviderList(runtime: ProviderRuntime) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ProviderListState>({
    runtime,
    revision: 0,
    status: 'loading',
  });
  const [avatarUrlState, setAvatarUrlState] = useState<ProviderAvatarUrlState>({
    runtime,
    revision: 0,
    urls: {},
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const objectUrls = new Map<string, string>();
    let isCancelled = false;

    const isCurrentRequest = () => !isCancelled && requestId === requestIdRef.current;

    async function loadAvatar(provider: ProviderSummary): Promise<void> {
      try {
        const result = await globalThis.api.providers.getProviderAvatar(provider.id);
        if (!isCurrentRequest() || !result.ok || result.value === null) {
          return;
        }

        const url = createProviderAvatarUrl(result.value);
        if (!isCurrentRequest()) {
          URL.revokeObjectURL(url);
          return;
        }

        const previousUrl = objectUrls.get(provider.id);
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        objectUrls.set(provider.id, url);
        setAvatarUrlState((current) => ({
          runtime,
          revision,
          urls: current.runtime === runtime && current.revision === revision
            ? { ...current.urls, [provider.id]: url }
            : { [provider.id]: url },
        }));
      } catch {
        // An avatar is optional, so its failure falls back without failing the list.
      }
    }

    async function loadProviders(): Promise<void> {
      try {
        const result = await globalThis.api.providers.listProviders(runtime);
        if (!isCurrentRequest()) {
          return;
        }
        if (!result.ok) {
          setState({
            runtime,
            revision,
            status: 'error',
            message: result.error.message,
          });
          return;
        }

        const providers = result.value.filter((provider) => (
          provider.runtime === runtime && provider.source === 'user-custom'
        ));
        setState({ runtime, revision, status: 'success', providers });

        await Promise.all(
          providers
            .filter((provider) => provider.hasCustomAvatar)
            .map((provider) => loadAvatar(provider)),
        );
      } catch {
        if (isCurrentRequest()) {
          setState({
            runtime,
            revision,
            status: 'error',
            message: 'Provider data could not be loaded.',
          });
        }
      }
    }

    void loadProviders();

    return () => {
      isCancelled = true;
      revokeObjectUrls(objectUrls);
    };
  }, [revision, runtime]);

  const reload = useCallback(() => setRevision((current) => current + 1), []);
  const replaceProvider = useCallback((provider: ProviderSummary) => {
    setState((current) => {
      if (
        current.status !== 'success'
        || current.runtime !== runtime
        || current.revision !== revision
        || provider.runtime !== runtime
      ) {
        return current;
      }
      return {
        ...current,
        providers: current.providers.map((item) => (
          item.id === provider.id ? provider : item
        )),
      };
    });
  }, [revision, runtime]);
  const isCurrent = state.runtime === runtime && state.revision === revision;
  const avatarUrls = avatarUrlState.runtime === runtime
    && avatarUrlState.revision === revision
    ? avatarUrlState.urls
    : {};

  return {
    state: isCurrent ? state : undefined,
    avatarUrls,
    reload,
    replaceProvider,
  };
}
