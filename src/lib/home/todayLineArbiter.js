/**
 * todayLineArbiter — Campaign 22 Phase 2, Stage 1.
 *
 * THE CONTRACT. HOME-TODAY-UX-SPEC.md §13 (the ranked priority contract):
 * exactly ONE occupant may hold the Today line (region R2) at a time, chosen
 * by a fixed rank order. Everything else waits its turn. This module is that
 * choice, and nothing else: PURE, no I/O, no navigation, no AsyncStorage. It
 * takes the eligibility facts HomeScreen already computes (each existing
 * banner's show* condition, block-complete state, re-entry due, check-in
 * due, trial-ending state, recovery facts, a reserved safety slot) and
 * returns the single winning occupant, or null.
 *
 * RANKS (spec §13, task brief order — plateau and activation are explicitly
 * OUT: they stay P3, Stage 2's scope, and never reach this resolver):
 *   1. Safety-consequential state (reserved — see note below)
 *   2. Block-complete decision needed
 *   3. Coach decision to review
 *   4. Weekly check-in due
 *   5. Recovery adjustment / deload suggestion affecting today
 *   6. Re-entry question
 *   7. Nutrition-phase mismatch
 *   8. Trial ENDING with genuine payment action
 *   -> null (nothing eligible)
 *
 * RANK 1 NOTE. "ED/calm/photo suppression gates untouched and still senior"
 * (CLAUDE.md, PRESERVATION CONTRACT). Today, ED-flag/calm-mode safety acts
 * ONLY as a suppressor inside each fact's own loader (deloadSuggestion,
 * activationNudge, etc. already fail closed before their eligibility ever
 * reaches this arbiter) — there is no existing POSITIVE Home banner for a
 * "safety-consequential state" to promote. Rank 1 is wired here as a
 * reserved, always-checked-first slot so nothing junior can ever outrank a
 * genuine safety occupant if/when one is built; `facts.safety` is simply
 * `null` from every current call site.
 *
 * EVERY OCCUPANT'S action, dismissal key and target is supplied BY THE
 * CALLER (HomeScreen), already wired to the exact existing handler for that
 * fact. This module only decides WHICH one renders and writes its one-line
 * text (per HOME-TODAY-UX-SPEC.md §15 copy-contract items 1, 2 and 5; every
 * other occupant carries its existing wording, compressed to one sentence
 * where the old idiom used a separate title + body, which the new single-line
 * idiom no longer has room for).
 */

import { isLighterTrainingState, RECOVERY_STATE } from '../recoveryState';

/** @typedef {{key:string,text:string,onPress:Function,onDismiss:(Function|null),accessibilityLabel:string}} TodayLineItem */

// Rank 2 — block-complete decision needed. Spec §18 mock H literal.
function resolveBlockComplete(facts) {
  const f = facts?.blockComplete;
  if (!f?.eligible) return null;
  return {
    key: 'block_complete',
    text: "Block complete. Choose what's next.",
    onPress: f.onPress,
    onDismiss: null,
    accessibilityLabel: "Block complete. Choose what's next.",
  };
}

// Rank 3 — coach decision to review. Copy item 2: "Coach - this week's
// decision" -> "This week's coaching decision". The old banner's title +
// body collapse into one sentence; when a calorie change is the real content
// it leads (spec §18 mock B), otherwise the plain title carries the tap.
function resolveCoachDecision(facts) {
  const f = facts?.coachDecision;
  if (!f?.eligible) return null;
  const text = f.caloriesKcal != null
    ? `Calories adjusted to ${f.caloriesKcal} kcal. See why.`
    : "This week's coaching decision. See why.";
  return {
    key: 'coach_decision',
    text,
    onPress: f.onPress,
    onDismiss: f.onDismiss,
    accessibilityLabel: "This week's coaching review. Tap to open.",
  };
}

// Rank 4 — weekly check-in due. Copy item 5: three sentences + optional scan
// subline collapse to ONE sentence; the scan invitation moves to the
// check-in screen it belongs to (not carried here).
function resolveCheckIn(facts) {
  const f = facts?.checkIn;
  if (!f?.eligible) return null;
  return {
    key: 'check_in',
    text: 'Your weekly check-in is ready.',
    onPress: f.onPress,
    onDismiss: f.onDismiss,
    accessibilityLabel: 'Your weekly check-in is ready. Tap to open.',
  };
}

