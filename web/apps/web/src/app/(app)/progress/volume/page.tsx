import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getMuscleVolume } from '@volyume/supabase';
import { isoDaysAgo } from '@/lib/dates';
import { VolumeBars } from '@/components/progress/VolumeBars';

export const dynamic = 'force-dynamic';

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-xs">
      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="type-caption text-textSecondary">{label}</span>
    </span>
  );
}

export default async function VolumePage() {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const rows = await getMuscleVolume(supabase, user.id, isoDaysAgo(7));
  const hasData = rows.some((r) => r.sets > 0);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="type-label uppercase tracking-label text-textSecondary">Working sets, last 7 days</p>
        <div className="flex flex-wrap gap-lg">
          <LegendDot color="var(--c-textMuted)" label="Below" />
          <LegendDot color="var(--c-success)" label="Optimal" />
          <LegendDot color="var(--c-warning)" label="Getting close" />
          <LegendDot color="var(--c-error)" label="Too much" />
        </div>
      </div>

      {hasData ? (
        <div className="mt-xl">
          <VolumeBars rows={rows} />
        </div>
      ) : (
        <p className="mt-lg type-body text-textMuted">No sets logged in the last week.</p>
      )}
    </section>
  );
}
