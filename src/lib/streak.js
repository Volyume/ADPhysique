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
 * computeWeekState — the single per-week seam (NEW-002 §4.10).
 *
 * The partner view and the solo streak card must read ONE consistency engine.
 * This pure function collapses a week's gathered facts into the small object
 * NEW-002 serialises into `partner_week_signals` and the solo card consumes:
 *   { planned, done, weekMet, state: 'training' | 'resting' }
 *
 * Rules, inherited verbatim from the solo derivation above (no second engine):
 *  - A paused, engine-deload, or ED/wellbeing-suppressed week is 'resting' and
 *    counts as met — recovery is compliance, never a miss, and the partner can
 *    never tell a wellbeing hold from a planned recovery week (the privacy
 *    property in §5: the forgiveness state doubles as the safety state).
 *  - Otherwise the week is 'training' and is met when done >= target.
 *  - With no target the week is 'training' and unmet (session-count mode); the
 *    ticks still carry done/planned so "3 of 4" renders.
 */
export function computeWeekState({
  completed = 0, planned = 0, target = null,
  isDeload = false, paused = false, edSuppressed = false,
} = {}) {
  const done = Math.max(0, Math.round(Number(completed) || 0));
  // planned ticks prefer an explicit planned count, else the target.
  const plannedRaw = Number.isFinite(planned) && planned > 0 ? planned : target;
  const plannedCount = Math.max(0, Math.round(Number(plannedRaw) || 0));
  const resting = !!paused || !!isDeload || !!edSuppressed;
  const hasT = Number.isFinite(target) && target > 0;
  const weekMet = resting ? true : (hasT && done >= target);
  return { planned: plannedCount, done, weekMet, state: resting ? 'resting' : 'training' };
}

/**
 * detectPerfectMonth — a "perfect month" landmark (Phase 2 premium card).
 *
 * The four most-recent FINISHED weeks all kept the run (kept/resting/paused/
 * repaired — a deload or wellbeing rest counts as kept, so recovery never breaks
 * it). Requires at least one genuinely target-meeting week and some real
 * sessions, so an all-rest stretch never reads as a training month.
 *
 * @param {Array} weeks  the labelled weeks from computeStreak (oldest-first)
 * @returns {{ weeks: number, sessions: number, lastWeekKey: string }|null}
 */
export function detectPerfectMonth(weeks = []) {
  // A bridged miss ('repaired') keeps a streak but is NOT a perfect month, so
  // it's excluded here; recovery ('resting'/'paused') still counts as kept.
  const PERFECT = new Set(['kept', 'resting', 'paused']);
  const finished = (Array.isArray(weeks) ? weeks : []).filter((w) => w && w.state !== 'in-progress');
  if (finished.length < 4) return null;
  const last4 = finished.slice(-4);
  if (!last4.every((w) => PERFECT.has(w.state))) return null;
  if (!last4.some((w) => w.state === 'kept')) return null;
  const sessions = last4.reduce((t, w) => t + Math.max(0, Math.round(Number(w.completed) || 0)), 0);
  if (sessions <= 0) return null;
  return { weeks: 4, sessions, lastWeekKey: last4[last4.length - 1].weekKey };
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
