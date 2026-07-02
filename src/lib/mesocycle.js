/**
 * mesocycle.js
 * Standalone mesocycle scheduler, week progression, deload detection,
 * and autoregulation reader for the Volyume Coach Engine v2.
 *
 * Pure functions, no DB calls, no side effects.
 * All inputs are plain values or serialisable objects.
 */

// ---------------------------------------------------------------------------
// Mesocycle schedule constants
// ---------------------------------------------------------------------------

const MESO_SCHEDULE = {
  // beginner / intermediate: 4 accumulation + 1 recovery = 5 weeks
  standard: [
    { week: 1, phase: 'intro',   setsMultiplier: 1.00, label: 'Introduction week. Settle into the movements.' },
    { week: 2, phase: 'build',   setsMultiplier: 1.10, label: 'Build week. Push a little harder.' },
    { week: 3, phase: 'build',   setsMultiplier: 1.20, label: 'Build week. Keep the momentum going.' },
    { week: 4, phase: 'peak',    setsMultiplier: 1.25, label: 'Peak week. Your best effort this block.' },
    { week: 5, phase: 'recovery', setsMultiplier: 0.50, label: 'Recovery week. Back off and recharge.' },
  ],
  // advanced / competitive: 5 accumulation + 1 recovery = 6 weeks
  advanced: [
    { week: 1, phase: 'intro',   setsMultiplier: 1.00, label: 'Introduction week. Settle into the movements.' },
    { week: 2, phase: 'build',   setsMultiplier: 1.07, label: 'Build week. Add a little.' },
    { week: 3, phase: 'build',   setsMultiplier: 1.14, label: 'Build week. Keep climbing.' },
    { week: 4, phase: 'build',   setsMultiplier: 1.20, label: 'Build week. Push harder.' },
    { week: 5, phase: 'peak',    setsMultiplier: 1.25, label: 'Peak week. Your best effort this block.' },
    { week: 6, phase: 'recovery', setsMultiplier: 0.50, label: 'Recovery week. Back off and recharge.' },
  ],
};

// ---------------------------------------------------------------------------
// Week calculation
// ---------------------------------------------------------------------------

/**
 * Whole local calendar days from startMs to endMs, never negative.
 *
 * F10 (EN-11): the shared DST-safe day counter. Compare local calendar days
 * rather than raw ms deltas so a DST jump during the block (spring-forward /
 * fall-back) doesn't shift the user's week counter by a day. We anchor at
 * local midnight on each side and count whole calendar days, which is what
 * the user's calendar shows them anyway. Both getCurrentMesoWeek and
 * getBlockStatus count days through here so they can never disagree about
 * which week a date falls in.
 *
 * @param {number} startMs - epoch ms
 * @param {number} endMs - epoch ms
 * @returns {number} whole calendar days elapsed (>= 0)
 */
