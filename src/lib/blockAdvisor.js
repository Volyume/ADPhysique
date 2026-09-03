/**
 * blockAdvisor.js
 *
 * Synthesises performance, readiness, and time signals into a single
 * block-transition recommendation.
 *
 * Design philosophy (from three-report research synthesis):
 *   - A block ending is NOT a programme change. Default is always:
 *     recovery week → same programme, refreshed.
 *   - Programme changes only happen when DATA signals it, not time.
 *   - The hierarchy (least → most disruptive):
 *       1. Continue current block
 *       2. Prepare for recovery week (early heads-up)
 *       3. Enter recovery week now (early deload)
 *       4. After recovery → same programme (default)
 *       5. After recovery → same programme, adjusted loads/volume
 *       6. After recovery → swap exercise variants
 *       7. After recovery → full rebuild (coach-prompted, never auto)
 *   - Deloads are "reloading the gun", performance-enabling, not corrective.
 *   - The Banister fitness-fatigue model is NOT used (no hypertrophy validation).
 *   - All decisions are proposed to the user, never auto-executed.
 *
 * Inputs required:
 *   - recentCheckins: last 8 weekly check-ins (from getRecentCheckins)
 *   - activeBlock:    current mesocycle row (from getActiveBlock)
 *   - userProfile:    { experience, trainingFreq, goal, firstName }
 *   - blockHistory:   array of past blocks for this user (optional, for stagnation)
 */

import { getRecentCheckins } from './database';
import { getBlockStatus, blockCompletionState, BLOCK_COMPLETION } from './mesocycle';
import { planHeadingName } from './planDisplay';
import { structureSignature } from './programmeEpoch';

// ---------------------------------------------------------------------------
// Readiness computation
// ---------------------------------------------------------------------------

/**
 * Maps a single check-in row to a 0–100 readiness score.
 * Higher = better recovered and ready to train hard.
 *
 * energy_score:   1–5  (1=very low, 5=excellent)
 * soreness_score: 1–5  (1=none, 5=very high), inverted
 * sleep_hours:    real, clipped 4–9h range
 */
