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

// Renders marketing_content.claims_citations (jsonb, shape not fixed by the
// schema beyond "citations backing a factual claim") defensively: a string
// as-is, an array one citation per line, anything else pretty-printed.
function formatCitations(citations: unknown): string {
  if (typeof citations === 'string') return citations;
  if (Array.isArray(citations)) {
    return citations.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('\n');
  }
  return JSON.stringify(citations, null, 2);
}

// A ready-to-post pack for approved social items: everything a founder needs
// to actually hand the item to a channel. body_ref is rendered as selectable
// text rather than truncated decoration (there is no in-app editor for it,
// per DASHBOARD-SPEC.md section 5 non-goals -- this is read-only reference).
function ReadyToPostPack({ row }: { row: MarketingContentRow }) {
  if (!row.channel.startsWith('social_') || row.status !== 'approved') return null;
  return (
    <div className="mt-sm flex flex-col gap-sm rounded-md bg-surface2 p-sm">
      <p className="type-caption font-medium uppercase tracking-label text-textPrimary">
        Ready to post
      </p>
      <div>
        <p className="type-caption text-textMuted">Body reference</p>
        <pre className="select-all whitespace-pre-wrap break-all rounded-sm bg-surface1 p-xs type-caption text-textPrimary">
          {row.body_ref ?? 'No body_ref recorded on this item.'}
        </pre>
      </div>
      {row.claims_citations ? (
        <div>
          <p className="type-caption text-textMuted">Claims citations</p>
          <pre className="select-all whitespace-pre-wrap break-all rounded-sm bg-surface1 p-xs type-caption text-textPrimary">
            {formatCitations(row.claims_citations)}
          </pre>
        </div>
      ) : (
        <p className="type-caption text-textMuted">No claims citations recorded on this item.</p>
      )}
      <p className="type-caption text-textMuted">
        Caption text is not stored as its own field on marketing_content; it lives inline in the
        copy at the body reference above.
      </p>
    </div>
  );
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
                      className="flex flex-col gap-sm rounded-md border border-borderSubtle p-md"
                    >
                      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
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
                      <ReadyToPostPack row={row} />
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
