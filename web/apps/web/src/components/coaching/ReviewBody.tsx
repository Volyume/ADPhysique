import type { CoachReview } from '@volyume/supabase';
import { fmtInt } from '@/lib/format';

function AdjLine({ label, note, value }: { label: string; note: string; value?: string }) {
  return (
    <div className="flex flex-col gap-hair">
      <div className="flex items-baseline justify-between gap-md">
        <span className="type-bodyStrong font-semibold text-textPrimary">{label}</span>
        {value ? <span className="type-body tnum text-primary">{value}</span> : null}
      </div>
      <p className="type-body text-textSecondary">{note}</p>
    </div>
  );
}

function Callout({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-md border border-borderSubtle bg-surface2 p-md">
      <p className="type-label uppercase tracking-label text-primary">{label}</p>
      <p className="mt-xs type-body text-textPrimary">{note}</p>
    </div>
  );
}

// One weekly review, used both for the latest (expanded) and each history entry.
export function ReviewBody({ review }: { review: CoachReview }) {
  const a = review.adjustments;
  const calValue =
    a.calories?.change != null ? `${a.calories.change > 0 ? '+' : ''}${fmtInt(a.calories.change)} kcal` : undefined;
  const stepValue = a.steps?.target != null ? `${fmtInt(a.steps.target)}/day` : undefined;

  return (
    <div className="flex flex-col gap-lg">
      {review.trend?.rateLabel ? (
        <p className="type-body text-textSecondary">
          Trend: <span className="tnum text-textPrimary">{review.trend.rateLabel}</span>
          {review.trend.onTarget != null ? (
            <span className="text-textMuted"> ({review.trend.onTarget ? 'on target' : 'off target'})</span>
          ) : null}
        </p>
      ) : null}

      {review.whatWorking.length ? (
        <div>
          <p className="type-label uppercase tracking-label text-textSecondary">What is working</p>
          <ul className="mt-xs flex flex-col gap-xs">
            {review.whatWorking.map((w, i) => (
              <li key={i} className="type-body text-textPrimary">
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="type-label uppercase tracking-label text-textSecondary">Adjustments</p>
        <div className="mt-sm flex flex-col gap-md">
          {a.training?.note ? <AdjLine label="Training" note={a.training.note} /> : null}
          {a.calories?.note ? <AdjLine label="Calories" note={a.calories.note} value={calValue} /> : null}
          {a.steps?.note ? <AdjLine label="Steps" note={a.steps.note} value={stepValue} /> : null}
          {a.cardio?.note ? <AdjLine label={a.cardio.type ?? 'Cardio'} note={a.cardio.note} /> : null}
          {!a.training?.note && !a.calories?.note && !a.steps?.note && !a.cardio?.note ? (
            <p className="type-body text-textMuted">No changes this week.</p>
          ) : null}
        </div>
      </div>

      {review.deloadSuggested && review.deloadNote ? <Callout label="Deload" note={review.deloadNote} /> : null}
      {review.dietBreakSuggested && review.dietBreakNote ? (
        <Callout label="Diet break" note={review.dietBreakNote} />
      ) : null}

      {review.whyThisWeek ? (
        <div>
          <p className="type-label uppercase tracking-label text-textSecondary">Why this week</p>
          <p className="mt-xs max-w-[70ch] type-body leading-relaxed text-textPrimary">{review.whyThisWeek}</p>
        </div>
      ) : null}
    </div>
  );
}
