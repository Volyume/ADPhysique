import { createServerSupabase } from '@volyume/supabase/server';
import { Card, CardHeader, CardTitle, StatusDot } from '@volyume/ui';
import { requireMarketingAdmin } from '@/lib/marketing/auth';
import { getWeeklyReports } from '@/lib/marketing/queries';

export const dynamic = 'force-dynamic';

// Same kind -> tone mapping as the ledger page: publish reads positive,
// incident reads negative, everything else neutral (StatusDot has no
// separate "info" tone to invent one for).
const KIND_TONE: Record<string, 'on' | 'off' | 'neutral'> = {
  action: 'neutral',
  publish: 'on',
  incident: 'off',
  decision: 'neutral',
  note: 'neutral',
};

const KIND_ORDER = ['action', 'publish', 'incident', 'decision', 'note'];

function weekLabel(weekStart: string): string {
  // weekStart is a Europe/London Monday day key; render it as that calendar
  // date (UTC here only pins the day key to itself, no timezone shift).
  return new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function MarketingReportsPage() {
  await requireMarketingAdmin();
  const supabase = await createServerSupabase();
  const reports = await getWeeklyReports(supabase);

  return (
    <div className="flex flex-col gap-lg">
      <p className="type-caption text-textMuted">
        Weekly rollups derived from marketing_ledger and marketing_metrics, Monday-start weeks
        (Europe/London), last 8 weeks. There is no separate reports table; this view is computed at
        read time.
      </p>
      {reports.length === 0 ? (
        <Card>
          <p className="type-caption text-textMuted">
            No report weeks yet. Reports roll up marketing_ledger entries and marketing_metrics
            snapshots from the last 8 weeks; once the agents write their first rows, the weekly
            rollups appear here.
          </p>
        </Card>
      ) : (
        reports.map((week) => (
          <Card key={week.weekStart}>
            <CardHeader>
              <CardTitle>Week beginning {weekLabel(week.weekStart)}</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-md">
              <div className="flex flex-wrap items-center gap-md type-caption text-textMuted">
                {KIND_ORDER.filter((kind) => (week.kindCounts[kind] ?? 0) > 0).map((kind) => (
                  <span key={kind} className="inline-flex items-center gap-sm">
                    <StatusDot tone={KIND_TONE[kind] ?? 'neutral'} />
                    {kind}: {week.kindCounts[kind]}
                  </span>
                ))}
                {week.rows.length === 0 ? <span>No ledger activity this week.</span> : null}
              </div>
              {week.metrics.length > 0 ? (
                <div className="flex flex-wrap gap-md">
                  {week.metrics.map((m) => (
                    <div key={m.metric} className="rounded-md bg-surface2 px-md py-sm">
                      <p className="type-caption uppercase tracking-label text-textSecondary">
                        {m.metric}
                      </p>
                      <p className="type-body font-medium text-textPrimary">{m.value}</p>
                      <p className="type-caption text-textMuted">
                        {new Date(m.metric_date).toLocaleDateString('en-GB')} ({m.source})
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {week.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left type-body">
                    <thead>
                      <tr className="type-caption uppercase tracking-label text-textSecondary">
                        <th className="px-sm py-xs">Occurred</th>
                        <th className="px-sm py-xs">Kind</th>
                        <th className="px-sm py-xs">Action</th>
                        <th className="px-sm py-xs">Channel</th>
                        <th className="px-sm py-xs">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {week.rows.map((row) => (
                        <tr key={row.id} className="border-t border-borderSubtle">
                          <td className="px-sm py-sm type-caption text-textMuted">
                            {new Date(row.occurred_at).toLocaleString('en-GB')}
                          </td>
                          <td className="px-sm py-sm">
                            <span className="inline-flex items-center gap-sm">
                              <StatusDot tone={KIND_TONE[row.kind] ?? 'neutral'} />
                              {row.kind}
                            </span>
                          </td>
                          <td className="px-sm py-sm">{row.action}</td>
                          <td className="px-sm py-sm">{row.channel ?? '-'}</td>
                          <td className="px-sm py-sm">{row.result ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
