import { NextResponse } from 'next/server';
import { createServerSupabase } from '@volyume/supabase/server';

// OAuth / magic-link return. Exchanges the code for a cookie session, then
// continues to the app. Mirrors the @supabase/ssr callback pattern.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
