import { createServerSupabase } from '@volyume/supabase/server';
import { Card, CardHeader, CardTitle, StatusDot } from '@volyume/ui';
import { requireMarketingAdmin } from '@/lib/marketing/auth';
import { getContentByStatus, type MarketingContentRow } from '@/lib/marketing/queries';
import { PipelineRowActions } from './PipelineRowActions';
import { CopyButton } from './CopyButton';

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

// The item's compliance_record (jsonb) carries everything the founder needs to
// review and post: the human-readable script/notes (preview_text), the final
// caption and hashtags, and a manifest of the rendered files. Read defensively
// -- any field may be absent on older rows.
function record(row: MarketingContentRow): Record<string, unknown> | null {
  return (row.compliance_record as Record<string, unknown> | null) ?? null;
}

function stringField(row: MarketingContentRow, key: string): string | null {
  const v = record(row)?.[key];
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

// A rendered file bundled with the item, served from the dashboard's own
// /public/marketing-previews/... path (deployed with the app on Vercel). Each
// entry is playable/viewable and downloadable inline -- no external bucket,
// no sign-in wall. Shape written by the render pipeline into
// compliance_record.preview_assets.
interface PreviewAsset {
  path: string;
  kind: 'video' | 'image';
  label: string;
}

function previewAssets(row: MarketingContentRow): PreviewAsset[] {
  const raw = record(row)?.preview_assets;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((a) => {
    if (!a || typeof a !== 'object') return [];
    const o = a as Record<string, unknown>;
    const path = o.path;
    const kind = o.kind;
    const label = o.label;
    if (typeof path !== 'string') return [];
    if (kind !== 'video' && kind !== 'image') return [];
    return [{ path, kind, label: typeof label === 'string' ? label : path }];
  });
}

// Everything the founder needs to actually post the item: play the video, see
// every carousel slide, download any file, and copy the caption and hashtags.
// Rendered for any item that has a preview_assets manifest, at any status --
// review is a real viewing decision, not a leap of faith.
function ReadyToPostPack({ row }: { row: MarketingContentRow }) {
  const assets = previewAssets(row);
  const caption = stringField(row, 'caption');
  const hashtags = stringField(row, 'hashtags');
  const notes = stringField(row, 'preview_text');

  if (assets.length === 0 && !caption && !hashtags && !notes) return null;

  const videos = assets.filter((a) => a.kind === 'video');
  const images = assets.filter((a) => a.kind === 'image');

  return (
    <div className="mt-sm flex flex-col gap-md rounded-md bg-surface2 p-md">
      <p className="type-caption font-medium uppercase tracking-label text-textPrimary">
        Ready to post
      </p>

      {videos.length > 0 ? (
        <div className="flex flex-col gap-sm">
          <p className="type-caption text-textMuted">Video</p>
          <div className="flex flex-wrap gap-md">
            {videos.map((v) => (
              <div key={v.path} className="flex flex-col gap-xs">
                <video
                  src={v.path}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-96 rounded-md border border-borderSubtle bg-black"
                />
                <a
                  href={v.path}
                  download
                  className="type-caption text-primary underline underline-offset-2"
                >
                  Download {v.label}
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="flex flex-col gap-sm">
          <p className="type-caption text-textMuted">
            Carousel ({images.length} {images.length === 1 ? 'slide' : 'slides'})
          </p>
          <div className="flex gap-sm overflow-x-auto pb-xs">
            {images.map((img) => (
              <div key={img.path} className="flex shrink-0 flex-col items-center gap-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.path}
                  alt={img.label}
                  loading="lazy"
                  className="h-72 rounded-md border border-borderSubtle"
                />
                <a
                  href={img.path}
                  download
                  className="type-caption text-primary underline underline-offset-2"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {caption ? (
        <div className="flex flex-col gap-xs">
          <div className="flex items-center justify-between gap-sm">
            <p className="type-caption text-textMuted">Caption</p>
            <CopyButton text={caption} label="Copy caption" />
          </div>
          <pre className="select-text whitespace-pre-wrap break-words rounded-sm bg-surface p-sm type-caption text-textPrimary">
            {caption}
          </pre>
        </div>
      ) : null}

      {hashtags ? (
        <div className="flex flex-col gap-xs">
          <div className="flex items-center justify-between gap-sm">
            <p className="type-caption text-textMuted">Hashtags</p>
            <CopyButton text={hashtags} label="Copy hashtags" />
          </div>
          <pre className="select-text whitespace-pre-wrap break-words rounded-sm bg-surface p-sm type-caption text-textPrimary">
            {hashtags}
          </pre>
        </div>
      ) : null}

      {notes ? (
        <details className="flex flex-col gap-xs">
          <summary className="cursor-pointer type-caption text-textMuted">
            Full script and notes
          </summary>
          <pre className="mt-xs max-h-96 select-text overflow-y-auto whitespace-pre-wrap break-words rounded-sm bg-surface p-sm type-caption text-textPrimary">
            {notes}
          </pre>
        </details>
      ) : null}
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
