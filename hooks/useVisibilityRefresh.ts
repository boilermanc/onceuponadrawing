import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that provides AbortController support for data fetching with tab visibility handling.
 *
 * When the tab becomes hidden, pending requests are aborted.
 * When the tab becomes visible again, a new AbortController is created and refreshKey increments,
 * triggering components to re-fetch data with a fresh connection.
 */
export function useVisibilityRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a new AbortController
  const createController = useCallback(() => {
    // Abort any existing controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  // Get the current signal, creating a controller if needed
  const getSignal = useCallback(() => {
    if (!abortControllerRef.current) {
      createController();
    }
    return abortControllerRef.current!.signal;
  }, [createController]);

  // Abort current requests
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Create initial controller
    createController();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is now hidden - abort pending requests
        abort();
      } else if (document.visibilityState === 'visible') {
        // Tab is now visible - create fresh controller and trigger refresh
        createController();
        setRefreshKey(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      abort();
    };
  }, [abort, createController]);

  return {
    refreshKey,
    getSignal,
    abort,
  };
}

/**
 * Helper to check if an error is from an aborted request
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('aborted');
  }
  return false;
}