// Exported (Stage 6, 2026-08-09): blockLedgerRunner computes the block's
// readiness values through THIS formula rather than forking its own.
export function checkinReadiness(c) {
  if (!c) return null;
  // FB-36 (FQ-2, D96): a row that answers NONE of the readiness questions is
  // not a readiness reading. WorkoutSummaryScreen writes a weekly_checkins
  // row carrying only sleepQuality (a different column from sleepHours, and
  // one this formula never reads) whenever the pre-workout sleep question is
  // answered, tier-blind. Under the old defaults that empty row scored
  // exactly 50 - energy and soreness both defaulted to 3 - and 50 was enough
  // to flip the next-block branch, so whether the app offered the adaptive
  // path turned on the presence of a placeholder row rather than on anything
  // the user reported. An evidence-free row now counts as no reading at all,
  // exactly as unknown sleep already does ("unknowns never count"). Any row
  // that answers even one of the three is scored precisely as before.
  if (c.energyScore == null && c.sorenessScore == null && c.sleepHours == null) return null;
  const energy  = (((c.energyScore  ?? 3) - 1) / 4) * 100;           // 0–100
  const soreness = (1 - ((c.sorenessScore ?? 3) - 1) / 4) * 100;     // inverted 0–100
  // Campaign 1 P0-7 D10: sleepHours is OPTIONAL on the check-in, and the
  // old ?? 7 scored the common unknown as a healthy seven hours - which
  // could fabricate an improving readiness slope and remove a strain
  // point real data would have added. Unknown sleep now drops the sleep
  // term and renormalises energy/soreness to 0.5/0.5, so it neither
  // helps nor hurts (countSleepFlaggedWeeks already gets this right:
  // "unknowns never count").
  if (c.sleepHours == null) {
    return energy * 0.5 + soreness * 0.5;
  }
  const sleep = Math.min(Math.max((c.sleepHours - 4) / 5, 0), 1) * 100; // 4–9h → 0–100
  return energy * 0.4 + soreness * 0.4 + sleep * 0.2;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

function zScore(value, baseline) {
  const sd = stdDev(baseline);
  if (sd === 0 || baseline.length < 2) return 0;
  return (value - mean(baseline)) / sd;
}

// ---------------------------------------------------------------------------
// Signal detection
// ---------------------------------------------------------------------------

/**
 * Returns an array of detected signals from check-in history.
 * Each signal: { type, severity: 'info'|'medium'|'high', label, data }
 */
function detectSignals(checkins) {
  const signals = [];
  if (!checkins.length) return signals;

  const latest = checkins[0];
  const recentTwo = checkins.slice(0, 2);

  // ── Acute low energy ──────────────────────────────────────────────────────
  const energy = latest.energyScore ?? 3;
  if (energy <= 1) {
    signals.push({ type: 'energy', severity: 'high', label: 'Very low energy this week', data: energy });
  } else if (energy <= 2) {
    signals.push({ type: 'energy', severity: 'medium', label: 'Energy lower than usual', data: energy });
  }

  // ── Persistent high soreness ──────────────────────────────────────────────
  // "Carrying over" needs TWO consecutive high readings to be true. A single
  // first-ever check-in with high soreness is a snapshot, not a pattern, and
  // shouldn't be labelled as carrying over from anything. Promote to high
  // only when we can actually see the carry-over in the data.
  const soreness = latest.sorenessScore ?? 3;
  const prevSoreness = checkins[1]?.sorenessScore ?? null;
  if (soreness >= 4 && prevSoreness !== null && prevSoreness >= 4) {
    signals.push({ type: 'soreness', severity: 'high', label: 'High soreness carrying over into sessions', data: soreness });
  } else if (soreness >= 4) {
    signals.push({ type: 'soreness', severity: 'medium', label: 'Soreness higher than normal this week', data: soreness });
  }

  // ── Low sleep ─────────────────────────────────────────────────────────────
  const sleep = latest.sleepHours ?? 7;
  if (sleep < 5.5) {
    signals.push({ type: 'sleep', severity: 'high', label: `Sleep averaging ${sleep.toFixed(1)}h. Recovery is compromised.`, data: sleep });
  } else if (sleep < 6.5) {
    signals.push({ type: 'sleep', severity: 'medium', label: 'Sleep below recommended for training recovery', data: sleep });
  }

  // ── Readiness z-score vs. 8-week personal baseline ───────────────────────
  // Use the latest reading vs. weeks 2-8 as the baseline
  const readinessScores = checkins.map(checkinReadiness).filter(r => r !== null);
  const latestR = readinessScores[0];
  const baselineR = readinessScores.slice(2, 8);
  if (latestR !== null && baselineR.length >= 2) {
    const z = zScore(latestR, baselineR);
    if (z <= -1.5) {
      signals.push({ type: 'readiness_drop', severity: 'high', label: 'Readiness well below your personal baseline', data: Math.round(z * 10) / 10 });
    } else if (z <= -1.0) {
      // C6 Phase 7 (D97): the baseline is the last 8 check-in ROWS
      // (getRecentCheckins), not a dated window - for a returning user
      // those rows can be months old, so the label must not call them
      // "recent". "Personal baseline" is what the maths actually is (the
      // high-severity sibling already says so). Copy only; the z-score
      // and thresholds are untouched.
      signals.push({ type: 'readiness_drop', severity: 'medium', label: 'Readiness a bit below your personal baseline', data: Math.round(z * 10) / 10 });
    }
  }

  // ── Consecutive poor check-ins ────────────────────────────────────────────
  const recentPoorCount = recentTwo.filter(c => {
    const r = checkinReadiness(c);
    return r !== null && r < 45;
  }).length;
  if (recentPoorCount >= 2) {
    signals.push({ type: 'sustained_fatigue', severity: 'high', label: 'Recovery has been low for 2 weeks in a row' });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// The next-block decision: two options, always both
// ---------------------------------------------------------------------------

/**
 * FQ-2 (D96, founder ruling 2026-08-10): "At block completion PRO always
 * sees BOTH Repeat and Continue-with-adjustments as side-by-side legitimate
 * choices; the advisor may recommend and explain but never hides, gates or
 * forces ... FREE does not receive adaptive next-block coaching; if the
 * option renders for Free at all it is truthfully Pro-gated through the
 * existing entitlement UX."
 *
 * So the two options are a CONSTANT of the surface, not a function of the
 * advisor's branch. `buildNextBlockOptions` always returns both, always in
 * the same order, and the advisor's recommendation only sets `recommended`
 * on one of them. It can never remove, reorder or gate the other.
 *
 * Tier eligibility comes from the real entitlement (`store.tier === 'pro'`,
 * threaded in as `isPro`), never from the presence or absence of check-in
 * rows - that accidental entitlement was FB-36 and it is gone.
 */
export const NEXT_BLOCK_OPTION_LABELS = {
  repeat: 'Run this plan again, unchanged',
  adjust: 'Continue with adjustments',
};

// D139 (programme creation masterpass, 2026-09-03): the product has no
// tier split (D137, fully free) -- every option has always been reachable
// since then, but these two fields still derived their value from `isPro`,
// which meant a Free caller still saw `locked: true` / `requiresPro: true`
// on the adjust option and its detail line still read "Part of Pro. ...".
// Both fields are kept (some callers still read them) but are now pinned to
// the free-for-all state via this constant rather than derived from tier.
const NEXT_BLOCK_OPTION_GATING = Object.freeze({ requiresPro: false, locked: false });

export function buildNextBlockOptions({ recommendation = null, isPro = false } = {}) {
  return [
    {
      intent: 'repeat',
      label: NEXT_BLOCK_OPTION_LABELS.repeat,
      // A true repeat: the next block is seeded with this block's own
      // observed start and planned peak (blockSeed's intent === 'repeat').
      detail: 'Same workouts, and the same weekly set targets as last time.',
      ...NEXT_BLOCK_OPTION_GATING,
      recommended: isPro && recommendation === 'repeat',
    },
    {
      intent: 'adjust',
      label: NEXT_BLOCK_OPTION_LABELS.adjust,
      // D139: the free-tier "Part of Pro. ..." variant is dead copy on a
      // fully free product -- this is the only detail line now.
      detail: 'Same workouts, with next block\'s weekly set targets starting from what this block showed, muscle by muscle.',
      ...NEXT_BLOCK_OPTION_GATING,
      recommended: isPro && recommendation === 'adjust',
    },
  ];
}

// ---------------------------------------------------------------------------
// Next-block recommendation (post-recovery hierarchy)
// ---------------------------------------------------------------------------

/**
 * Determines what should happen after the recovery week.
 * Default is always: same programme, go again.
 * Changes only triggered by sustained signals over multiple blocks.
 *
 * FQ-2: this is ADVICE. It marks one of the two options as recommended and
 * explains why in its headline/body; it never decides which options exist.
 * The three coached branches therefore no longer carry an `actionLabel` -
 * there is no single CTA left for one branch to own (the button labels are
 * NEXT_BLOCK_OPTION_LABELS above, identical on every branch, which is also
 * what retires FB-33's "Repeat this plan anyway": with both options offered
 * as equals, no option has to be framed as going against advice).
 *
 * @param {Array}  checkins    - recent weekly check-ins
 * @param {Object} userProfile - { experience, goal }
 * @param {Array}  signals     - detected signals
 * @param {string} phase       - 'recovery' while the recovery week is still
 *   ahead or live; 'finished' once the block is completed_awaiting_decision
 *   (Stage 1: the wording must never place the recovery week in the future
 *   when it has already passed).
 * @param {boolean} isPro      - the REAL entitlement. Free receives no
 *   adaptive next-block coaching at all (founder tier law, D96: "FREE DOES
 *   NOT HAVE COACHING"), so no recommendation is computed for it and none of
 *   the adaptive narrative is composed.
 * @returns {{ recommendation, coached, headline, body, secondaryLabel }}
 */
function buildNextBlockRecommendation(checkins, userProfile, signals, phase = 'recovery', isPro = false) {
  const highSignals = signals.filter(s => s.severity === 'high');
  const finished = phase === 'finished';

  // ── Free: no adaptive coaching, and no branch that check-in rows can move ─
  // The card still states the choice honestly (repeat is core training and
  // stays reachable); the adjusted path renders Pro-marked and routes through
  // the normal entitlement UX, so the tier boundary is declared rather than
  // accidental.
  if (!isPro) {
    return {
      recommendation: null,
      coached: false,
      headline: 'Your next block',
      body: finished
        ? 'You can run this plan again whenever you are ready. Same workouts, same set targets as last time.'
        : 'Once your recovery week is done you can run this plan again. Same workouts, same set targets as last time.',
      secondaryLabel: 'Change my training setup',
    };
  }

  // Count persistent performance/fatigue signals
  // Simplified: if this block had consistently poor readiness, suggest minor adjustment
  // C6 RA6-11 (D97-25): the same row-limited-not-dated defect D97-8
  // closed for detectSignals survived in this sibling read - the branch
  // choice here was driven by check-ins of ANY age, so a returning
  // user's recommendation (and its present-tense copy, "The structure
  // is working") could be computed entirely from pre-lapse rows, and
  // not always conservatively. Same boundary as the sibling: only
  // check-ins inside the 14-day detraining window count; with none,
  // the existing no-data default (70) applies, which lands on the
  // conservative repeat branch.
  const recentCheckins = checkins.filter((c) => {
    const t = Number(c?.weekStart);
    return Number.isFinite(t) && (Date.now() - t) <= 14 * 86400000;
  });
  const allReadiness = recentCheckins.map(checkinReadiness).filter(r => r !== null);
  const avgReadiness = allReadiness.length ? mean(allReadiness) : 70;

  // Default: same programme
  if (highSignals.length === 0 && avgReadiness >= 60) {
    return {
      recommendation: 'repeat',
      coached: true,
      headline: 'Go again: same plan',
      body: finished
        ? "Pick up where you left off. Same exercises, same structure. You'll come back a little stronger each block."
        : "Your recovery week does its job, then you pick up where you left off. Same exercises, same structure. You'll come back a little stronger each block.",
      // FB-32 (D96): this branch suggests a TRUE repeat -- the next block is
      // seeded with the finished block's own observed start and planned peak,
      // discarding every ledger proposal (blockSeed.js's intent ===
      // 'repeat'). The button that does it says exactly that
      // (NEXT_BLOCK_OPTION_LABELS.repeat). FQ-2: recommending the repeat no
      // longer removes the adjusted option from the card, and the ledger the
      // block just produced is shown either way.
      secondaryLabel: 'Change my training setup',
    };
  }

  // Minor adjustment: loads or sets tweaked, same structure
  if (highSignals.length <= 1 || avgReadiness >= 50) {
    return {
      recommendation: 'adjust',
      coached: true,
      headline: 'Same plan, slightly adjusted',
      // Stage 6 (2026-08-09): the promise is finally TRUE. The restart
      // path builds the Block Ledger and seeds each muscle's next-block
      // volume from how this block actually went (PlansScreen ->
      // buildSeedRangesForNextBlock -> resolveSeedRange), so "Continue
      // with adjustments" returns together with the behaviour Stage 1
      // stripped it of.
      body: finished
        ? "The structure is working. Your next block starts from what this block showed, muscle by muscle."
        : "The structure is working. After your recovery week, your next block starts from what this block showed, muscle by muscle.",
      secondaryLabel: 'Change my training setup',
    };
  }

  // Suggest rebuild only when signals are consistently poor
  return {
    recommendation: 'consider_rebuild',
    coached: true,
    headline: 'Might be worth a fresh look',
    body: finished
      ? "Fatigue ran consistently high this block. It's worth reviewing whether the plan's volume or exercise selection still fits where you are. The coach can help rebuild it."
      : "Fatigue has been consistently high this block. After your recovery week, it's worth reviewing whether the plan's volume or exercise selection still fits where you are. The coach can help rebuild it.",
    // D93 (Campaign 2, Phase 12) required this card's primary button not to
    // share 'Continue this plan' with the card that recommends continuing,
    // and settled on 'Repeat this plan anyway'. FQ-2 (D96) supersedes the
    // label while KEEPING the honesty rule that produced it: no branch owns
    // a CTA any more, both options carry their own true labels on every
    // branch, and this branch simply marks NEITHER of them as recommended -
    // its own suggestion is the fresh look below. That also resolves FB-33:
    // "anyway" framed repeating as going against advice, and there is no
    // longer any need to frame either option as the wrong one.
    secondaryLabel: 'Change my training setup',
  };
}

/**
 * C8 Work 1 (RA6-8 / RA6-9): re-decide the next-block recommendation
 * from the evidence that ACTUALLY seeds the adjusted block.
 *
 * buildNextBlockRecommendation above chooses between Repeat and Adjust
 * from check-in readiness, which says nothing about what the adjusted
 * block would prescribe. Review A proved both failure directions: a
 * user who earned a climb in every muscle could be recommended Repeat,
 * and on the retention default the two options produce identical
 * numbers while the card still implies adaptation.
 *
 * This applies the ledger-derived preview (nextBlockPreview) over the
 * base recommendation, so the recommendation and the explanation come
 * from ONE source (requirement D). It is pure and additive:
 *
 *  - the consider_rebuild branch is NEVER overridden (persistent
 *    fatigue outranks a volume delta);
 *  - Free is never touched (recommendation stays null, no coaching);
 *  - with no preview the base recommendation is returned unchanged, so
 *    every existing caller behaves exactly as before;
 *  - FQ-2 is untouched: this marks a recommendation, it never gates or
 *    hides either option (buildNextBlockOptions is not involved).
 *
 * @param {object|null} nextBlock  buildNextBlockRecommendation output
 * @param {object|null} preview    buildAdjustPreview output
 * @param {object} [opts] { finished }
 */
export function applyAdjustEvidence(nextBlock, preview, { finished = true } = {}) {
  if (!nextBlock || !preview) return nextBlock;
  // Free has no coaching: nothing to re-decide.
  if (!nextBlock.coached) return nextBlock;
  // Persistent fatigue keeps its own advice.
  if (nextBlock.recommendation === 'consider_rebuild') return nextBlock;

  if (preview.meaningful) {
    // Review D7: the headline speaks about where the block STARTS, so a
    // ceiling-only move must not be described as a higher start.
    const dir = preview.climbs === 0 && preview.reductions === 0
      ? 'Some muscle groups build to a different peak next block'
      : preview.climbs > 0 && preview.reductions === 0
        ? 'Some muscle groups start higher next block'
        : preview.reductions > 0 && preview.climbs === 0
          ? 'Some muscle groups start lower next block'
          : 'Some muscle groups start higher and some lower next block';
    return {
      ...nextBlock,
      recommendation: 'adjust',
      headline: 'Same plan, adjusted where the evidence moved',
      body: finished
        ? `${dir}, based on how this block actually went. The changes are listed below; everything else stays where it is.`
        : `After your recovery week, ${dir.charAt(0).toLowerCase()}${dir.slice(1)}, based on how this block actually went. The changes are listed below; everything else stays where it is.`,
    };
  }

  // Honest equivalence (requirement C): no manufactured difference.
  // Review D3: a recovery week that IS sized differently is a real, if
  // small, difference, so the "same training week" claim is dropped and
  // the actual difference is named instead. It does not flip the
  // recommendation: the training weeks themselves are identical.
  const sameWeek = preview.recoveryWeekDiffers
    ? 'The training weeks are the same either way; continuing with adjustments would size your recovery week to the work you actually did.'
    : 'Either option gives you the same training week.';
  return {
    ...nextBlock,
    recommendation: 'repeat',
    headline: 'Go again: the same targets still fit',
    body: finished
      ? `Your current set targets are still supported by the evidence, so there are no meaningful training changes to apply. ${sameWeek}`
      : `Your recovery week does its job, then the same set targets still fit: the evidence supports them, so there are no meaningful training changes to apply. ${sameWeek}`,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns a block advice object for the current state.
 *
 * @param {string} userId
 * @param {Object|null} activeBlock  - from getActiveBlock(); has startDate, plannedWeeks, etc.
 * @param {Object} userProfile       - from useAppStore; { experience, goal, firstName }
 * @param {Object} [options]
 * @param {boolean} [options.isPro]  - FQ-2 (D96): the REAL entitlement, from
 *   the store's tier. Defaults to false, so a caller that forgets it gets the
 *   uncoached advice rather than Pro coaching by accident (fails closed).
 * @returns {Promise<BlockAdvice>}
 *
 * BlockAdvice shape:
 * {
 *   action:    'continue' | 'heads_up' | 'early_deload' | 'in_recovery' | 'post_recovery'
 *   headline:  string, short coaching statement
 *   body:      string, plain English, uses user's own data
 *   signals:   [{ type, severity, label }]
 *   nextBlock: null | { recommendation, coached, headline, body, secondaryLabel }
 *   blockStatus: null | { status: 'active' | 'recovery' |
 *     'completed_awaiting_decision', awaitingDecision, currentWeek,
 *     totalWeeks, weeksOverdue, ... }
 * }
 */
/**
 * C16 phase C: assemble the programme review for a finished block.
 *
 * Reads the CURRENT plan, the user's exercise intelligence and the block
 * history, and hands them to the pure engine. Every decision is made in
 * programmeEpoch; this only gathers.
 *
 * Best-effort by construction. A read failure returns null and the caller
 * simply shows the existing volume recommendation without the structural
 * half - which is the behaviour that shipped before this existed.
 */
async function buildProgrammeReview(userId, activeBlock) {
  // eslint-disable-next-line global-require
  const {
    getActivePlan, getAllProgrammes, getRoutinesForPlan,
    getRoutineExercisesWithDetails, getAllMesocycles, getAllExercises,
  } = require('./database');
  // eslint-disable-next-line global-require
  const { loadExerciseIntentState, exerciseEvidence, isExcluded, isAvoidedThisBlock,
    swappedAwayCount, EVIDENCE_MATURITY } = require('./exercise/intent');
  // eslint-disable-next-line global-require
  const { isAutoEligible } = require('./exercise/canonicality');
  // eslint-disable-next-line global-require
  const { proposeNextBlock, verdictCopy } = require('./blockReview');

  const plan = await getActivePlan(userId);
  if (!plan?.id) return null;
  const routines = await getRoutinesForPlan(plan.id);
  // CC33 adversarial review F2: the routine rows' embedded exercise
  // objects carry NO demand columns (database.js:4482-4515), so judging
  // them read every capability axis as null - a baseline demand rule
  // marked EVERY slot capability-ineligible ("sits outside how you
  // train", proposed for replacement) and an episode rule held every
  // slot un-judged. Judge library-resolved rows; the routine row is only
  // the display fallback for an unresolved FK.
  const libraryById = new Map(((await getAllExercises().catch(() => [])) ?? []).map((e) => [e.id, e]));
  const slots = [];
  const structure = [];
  const rowById = new Map();
  for (const r of routines ?? []) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await getRoutineExercisesWithDetails(r.id);
    const exercises = [];
    for (const row of rows ?? []) {
      const ex = row.exercise ?? {};
      if (!ex.id) continue;
      slots.push({ exerciseId: ex.id, exerciseName: ex.name ?? null, workout: r.name ?? null });
      exercises.push({ exerciseId: ex.id });
      rowById.set(ex.id, libraryById.get(ex.id) ?? ex);
    }
    structure.push({ name: r.name, exercises });
  }
  if (slots.length === 0) return null;
  const currentStructure = {
    splitType: routines.find(r => r?.splitType)?.splitType ?? null,
    workouts: structure,
  };

  const intentState = await loadExerciseIntentState(userId, {
    activeMesocycleId: activeBlock?.id ?? null,
    progressionForIds: slots.map(s => s.exerciseId),
  });

  const evidenceFor = (exerciseId) => {
    const facts = exerciseEvidence(intentState, exerciseId);
    // CC30 (section 7 matrix): an episode-conflicted slot is not
    // evidence-judged - the verdict engine keeps it with the capability
    // reason - while a definite BASELINE conflict replaces (D112 R1's
    // amendment to CAP-1). The ranking between them is slotVerdict's
    // (round 18, D130): live overlay KEEP, then baseline REPLACE, then
    // open-episode KEEP; the user's own exclusion outranks all three.
    let capabilityAffected = false;
    let capabilityEpisodeOpen = false;
    try {
      // eslint-disable-next-line global-require
      const { episodeConflicts, removalExcusalConflicts } = require('./capability/effective');
      const row = rowById.get(exerciseId);
      // Definite conflicts only (F2/F1 class): unknown drives nothing
      // automatic anywhere in the lane. Round 18 (R18-2), matching
      // planAutoGen's builder exactly: `capabilityAffected` is the LIVE
      // overlay only (the shared removalExcusalConflicts gate -
      // definite, not held, every live driver applied - the answer
      // serve and both effects writers act on); a held or declined rule
      // drives nothing (D120 ruling 2) and must not veto the baseline
      // replace below. Any OTHER definite episode conflict is
      // `capabilityEpisodeOpen`: slotVerdict keeps it un-judged BELOW
      // the baseline replace (D130).
      const episodeDefinite = row
        ? episodeConflicts(intentState?.capability, row).filter((c) => !c.unknown)
        : [];
      capabilityAffected = removalExcusalConflicts(episodeDefinite).length > 0;
      capabilityEpisodeOpen = !capabilityAffected && episodeDefinite.length > 0;
    } catch (e) {
      // UNKNOWN IS NOT NONE (D112 R3, adopting planAutoGen's posture for
      // the same field): a capability read that did not happen says
      // nothing about whether this slot is being trained around, so the
      // conservative reading keeps the incumbent rather than letting the
      // verdict engine replace a movement on the strength of a check that
      // never ran. Logged, because reaching here at all is a code defect.
      capabilityAffected = true;
      try {
        // eslint-disable-next-line global-require
        require('./errorLog').logError('blockAdvisor.capabilityRead', e, {
          reason: 'episode conflict check failed; treating slot as possibly affected',
        });
      } catch (_) { /* logging must never break the advisor */ }
    }
    // D112 R2/R6 (CC33 audit T1-10, refined at the T1-08 root fix): the
    // review asks whether the incumbent is capability-eligible AT ALL,
    // through the PRECISE field - capabilityIneligible - never the shared
    // autoEligible seam, whose meaning everywhere else is name-based
    // obscure-lift gating (overloading it briefly let a stored KEEP of an
    // obscure-named lift be overridden too, against R4). Capability-only
    // on purpose: preference exclusions speak through `excluded`, and an
    // EPISODE conflict keeps its KEEP (capabilityAffected outranks this
    // inside slotVerdict). A failed read answers false - never REPLACE on
    // a check that did not happen.
    let capabilityIneligible = false;
    try {
      // eslint-disable-next-line global-require
      const { baselineConflicts } = require('./capability/effective');
      const row = rowById.get(exerciseId);
      // DEFINITE conflicts only, not isCapabilityEligible (F2):
      // suggestion eligibility treats unknown as not-suggestable (rank
      // 4, correct for generation - CAP-8 custom lifts are never
      // auto-picked), but REPLACING an incumbent the user is training
      // demands an established fact. Round 18 (R18-2): the BASELINE
      // question asked of the baseline list itself (allowance-carved -
      // baselineConflicts rides on blockingConflicts), dropping the
      // `&& !capabilityAffected` proxy that let a held or declined
      // episode rule veto the replace. slotVerdict does the ranking.
      // Round 19 (R19-2), matching planAutoGen: stale-known is
      // knowledge - the `!unavailable` guard silently switched the
      // review's capability REPLACE off under a state the rest of the
      // lane honours.
      // eslint-disable-next-line global-require
      const { capabilityKnown } = require('./capability/resolve');
      capabilityIneligible = !!(row && intentState?.capability && !intentState.capability.empty
        && capabilityKnown(intentState.capability)
        && baselineConflicts(intentState.capability, row).some((c) => !c.unknown));
    } catch (e) {
      // A failed baseline check cannot license a replacement through another
      // evidence lane. Treat the incumbent as possibly capability-affected,
      // which is the conservative KEEP verdict, and record the defect.
      capabilityIneligible = false;
      capabilityAffected = true;
      try {
        // eslint-disable-next-line global-require
        require('./errorLog').logError('blockAdvisor.capabilityBaselineRead', e, {
          reason: 'baseline conflict check failed; preserving incumbent',
        });
      } catch (_) { /* logging must never break the advisor */ }
    }
    return {
      capabilityAffected,
      capabilityEpisodeOpen,
      capabilityIneligible,
      excluded: isExcluded(intentState, exerciseId) || isAvoidedThisBlock(intentState, exerciseId),
      swappedAwayCount: swappedAwayCount(intentState, exerciseId),
      autoEligible: undefined,
      sessions: facts.sessions,
      progressing: facts.progression === 'progressing',
      plateau: facts.plateau === true,
      // The shared plateau law already decides the smaller sufficient
      // intervention: two continuous stalls try a rep-range change; three
      // justify an exercise swap. Carry the exact reviewed prescription so
      // the writer can apply it rather than reconstructing it from prose.
      prescriptionFix: facts.plateauResolution === 'change_rep_range',
      prescriptionChange: facts.plateauResolution === 'change_rep_range'
        ? { repMin: 15, repMax: 20 }
        : null,
      establishedPersonalFit: facts.maturity === EVIDENCE_MATURITY.ESTABLISHED,
      // Elective variation is offered only once the epoch has the history
      // for it; the engine gates that itself and refuses it outright for a
      // still-progressing movement.
      // Insufficient evidence is uncertainty, never a licence for novelty.
      // 'holding' has the shared model's minimum comparisons and may become
      // eligible for purposeful variation once the epoch itself is mature.
      systematicCandidate: facts.progression === 'holding' && facts.sufficient,
    };
  };

  let history = [];
  let programmes = [];
  try {
    [history, programmes] = await Promise.all([
      getAllMesocycles(userId), getAllProgrammes(userId),
    ]);
  } catch (_) { history = []; programmes = []; }

  // Build honest, newest-first epoch history. The old production path
  // stamped the CURRENT structure onto every historical block and marked
  // every row completed, so an abandoned or unrelated programme inflated
  // the epoch. New ledgers carry an immutable signature snapshot. Older
  // rows fall back conservatively to the archived programme whose name and
  // creation time best match the block; an unknown structure stops the run.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const asMs = (v) => {
    const n = typeof v === 'number' ? v : new Date(v).getTime();
    return Number.isFinite(n) ? n : null;
  };
  const activeStatus = getBlockStatus(
    activeBlock?.startDate ?? activeBlock?.createdAt ?? Date.now(),
    activeBlock?.plannedWeeks ?? activeBlock?.durationWeeks ?? 5,
  );
  // C18 adversarial closure A1: ONE definition of "this historical block was
  // genuinely completed", shared with the structure memory. It used to accept
  // any ledger-bearing row, which counted a block the user WALKED AWAY from
  // (a backfilled ledger is written for any block whose calendar has run out,
  // abandoned or not) toward the epoch. blockCompletionState reads the
  // truncated end_date `endActiveMesocycles` writes on a switch-away, so an
  // abandoned block no longer inflates the epoch counter.
  const completedPastBlock = (m) => blockCompletionState(m) === BLOCK_COMPLETION.COMPLETED;
  const userProgrammes = (programmes ?? []).filter(
    p => p?.userId === userId && !(p?.isLibrary === 1 || p?.isLibrary === true),
  );
  const structureCache = new Map([[plan.id, currentStructure]]);
  const loadStructure = async (programme) => {
    if (!programme?.id) return null;
    if (structureCache.has(programme.id)) return structureCache.get(programme.id);
    const days = [];
    const rs = await getRoutinesForPlan(programme.id);
    for (const r of rs ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(r.id);
      days.push({
        name: r.name,
        exercises: (rows ?? []).map(row => ({ exerciseId: row?.exercise?.id ?? null })),
      });
    }
    const value = days.length ? {
      splitType: rs.find(r => r?.splitType)?.splitType ?? null,
      workouts: days,
    } : null;
    structureCache.set(programme.id, value);
    return value;
  };
  const signatureHistory = [];
  for (const m of history ?? []) {
    if (m?.id === activeBlock?.id) {
      if (activeStatus?.awaitingDecision) {
        signatureHistory.push({ completed: true, signature: structureSignature(currentStructure) });
      }
      continue;
    }
    if (!completedPastBlock(m)) {
      signatureHistory.push({ completed: false, signature: null });
      break;
    }
    let storedSignature = null;
    try { storedSignature = JSON.parse(m?.blockLedger ?? 'null')?.programmeSignature ?? null; } catch (_) {}
    if (storedSignature) {
      signatureHistory.push({ completed: true, signature: storedSignature });
      continue;
    }
    const blockAt = asMs(m?.createdAt ?? m?.startDate) ?? Infinity;
    const candidates = userProgrammes
      .filter(p => (p.name === m?.name || planHeadingName(p.name) === m?.name)
        && (asMs(p.createdAt) ?? 0) <= blockAt + DAY_MS)
      .sort((a, b) => (asMs(b.createdAt) ?? 0) - (asMs(a.createdAt) ?? 0));
    // eslint-disable-next-line no-await-in-loop
    const historicalStructure = await loadStructure(candidates[0] ?? null);
    if (!historicalStructure) {
      signatureHistory.push({ completed: false, signature: null });
      break;
    }
    signatureHistory.push({ completed: true, signature: structureSignature(historicalStructure) });
  }

  // CAMPAIGN 18 JOB 5. Was this block actually run? The same
  // trainingExecutionFact every other cross-domain decision uses, so the
  // block review and the weekly card cannot disagree about whether the
  // programme was tested. A read failure leaves execution UNKNOWN, and
  // unknown is not judgeable - the conservative direction, since it can only
  // ever withhold a change.
  //
  // Completed sessions come from getBlockTrainingData (the existing block
  // reader); planned sessions are the block's own weeks times the number of
  // training days in the plan we just walked. No new authority, no second
  // definition of "a session".
  let executionJudgeable = true;
  try {
    // eslint-disable-next-line global-require
    const { getBlockTrainingData } = require('./database');
    // eslint-disable-next-line global-require
    const { trainingExecutionFact, SIGNAL } = require('./coachContext');
    const weeks = Number(activeBlock?.plannedWeeks ?? activeBlock?.durationWeeks) || null;
    const { fullyCompletedWorkouts } = await getBlockTrainingData(userId, activeBlock?.id ?? null);
    const fact = trainingExecutionFact({
      sessionsCompleted: Array.isArray(fullyCompletedWorkouts) ? fullyCompletedWorkouts.length : null,
      sessionsPlanned: weeks && routines?.length ? weeks * routines.length : null,
    });
    executionJudgeable = fact.signal === SIGNAL.GOOD;
  } catch (_) {
    executionJudgeable = false;
  }

  const proposal = proposeNextBlock({
    slots,
    evidenceFor,
    history: signatureHistory,
    currentStructure,
    executionJudgeable,
  });
  // isAutoEligible is imported for the evidence shape's completeness and is
  // deliberately not applied here: at a block boundary an exercise the user
  // is already running is not made invalid by a curation tier change.
  void isAutoEligible;
  return { ...proposal, copy: verdictCopy(proposal.verdict, { changedCount: proposal.changedCount }) };
}

export async function getBlockAdvice(userId, activeBlock, userProfile, { isPro = false } = {}) {
  // Campaign 1 P0-7 D2: a FAILED check-in read must not masquerade as "no
  // signals detected" - the old catch(() => []) made a read error produce
  // a confident healthy-block advice with the heads-up and early-deload
  // paths silently disabled. On failure the advisor says nothing (null);
  // the one caller already tolerates null and simply renders no card.
  let checkins;
  try {
    checkins = await getRecentCheckins(userId, 8);
  } catch (_) {
    return null;
  }

  const blockStatus = activeBlock
    ? getBlockStatus(
        activeBlock.startDate ?? activeBlock.createdAt ?? Date.now(),
        // Wave 2 (2026-07-30): plannedWeeks is the authoritative schedule-
        // length field; durationWeeks is kept in lockstep with it, so it is
        // only a fallback here, never plannedWeeks' own hardcoded default
        // (that was root cause #2 of the "Week 2 of 5" vs "of 6" bug --
        // getBlockStatus no longer accepts a default at all).
        activeBlock.plannedWeeks ?? activeBlock.durationWeeks ?? 5,
      )
    : null;

  // C6 Phase 1 seam 2 (D97): every signal detectSignals produces speaks
  // in the present tense ("this week", "Your check-in shows..."), and
  // getRecentCheckins is row-limited, not dated - so a user returning
  // after months met recovery advice computed from, and described as,
  // data they supplied before the gap (a fabricated recovery assumption,
  // the lapse-is-not-failure law). A check-in older than 14 days (two
  // weekly cycles, the engine's detraining boundary) is history, not a
  // current signal: with no fresh check-in there ARE no current signals.
  // The z-score baseline inside detectSignals still reads the older rows
  // once a fresh latest exists, and blockLedgerGather's block-end reads
  // are date-anchored separately and unaffected.
  const latestCheckinAt = checkins[0]?.weekStart ?? null;
  const latestIsCurrent = latestCheckinAt != null
    && (Date.now() - latestCheckinAt) <= 14 * 86400000;
  // C6 closeout P-8 (tier law: FREE HAS NO COACHING): the early_deload /
  // heads_up branches and the signal chips are coaching output derived
  // from check-in data, but only the next-block narrative was
  // entitlement-gated - so for up to 14 days after a trial expiry a
  // Free user could still be told "Your body is asking for a lighter
  // week" from Pro-era check-ins whose recency gate they still passed.
  // Signals now require the entitlement as well as currency. Historical
  // rows are untouched (nothing is deleted; the Coach history surfaces
  // keep their own rules); returning to Pro restores live signals from
  // the same data immediately.
  const signals = (isPro && latestIsCurrent) ? detectSignals(checkins) : [];
  const highSignals   = signals.filter(s => s.severity === 'high');
  const mediumSignals = signals.filter(s => s.severity === 'medium');

  // ── In recovery week ──────────────────────────────────────────────────────
  if (blockStatus?.status === 'recovery') {
    // C6 R-4 (D97-22, ruling (b) + (a)): the block clock is pure calendar,
    // so a user who left mid-accumulation and returned a fortnight later
    // landed INSIDE a live "Recovery week is active" card whose body
    // ("letting the last few weeks of work pay off") described weeks of no
    // training - a recovery week they never earned (Phase 27: recovery
    // state must not become fake training). A recovery week is only
    // claimed as LIVE when the block actually trained inside the standing
    // 14-day detraining boundary; otherwise the copy states the calendar
    // fact and the way back without prescribing recovery from work that
    // did not happen. The clock itself is untouched (option (c), pausing
    // it, is D91-25-adjacent and stays a founder question in the triage);
    // a failed read cannot invent recent training (recentTrainingAt null).
    let recentTrainingAt = null;
    try {
      // eslint-disable-next-line global-require
      const { getRecentCompletedWorkouts } = require('./database');
      const recent = await getRecentCompletedWorkouts(userId, 1);
      const w = recent?.[0];
      recentTrainingAt = w ? Number(w.endedAt ?? w.startedAt ?? w.createdAt) : null;
    } catch (_) { recentTrainingAt = null; }
    const trainedRecently = Number.isFinite(recentTrainingAt)
      && (Date.now() - recentTrainingAt) <= 14 * 86400000;
    const nextBlock = buildNextBlockRecommendation(checkins, userProfile, signals, 'recovery', isPro);
    // C16 phase C: the recovery-week heads-up. It INFORMS that a review is
    // coming and what the review will consider; it promises no changes,
    // because none have been decided. Pro only (Free receives no coaching)
    // and best-effort - a failed epoch read simply omits the line.
    let reviewHeadsUp = null;
    if (isPro) {
      try {
        // eslint-disable-next-line global-require
        const { recoveryHeadsUp } = require('./blockReview');
        const review = await buildProgrammeReview(userId, activeBlock);
        reviewHeadsUp = recoveryHeadsUp({ epochBlocks: review?.epochBlocks ?? 0 }).body;
      } catch (_) { reviewHeadsUp = null; }
    }
    if (!trainedRecently) {
      return {
        action: 'in_recovery',
        reviewHeadsUp,
        headline: 'Recovery week on the calendar',
        body: `This block's recovery week has arrived, but you haven't trained recently, so there's nothing to recover from yet. Pick up wherever suits you: ease back in with lighter sessions, and the next-block choice opens when this week ends.`,
        signals,
        nextBlock,
        blockStatus,
      };
    }
    return {
      action: 'in_recovery',
      reviewHeadsUp,
      headline: 'Recovery week is active',
      body: `Keep sessions lighter this week. Roughly half the sets, same exercises, easy effort. This is not a step backwards. Your body rebuilds when the hard work eases off, so this is the week the last few weeks turn into progress. Full training again next week.`,
      signals,
      nextBlock,
      blockStatus,
    };
  }

  // ── Block finished, awaiting the user's next-block decision ──────────────
  if (blockStatus?.status === 'completed_awaiting_decision') {
    const nextBlock = buildNextBlockRecommendation(checkins, userProfile, signals, 'finished', isPro);
    // C16 phase C: the programme-level verdict, from the epoch engine.
    //
    // This closes the mismatch the founder named: the branch was labelled
    // `consider_rebuild` while its primary action still effectively
    // repeated the programme. A rebuild is now only ever called a rebuild
    // when the STRUCTURE has a reason to change - never because one or two
    // slots did, and never because fatigue ran high for a fortnight.
    //
    // Pro only, and best-effort: the verdict is additive information beside
    // the existing recommendation. Free receives no coaching (D96), and a
    // failure here must not cost the user their block-complete card.
    let programmeReview = null;
    if (isPro) {
      try {
        programmeReview = await buildProgrammeReview(userId, activeBlock);
      } catch (_) { programmeReview = null; }
    }
    const overdueWeeks = blockStatus.weeksOverdue;
    return {
      action: 'post_recovery',
      // C16 phase C: the persistent decision surface shows the programme
      // verdict in user language beside the volume recommendation.
      programmeReview,
      // C6 RB6-8 (D97-25): week counts read oddly at scale ("passed 25
      // weeks ago"); from two months the headline rolls over to months.
      headline: overdueWeeks > 0
        ? (overdueWeeks >= 9
          ? `Recovery week passed about ${Math.round(overdueWeeks / 4.345)} months ago`
          : `Recovery week passed ${overdueWeeks} week${overdueWeeks > 1 ? 's' : ''} ago`)
        : 'Block finished',
      // Stage 1 honesty (2026-08-09): this state begins the week AFTER the
      // recovery week, so the old "take your recovery week" line described
      // a week that had already passed.
      // C6 R-5 (D97-22): weeksOverdue is unbounded, so this line used to
      // fire at 20+ weeks with urgency copy plus a physiological claim
      // ("Your body's ready") nothing can support after an absence. The
      // lapse law bans both; the honest line states the fact and the next
      // step, at any age, with no pressure and no readiness claim.
      body: overdueWeeks > 0
        ? `Your recovery week has been and gone. Whenever you're ready, the next step is choosing your next block.`
        : `You've finished this block, recovery week included. The next step is choosing your next block.`,
      signals,
      nextBlock,
      blockStatus,
    };
  }

  // ── Active block, check for early deload triggers ────────────────────────

  // Masters lifters (age ≥40) recover more slowly from accumulated training
  // stress (Sullivan & Baker; Rippetoe; Hayes et al. 2023, older adults show
  // longer strength-recovery timelines and lower productive-volume ceilings).
  // Drop the deload trigger from 2 high signals to 1, and the heads-up from
  // 2 medium signals to 1, so the same recovery state surfaces a week earlier.
  const isMasters = (userProfile?.age ?? 0) >= 40;
  const deloadHighThreshold  = isMasters ? 1 : 2;
  const headsUpMediumThreshold = isMasters ? 1 : 2;

  // Strong deload trigger: enough high signals OR sustained fatigue.
  // Gated on enough history to be a pattern rather than a single bad day.
  // A user one week into their first block, with one check-in entered on
  // enrolment day, shouldn't be told to drop their sets in half. That
  // recommendation is for accumulated fatigue, which requires at least
  // two weeks of check-ins and a block that's been running long enough
  // for fatigue to actually accumulate.
  const hasSustainedFatigue = signals.some(s => s.type === 'sustained_fatigue');
  const hasEnoughHistory = checkins.length >= 2 && (blockStatus?.currentWeek ?? 1) >= 2;
  if (hasEnoughHistory && (highSignals.length >= deloadHighThreshold || hasSustainedFatigue)) {
    const nextBlock = buildNextBlockRecommendation(checkins, userProfile, signals, 'recovery', isPro);
    return {
      action: 'early_deload',
      headline: 'Your body is asking for a lighter week',
      body: buildEarlyDeloadBody(signals, checkins[0], blockStatus),
      signals,
      nextBlock,
      blockStatus,
    };
  }

  // Moderate: heads-up, signals building. Gated on the same enough-history
  // check as the deload above: a single check-in, including a stray or seeded
  // one on a brand-new user, must not surface a recovery-concern card. Without
  // a real pattern (>= 2 check-ins and >= 2 weeks into the block) we stay on
  // 'continue' and show no card.
  if (hasEnoughHistory && (highSignals.length >= 1 || mediumSignals.length >= headsUpMediumThreshold)) {
    return {
      action: 'heads_up',
      headline: 'Keep an eye on recovery',
      body: buildHeadsUpBody(signals, blockStatus),
      signals,
      nextBlock: null,
      blockStatus,
    };
  }

  // All clear
  const weeksLeft = blockStatus
    ? blockStatus.recoveryWeek - blockStatus.currentWeek
    : null;

  return {
    action: 'continue',
    headline: blockStatus
      ? `Week ${blockStatus.currentWeek} of ${blockStatus.totalWeeks}`
      : 'On track',
    body: weeksLeft === 1
      ? `One more week before your recovery week. Push hard this week. It's your peak.`
      : weeksLeft === 0
        ? `This is your recovery week. Back off and let everything settle.`
        : `Training is going well. Stay on plan.`,
    signals,
    nextBlock: null,
    blockStatus,
  };
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

function buildEarlyDeloadBody(signals, latestCheckin, blockStatus) {
  const parts = [];

  const energySig  = signals.find(s => s.type === 'energy');
  const sorenessSig = signals.find(s => s.type === 'soreness');
  const sleepSig   = signals.find(s => s.type === 'sleep');
  const zSig       = signals.find(s => s.type === 'readiness_drop');

  if (energySig?.severity === 'high') parts.push('energy is very low');
  if (sorenessSig?.severity === 'high') parts.push('soreness is carrying over into sessions');
  if (sleepSig) parts.push(`sleep is below ${sleepSig.data?.toFixed(1) ?? '6'}h`);
  if (zSig?.severity === 'high') parts.push('your overall readiness is well below your normal baseline');

  const signalText = parts.length > 0
    ? `Your check-in shows ${parts.join(' and ')}. `
    : '';

  const weeksIn = blockStatus?.currentWeek ?? null;
  const timing = weeksIn
    ? `You're in week ${weeksIn}. `
    : '';

  return `${signalText}${timing}dropping your sets roughly in half this week while keeping the same exercises lets fatigue clear without losing any of the progress you've built. Think of it as loading the spring for the next push.`;
}

function buildHeadsUpBody(signals, blockStatus) {
  const energySig   = signals.find(s => s.type === 'energy');
  const sorenessSig = signals.find(s => s.type === 'soreness');
  const recovDrop   = signals.find(s => s.type === 'readiness_drop');

  const weeksToRecovery = blockStatus
    ? blockStatus.recoveryWeek - blockStatus.currentWeek
    : null;

  const obs = [];
  if (energySig) obs.push('energy is a bit lower than usual');
  if (sorenessSig) obs.push('soreness is higher than normal');
  if (recovDrop) obs.push('your overall readiness has dipped');

  const obsText = obs.length ? `${obs.join(' and ')}. ` : '';

  const timing = weeksToRecovery !== null
    ? `Your recovery week is ${weeksToRecovery === 1 ? 'next week' : `${weeksToRecovery} weeks away`}. `
    : '';

  return `${obsText}${timing}Keep training as planned, focus on sleep and eating enough, and flag it next check-in if nothing has improved.`;
}
