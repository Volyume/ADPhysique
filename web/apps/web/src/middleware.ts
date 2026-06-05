import { type NextRequest } from 'next/server';
import { updateSession } from '@volyume/supabase/middleware';

// Refresh the Supabase session on every request so Server Components always see
// a valid cookie. Skips static assets.
export async function middleware(request: NextRequest) {
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
