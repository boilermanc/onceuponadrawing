
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Namespace auth storage per environment to avoid cross-origin pollution (e.g., localhost vs prod)
const host = typeof window !== 'undefined' ? window.location.hostname : 'server';
const storageKey =
  host === 'onceuponadrawing.com'
    ? 'sb-onceupon-prod-auth'
    : host === 'localhost'
      ? 'sb-onceupon-local-auth'
      : `sb-onceupon-${host}-auth`;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[supabaseClient] Supabase credentials missing. Auth and DB will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    lockType: 'mem',
    // Only enable debug in development when explicitly needed
    debug: false,
  },
});

// Export these for use in fetch calls to Edge Functions
export const getSupabaseAnonKey = () => supabaseAnonKey;
export const getSupabaseUrl = () => supabaseUrl;
