import { redirect } from 'next/navigation';
import { createServerSupabase } from '@volyume/supabase/server';

export async function getUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Gate a Server Component on a signed-in user; send to sign-in otherwise.
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  return user;
}
