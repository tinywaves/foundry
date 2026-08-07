import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ProviderSummary } from '../../../../shared/provider-contract';
import { createProviderAvatarUrl } from './provider-avatar-url';
import { getProviderAvatarQueryOptions } from './provider-query';

interface ProviderAvatarUrlState {
  avatar: NonNullable<ReturnType<typeof useProviderAvatarQuery>['data']>;
  url: string;
}

function useProviderAvatarQuery(provider: ProviderSummary) {
  return useQuery({
    ...getProviderAvatarQueryOptions(provider.runtime, provider.id),
    enabled: provider.hasCustomAvatar,
  });
}

export function useProviderAvatarUrl(provider: ProviderSummary): string | undefined {
  const query = useProviderAvatarQuery(provider);
  const avatar = provider.hasCustomAvatar ? query.data : undefined;
  const [urlState, setUrlState] = useState<ProviderAvatarUrlState>();

  useEffect(() => {
    if (avatar === undefined || avatar === null) {
      return;
    }
    const nextUrl = createProviderAvatarUrl(avatar);
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) {
        setUrlState({ avatar, url: nextUrl });
      }
    });
    return () => {
      isActive = false;
      URL.revokeObjectURL(nextUrl);
    };
  }, [avatar]);

  return avatar !== undefined && avatar !== null && urlState?.avatar === avatar
    ? urlState.url
    : undefined;
}
