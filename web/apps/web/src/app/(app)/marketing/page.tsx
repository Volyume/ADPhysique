import { createServerSupabase } from '@volyume/supabase/server';
import { Card, CardHeader, CardTitle, LineChart } from '@volyume/ui';
import { requireMarketingAdmin } from '@/lib/marketing/auth';
import { getLatestMetrics, getMetricHistory, type MarketingMetricRow } from '@/lib/marketing/queries';

export const dynamic = 'force-dynamic';

const STAT_CARDS: { metric: string; label: string }[] = [
  { metric: 'installs', label: 'Installs' },
  { metric: 'trial_starts', label: 'Trial starts' },
  { metric: 'conversions', label: 'Conversions' },
  { metric: 'rating', label: 'Rating' },
  { metric: 'waitlist_total', label: 'Waitlist total' },
];

function formatValue(row: MarketingMetricRow): string {
  return row.metric === 'rating' ? row.value.toFixed(1) : Math.round(row.value).toLocaleString('en-GB');
}

export default async function MarketingOverviewPage() {
  await requireMarketingAdmin();
  const supabase = await createServerSupabase();
  const metrics = await getLatestMetrics(supabase);

  const histories = await Promise.all(
    STAT_CARDS.map(async ({ metric }) => {
      if (!metrics[metric]) return { metric, points: [] as { t: number; v: number }[] };
      const history = await getMetricHistory(supabase, metric);
      return {
        metric,
        points: history.map((h) => ({ t: Date.parse(h.metric_date), v: h.value })),
      };
    }),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="type-title mb-lg font-bold text-textPrimary">Marketing overview</h1>
      <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map(({ metric, label }) => {
          const row = metrics[metric];
          const history = histories.find((h) => h.metric === metric);
          const hasTrend = (history?.points.length ?? 0) > 1;
          return (
            <Card key={metric}>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              {row ? (
                <>
                  <p className="type-display font-bold text-textPrimary">{formatValue(row)}</p>
                  <p className="type-caption text-textMuted">
                    As of {row.metric_date} &middot; {row.source}
                  </p>
                  {hasTrend ? (
                    <div className="mt-md">
                      <LineChart
                        series={[{ points: history!.points }]}
                        height={100}
                        formatX={(t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="type-caption text-textMuted">
                  Awaiting data for &ldquo;{metric}&rdquo; from marketing_metrics.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
