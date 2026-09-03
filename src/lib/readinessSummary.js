// Audit S15#7: readiness aggregate. Composes signals HomeScreen already
// computes (the mesocycle block-phase chip, the shouldDeload training
// signal, the last session's walked-in-with soreness/sleep/energy facts,
// and the recent-fatigue trend already used by buildCoachBrief) into ONE
// calm status line instead of leaving them scattered. No new sensors, no
// new data source: every input here is already loaded onto HomeScreen's
// state for its existing chip/banner. Pure, deterministic, no I/O.
//
// Deliberately NOT folded in: the top "Recovery week suggested" banner
// (dismissible, wired into the NAV-4 differential paywall trigger, so it
// stays a separate mechanism) and the weekly check-in runway (its own
// dedicated section with rows/unlock dates, not a stray chip). Folding
// those in would either duplicate paywall-trigger plumbing or flatten a
// richer section into one line for no benefit.
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

// Sleep/energy chips offer 2 (Poor/Low), 3 (OK), 4 (Good/High) on a 1-5
// domain; soreness offers 1 (Fresh), 2 (Mild), 3 (Sore) on a 1-3 domain
// (see HomeScreen's READINESS_ROWS). "Low" here means the chip value that
// reads as the bottom option the user actually picked.
const LOW_SLEEP_OR_ENERGY = 2;
const HIGH_SORENESS = 3;

// Same threshold buildCoachBrief's own fatigue rule uses, so the two never
// disagree about what counts as "fatigue building".
const FATIGUE_TREND_THRESHOLD = 3.5;

const FATIGUE_RECENCY_MS = 14 * 86400000;
// C6 RB6-4 (D97-25): 'fatigue has been building' and the 10%-reduction
// advice are PRESENT-TENSE claims from the last two rated sessions - at
// ANY age. After months away they narrated ancient sessions as current
// fatigue (the same class R-6 closed for the sibling caution). A rated
// session only counts here when it is inside the 14-day detraining
// boundary; undated rows cannot prove recency and are skipped.
const _recentRated = (rows, nowMs) => (rows ?? [])
  .filter((r) => {
    const t = Number(r?.startedAt ?? r?.started_at);
    return Number.isFinite(t) && (nowMs - t) <= FATIGUE_RECENCY_MS;
  });

