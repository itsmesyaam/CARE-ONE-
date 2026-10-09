import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const defaultUrl = 'http://127.0.0.1:54321';
const defaultAnonKey = 'placeholder-anon-key';

export function getSupabaseConfigurationError(): string | null {
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local'));

  if (import.meta.env.PROD && !isLocalHost) {
    const rawUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!rawUrl || !rawUrl.trim()) {
      return 'Supabase URL is missing in this production deployment. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your Cloudflare build settings.';
    }
    const lower = rawUrl.toLowerCase().trim();
    if (lower.includes('localhost') || lower.includes('127.0.0.1')) {
      return `Production build cannot connect to local development address (${rawUrl}). Please set VITE_SUPABASE_URL to your Supabase project (https://kndkohgpbnbbndvtgqvx.supabase.co).`;
    }
    if (lower.includes('your-project')) {
      return 'Production build contains placeholder "YOUR-PROJECT". Please configure your real Supabase project URL.';
    }
  }
  return null;
}

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
