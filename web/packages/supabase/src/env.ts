// Public Supabase config. The anon key + the user's JWT is the user-web/B2B
// contract; RLS does the isolation, exactly as mobile. The service-role key is
// NEVER read here (admin uses it server-only, in its own app).
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return { url, anonKey };
}
