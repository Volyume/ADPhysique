/**
 * firstReviewLine — Campaign 22 Phase 2, Stage 2.
 *
 * HOME-TODAY-UX-SPEC.md §9 (the first-review/insufficient-evidence ruling)
 * and §17 region R4 (the Evidence Row); FOUNDER-RULINGS-PHASE2.md ruling R2
 * ("YES... real UNCLAMPED evidence requirements... self-retiring... one tap
 * to the detailed You/readiness surface").
 *
 * THE CONTRACT. A single, honest, self-retiring one-line surface, Pro and
 * pre-first-weekly-review only, that names a REAL missing input -- never a
 * clamped "3 of 3" gate-plumbing display (the exact defect the founder named
 * and the Today truth repair removed). This module REUSES the derivation
 * the You tab already consumes for the same question
 * (`buildCoachLedger`, src/lib/coachLedger.js) -- it does not re-derive the
 * first-review gate. What it does NOT reuse is `buildCoachLedger`'s row
 * LABELS: those are `Math.min(weighIns7d, MIN_WEIGH_INS)` clamped, correct
 * for a threshold ledger's own display, wrong for this line's job (a real
 * countdown). So this module writes its own single sentence from the
 * ledger's `done` booleans plus `weighInsNeeded` (trialActivation.js's own
 * unclamped remaining-count helper, the single source of truth for that
 * sum) -- never from a ledger row's `label`.
 *
 * PURE, no I/O, no React. HomeScreen gathers the facts (mirroring the same
 * Monday-anchored weigh-in window and coach-ledger inputs the You tab
 * already computes); this module only decides the text, or null.
 */
import { buildCoachLedger } from '../coachLedger';
import { weighInsNeeded } from '../trialActivation';

/** @typedef {{text:string, accessibilityLabel:string}} FirstReviewLineItem */

/**
 * @param {object} facts
 * @param {'free'|'pro'} facts.tier
 * @param {boolean} [facts.hasCompletedFirstReview] - true once a completed
 *   coach decision exists (`isCompletedCoachDecision`); self-retires the
 *   line for good once true.
 * @param {number} [facts.weighIns7d] - distinct mornings weighed in the
 *   trailing Monday-anchored week (the same count the You tab and the
 *   weekly check-in gate read).
 * @param {number|null} [facts.firstWeightAt] - epoch ms of the earliest
 *   morning weight, or null.
 * @param {number} [facts.checkinDay] - 0=Sunday … 6=Saturday.
 * @param {boolean} [facts.edFlagOpen] - open ED-pattern flag or a failed
 *   flag/wellbeing read; weight-adjacent, so it suppresses the whole line
 *   (fail closed -- CLAUDE.md: never weaken ED-safety suppression).
 * @param {number} [facts.completedSessions] - completed workouts, all time.
 * @param {number} [facts.now] - epoch ms, injectable for tests; defaults to
 *   Date.now() and threads straight through to buildCoachLedger so this
 *   module never reads the clock a second, independent way.
 * @returns {FirstReviewLineItem|null}
 */
export function resolveFirstReviewLine({
  tier,
  hasCompletedFirstReview = false,
  weighIns7d = 0,
  firstWeightAt = null,
  checkinDay = 0,
  edFlagOpen = false,
  completedSessions = 0,
  now = Date.now(),
} = {}) {
  if (tier !== 'pro' || hasCompletedFirstReview) return null;

  const ledger = buildCoachLedger({
    weighIns7d, completedSessions, firstWeightAt, checkinDay, edFlagOpen, now,
  });
  // ED-safety: the neutral variant has nothing nameable without a weigh-in
  // count to cite, so the line stays silent rather than inventing a
  // substitute -- never weaken the suppression by working around it.
  if (ledger.variant !== 'full') return null;

  const weighInsRow = ledger.rows.find((r) => r.key === 'weighIns');
  const daysRow = ledger.rows.find((r) => r.key === 'days');
  // Both gates already met: nothing left to name. The weekly check-in
  // ready-state is the Today line's job (rank 4), not this row's.
  if (weighInsRow?.done && daysRow?.done) return null;

  if (!weighInsRow?.done) {
    const remaining = weighInsNeeded(weighIns7d);
    const word = remaining === 1 ? 'weigh-in' : 'weigh-ins';
    const text = `First review: ${remaining} more morning ${word}.`;
    return { text, accessibilityLabel: `${text} See your readiness.` };
  }

  // Weigh-ins are satisfied; only the day-count gate remains.
  if (ledger.unlockLabel) {
    const text = `First review ready ${ledger.unlockLabel}.`;
    return { text, accessibilityLabel: `${text} See your readiness.` };
  }
  return null;
}

export default resolveFirstReviewLine;
