
import { createClient } from '@supabase/supabase-js';

// Assume these are provided in the environment
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Debug: log credential status (not the actual values)
console.log('[Supabase] URL configured:', !!supabaseUrl, supabaseUrl ? `(${supabaseUrl.substring(0, 30)}...)` : '(empty)');
console.log('[Supabase] Key configured:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Auth and DB will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
