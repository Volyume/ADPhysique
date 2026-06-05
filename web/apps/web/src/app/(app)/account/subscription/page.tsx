import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getAccountProfile } from '@volyume/supabase';
import { humanise } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  const user = await requireUser();
  const supabase = createServerSupabase();
  const p = await getAccountProfile(supabase, user.id);
  const tier = p.tier ? humanise(p.tier) : 'Free';

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/account" className="type-caption text-textMuted hover:text-textSecondary">
        Account
      </Link>
      <h1 className="mt-xs type-h2 text-textPrimary">Subscription</h1>

      <div className="mt-xl rounded-lg border border-borderSubtle bg-surface p-lg">
        <p className="type-label uppercase tracking-label text-textSecondary">Current plan</p>
        <p className="mt-xs type-display tnum text-textPrimary">{tier}</p>
      </div>

      <p className="mt-lg max-w-[60ch] type-body text-textSecondary">
        Billing is handled through the app store your subscription was bought from. Manage or cancel
        it there; this page reflects your current status.
      </p>

      <p className="mt-md type-caption text-textMuted">
        Account deletion and data export are available on the app under Settings.
      </p>
    </div>
  );
}
