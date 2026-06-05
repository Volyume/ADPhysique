import { Card, CardTitle } from '@volyume/ui';
import type { PlanSummary } from '@volyume/supabase';

export function ActivePlanCard({ plan }: { plan: PlanSummary | null }) {
  return (
    <Card>
      <CardTitle>Plan</CardTitle>
      {plan?.name ? (
        <>
          <p className="mt-xs type-h3 text-textPrimary">{plan.name}</p>
          {plan.weekOf != null && plan.totalWeeks != null ? (
            <p className="mt-xs type-body tnum text-textSecondary">
              Week {plan.weekOf} of {plan.totalWeeks}
              {plan.phase ? ` · ${plan.phase}` : ''}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-sm type-body text-textMuted">No active plan.</p>
      )}
    </Card>
  );
}
