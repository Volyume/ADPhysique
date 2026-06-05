import { Card, CardTitle } from '@volyume/ui';
import type { CoachingSummary } from '@volyume/supabase';

export function CoachingStrip({ coaching }: { coaching: CoachingSummary | null }) {
  const headline = coaching?.headline ?? coaching?.whyThis ?? null;
  return (
    <Card>
      <CardTitle>Precision Coaching</CardTitle>
      {headline ? (
        <p className="mt-xs type-body text-textPrimary">{headline}</p>
      ) : (
        <p className="mt-sm type-body text-textMuted">No weekly review yet.</p>
      )}
    </Card>
  );
}
