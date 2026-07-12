import { createServerSupabase } from '@volyume/supabase/server';
import { Card, CardHeader, CardTitle, StatusDot } from '@volyume/ui';
import { requireMarketingAdmin } from '@/lib/marketing/auth';
import { getContentByStatus, type MarketingContentRow } from '@/lib/marketing/queries';
import { PipelineRowActions } from './PipelineRowActions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  failed_review: 'Failed review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  retired: 'Retired',
};

const STATUS_ORDER = [
  'draft',
  'pending_review',
  'failed_review',
  'approved',
  'scheduled',
  'published',
  'retired',
];

// Rows still awaiting a founder decision, or approved but not yet
// published, are the only ones offered Approve/Reject controls.
const ACTIONABLE_STATUSES = new Set(['pending_review', 'approved']);

function verdictTone(verdict: string | null): 'on' | 'off' | 'neutral' {
  if (!verdict) return 'neutral';
  const v = verdict.toUpperCase();
  if (v === 'PASS') return 'on';
  if (v === 'FAIL') return 'off';
  return 'neutral';
}

export default async function MarketingContentPage() {
  await requireMarketingAdmin();
  const supabase = await createServerSupabase();
  const grouped = await getContentByStatus(supabase);

  return (
    <div>
      <div className="flex flex-col gap-lg">
        {STATUS_ORDER.map((status) => {
          const rows = grouped[status] ?? [];
          return (
            <Card key={status}>
              <CardHeader>
                <CardTitle>
                  {STATUS_LABELS[status] ?? status} ({rows.length})
                </CardTitle>
              </CardHeader>
              {rows.length === 0 ? (
                <p className="type-caption text-textMuted">No items in this lane.</p>
              ) : (
                <div className="flex flex-col gap-md">
                  {rows.map((row: MarketingContentRow) => (
                    <div
                      key={row.id}
                      className="flex flex-col gap-sm rounded-md border border-borderSubtle p-md sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col gap-xs">
                        <div className="flex items-center gap-sm">
                          <StatusDot tone={verdictTone(row.compliance_verdict)} />
                          <span className="type-body font-medium text-textPrimary">{row.title}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-sm type-caption text-textMuted">
                          <span className="rounded-full bg-surface2 px-sm py-hair uppercase tracking-label">
                            {row.lane}
                          </span>
                          <span>{row.channel}</span>
                          <span>
                            Compliance: {row.compliance_verdict ?? 'awaiting review'}
                          </span>
                          <span>Updated {new Date(row.updated_at).toLocaleString('en-GB')}</span>
                        </div>
                      </div>
                      {ACTIONABLE_STATUSES.has(row.status) ? (
                        <PipelineRowActions id={row.id} />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
