import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      networkMode: 'always',
      retry: false,
    },
  },
});
