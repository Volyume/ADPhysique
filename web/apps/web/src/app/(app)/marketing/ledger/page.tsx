import Link from 'next/link';
import { createServerSupabase } from '@volyume/supabase/server';
import { Card, StatusDot } from '@volyume/ui';
import { requireMarketingAdmin } from '@/lib/marketing/auth';
import { getLedgerPage } from '@/lib/marketing/queries';

export const dynamic = 'force-dynamic';

// kind -> StatusDot tone, using only the tones StatusDot already supports
// (on/off/neutral -- success/error/muted). publish reads positive, incident
// reads negative; action, decision and note all read neutral, since
// StatusDot has no separate "info" tone to invent one for.
const KIND_TONE: Record<string, 'on' | 'off' | 'neutral'> = {
  action: 'neutral',
  publish: 'on',
  incident: 'off',
  decision: 'neutral',
  note: 'neutral',
};

export default async function MarketingLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireMarketingAdmin();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? '1') || 1);

  const supabase = await createServerSupabase();
  const { rows, hasNextPage } = await getLedgerPage(supabase, page);

  return (
    <div>
      <Card>
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
              {rows.length === 0 ? (
                <tr>
                  <td className="px-sm py-md type-caption text-textMuted" colSpan={5}>
                    No ledger entries yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-md flex items-center gap-md">
        {page > 1 ? (
          <Link className="type-caption text-primary hover:underline" href={`/marketing/ledger?page=${page - 1}`}>
            Previous
          </Link>
        ) : (
          <span className="type-caption text-textDisabled">Previous</span>
        )}
        <span className="type-caption text-textMuted">Page {page}</span>
        {hasNextPage ? (
          <Link className="type-caption text-primary hover:underline" href={`/marketing/ledger?page=${page + 1}`}>
            Next
          </Link>
        ) : (
          <span className="type-caption text-textDisabled">Next</span>
        )}
      </div>
    </div>
  );
}
