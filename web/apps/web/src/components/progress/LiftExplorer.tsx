'use client';

import { useState } from 'react';
import { LineChart } from '@volyume/ui';
import type { LiftProgress } from '@volyume/supabase';
import { ukShortDate } from '@/lib/dates';

// Lift selector + the estimated-1RM curve for the chosen lift. Lifts arrive
// sorted by how much history they have, so the default is the most-trained one.
export function LiftExplorer({ lifts }: { lifts: LiftProgress[] }) {
  const [id, setId] = useState(lifts[0]?.id ?? '');
  const lift = lifts.find((l) => l.id === id) ?? lifts[0];

  if (!lift) {
    return <p className="type-body text-textMuted">No lifts logged yet.</p>;
  }

  return (
    <section>
      <label className="flex flex-col gap-xs">
        <span className="type-label uppercase tracking-label text-textSecondary">Lift</span>
        <select
          value={lift.id}
          onChange={(e) => setId(e.target.value)}
          className="max-w-sm rounded-md border border-borderSubtle bg-inputBg px-md py-sm type-body text-textPrimary outline-none focus:border-primary"
        >
          {lifts.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.series.length})
            </option>
          ))}
        </select>
      </label>

      <p className="mt-lg type-label uppercase tracking-label text-textSecondary">Estimated 1RM</p>
      {lift.series.length >= 2 ? (
        <div className="mt-sm overflow-x-auto">
          <LineChart
            width={760}
            height={320}
            series={[{ points: lift.series.map((p) => ({ t: p.t, v: p.e1rm })), color: 'var(--c-chartLine)', fill: 'var(--c-chartFill)' }]}
            formatY={(n) => `${Math.round(n)}`}
            formatX={ukShortDate}
          />
        </div>
      ) : (
        <p className="mt-sm type-body text-textMuted">Only one session logged for this lift so far.</p>
      )}
    </section>
  );
}
