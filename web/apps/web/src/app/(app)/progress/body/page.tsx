import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getBodyTrend } from '@volyume/supabase';
import { LineChart } from '@volyume/ui';
import { isoDaysAgo, ukShortDate } from '@/lib/dates';
import { fmtKg, fmtSignedRate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function BodyPage() {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const trend = await getBodyTrend(supabase, user.id, isoDaysAgo(180));

  if (trend.raw.length < 2) {
    return <p className="type-body text-textMuted">Not enough morning weights yet.</p>;
  }

  const latest = trend.raw[trend.raw.length - 1]!.v;

  return (
    <section>
      <div className="flex flex-wrap items-end gap-x-xl gap-y-sm">
        <div>
          <p className="type-label uppercase tracking-label text-textSecondary">Latest</p>
          <p className="type-h2 tnum text-textPrimary">{fmtKg(latest)}</p>
        </div>
        {trend.ratePerWeek != null ? (
          <div>
            <p className="type-label uppercase tracking-label text-textSecondary">Trend</p>
            <p className="type-h2 tnum text-textSecondary">{fmtSignedRate(trend.ratePerWeek)} kg/wk</p>
          </div>
        ) : null}
      </div>

      <div className="mt-xl overflow-x-auto">
        <LineChart
          width={760}
          height={320}
          series={[
            { points: trend.raw, color: 'var(--c-textDisabled)' },
            { points: trend.ewma, color: 'var(--c-chartLine)', fill: 'var(--c-chartFill)' },
          ]}
          formatY={(n) => n.toFixed(1)}
          formatX={ukShortDate}
        />
      </div>
      <p className="mt-sm type-caption text-textMuted">
        Faint line is each morning weight; amber is the smoothed trend.
      </p>
    </section>
  );
}
