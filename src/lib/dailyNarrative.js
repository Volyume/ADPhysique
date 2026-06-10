/**
 * dailyNarrative.js
 * Deterministic, explainable one-line "story" for the Train home screen.
 *
 * Pure function: same inputs -> same output. No DB calls, no side effects,
 * no AI, no randomness (a fixed priority order picks the single most relevant
 * line). Training-only inputs so it is safe to show on the free tier; it never
 * references weight, calories, or any Pro coaching surface.
 *
 * Jargon rule: no MEV/MAV/MRV/RIR/RPE/mesocycle in the output. British
 * English, no em dashes.
 */

/**
 * @param {object} args
 * @param {number|null} args.lastWorkoutDaysAgo  whole days since the last completed session
 * @param {number}      args.sessionsThisWeek    completed sessions in the current week
 * @param {number|null} args.lastSessionTonnage  total kg moved in the last session
 * @param {number}      args.totalSessions       lifetime completed session count
 * @param {boolean}     [args.hasActiveWorkout]  a session is in progress right now
 * @returns {string|null} one short line, or null when there is no story worth telling
 */
export function buildDailyNarrative(args = {}) {
  const a = (args && typeof args === 'object') ? args : {};
  const daysAgo = Number.isFinite(a.lastWorkoutDaysAgo) ? a.lastWorkoutDaysAgo : null;
  const sessionsThisWeek = Number.isFinite(a.sessionsThisWeek) ? a.sessionsThisWeek : 0;
  const tonnage = Number.isFinite(a.lastSessionTonnage) ? a.lastSessionTonnage : null;
  const total = Number.isFinite(a.totalSessions) ? a.totalSessions : 0;

  // A session in progress has its own prominent surface; stay quiet here.
  if (a.hasActiveWorkout) return null;
  // Brand-new user with nothing logged: the welcome state covers this.
  if (total <= 0 || daysAgo == null) return null;

  // Fixed priority order. The first matching line wins, so the most relevant
  // single story shows and the home screen never stacks narrative lines.

  // Trained today already.
  if (daysAgo === 0) {
    if (tonnage != null && tonnage > 0) {
      return `Logged today. ${formatTonnage(tonnage)} moved.`;
    }
    return 'Logged today. Good work.';
  }

  // Long layoff: welcome back gently, never scold.
  if (daysAgo >= 7) {
    return 'Welcome back. Ease into the first session.';
  }

  // Yesterday's session, with a concrete number when we have it.
  if (daysAgo === 1) {
    if (tonnage != null && tonnage > 0) {
      return `Yesterday you moved ${formatTonnage(tonnage)}. Recovered and ready.`;
    }
    if (sessionsThisWeek >= 2) {
      return `${sessionsThisWeek} sessions in this week. Strong rhythm.`;
    }
    return 'Yesterday is in the bank. Ready for the next one.';
  }

  // 2 or more rest days banked, but not a layoff.
  if (sessionsThisWeek >= 3) {
    return `${sessionsThisWeek} sessions this week. That is a full week of work.`;
  }
  if (daysAgo >= 2) {
    const d = daysAgo;
    return `${d} rest days banked. You will come in fresh.`;
  }

  return null;
}

function formatTonnage(kg) {
  // Compact, tabular-friendly: 12,400 kg -> "12.4 t"; smaller stays in kg.
  if (kg >= 1000) {
    const t = Math.round(kg / 100) / 10;
    return `${t} t`;
  }
  return `${Math.round(kg)} kg`;
}