function localDaysElapsed(startMs, endMs) {
  const startDayMs = (() => { const d = new Date(startMs); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
  const endDayMs   = (() => { const d = new Date(endMs); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
  // Math.round: local midnights across a DST boundary sit 23 or 25 raw hours
  // apart, so rounding recovers the exact calendar-day count.
  return Math.max(0, Math.round((endDayMs - startDayMs) / (1000 * 60 * 60 * 24)));
}

/**
 * Returns which week of the current mesocycle we are in (1-indexed).
 * Wraps back to 1 after the schedule length.
 *
 * @param {string|number} startDateMs - epoch ms (or ISO string) of mesocycle start
 * @param {'beginner'|'intermediate'|'advanced'|'competitive'} experience
 * @param {number} [nowMs] - epoch ms to treat as "now"; defaults to Date.now().
 *   Injectable so tests can pin the clock without monkey-patching Date.
 * @returns {number} 1-based week number
 */
export function getCurrentMesoWeek(startDateMs, experience = 'intermediate', nowMs = Date.now()) {
  const schedule = getMesoSchedule(experience);
  const start = typeof startDateMs === 'string' ? new Date(startDateMs).getTime() : startDateMs;
  // CALC-8: an invalid start (NaN / undefined) used to propagate NaN out as the
  // week number. Fall back to week 1 instead.
  if (!Number.isFinite(start)) return 1;
  const daysElapsed = localDaysElapsed(start, nowMs);
  const weeksElapsed = Math.floor(daysElapsed / 7);
  return (weeksElapsed % schedule.length) + 1;
}

/**
 * Returns the full mesocycle schedule array for this experience level.
 *
 * @param {'beginner'|'intermediate'|'advanced'|'competitive'} experience
 * @returns {Array<{week, phase, setsMultiplier, label}>}
 */
export function getMesoSchedule(experience) {
  return (experience === 'advanced' || experience === 'competitive')
    ? MESO_SCHEDULE.advanced
    : MESO_SCHEDULE.standard;
}

/**
 * Returns the sets multiplier for a given mesocycle week.
 *
 * @param {number} mesoWeek - 1-indexed
 * @param {'beginner'|'intermediate'|'advanced'|'competitive'} experience
 * @returns {number}
 */
export function getWeekSetsMultiplier(mesoWeek, experience = 'intermediate') {
  const schedule = getMesoSchedule(experience);
  // CALC-8: wrap an out-of-range or non-finite week into the schedule (same
  // wrap getCurrentMesoWeek uses) instead of silently returning week 1. In-range
  // weeks map to themselves, so valid callers are unchanged.
  const wk = Number.isFinite(mesoWeek) ? Math.max(1, Math.round(mesoWeek)) : 1;
  const normalized = ((wk - 1) % schedule.length) + 1;
  const entry = schedule.find(s => s.week === normalized) ?? schedule[0];
  return entry.setsMultiplier;
}

/**
 * Returns whether the current week is a recovery (deload) week.
 *
 * @param {number} mesoWeek - 1-indexed
 * @param {'beginner'|'intermediate'|'advanced'|'competitive'} experience
 * @returns {boolean}
 */
export function isRecoveryWeek(mesoWeek, experience = 'intermediate') {
  const schedule = getMesoSchedule(experience);
  const entry = schedule.find(s => s.week === mesoWeek);
  return entry?.phase === 'recovery';
}

// ---------------------------------------------------------------------------
// Weekly set targets with mesocycle progression
// ---------------------------------------------------------------------------

/**
 * Applies the mesocycle multiplier to a set of base targets (MEV-start values).
 *
 * @param {Object.<string, number>} baseSets - { muscle: weeklySetCount }
 * @param {number} mesoWeek - 1-indexed
 * @param {'beginner'|'intermediate'|'advanced'|'competitive'} experience
 * @returns {Object.<string, number>} adjusted set counts (rounded to nearest integer)
 */
export function getVolumeTargetsForWeek(baseSets, mesoWeek, experience = 'intermediate') {
  const multiplier = getWeekSetsMultiplier(mesoWeek, experience);
  const out = {};
  for (const [muscle, sets] of Object.entries(baseSets)) {
    out[muscle] = Math.round(sets * multiplier);
  }
  return out;
}

/**
 * Builds the complete week-by-week set progression table for one muscle.
 *
 * @param {number} baseSets - MEV start-of-block set count for this muscle
 * @param {number} mrvSets - MRV ceiling for this muscle (caps peak week)
 * @param {'beginner'|'intermediate'|'advanced'|'competitive'} experience
 * @returns {Array<{week, phase, setsMultiplier, plannedSets, label}>}
 */
export function buildWeeklyProgression(baseSets, mrvSets, experience = 'intermediate') {
  const schedule = getMesoSchedule(experience);
  return schedule.map(entry => ({
    ...entry,
    plannedSets: Math.min(mrvSets, Math.round(baseSets * entry.setsMultiplier)),
  }));
}

// ---------------------------------------------------------------------------
// Autoregulation reader
// ---------------------------------------------------------------------------

/**
 * Computes the autoregulation adjustment recommendation based on a
 * window of recent session feedback objects.
 *
 * Feedback object shape:
 *   {
 *     sessionDifficulty:  1-5  (1=Very Easy, 5=Brutal)
 *     overallPump:        1-3  (1=None, 3=Good)
 *     soreness24hBefore:  1-3  (1=Fresh, 3=Sore)
 *     fatigueLevel:       1-5  (1=Fresh, 5=Exhausted)
 *     jointDiscomfort:    0-3  (0=None, 3=Significant)
 *   }
 *
 * Returns an action object:
 *   {
 *     action:    'continue' | 'hold_volume' | 'reduce_volume' | 'deload_now'
 *     setsAdjust: number  (signed %; e.g. -10 means drop 10%)
 *     message:   string   (plain English, jargon-free, ≤25 words)
 *   }
 *
 * @param {Object[]} feedbackWindow - last 1–4 sessions (most recent last)
 * @returns {{ action: string, setsAdjust: number, message: string }}
 */
export function evaluateAutoReg(feedbackWindow = []) {
  if (!feedbackWindow.length) {
    return { action: 'continue', setsAdjust: 0, message: 'Keep logging sessions and we\'ll start making personalised adjustments.' };
  }

  // Weight recent sessions more heavily
  const weights = feedbackWindow.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  function weightedAvg(field) {
    return feedbackWindow.reduce((sum, fb, i) => sum + (fb[field] ?? 0) * weights[i], 0) / totalWeight;
  }

  const avgDifficulty    = weightedAvg('sessionDifficulty');   // 1–5
  const avgFatigue       = weightedAvg('fatigueLevel');         // 1–5
  const avgSoreness      = weightedAvg('soreness24hBefore');    // 1–3
  const avgPump          = weightedAvg('overallPump');           // 1–3

  // Joint discomfort is an emergency brake
  const latestFb = feedbackWindow[feedbackWindow.length - 1];
  if ((latestFb?.jointDiscomfort ?? 0) >= 3) {
    return {
      action: 'deload_now',
      setsAdjust: -50,
      message: 'Joint discomfort is significant. Cut your sets roughly in half this week and avoid any painful movements.',
    };
  }

  // Multi-session joint discomfort (≥2 twice in window)
  const jointAlerts = feedbackWindow.filter(fb => (fb.jointDiscomfort ?? 0) >= 2).length;
  if (jointAlerts >= 2) {
    return {
      action: 'reduce_volume',
      setsAdjust: -20,
      message: 'Persistent joint discomfort detected. Dropping sets by around 20% this week. Swap any painful exercises.',
    };
  }

  // Exhaustion pattern
  if (avgFatigue >= 4.5 && avgDifficulty >= 4.5) {
    return {
      action: 'deload_now',
      setsAdjust: -50,
      message: 'Multiple very hard sessions with high fatigue. Your body is asking for a lighter week.',
    };
  }

  // Overreaching signals: high fatigue + coming in sore
  if (avgFatigue >= 4 && avgSoreness >= 2.5) {
    return {
      action: 'reduce_volume',
      setsAdjust: -15,
      message: 'Coming into sessions sore with high fatigue. Trim your sets by around 15% this week to protect recovery.',
    };
  }

  // Sessions brutally hard with poor pump (poor recovery/absorption)
  if (avgDifficulty >= 4.2 && avgPump <= 1.3) {
    return {
      action: 'hold_volume',
      setsAdjust: 0,
      message: 'Sessions feel hard but muscles feel flat. Keep your sets steady for now until recovery improves.',
    };
  }

  // Positive signal: sessions feel manageable, good pump, low soreness
  if (avgDifficulty <= 2.5 && avgPump >= 2.5 && avgSoreness <= 1.5 && avgFatigue <= 2.5) {
    return {
      action: 'continue',
      setsAdjust: 0,
      message: 'Recovery is excellent. Stay on track and add a set where sessions feel short.',
    };
  }

  // Slightly hard but managing
  if (avgDifficulty >= 3.8 && avgFatigue >= 3.5) {
    return {
      action: 'hold_volume',
      setsAdjust: 0,
      message: 'Training is challenging. Keep your sets steady this week and focus on sleep and nutrition.',
    };
  }

  return {
    action: 'continue',
    setsAdjust: 0,
    message: 'All signals normal. Continue the plan as written.',
  };
}

// ---------------------------------------------------------------------------
// Deload prediction
// ---------------------------------------------------------------------------

/**
 * Predicts how many weeks until a recovery week is likely needed,
 * based on current mesocycle position and recent feedback trend.
 *
 * @param {Object[]} feedbackWindow - recent sessions
 * @param {number}   mesoWeek       - current 1-indexed week
 * @param {'beginner'|'intermediate'|'advanced'|'competitive'} experience
 * @returns {{ weeksUntilDeload: number | null, reason: string }}
 */
export function predictDeloadWeek(feedbackWindow = [], mesoWeek = 1, experience = 'intermediate') {
  const schedule = getMesoSchedule(experience);
  const totalWeeks = schedule.length;
  const recoveryWeek = schedule.find(s => s.phase === 'recovery')?.week ?? totalWeeks;

  // Weeks left in this block before the scheduled recovery week
  const weeksToScheduled = recoveryWeek - mesoWeek;

  if (weeksToScheduled <= 0) {
    return { weeksUntilDeload: 0, reason: 'This is your rest week. Keep sessions lighter this week.' };
  }

  if (!feedbackWindow.length) {
    return {
      weeksUntilDeload: weeksToScheduled,
      reason: `Scheduled rest week is in ${weeksToScheduled} ${weeksToScheduled === 1 ? 'week' : 'weeks'}.`,
    };
  }

  // Check autoReg result
  const autoReg = evaluateAutoReg(feedbackWindow);

  if (autoReg.action === 'deload_now') {
    return {
      weeksUntilDeload: 0,
      reason: 'Fatigue signals suggest taking a lighter week now rather than waiting.',
    };
  }

  if (autoReg.action === 'reduce_volume') {
    const early = Math.max(1, weeksToScheduled - 1);
    return {
      weeksUntilDeload: early,
      reason: `Fatigue is building. Rest week likely in about ${early} ${early === 1 ? 'week' : 'weeks'}.`,
    };
  }

  return {
    weeksUntilDeload: weeksToScheduled,
    reason: `Scheduled rest week is in ${weeksToScheduled} ${weeksToScheduled === 1 ? 'week' : 'weeks'}.`,
  };
}

// ---------------------------------------------------------------------------
// Time-crunch session trimmer
// ---------------------------------------------------------------------------

/**
 * Applies a "time crunch" adjustment to a session plan:
 * - Reduces rest between sets by 30%
 * - Drops the lowest-priority isolation exercises until the session fits
 *
 * @param {Object[]} exercises      - array of exercise objects with restSec, sets, etc.
 * @param {number}   targetMinutes  - hard cap for the trimmed session
 * @param {number}   estimateFn     - function(exercises) => estimated minutes
 * @returns {{ exercises: Object[], restReduction: number, dropped: string[] }}
 */
export function applyTimeCrunch(exercises, targetMinutes, estimateFn, options = {}) {
  if (!exercises?.length) {
    return { exercises: [], restReduction: 0.30, dropped: [] };
  }

  // Starter-session bounds (COMP-013). Off by default: when neither is set the
  // function behaves exactly as before for every existing caller. When set, a
  // final deterministic trim (Step 3) caps the session to a finishable subset.
  const { maxSetsPerExercise, maxExercises } = options;
  const hasStarterTrim = maxSetsPerExercise != null || maxExercises != null;

  // Step 1: reduce rest by 30%
  const withReducedRest = exercises.map(ex => ({
    ...ex,
    restSec: Math.round((ex.restSec ?? 90) * 0.70),
  }));

  if (!hasStarterTrim && estimateFn(withReducedRest) <= targetMinutes) {
    return { exercises: withReducedRest, restReduction: 0.30, dropped: [] };
  }

  // Starter sessions (COMP-013): a finishable subset that does NOT depend on the
  // minutes budget. Keep the first `maxExercises` in plan order and cap each at
  // `maxSetsPerExercise` — deterministic, the same lifts and order as Day 1, the
  // first N exercises (not the first N of an isolation-dropped survivor list).
  // This runs INSTEAD of the budget-fit isolation drop below.
  if (hasStarterTrim) {
    let starter = withReducedRest;
    const starterDropped = [];
    if (maxExercises != null && starter.length > maxExercises) {
      for (const ex of starter.slice(maxExercises)) starterDropped.push(ex.exerciseName);
      starter = starter.slice(0, maxExercises);
    }
    if (maxSetsPerExercise != null) {
      starter = starter.map(ex => ({ ...ex, sets: Math.min(ex.sets ?? 0, maxSetsPerExercise) }));
    }
    return { exercises: starter, restReduction: 0.30, dropped: starterDropped };
  }

  // Step 2: drop lowest-priority isolation exercises (compound always protected)
  // Priority order: compound > isolation (by compoundIsolation tag); within each, sort by sets
  const dropped = [];

  // Sort a working copy: compounds first, then isolations by fewest sets (easiest to drop)
  const sorted = [...withReducedRest].sort((a, b) => {
    const aIsIso = (a.compoundIsolation === 'isolation') ? 1 : 0;
    const bIsIso = (b.compoundIsolation === 'isolation') ? 1 : 0;
    if (aIsIso !== bIsIso) return aIsIso - bIsIso; // compounds first
    return (a.sets ?? 0) - (b.sets ?? 0); // fewer sets → drop first (still within isolation)
  });

  // We need to maintain original order for the exercises we keep;
  // build a removable set index
  const removable = sorted
    .filter(ex => ex.compoundIsolation === 'isolation')
    .reverse(); // last in sorted (highest sets) comes first in candidates

  let result = [...withReducedRest];
  for (const candidate of removable) {
    if (estimateFn(result) <= targetMinutes) break;
    const idx = result.findIndex(ex => ex.exerciseName === candidate.exerciseName && ex.sets === candidate.sets);
    if (idx !== -1) {
      dropped.push(result[idx].exerciseName);
      result.splice(idx, 1);
    }
  }

  return { exercises: result, restReduction: 0.30, dropped };
}


// ---------------------------------------------------------------------------
// Block completion detection
// ---------------------------------------------------------------------------

/**
 * Determines where a training block is in its lifecycle.
 *
 * @param {string|number} startDateMs - ISO date string or epoch ms of block start
 * @param {number} plannedWeeks - total weeks in the block (includes recovery week)
 * @returns {{
 *   status: 'active' | 'recovery' | 'complete' | 'overdue',
 *   currentWeek: number,
 *   totalWeeks: number,
 *   weeksOverdue: number,
 *   recoveryWeek: number,
 * }}
 *
 * Status meaning:
 *   active   , still in the accumulation phase, keep training
 *   recovery , currently in the final (lighter) week of the block
 *   complete , recovery week just finished (0–13 days overdue)
 *   overdue  , block finished 2+ weeks ago, strongly prompt transition
 */
export function getBlockStatus(startDateMs, plannedWeeks = 5, nowMs = Date.now()) {
  let start = typeof startDateMs === 'string' ? new Date(startDateMs).getTime() : (startDateMs ?? nowMs);
  // Wave-3 review: mirror getCurrentMesoWeek's CALC-8 guard. An unparseable
  // stored start date used to propagate NaN into currentWeek/weeksOverdue
  // ('Week NaN' in any consumer). Treat it as a block starting now (week 1).
  if (!Number.isFinite(start)) start = nowMs;
  // F10 (EN-11): count whole LOCAL calendar days via the same DST-safe
  // anchoring getCurrentMesoWeek uses (localDaysElapsed). The old raw-ms
  // floor lost an hour across a DST change, so the two functions could
  // disagree by a day — and therefore by a whole week at a week boundary —
  // about where the block stands.
  const daysElapsed = localDaysElapsed(start, nowMs);
  const currentWeek = Math.floor(daysElapsed / 7) + 1;
  const recoveryWeek = plannedWeeks; // last week is always recovery

  let status;
  if (currentWeek < recoveryWeek) {
    status = 'active';
  } else if (currentWeek === recoveryWeek) {
    status = 'recovery';
  } else if (currentWeek <= recoveryWeek + 1) {
    status = 'complete';
  } else {
    status = 'overdue';
  }

  return {
    status,
    currentWeek,
    totalWeeks: plannedWeeks,
    weeksOverdue: Math.max(0, currentWeek - recoveryWeek - 1),
    recoveryWeek,
  };
}
