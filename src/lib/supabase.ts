import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const defaultUrl = 'http://127.0.0.1:54321';
const defaultAnonKey = 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  defaultAnonKey;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
