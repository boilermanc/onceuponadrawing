import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export function useTestIntegration() {
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async (integration: string): Promise<TestResult> => {
    setTesting(integration);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('test-integration', {
        body: { integration },
      });

      if (fnError) {
        // FunctionsHttpError hides real message in error.context (Response object)
        let errorMsg = fnError.message;
        try {
          if ((fnError as any).context?.json) {
            const body = await (fnError as any).context.json();
            if (body?.message) errorMsg = body.message;
          }
        } catch { /* use original message */ }
        return { success: false, message: errorMsg };
      }

      return data as TestResult;
    } catch (err: any) {
      const msg = err.message || 'Unexpected error testing connection';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setTesting(null);
    }
  };

  return { testConnection, testing, error };
}
