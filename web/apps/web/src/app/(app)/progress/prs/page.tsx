import { requireUser } from '@/lib/auth';
import { createServerSupabase } from '@volyume/supabase/server';
import { getPRs } from '@volyume/supabase';
import { isoDaysAgo, ukShortDate } from '@/lib/dates';
import { fmtKg } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PRsPage() {
  const user = await requireUser();
  const supabase = createServerSupabase();
  const prs = await getPRs(supabase, user.id, isoDaysAgo(365));

  if (prs.length === 0) {
    return <p className="type-body text-textMuted">No lifts logged in the last year.</p>;
  }

  return (
    <section>
      <p className="type-label uppercase tracking-label text-textSecondary">
        Best estimated 1RM, last 12 months
      </p>
      <table className="mt-lg w-full border-collapse">
        <thead>
          <tr className="border-b border-borderSubtle text-left">
            <th className="py-sm pr-md type-label font-medium text-textSecondary">Lift</th>
            <th className="py-sm px-md type-label font-medium text-textSecondary text-right">Est. 1RM</th>
            <th className="py-sm pl-md type-label font-medium text-textSecondary text-right">When</th>
          </tr>
        </thead>
        <tbody>
          {prs.map((p) => (
            <tr key={p.id} className="border-b border-borderSubtle">
              <td className="py-sm pr-md type-body text-textPrimary">{p.name}</td>
              <td className="py-sm px-md type-body tnum text-right text-textPrimary">{fmtKg(p.e1rm, 0)}</td>
              <td className="py-sm pl-md type-body tnum text-right text-textMuted">
                {Number.isFinite(p.t) ? ukShortDate(p.t) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
