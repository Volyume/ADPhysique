import { redirect } from 'next/navigation';
import { createServerSupabase } from '@volyume/supabase/server';
import { requireUser } from '@/lib/auth';

// Gate every marketing-dashboard page/action on membership in
// marketing_admins. This UI-level check is convenience only: the real
// boundary is Supabase RLS, which gates every policy on the marketing
// tables through the same allow-list (see marketing/hq/DASHBOARD-SPEC.md
// "Auth layering" and DATA-SCHEMA.md section 1).
export async function requireMarketingAdmin() {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('marketing_admins')
    .select('email')
    .eq('email', user.email)
    .maybeSingle();
  if (!data) {
    redirect('/dashboard');
  }
  return user;
}

// Lightweight, non-redirecting check for cosmetic nav visibility. Returns
// false on any error (including a signed-out user) so the nav entry simply
// doesn't render rather than throwing inside the shared app shell.
export async function isMarketingAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('marketing_admins')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  return Boolean(data);
}
