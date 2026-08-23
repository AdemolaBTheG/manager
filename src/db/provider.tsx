import { type ReactNode, useEffect, useState } from 'react';

import { initializeDatabase } from './migrations';

type DatabaseProviderProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type InitializationState =
  | { status: 'pending' }
  | { status: 'ready' }
  | { status: 'error'; error: Error };

export function DatabaseProvider({ children, fallback = null }: DatabaseProviderProps) {
  const [state, setState] = useState<InitializationState>({ status: 'pending' });

  useEffect(() => {
    let isMounted = true;

    initializeDatabase().then(
      () => {
        if (isMounted) {
          setState({ status: 'ready' });
        }
      },
      (error: unknown) => {
        if (isMounted) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error('Database initialization failed'),
          });
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === 'error') {
    throw state.error;
  }

  if (state.status !== 'ready') {
    return fallback;
  }

  return children;
}
