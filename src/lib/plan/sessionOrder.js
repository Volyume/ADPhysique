/**
 * sessionOrder.js -- D219: the order of exercises inside a session (design
 * 4.8, docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md;
 * S F9).
 *
 * Order inside a session does not change growth, but it favours the
 * strength and volume of whatever comes first [A], so:
 *   1. the focus muscle's exercises first;
 *   2. multi-joint before single-joint;
 *   3. heavier free-weight compounds before machine compounds;
 *   4. the session's muscles in their priority order (role weight, then the
 *      plan's muscle order);
 *   5. a muscle's first choice before its second.
 * Today there is no compound-first pass and calves can come before the
 * chest presses (R1 5.2). Pure and deterministic.
 */
import { ROLE } from './bands';
import { PLAN_MUSCLES } from './roles';

const KIND_RANK = Object.freeze({ heavy_compound: 0, mod_compound: 1, machine: 2, isolation: 3 });

/**
 * @param {Array<{ muscle: string, kind: string, choiceIndex?: number }>} slots  one session's exercises
 * @param {Object<string, { role: string, weight: number }>} roles
 * @returns {Array} the same slots, sorted (a new array)
 */
export function orderSession(slots, roles) {
  const muscleIndex = (m) => {
    const i = PLAN_MUSCLES.indexOf(m);
    return i < 0 ? PLAN_MUSCLES.length : i;
  };
  return slots
    .map((slot, i) => ({ slot, i }))
    .sort((a, b) => {
      const ra = roles?.[a.slot.muscle];
      const rb = roles?.[b.slot.muscle];
      const fa = ra?.role === ROLE.FOCUS ? 0 : 1;
      const fb = rb?.role === ROLE.FOCUS ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const ja = a.slot.kind === 'isolation' ? 1 : 0;
      const jb = b.slot.kind === 'isolation' ? 1 : 0;
      if (ja !== jb) return ja - jb;
      const ka = KIND_RANK[a.slot.kind] ?? 2;
      const kb = KIND_RANK[b.slot.kind] ?? 2;
      if (ka !== kb) return ka - kb;
      const wa = ra?.weight ?? 1;
      const wb = rb?.weight ?? 1;
      if (wa !== wb) return wb - wa;
      const ma = muscleIndex(a.slot.muscle);
      const mb = muscleIndex(b.slot.muscle);
      if (ma !== mb) return ma - mb;
      const ca = a.slot.choiceIndex ?? 0;
      const cb = b.slot.choiceIndex ?? 0;
      if (ca !== cb) return ca - cb;
      return a.i - b.i;
    })
    .map(({ slot }) => slot);
}
