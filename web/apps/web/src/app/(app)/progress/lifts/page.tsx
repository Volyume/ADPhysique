import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getLifts } from '@volyume/supabase';
import { isoDaysAgo } from '@/lib/dates';
import { LiftExplorer } from '@/components/progress/LiftExplorer';

export const dynamic = 'force-dynamic';

export default async function LiftsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const lifts = await getLifts(supabase, user.id, isoDaysAgo(180));

  if (lifts.length === 0) {
    return <p className="type-body text-textMuted">No lifts logged in the last six months.</p>;
  }

  return <LiftExplorer lifts={lifts} />;
}
