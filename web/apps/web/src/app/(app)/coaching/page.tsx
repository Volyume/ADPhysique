import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getCoachingHistory, type CoachReview } from '@volyume/supabase';
import { ReviewBody } from '@/components/coaching/ReviewBody';
import { ukDisplayDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

function weekLabel(r: CoachReview): string {
  if (r.weekLabel) return r.weekLabel;
  if (Number.isFinite(r.weekStart)) return `Week of ${ukDisplayDate(new Date(r.weekStart))}`;
  return 'Weekly review';
}

export default async function CoachingPage() {
  const user = await requireUser();
  const supabase = createServerSupabase();
  const history = await getCoachingHistory(supabase, user.id);

  if (history.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h2 text-textPrimary">Precision Coaching</h1>
        <p className="mt-lg type-body text-textMuted">
          No weekly reviews yet. Your first one appears after a check-in on the app.
        </p>
      </div>
    );
  }

  const [latest, ...past] = history;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="type-h2 text-textPrimary">Precision Coaching</h1>
      <p className="mt-xs type-label uppercase tracking-label text-textSecondary">{weekLabel(latest!)}</p>

      <div className="mt-xl">
        <ReviewBody review={latest!} />
      </div>

      {past.length ? (
        <section className="mt-xxl">
          <h2 className="type-h3 text-textPrimary">Decision history</h2>
          <div className="mt-lg flex flex-col gap-sm">
            {past.map((r) => (
              <details key={r.weekStart} className="rounded-md border border-borderSubtle bg-surface p-md">
                <summary className="cursor-pointer list-none">
                  <span className="type-bodyStrong font-semibold text-textPrimary">{weekLabel(r)}</span>
                  {r.whyThisWeek ? (
                    <span className="mt-hair block truncate type-caption text-textMuted">{r.whyThisWeek}</span>
                  ) : null}
                </summary>
                <div className="mt-lg border-t border-borderSubtle pt-lg">
                  <ReviewBody review={r} />
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
