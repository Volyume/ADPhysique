import { Sparkline, StatusDot } from '@volyume/ui';
import type { WeightSummary } from '@volyume/supabase';
import { fmtSignedRate } from '@/lib/format';

// The one hero figure on the dashboard (Whoop pattern): the weight trend. One
// display element, laid out by importance, not a 2x2 grid of equals.
export function HeroFigure({ weight }: { weight: WeightSummary | null }) {
  if (!weight || weight.latestKg == null) {
    return (
      <section>
        <p className="type-label uppercase tracking-label text-textSecondary">Weight trend</p>
        <p className="mt-sm type-body text-textMuted">No weight logged yet.</p>
      </section>
    );
  }

  const rate = weight.ratePerWeek;
  // Trend tone: losing weight reads as on-target by default for most users, but
  // we do not have the coach goal here, so keep status neutral until Progress.
  return (
    <section>
      <p className="type-label uppercase tracking-label text-textSecondary">Weight trend</p>
      <div className="mt-xs flex flex-wrap items-end gap-x-xl gap-y-sm">
        <p className="type-display tnum text-textPrimary">
          {weight.latestKg.toFixed(1)}
          <span className="ml-xs type-h3 font-normal text-textSecondary">kg</span>
        </p>
        {rate != null ? (
          <p className="flex items-center gap-sm type-h3 tnum text-textSecondary">
            <StatusDot tone="neutral" />
            {fmtSignedRate(rate)} kg/wk
          </p>
        ) : null}
        {weight.series.length >= 2 ? (
          <Sparkline values={weight.series} width={160} height={44} fill="var(--c-chartFill)" />
        ) : null}
      </div>
    </section>
  );
}
