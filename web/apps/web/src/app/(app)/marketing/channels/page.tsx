import { createServerSupabase } from '@volyume/supabase/server';
import { Card, StatusDot } from '@volyume/ui';
import { requireMarketingAdmin } from '@/lib/marketing/auth';
import { getChannels } from '@/lib/marketing/queries';

export const dynamic = 'force-dynamic';

// status -> StatusDot tone, using only the tones StatusDot already supports.
// live reads positive; pending_approval is genuinely in-between so it reads
// neutral; paused and not_created both read off (the channel is not posting).
const STATUS_TONE: Record<string, 'on' | 'off' | 'neutral'> = {
  live: 'on',
  pending_approval: 'neutral',
  paused: 'off',
  not_created: 'off',
};

const STATUS_LABELS: Record<string, string> = {
  live: 'Live',
  pending_approval: 'Pending approval',
  paused: 'Paused',
  not_created: 'Not created',
};

const CAPABILITY_LABELS: Record<string, string> = {
  manual: 'Manual',
  founder_tap: 'Founder tap',
  autonomous: 'Autonomous',
};

export default async function MarketingChannelsPage() {
  await requireMarketingAdmin();
  const supabase = await createServerSupabase();
  const channels = await getChannels(supabase);

  return (
    <div>
      <Card>
        {channels.length === 0 ? (
          <p className="type-caption text-textMuted">
            No channel rows found. marketing_channels holds one row per marketing channel and is
            seeded by an agent job; an empty result here means either that seed has not run against
            this environment, or this session&rsquo;s email is not in marketing_admins so RLS is
            returning zero rows.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left type-body">
              <thead>
                <tr className="type-caption uppercase tracking-label text-textSecondary">
                  <th className="px-sm py-xs">Channel</th>
                  <th className="px-sm py-xs">Status</th>
                  <th className="px-sm py-xs">Capability</th>
                  <th className="px-sm py-xs">Account</th>
                  <th className="px-sm py-xs">Notes</th>
                  <th className="px-sm py-xs">Updated</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((row) => (
                  <tr key={row.id} className="border-t border-borderSubtle">
                    <td className="px-sm py-sm font-medium text-textPrimary">{row.channel}</td>
                    <td className="px-sm py-sm">
                      <span className="inline-flex items-center gap-sm">
                        <StatusDot tone={STATUS_TONE[row.status] ?? 'neutral'} />
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-sm py-sm">{CAPABILITY_LABELS[row.capability] ?? row.capability}</td>
                    <td className="px-sm py-sm">{row.account_ref ?? '-'}</td>
                    <td className="px-sm py-sm type-caption text-textMuted">{row.notes ?? '-'}</td>
                    <td className="px-sm py-sm type-caption text-textMuted">
                      {new Date(row.updated_at).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
