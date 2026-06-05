import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getActivePlan, MUSCLE_DISPLAY_NAMES } from '@volyume/supabase';
import { Card } from '@volyume/ui';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const user = await requireUser();
  const supabase = createServerSupabase();
  const plan = await getActivePlan(supabase, user.id);

  if (!plan) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="type-h2 text-textPrimary">Plan</h1>
        <p className="mt-lg type-body text-textMuted">No active plan. Build one on the app.</p>
      </div>
    );
  }

  const m = plan.mesocycle;
  const mesoLine = m
    ? [
        m.weekOf != null && m.totalWeeks != null ? `Week ${m.weekOf} of ${m.totalWeeks}` : null,
        m.focus,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="type-h2 text-textPrimary">{plan.programmeName}</h1>
      {mesoLine ? <p className="mt-xs type-label uppercase tracking-label text-textSecondary">{mesoLine}</p> : null}

      {plan.description ? (
        <p className="mt-lg max-w-[70ch] type-body leading-relaxed text-textSecondary">{plan.description}</p>
      ) : null}

      <div className="mt-xl flex flex-col gap-lg">
        {plan.days.map((day) => (
          <Card key={day.id}>
            <div className="flex items-baseline justify-between gap-md">
              <h2 className="type-h3 text-textPrimary">{day.name}</h2>
              {day.splitType ? <span className="type-caption text-textMuted">{day.splitType}</span> : null}
            </div>

            {day.exercises.length ? (
              <ul className="mt-md flex flex-col">
                {day.exercises.map((ex, i) => (
                  <li
                    key={`${ex.id}-${i}`}
                    className="flex items-baseline justify-between gap-md border-t border-borderSubtle py-sm first:border-t-0"
                  >
                    <div className="min-w-0">
                      <p className="type-body text-textPrimary">{ex.name}</p>
                      {ex.primary ? (
                        <p className="type-caption text-textMuted">
                          {MUSCLE_DISPLAY_NAMES[ex.primary] ?? ex.primary}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 type-body tnum text-textSecondary">
                      {ex.sets} × {ex.repMin}
                      {ex.repMax && ex.repMax !== ex.repMin ? `-${ex.repMax}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-sm type-body text-textMuted">No exercises on this day.</p>
            )}
          </Card>
        ))}
      </div>

      <p className="mt-lg type-caption text-textMuted">
        Logging a workout happens on the app. This is your plan to read and review.
      </p>
    </div>
  );
}
