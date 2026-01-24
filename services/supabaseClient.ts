
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

console.log('[supabaseClient] Initializing with:', {
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Auth and DB will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export these for use in fetch calls to Edge Functions
export const getSupabaseAnonKey = () => supabaseAnonKey;
export const getSupabaseUrl = () => supabaseUrl;
