import type { ProviderConnectionStatus } from '../../../../shared/provider-contract';

export function getProviderConnectionStatusPresentation(
  status: ProviderConnectionStatus,
): {
  label: string;
  variant: 'neutral' | 'success' | 'error';
} {
  switch (status) {
    case 'connected': {
      return { label: 'Connected', variant: 'success' };
    }
    case 'failed': {
      return { label: 'Failed', variant: 'error' };
    }
    case 'never-tested': {
      return { label: 'Never tested', variant: 'neutral' };
    }
  }
}
