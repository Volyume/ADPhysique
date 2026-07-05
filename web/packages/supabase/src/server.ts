import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server Supabase client for Server Components, Route Handlers and Server
// Actions. Reads/writes the auth cookie. Anon key + the user's JWT, RLS
// enforced. Writing cookies from a Server Component throws (read-only render),
// so setAll is wrapped: the middleware refreshes the session on every request.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render. Safe to ignore: the
          // middleware (updateSession) has already refreshed the session.
        }
      },
    },
  });
}
