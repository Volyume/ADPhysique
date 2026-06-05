import { Card, CardTitle } from '@volyume/ui';
import type { NutritionSummary } from '@volyume/supabase';
import { fmtInt } from '@/lib/format';

function Line({ label, value, target, unit }: { label: string; value: number | null; target: number | null; unit: string }) {
  return (
    <div className="flex items-baseline justify-between gap-md">
      <span className="type-body text-textSecondary">{label}</span>
      <span className="type-body tnum text-textPrimary">
        {value != null ? fmtInt(value) : '0'}
        {target != null ? <span className="text-textMuted"> / {fmtInt(target)}</span> : null}
        <span className="ml-xs type-caption text-textMuted">{unit}</span>
      </span>
    </div>
  );
}

export function NutritionStrip({ nutrition }: { nutrition: NutritionSummary | null }) {
  return (
    <Card>
      <CardTitle>Today</CardTitle>
      {nutrition && (nutrition.kcalTarget != null || nutrition.kcal != null) ? (
        <div className="mt-xs flex flex-col gap-xs">
          <Line label="Energy" value={nutrition.kcal} target={nutrition.kcalTarget} unit="kcal" />
          <Line label="Protein" value={nutrition.protein} target={nutrition.proteinTarget} unit="g" />
        </div>
      ) : (
        <p className="mt-sm type-body text-textMuted">Nothing logged today.</p>
      )}
    </Card>
  );
}
