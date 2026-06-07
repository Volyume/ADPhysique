/**
 * cardio/cardioEngine.js
 *
 * Pure coach logic for cardio: structured targets, compliance, week summary,
 * next-week adjustment, and the recovery flag. No DB, no store, no screens, so
 * the whole "brains" of cardio is unit-tested without a device. weeklyCoach.js
 * calls these; it owns the gating (when cardio is a lever), this owns the dose.
 *
 * Principles (audit Phases 4-6):
 *   - The coach sets a DOSE (sessions x duration x intensity), never an
 *     activity. The user always picks what they do.
 *   - Cut = cardio is a deficit lever (after food + steps). Non-cut = a light
 *     health habit that never escalates and never risks the surplus.
 *   - Compliance comes from the actual log, not a self-report.
 *   - Recovery: high-impact cardio that stacks against training gets flagged;
 *     poor recovery pauses cardio.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

// Session cap so the coach can never spiral cardio in a cut.
export const MAX_CARDIO_SESSIONS = 5;

/**
 * The deficit-lever target for a cut. Base is 3 easy sessions; a long stall in
 * an aggressive cut adds an interval session on top (the existing "Cardio
 * boost" behaviour, now structured). Returns a target object.
 */
export function cutCardioTarget(consecutiveOffTargetWeeks = 0, goalPhase = 'mod_cut') {
  const longAggStall = num(consecutiveOffTargetWeeks) >= 4 && goalPhase === 'agg_cut';
  if (longAggStall) {
    return {
      mode: 'deficit',
      sessionsPerWeek: 3,
      minMinutes: 20,
      maxMinutes: 30,
      intensity: 'low',
      includesInterval: true,
      paused: false,
      note: 'Aim for 3 easy cardio sessions, 20 to 30 min, plus one short interval session (10 to 15 min). Your choice of activity.',
    };
  }
  return {
    mode: 'deficit',
    sessionsPerWeek: 3,
    minMinutes: 20,
    maxMinutes: 30,
    intensity: 'low',
    includesInterval: false,
    paused: false,
    note: 'Aim for 3 cardio sessions this week, 20 to 30 min at an easy pace. Your choice of activity.',
  };
}

/**
 * The light health target for a non-cut phase (bulk / maintenance / general
 * fitness) when the user has cardio enabled. Never a deficit lever, never
 * escalates, kept low so it cannot eat the surplus or recovery.
 */
export function healthCardioTarget() {
  return {
    mode: 'health',
    sessionsPerWeek: 2,
    minMinutes: 20,
    maxMinutes: 30,
    intensity: 'low',
    includesInterval: false,
    paused: false,
    note: '2 easy cardio sessions this week for heart health. Keep it light so it does not cut into your training.',
  };
}

/** The paused target (poor recovery). */
export function pausedCardioTarget(mode = 'deficit') {
  return {
    mode, sessionsPerWeek: 0, minMinutes: 0, maxMinutes: 0,
    intensity: 'low', includesInterval: false, paused: true,
    note: 'Cardio paused this week. Recovery takes priority.',
  };
}

/**
 * Compliance verdict from the actual logged session count vs the target.
 * 'hit' >= target, 'mostly' >= half, else 'missed'. A zero target is 'hit'.
 */
export function cardioComplianceFromLog(sessionsLogged, target) {
  const goal = num(target?.sessionsPerWeek);
  if (goal <= 0) return 'hit';
  const done = num(sessionsLogged);
  if (done >= goal) return 'hit';
  if (done >= goal / 2) return 'mostly';
  return 'missed';
}

/**
 * Summarise a week of cardio_log rows for the Plans card, check-in and coach.
 * Rows: { duration_min, est_kcal, intensity, recovery_impact } (or camelCase).
 * Pure; tolerant of either casing and missing fields.
 */
export function summariseWeekCardio(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let sessions = 0, totalMinutes = 0, totalKcal = 0, highImpactSessions = 0;
  for (const r of list) {
    sessions += 1;
    totalMinutes += num(r?.duration_min ?? r?.durationMin);
    totalKcal += num(r?.est_kcal ?? r?.estKcal);
    const impact = r?.recovery_impact ?? r?.recoveryImpact;
    if (impact === 'high') highImpactSessions += 1;
  }
  return { sessions, totalMinutes, totalKcal, highImpactSessions };
}

/**
 * Next week's target from this week's compliance. Mirrors the steps lever:
 *   - poor recovery -> pause.
 *   - health mode -> never escalate, hold the light target.
 *   - deficit + still off-trend + hit the target + room -> add one session.
 *   - deficit + missed -> hold and ask to hit the current target first.
 *   - otherwise -> hold.
 *
 *   { currentTarget, sessionsLogged, stillOffTrendInCut, poorRecovery }
 */
export function nextCardioTarget({ currentTarget, sessionsLogged, stillOffTrendInCut, poorRecovery, complianceOverride = null } = {}) {
  const cur = currentTarget || cutCardioTarget();
  const mode = cur.mode || 'deficit';

  if (poorRecovery) return pausedCardioTarget(mode);
  if (mode === 'health') return { ...healthCardioTarget() };

  // Prefer the check-in's compliance verdict when supplied. It is itself
  // pre-filled from the log and may be user-overridden (cardio done but not
  // logged here), so honouring it lets the coach act on what actually
  // happened rather than only the raw logged count.
  const compliance = (complianceOverride === 'hit' || complianceOverride === 'mostly' || complianceOverride === 'missed')
    ? complianceOverride
    : cardioComplianceFromLog(sessionsLogged, cur);

  if (stillOffTrendInCut && compliance === 'hit' && cur.sessionsPerWeek < MAX_CARDIO_SESSIONS) {
    const sessionsPerWeek = cur.sessionsPerWeek + 1;
    return {
      ...cur,
      sessionsPerWeek,
      paused: false,
      note: `Trend is still behind, and you hit your cardio. Add one more session this week (${sessionsPerWeek} total), 20 to 30 min, your choice of activity.`,
    };
  }
  if (compliance === 'missed') {
    return {
      ...cur,
      paused: false,
      note: `You logged ${num(sessionsLogged)} of ${cur.sessionsPerWeek} cardio sessions. Hit that consistently before adding more.`,
    };
  }
  return { ...cur, paused: false };
}

/**
 * The optional one-line recovery flag (R2). Fires when high-impact cardio is
 * stacking up, especially while recovery is trending down. Returns a string or
 * null. Never alarmist, one line (CLAUDE voice).
 *
 *   { weekSummary, recoveryTrendDown, legDayCollision }
 */
export function cardioRecoveryFlag({ weekSummary, recoveryTrendDown, legDayCollision } = {}) {
  const s = weekSummary || {};
  const high = num(s.highImpactSessions);
  if (legDayCollision) {
    return 'Your hard cardio is landing next to leg day. Move it to a rest day or after legs, not before.';
  }
  if (high >= 3 && recoveryTrendDown) {
    return 'Your cardio is adding up while recovery is sliding. Keep it low-impact this week, or trim a session.';
  }
  if (high >= 4) {
    return 'That is a lot of hard cardio this week. Some easy, low-impact sessions would protect your training.';
  }
  return null;
}
