/**
 * existing.js -- D222 phase 8: people already on plans.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/25-PHASE8-EXISTING-PLANS-SPEC.md
 * (R90 to R97). Pure helpers for planRebuild's run (no I/O, deterministic):
 *
 *   isAuthoredFacts(facts)         R91: an authored plan (D227) is never moved
 *   isEnginePlanFacts(facts)       R90: a plan the structure engine built
 *   exerciseChanges(...)           R92: kept, swapped, added and removed, by
 *                                  name, from the plan's rows and the engine's
 *                                  week
 *   previousFactsOf(facts, rows)   R96: the facts kept under `facts.previous`
 *                                  (one level)
 *   NEEDS_CHOICE                   R94: the state reason
 *   checkFixedPlanOnce(...)        R95: the general checks, once per plan
 *                                  version
 */
import { checkFixedPlan } from './stored';
import { isStructureFacts } from './serve';

/** R94: the state reason recorded when a rebuild would need a choice. */
export const NEEDS_CHOICE = 'needs_choice';

/** R91: an authored plan (facts.kind === 'authored', D227). */
export const isAuthoredFacts = (facts) => !!facts && typeof facts === 'object' && facts.kind === 'authored';

/** R90: a plan the structure engine built (structure.version === 3). */
export const isEnginePlanFacts = (facts) => facts?.structure?.version === 3;

/**
 * R92: what the engine's week did to the exercises the person has, by name.
 * An exercise is KEPT when the same exercise (by id) is anywhere in the new
 * plan; the exercises that are not kept leave, and the new ones that were not
 * there arrive; a leaving and an arriving exercise of the same muscle are a
 * SWAP (in order), the rest are removed or added.
 *
 * @param {Array<Array<{ exerciseId: string, name: string, muscle: ?string }>>} before  per session, the plan's rows
 * @param {Array<Array<{ exerciseId: string, name: string, muscle: ?string }>>} after   per session, the engine's rows
 * @returns {{ kept: string[], replaced: Array<{ from: string, to: string }>, removed: string[], added: string[] }}
 */
export function exerciseChanges(before, after) {
  const flat = (sessions) => (Array.isArray(sessions) ? sessions : []).flatMap((s) => (Array.isArray(s) ? s : []));
  const unique = (rows) => {
    const seen = new Set();
    return rows.filter((r) => r && r.exerciseId != null && !seen.has(r.exerciseId) && seen.add(r.exerciseId));
  };
  const old = unique(flat(before));
  const now = unique(flat(after));
  const nowIds = new Set(now.map((r) => r.exerciseId));
  const oldIds = new Set(old.map((r) => r.exerciseId));
  const kept = old.filter((r) => nowIds.has(r.exerciseId)).map((r) => r.name);
  const gone = old.filter((r) => !nowIds.has(r.exerciseId));
  const arrived = now.filter((r) => !oldIds.has(r.exerciseId));
  const replaced = [];
  const removed = [];
  const taken = new Set();
  for (const g of gone) {
    const i = arrived.findIndex((a, j) => !taken.has(j) && g.muscle != null && a.muscle === g.muscle);
    if (i >= 0) {
      taken.add(i);
      replaced.push({ from: g.name, to: arrived[i].name });
    } else {
      removed.push(g.name);
    }
  }
  const added = arrived.filter((_, j) => !taken.has(j)).map((a) => a.name);
  return { kept, replaced, removed, added };
}

/**
 * R96: the facts kept under `facts.previous`, one level only: the old plan's
 * facts without their own `previous`; a plan with no facts leaves its
 * sessions' exercise names so support can still see what it was.
 * @param {?object} facts
 * @param {Array<{ name: string, exercises: string[] }>} sessions
 */
export function previousFactsOf(facts, sessions) {
  if (facts && typeof facts === 'object') {
    const { previous: _drop, ...rest } = facts; // eslint-disable-line no-unused-vars
    return JSON.parse(JSON.stringify(rest));
  }
  return { version: null, sessions: Array.isArray(sessions) ? sessions : [] };
}

// ── R95: the general checks, once per plan version ────────────────────────

const checked = new Map(); // plan key -> { signature, faults }

/** Test seam. */
export function __resetFixedChecksForTests() { checked.clear(); }

/**
 * R95: a hand-built, library or kit plan checked with the checks that apply to
 * any plan (stored.checkFixedPlan), ONCE per plan version: the version is the
 * plan as stored (its sessions, exercises and set counts), so the check runs
 * again only when the plan changed. Never a change to the plan. An engine plan
 * (checked after every change by phase 7) and an authored plan (R91: its
 * departures are recorded exceptions, D227) have nothing to check here.
 * @param {string} planKey
 * @param {?object} facts  the plan's facts
 * @param {Array<{ key: string, name?: string, rows: Array<object> }>} sessions
 * @returns {object[]} the hard faults, possibly none
 */
export function checkFixedPlanOnce(planKey, facts, sessions) {
  if (isStructureFacts(facts) || isAuthoredFacts(facts)) return [];
  const signature = JSON.stringify((sessions || []).map((s) => [
    s.key, (s.rows || []).map((r) => [r?.routineExercise?.exerciseId ?? null, r?.routineExercise?.recommendedSets ?? null, r?.routineExercise?.groupKind ?? null]),
  ]));
  const hit = checked.get(planKey);
  if (hit && hit.signature === signature) return hit.faults;
  const faults = checkFixedPlan(sessions);
  checked.set(planKey, { signature, faults });
  return faults;
}