// Rank 5 — recovery adjustment / deload suggestion affecting today. Absorbs
// TWO previously-separate mechanisms (RecoveryStateCard's announcement duty,
// and the data-driven deload-suggestion banner). They are mutually exclusive
// in practice — HomeScreen's existing `inScheduledRecovery` gate already
// keeps the deload suggestion from firing while a structural recovery state
// is live — so the structural state (the block's own resolved truth) takes
// priority within the rank whenever both are somehow present.
function resolveRecovery(facts) {
  const f = facts?.recovery;
  if (!f) return null;
  if (isLighterTrainingState(f.state) && f.onOpenDetail) {
    const planned = f.state.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY;
    const text = planned
      ? 'Recovery week. Training is deliberately lighter. What that means.'
      : 'Training is lighter for now. Why?';
    return {
      key: 'recovery_state',
      text,
      onPress: f.onOpenDetail,
      onDismiss: null,
      accessibilityLabel: text,
    };
  }
  if (f.deloadEligible) {
    return {
      key: 'deload_suggestion',
      text: 'Recovery week suggested. See why.',
      onPress: f.onDeloadPress,
      onDismiss: f.onDeloadDismiss,
      accessibilityLabel: 'Recovery week suggested. Tap to review.',
    };
  }
  return null;
}

// Rank 6 — re-entry question. The existing sheet/flow fires unchanged on
// tap; this only decides whether the entry point is due.
function resolveReEntry(facts) {
  const f = facts?.reEntry;
  if (!f?.eligible) return null;
  return {
    key: 're_entry',
    text: 'Welcome back. A quick question before your next session.',
    onPress: f.onPress,
    onDismiss: null,
    accessibilityLabel: 'Welcome back. A quick question before your next session.',
  };
}

// Rank 7 — nutrition-phase mismatch. Existing wording kept (already one
// sentence; not a listed copy-contract item for this stage).
function resolvePhaseMismatch(facts) {
  const f = facts?.phaseMismatch;
  if (!f?.eligible) return null;
  const text = `Your nutrition targets are set for ${f.savedPhaseLabel}. Update them to match.`;
  return {
    key: 'phase_mismatch',
    text,
    onPress: f.onPress,
    onDismiss: f.onDismiss,
    accessibilityLabel: 'Your nutrition targets do not match your current phase. Go to nutrition targets.',
  };
}

// Rank 8 — trial ENDING with genuine payment action. FOUNDER-RULINGS-PHASE2
// R3: only this state, never the everyday S1/S2/S3 value banner, may occupy
// the Today line. Spec §18 mock G literal wording.
function resolveTrialEnding(facts) {
  const f = facts?.trialEnding;
  if (!f?.eligible) return null;
  const when = f.daysRemaining <= 0 ? 'today' : 'tomorrow';
  const text = `Your trial ends ${when}. Keep your coaching.`;
  return {
    key: 'trial_ending',
    text,
    onPress: f.onPress,
    onDismiss: null,
    accessibilityLabel: text,
  };
}

// Rank 1 — reserved safety-consequential slot. See module header note.
function resolveSafety(facts) {
  const f = facts?.safety;
  if (!f) return null;
  return {
    key: f.key ?? 'safety',
    text: f.text,
    onPress: f.onPress,
    onDismiss: f.onDismiss ?? null,
    accessibilityLabel: f.accessibilityLabel ?? f.text,
  };
}

// The fixed rank order. Exported for tests that need to assert the order
// itself, not just the outcome.
export const TODAY_LINE_RANKS = [
  resolveSafety,
  resolveBlockComplete,
  resolveCoachDecision,
  resolveCheckIn,
  resolveRecovery,
  resolveReEntry,
  resolvePhaseMismatch,
  resolveTrialEnding,
];

/**
 * THE single decision point. Walks the fixed rank order and returns the
 * first eligible occupant, or null when nothing is eligible (or when the
 * caller signals resume-state suppression — see below).
 *
 * RESUME SUPPRESSION (spec §12 / build brief): while a workout is actively
 * in progress the Today line renders nothing, safety excepted — a resumable
 * workout outranks every P1 occupant. Callers pass `hasActiveWorkout`; this
 * function still evaluates rank 1 first so a genuine safety occupant is
 * never suppressed by an in-progress workout.
 *
 * @param {object} facts
 * @param {boolean} [facts.hasActiveWorkout]
 * @returns {TodayLineItem|null}
 */
export function resolveTodayLine(facts = {}) {
  const safety = resolveSafety(facts);
  if (safety) return safety;
  if (facts.hasActiveWorkout) return null;
  for (let i = 1; i < TODAY_LINE_RANKS.length; i++) {
    const occupant = TODAY_LINE_RANKS[i](facts);
    if (occupant) return occupant;
  }
  return null;
}

export default resolveTodayLine;
