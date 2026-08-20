/**
 * capability/planCompat.js - capability-COMPUTED library-plan
 * compatibility (CC28; ARCHITECTURE section 9.2.5).
 *
 * A plan's compatibility is computed from its CONTENTS against the user's
 * live capability state - there are no curated capability tags to rot
 * (A section 10.6 showed tags would not even survive installation). Pure
 * questions over rows the caller loads; the single loader here batches
 * the whole library's contents in one read.
 *
 * The verdict per plan is three honest numbers, never a score:
 *   compatible  rows the user can be offered (section 4.1 ranks 2-4 pass)
 *   conflicts   rows a definite rule blocks (clinician or declared)
 *   unknowns    rows blocked only because an axis is UNKNOWN (CAP-8)
 * A plan with conflicts+unknowns === 0 is fully compatible. Discovery
 * chips read `fullyCompatible`; the install flow walks `rows` for the
 * section 9.4 conflict/substitution surfacing (A section 11.8 fix).
 */
import { capabilityBlockReason, CAPABILITY_BLOCK } from './resolve';

/**
 * Compatibility of ONE plan's exercise rows against the state. Pure.
 *
 * @param {object|null} state the resolver state
 * @param {Array} exerciseRows the plan's exercises (library-row shape)
 * @returns {{total: number, compatible: number, conflicts: Array,
 *           unknowns: Array, fullyCompatible: boolean}}
 */
export function computePlanCompatibility(state, exerciseRows) {
  const rows = Array.isArray(exerciseRows) ? exerciseRows : [];
  const out = {
    total: rows.length, compatible: 0, conflicts: [], unknowns: [], fullyCompatible: true,
  };
  if (!state || state.empty) {
    out.compatible = rows.length;
    return out;
  }
  for (const row of rows) {
    const reason = capabilityBlockReason(state, row);
    if (reason === null) out.compatible += 1;
    else if (reason === CAPABILITY_BLOCK.UNKNOWN) out.unknowns.push({ row, reason });
    else out.conflicts.push({ row, reason });
  }
  out.fullyCompatible = out.conflicts.length === 0 && out.unknowns.length === 0;
  return out;
}

/**
 * Compatibility for EVERY library plan at once. The loader reads the
 * whole library's contents in one query (database.getLibraryPlanExerciseRows)
 * and the computation stays pure per plan.
 *
 * @returns {Promise<Map<string, ReturnType<typeof computePlanCompatibility>>>}
 *   keyed by programme id; empty Map when the read fails (callers render
 *   without chips rather than guessing).
 */
export async function computeLibraryCompatibility(state) {
  try {
    // eslint-disable-next-line global-require
    const { getLibraryPlanExerciseRows } = require('../database');
    const rows = await getLibraryPlanExerciseRows();
    const byPlan = new Map();
    for (const r of rows ?? []) {
      if (!byPlan.has(r.programmeId)) byPlan.set(r.programmeId, []);
      byPlan.get(r.programmeId).push(r);
    }
    const out = new Map();
    for (const [planId, exs] of byPlan) {
      out.set(planId, computePlanCompatibility(state, exs));
    }
    return out;
  } catch (_e) {
    return new Map();
  }
}
