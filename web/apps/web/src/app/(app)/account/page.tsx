import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getAccountProfile } from '@volyume/supabase';
import { InfoRows, type InfoRow } from '@/components/account/InfoRows';
import { humanise } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const p = await getAccountProfile(supabase, user.id);

  const profileRows: InfoRow[] = [
    { label: 'Name', value: p.firstName ?? 'Not set' },
    { label: 'Email', value: user.email ?? '' },
    { label: 'Units', value: p.units ? p.units.toUpperCase() : 'Not set' },
    { label: 'Sex', value: humanise(p.sex) },
    { label: 'Age', value: p.age != null ? `${p.age}` : 'Not set' },
    { label: 'Height', value: p.heightCm != null ? `${p.heightCm} cm` : 'Not set' },
  ];

  const trainingRows: InfoRow[] = [
    { label: 'Goal', value: humanise(p.primaryGoal) },
    { label: 'Training focus', value: humanise(p.trainingFocus) },
    { label: 'Experience', value: humanise(p.experienceLevel) },
    { label: 'Diet', value: humanise(p.dietPreference) },
    { label: 'Equipment', value: humanise(p.primaryEquipment) },
    { label: 'Bar weight', value: p.barWeight != null ? `${p.barWeight} kg` : 'Not set' },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="type-h2 text-textPrimary">Account</h1>

      <section className="mt-xl">
        <h2 className="type-label uppercase tracking-label text-textSecondary">Profile</h2>
        <div className="mt-sm">
          <InfoRows rows={profileRows} />
        </div>
      </section>

      <section className="mt-xl">
        <h2 className="type-label uppercase tracking-label text-textSecondary">Training</h2>
        <div className="mt-sm">
          <InfoRows rows={trainingRows} />
        </div>
      </section>

      <nav className="mt-xl flex flex-col gap-sm">
        <Link href="/account/subscription" className="type-body text-primary hover:underline">
          Subscription
        </Link>
        <Link href="/settings" className="type-body text-primary hover:underline">
          Settings
        </Link>
      </nav>

      <p className="mt-xl type-caption text-textMuted">
        Changing your goal or details happens on the app, which rebuilds your plan and targets.
      </p>
    </div>
  );
}
