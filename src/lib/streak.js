/**
 * streak.js — the pure "weeks running" derivation (COMP-018).
 *
 * The streak is a pure function over already-gathered weekly facts, never an
 * incremented counter: recompute from local data on view, so it is
 * offline-correct, self-healing when a late session syncs, and the exact
 * per-week object NEW-002's partner view will consume. No DB, no side effects,
 * fully unit-tested.
 *
 * Design rules from the blueprint, all enforced here:
 *  - The current week is never judged (it can't "fail"): it is 'in-progress'.
 *  - A week is KEPT when completed >= target. The plan (or the user's own
 *    goal) sets the target; with no target the feature stays in session-count
 *    mode and shows no run number.
 *  - Engine-prescribed deload weeks are 'resting' and keep the run, even with
 *    zero sessions — recovery is compliance, never a miss.
 *  - A single sub-target week sandwiched between keeping weeks is 'repaired'
 *    (bridged) automatically when the next week is kept; capped at one repair
 *    per rolling 6 weeks. A second miss in the window lapses the run quietly.
 *  - An open ED/wellbeing flag freezes the run benignly (every week reads
 *    'resting') and flags `suppressed` so the UI hides the number entirely.
 *  - Lapsing is an absence, never a shown state: the run number just stops.
 */

// States that keep a run alive.
const KEEPING = new Set(['kept', 'resting', 'paused', 'repaired']);
const REPAIR_WINDOW = 6; // at most one repaired week per rolling 6 weeks

function hasTarget(w) {
  return w && Number.isFinite(w.target) && w.target > 0;
}

// Base label before the repair pass. `weeks` carry the gathered facts:
// { weekKey, completed, target, isDeload, paused, isCurrent }.
function labelBase(w, edSuppressed) {
  if (w.isCurrent) return 'in-progress';
  if (edSuppressed) return 'resting';          // benign freeze while flagged
  if (w.paused) return 'paused';
  if (w.isDeload) return 'resting';
  if (hasTarget(w) && w.completed >= w.target) return 'kept';
  return 'missed';
}

// Bridge a lone sub-target week when the comeback lands, oldest-first so the
// rolling-6 cap is tracked correctly. A missed week is repaired only if the
// previous week kept the run AND the following (already-finished) week keeps
// it AND no repair has happened in the previous 6 weeks.
function applyRepair(labelled) {
  let lastRepaired = -Infinity;
  for (let i = 0; i < labelled.length; i++) {
    if (labelled[i].state !== 'missed') continue;
    const prev = labelled[i - 1];
    const next = labelled[i + 1];
    const prevKeeps = prev && KEEPING.has(prev.state);
    const nextKeeps = next && KEEPING.has(next.state); // the comeback; never in-progress
    if (prevKeeps && nextKeeps && (i - lastRepaired) >= REPAIR_WINDOW) {
      labelled[i].state = 'repaired';
      lastRepaired = i;
    }
  }
}

/**
 * @param {object} input
 * @param {Array}  input.weeks  oldest-first, each { weekKey, completed, target, isDeload, paused, isCurrent }
 * @param {boolean} input.edSuppressed  open ED/wellbeing flag
 * @returns {{ weeks: Array, runLength: ?number, current: ?object, suppressed: boolean }}
 */
export function computeStreak({ weeks = [], edSuppressed = false } = {}) {
  const labelled = (Array.isArray(weeks) ? weeks : []).map((w) => ({
    ...w,
    state: labelBase(w, edSuppressed),
  }));
  applyRepair(labelled);

  // Run length counts finished weeks newest-first; the in-progress current
  // week is excluded from judgement.
  const finished = labelled.filter((w) => w.state !== 'in-progress');
  let run = 0;
  for (let i = finished.length - 1; i >= 0; i--) {
    if (KEEPING.has(finished[i].state)) run += 1;
    else break;
  }

  const current = labelled.find((w) => w.isCurrent) ?? null;
  // With no target on the current week the feature is in session-count mode:
  // show what was done this week, but no run number.
  const runLength = hasTarget(current) ? run : null;

  return { weeks: labelled, runLength, current, suppressed: !!edSuppressed };
}
