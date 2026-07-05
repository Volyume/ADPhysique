import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getDashboardData } from '@volyume/supabase';
import { ukDayKey, ukWeekStartISO } from '@/lib/dates';
import { HeroFigure } from '@/components/dashboard/HeroFigure';
import { ActivePlanCard } from '@/components/dashboard/ActivePlanCard';
import { ThisWeekCard } from '@/components/dashboard/ThisWeekCard';
import { CoachingStrip } from '@/components/dashboard/CoachingStrip';
import { NutritionStrip } from '@/components/dashboard/NutritionStrip';

// Always render against the live session; never cache a user's private data.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const data = await getDashboardData(supabase, user.id, {
    todayKey: ukDayKey(),
    weekStartISO: ukWeekStartISO(),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <HeroFigure weight={data.weight} />

      <div className="mt-xl grid gap-lg lg:grid-cols-2">
        <ActivePlanCard plan={data.plan} />
        <ThisWeekCard thisWeek={data.thisWeek} />
        <CoachingStrip coaching={data.coaching} />
        <NutritionStrip nutrition={data.nutrition} />
      </div>

      {data.failed.length > 0 ? (
        <p className="mt-lg type-caption text-textMuted">Some sections could not load. Refresh to try again.</p>
      ) : null}
    </div>
  );
}
