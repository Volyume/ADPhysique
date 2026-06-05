'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

// Browser Supabase client (cookie session via @supabase/ssr). Anon key + the
// signed-in user's JWT; RLS scopes every read to the caller's own rows.
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
