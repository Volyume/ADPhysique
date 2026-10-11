// Audit S15#7: the one calm line of Today's block chip. Pure,
// deterministic, no I/O.
//
// D224 (founder order 2026-10-11, on Today: "Remove the recovery data from
// today. I don't want it there full stop."): the chip no longer reads any
// recovery signal. The lines it read from the shouldDeload training signal,
// the last session's soreness, sleep and energy, the recent fatigue trend,
// and the "recovering more slowly" adjustment are gone; recovery lives on
// the Recovery screen. What stays is the block's own calendar: a planned
// recovery week (the plan's week, not a reading), a first session, and the
// default block line.
//
// Voice: calm, plain, no score, no traffic-light judgement, no shame
// (COACHING_VOICE_SYNTHESIS_LOCKED). Reuses the same tone vocabulary as
// CoachBriefCard ('go' | 'caution' | 'recover') so the two read as one
// family rather than inventing a parallel scheme.

// Campaign 22 Phase 2 Stage 1 (HOME-TODAY-UX-SPEC.md §8, the "measured copy
// contradiction"): Priority 1 used to read `currentMesoWeek.isDeload` -- a
// PARALLEL derivation of the same fact `recoveryState.js`'s resolver already
// computes as `gatedRecoveryState`. The raw isDeload flag and the gated,
// position-aware resolved state can disagree (a block whose calendar has
// reached the deload row but still owes an outstanding accumulation session
// gates back to NORMAL_ACCUMULATION; the raw flag does not know that), which
// is exactly how this chip and RecoveryStateCard/the hero eyebrow could
// contradict each other in the same render. Fix: both surfaces now derive
// their recovery-tone line from the SAME resolved state -- this file never
// re-reads isDeload for the recovery-tone decision again.
import { isLighterTrainingState, RECOVERY_STATE } from './recoveryState';

/**
 * Builds the single line for Today's block chip.
 *
 * @param {object} input
 * @param {{isDeload?: boolean, weekIndex?: number, plannedWeeks?: number, rirTarget?: number}|null} input.currentMesoWeek
 * @param {object|null} [input.gatedRecoveryState] - the SAME resolved state
 *   `recoveryState.resolveRecoveryState()` produces (HomeScreen's
 *   `gatedRecoveryState`, position-gated), read ONLY for the block's planned
 *   recovery week, so this chip can never contradict the hero eyebrow.
 * @param {{startedAt?: number}|null} [input.lastSession] - the newest completed workout, read for its date only.
 * @returns {{tone: 'go'|'recover', line: string}|null}
 */
export function buildReadinessSummary({
  currentMesoWeek = null,
  gatedRecoveryState = null,
  lastSession = null,
  // C6 R-6: injectable clock for the recency bound. Pure - read once.
  nowMs = Date.now(),
} = {}) {
  // Nothing to say without an active training block.
  if (!currentMesoWeek) return null;

  // Priority 1: the block's planned recovery week, read from the resolved
  // state, never the raw isDeload flag (see the Stage 1 note above the
  // imports). The adaptive adjustment is a recovery reading and is not shown
  // on Today (D224).
  if (isLighterTrainingState(gatedRecoveryState) && gatedRecoveryState.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY) {
    // C6 RB6-3 (D97-25): an unearned calendar recovery week after a gap
    // states the calendar fact instead.
    const trainedRecently = Number.isFinite(Number(lastSession?.startedAt))
      && (nowMs - Number(lastSession.startedAt)) <= 14 * 86400000;
    return trainedRecently
      ? { tone: 'recover', line: 'Recovery week, lighter sessions.' }
      : { tone: 'recover', line: 'Recovery week on the calendar. Pick up whenever suits you.' };
  }

  // Priority 2 (lead activation ruling): no session logged yet, so "On
  // track" would claim a track record that does not exist. Founder device
  // order 2026-09-08: kept short enough to fit the chip.
  if (!lastSession) return { tone: 'go', line: 'See how this block works.' };

  // Priority 3: the default block line. Founder device order 2026-08-17: a
  // block fact, never an effort instruction; the week's shape stays one tap
  // away in the block-shape sheet (C22 single-counter law).
  return { tone: 'go', line: 'On track for this block.' };
}
