import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { i18n } from '@/i18n';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (_error, query) => {
      if (query.queryKey[0] === 'settings') {
        toast.error(i18n.t('settings.errors.load'));
      }
    },
  }),
});
