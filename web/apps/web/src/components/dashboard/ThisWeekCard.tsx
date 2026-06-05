import { Card, CardTitle, Sparkline } from '@volyume/ui';
import type { ThisWeekSummary } from '@volyume/supabase';

export function ThisWeekCard({ thisWeek }: { thisWeek: ThisWeekSummary | null }) {
  const sessions = thisWeek?.sessionsDone ?? 0;
  const hasVolume = (thisWeek?.volumeSeries.length ?? 0) >= 2;
  return (
    <Card>
      <CardTitle>This week</CardTitle>
      <p className="mt-xs type-h2 tnum text-textPrimary">
        {sessions}
        <span className="ml-xs type-body font-normal text-textSecondary">
          {sessions === 1 ? 'session' : 'sessions'}
        </span>
      </p>
      {thisWeek?.lastSessionName ? (
        <p className="mt-xs type-body text-textSecondary">Last: {thisWeek.lastSessionName}</p>
      ) : null}
      {hasVolume ? (
        <Sparkline values={thisWeek!.volumeSeries} width={180} height={36} className="mt-md" />
      ) : null}
    </Card>
  );
}