function joinNatural(words) {
  if (words.length === 1) return words[0];
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * Builds the single readiness line for the Home mesocycle chip.
 *
 * @param {object} input
 * @param {{isDeload?: boolean, weekIndex?: number, plannedWeeks?: number, rirTarget?: number}|null} input.currentMesoWeek
 * @param {object|null} [input.gatedRecoveryState] - the SAME resolved state
 *   `recoveryState.resolveRecoveryState()` produces (HomeScreen's
 *   `gatedRecoveryState`, position-gated), used ONLY to decide/word Priority
 *   1 so this chip can never contradict RecoveryStateCard or the hero
 *   eyebrow. Optional so a caller with no block-position read yet degrades
 *   to Priority 2+ rather than throwing; never re-derived here.
 * @param {object|null} input.deloadSuggestion - shouldDeload() result, truthy when a recovery week is suggested.
 * @param {Array<{fatigueLevel?: number, fatigue_level?: number}>} [input.fatigueHistory] - newest-first, from getRecentWorkoutFeedback.
 * @param {{soreness24hBefore?: number|null, sleepQuality?: number|null, energyScore?: number|null}|null} [input.lastSession]
 * @returns {{tone: 'go'|'caution'|'recover', line: string}|null}
 */
export function buildReadinessSummary({
  currentMesoWeek = null,
  gatedRecoveryState = null,
  deloadSuggestion = null,
  fatigueHistory = [],
  lastSession = null,
  // C6 R-6: injectable clock for the recency bound; defaults keep every
  // existing caller unchanged. Pure - read once, never re-read.
  nowMs = Date.now(),
} = {}) {
  // Nothing to say without an active training block: this mirrors the
  // chip's existing visibility rule, only the content composes further.
  if (!currentMesoWeek) return null;

  // Priority 1: the block is DELIBERATELY lighter right now, for either
  // reason recoveryState.js distinguishes -- read from the resolved state,
  // never the raw isDeload flag (see the Stage 1 note above the imports).
  // Wording is guaranteed one-source-of-truth with RecoveryStateCard and the
  // hero eyebrow: whenever isLighterTrainingState(gatedRecoveryState) is
  // true here, it is true there too, because both consume the identical
  // resolver output.
  if (isLighterTrainingState(gatedRecoveryState)) {
    if (gatedRecoveryState.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY) {
      // C6 RB6-3 (D97-25): "pull effort back" implies effort was being spent
      // - an unearned calendar recovery week after a gap must state the
      // calendar fact instead, matching the R-4 advisor ruling. Recency is
      // judged from the same last-session evidence priority 3 uses.
      const trainedRecently = Number.isFinite(Number(lastSession?.startedAt))
        && (nowMs - Number(lastSession.startedAt)) <= 14 * 86400000;
      return trainedRecently
        ? { tone: 'recover', line: 'Recovery week, pull effort back.' }
        : { tone: 'recover', line: 'Recovery week on the calendar. Ease back in whenever suits you.' };
    }
    // ADAPTIVE_RECOVERY_ADJUSTMENT: still inside accumulation, so this must
    // never be worded as "recovery week" (that would claim the hard part of
    // the block is over, which recoveryStateCard's own copy rule forbids).
    return { tone: 'recover', line: 'Training is lighter for now while your recovery catches up.' };
  }

  // Priority 2: the training-data-driven suggestion (shouldDeload). Worded
  // distinctly from the dismissible "Recovery week suggested" banner above
  // so the two never read as the exact same sentence twice.
  if (deloadSuggestion) {
    return { tone: 'recover', line: 'Recent training signals point towards easing off soon.' };
  }

  // Priority 3: the soreness/sleep/energy facts captured on the pre-workout
  // prompt last time out. Today these are written and never read back to
  // the user anywhere; surfacing the low readings here closes that loop.
  // C6 R-6 (D97-22): "Last time out ... worth listening to that TODAY"
  // is a present-tense claim, and lastSession is simply the newest
  // completed workout at ANY age - after a six-month gap it narrated
  // ancient soreness as current state (a fabricated recovery assumption,
  // lapse law). The caution now requires the session to fall inside the
  // app's standing 14-day detraining boundary; an undated session cannot
  // prove recency and is treated as stale.
  const lastSessionRecent = Number.isFinite(Number(lastSession?.startedAt))
    && (nowMs - Number(lastSession.startedAt)) <= 14 * 86400000;
  const bits = [];
  if (lastSession?.soreness24hBefore != null && lastSession.soreness24hBefore >= HIGH_SORENESS) bits.push('sore');
  if (lastSession?.sleepQuality != null && lastSession.sleepQuality <= LOW_SLEEP_OR_ENERGY) bits.push('short on sleep');
  if (lastSession?.energyScore != null && lastSession.energyScore <= LOW_SLEEP_OR_ENERGY) bits.push('low on energy');
  if (bits.length > 0 && lastSessionRecent) {
    return { tone: 'caution', line: `Last time out you were ${joinNatural(bits)}. Worth listening to that today.` };
  }

  // Priority 4: fatigue trending up over the last couple of sessions (the
  // same rule and threshold buildCoachBrief uses for its own fatigue read).
  // Campaign 1 P0-7 D11: average RATED sessions only - the old ?? 0
  // dragged the mean toward zero on unrated sessions and suppressed the
  // caution. Requires two rated sessions before the rule speaks.
  const rated = _recentRated(fatigueHistory, nowMs)
    .map((r) => r.fatigueLevel ?? r.fatigue_level ?? null)
    .filter((v) => v != null);
  if (rated.length >= 2) {
    const recent = rated.slice(0, 2);
    const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
    if (avg >= FATIGUE_TREND_THRESHOLD) {
      return { tone: 'caution', line: 'Fatigue has been building over your last couple of sessions.' };
    }
  }

  // Priority 4.5 (lead activation ruling, this brief): no last session at
  // all yet -- the same "most recent session" input Priority 3 reads. With
  // nothing logged, "On track for this block" below would claim a track
  // record that does not exist. No second "N of M" counter here either,
  // per the C22 single-counter law the Priority 5 note above documents.
  if (!lastSession) {
    return { tone: 'go', line: 'First session of your plan. Nothing to read yet.' };
  }

  // Priority 5: default block-phase read.
  // RE-DECIDED (Campaign 22 Phase 2 Stage 2, HOME-TODAY-UX-SPEC.md §7/§15
  // item 4/§17 R3: "the hero shows a SINGLE counter"). C5-P12-02's own fix
  // (quoted below, kept for provenance) put a SECOND "N of M" counter here
  // to disambiguate it from the eyebrow's "Day 1 of 2" -- which fixed the
  // confusion but left two counters on the hero, exactly the "hero eyebrow
  // 'N of M' pair" §7 classifies as NOISE once a single wording source
  // exists. The eyebrow keeps the surviving position counter; the block-week
  // figure moves to the block-shape sheet this same chip already opens on
  // tap, so the fact is one tap away, never deleted. Original C5-P12-02
  // rationale: "The hero shows two unlabelled 'N of M' counters two lines
  // apart with different meanings -- 'Day 1 of 2' (position in the plan's
  // workout rotation) and this one (position in the block) -- so a
  // first-time user could reasonably read them as two mental models of the
  // same plan." Priority 1 to 4 wordings are deliberately untouched.
  // Founder device order 2026-08-17: the default line said "Stop N short of
  // failure" - an effort instruction with no function on Today, and nothing
  // to do with the block details the chip actually opens. The default now
  // states the block fact; the week's shape (including its effort target)
  // stays one tap away in the block-shape sheet, per the C22 single-counter
  // law (no second "N of M" on the hero).
  return {
    tone: 'go',
    line: 'On track for this block.',
  };
}
