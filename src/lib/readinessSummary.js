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

// Sleep/energy chips offer 2 (Poor/Low), 3 (OK), 4 (Good/High) on a 1-5
// domain; soreness offers 1 (Fresh), 2 (Mild), 3 (Sore) on a 1-3 domain
// (see HomeScreen's READINESS_ROWS). "Low" here means the chip value that
// reads as the bottom option the user actually picked.
const LOW_SLEEP_OR_ENERGY = 2;
const HIGH_SORENESS = 3;

// Same threshold buildCoachBrief's own fatigue rule uses, so the two never
// disagree about what counts as "fatigue building".
const FATIGUE_TREND_THRESHOLD = 3.5;

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
 * @param {object|null} input.deloadSuggestion - shouldDeload() result, truthy when a recovery week is suggested.
 * @param {Array<{fatigueLevel?: number, fatigue_level?: number}>} [input.fatigueHistory] - newest-first, from getRecentWorkoutFeedback.
 * @param {{soreness24hBefore?: number|null, sleepQuality?: number|null, energyScore?: number|null}|null} [input.lastSession]
 * @returns {{tone: 'go'|'caution'|'recover', line: string}|null}
 */
export function buildReadinessSummary({
  currentMesoWeek = null,
  deloadSuggestion = null,
  fatigueHistory = [],
  lastSession = null,
} = {}) {
  // Nothing to say without an active training block: this mirrors the
  // chip's existing visibility rule, only the content composes further.
  if (!currentMesoWeek) return null;

  // Priority 1: the plan itself has scheduled a deload this week. The most
  // concrete signal there is, since it does not depend on interpreting data.
  if (currentMesoWeek.isDeload) {
    return { tone: 'recover', line: 'Deload week, pull effort back.' };
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
  const bits = [];
  if (lastSession?.soreness24hBefore != null && lastSession.soreness24hBefore >= HIGH_SORENESS) bits.push('sore');
  if (lastSession?.sleepQuality != null && lastSession.sleepQuality <= LOW_SLEEP_OR_ENERGY) bits.push('short on sleep');
  if (lastSession?.energyScore != null && lastSession.energyScore <= LOW_SLEEP_OR_ENERGY) bits.push('low on energy');
  if (bits.length > 0) {
    return { tone: 'caution', line: `Last time out you were ${joinNatural(bits)}. Worth listening to that today.` };
  }

  // Priority 4: fatigue trending up over the last couple of sessions (the
  // same rule and threshold buildCoachBrief uses for its own fatigue read).
  if (fatigueHistory.length >= 2) {
    const recent = fatigueHistory.slice(0, 2);
    const avg = recent.reduce((s, r) => s + (r.fatigueLevel ?? r.fatigue_level ?? 0), 0) / recent.length;
    if (avg >= FATIGUE_TREND_THRESHOLD) {
      return { tone: 'caution', line: 'Fatigue has been building over your last couple of sessions.' };
    }
  }

  // Priority 5: default block-phase read, today's chip text unchanged.
  const rirBit = currentMesoWeek.rirTarget != null ? ` - stop ${currentMesoWeek.rirTarget} short of failure` : '';
  return {
    tone: 'go',
    line: `Week ${currentMesoWeek.weekIndex} of ${currentMesoWeek.plannedWeeks ?? '-'}${rirBit}`,
  };
}
