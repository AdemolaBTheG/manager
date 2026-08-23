import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

const QUERY_STALE_TIME_MS = 30_000;
const MAX_QUERY_RETRIES = 2;

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handleAppStateChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    handleAppStateChange(AppState.currentState);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < MAX_QUERY_RETRIES && isRetryableQueryError(error),
        staleTime: QUERY_STALE_TIME_MS,
      },
      mutations: {
        // Rehearsal mutations can incur provider cost. Retrying stays explicit.
        retry: false,
      },
    },
  });
}

function isRetryableQueryError(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return true;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status !== 'number' || status === 0 || status >= 500;
}
