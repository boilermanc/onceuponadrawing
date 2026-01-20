
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Assume these are provided in the environment
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Auth and DB will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
