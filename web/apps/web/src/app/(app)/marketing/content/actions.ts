'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@volyume/supabase/server';
import { requireMarketingAdmin } from '@/lib/marketing/auth';

// Server actions can be invoked directly, independent of whichever page
// rendered their trigger, so each re-verifies admin status itself rather
// than trusting a page-level check. Writes go through the caller's
// authenticated session (RLS-gated), never service_role.

export async function approveContent(id: string) {
  await requireMarketingAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('marketing_content')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/marketing/content');
}

export async function rejectContent(id: string, reason: string) {
  await requireMarketingAdmin();
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from('marketing_content')
    .select('compliance_record')
    .eq('id', id)
    .single();
  const compliance_record = {
    ...((row?.compliance_record as Record<string, unknown> | null) ?? {}),
    founder_rejection: { reason, at: new Date().toISOString() },
  };
  const { error } = await supabase
    .from('marketing_content')
    .update({ status: 'failed_review', compliance_record, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/marketing/content');
}
