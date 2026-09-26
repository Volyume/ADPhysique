const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Indexed by the stored check-in day (0 = Sunday, matching HomeScreen).
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDay(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function formatDayFull(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekRangeLabel(weekStartMs) {
  if (weekStartMs == null) return 'Week dates unavailable';
  const startMs = Number(weekStartMs);
  if (!Number.isFinite(startMs)) return 'Week dates unavailable';
  const end = new Date(startMs + 6 * 24 * 60 * 60 * 1000);
  return `${formatDay(startMs)} to ${formatDayFull(end)}`;
}

// C6 RB6-9 (D97-25): the Monday redirect opens the LATEST completed
// decision at any age, and while auto-apply refuses anything past a week
// (D97-10) the manual Apply buttons stay live - deliberately, resuming
// is the user's tap. What was missing (R-1/R-2's sibling, recorded
// inside CLEAN entry R-29 and never carried) was any statement that the
// decision is old: the card was dated but never said "this has not
// moved since". One line of provenance on a decision older than its own
// week; no gate, no threshold change, the buttons stay live.
export function decisionAgeNote(weekStartMs, liveWeekStartMs) {
  if (weekStartMs == null || liveWeekStartMs == null) return null;
  const w = Number(weekStartMs);
  const live = Number(liveWeekStartMs);
  if (!Number.isFinite(w) || !Number.isFinite(live) || w <= 0 || live <= 0) return null;
  if (live - w <= 7 * 86400000) return null;
  return 'This decision covers the dates above and has not been updated since.';
}

export function buildOffItems(output, checkin) {
  const items = [];
  if (!output) return items;
  const { sessionsCompleted, sessionsPlanned } = output;
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned * 0.75) {
    items.push(`You hit ${sessionsCompleted} of ${sessionsPlanned} sessions.`);
  }
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    items.push(`Your sleep averaged ${checkin.sleepHours.toFixed(1)} hours.`);
  }
  if (checkin?.jointPain) {
    items.push('You flagged joint pain.');
  }
  if (checkin?.energyScore != null && checkin.energyScore <= 2) {
    items.push('Energy was low this week.');
  }
  if (checkin?.sorenessScore != null && checkin.sorenessScore >= 4) {
    items.push('Soreness was high.');
  }
  if (checkin?.calsAdherence === 'untracked') {
    items.push('You did not log your calories.');
    // D88 audit note: the two branches below are currently UNREACHABLE.
    // checkinDerive.js only ever writes 'yes' | 'no' | 'untracked', so a user
    // who misses their target always gets the generic line further down. The
    // copy is kept because it is correct and ready if calsAdherence is ever
    // extended to carry direction; that would be a product decision, not a
    // copy fix, so nothing is wired here.
  } else if (checkin?.calsAdherence === 'under') {
    items.push('You came in under your calorie target.');
  } else if (checkin?.calsAdherence === 'over') {
    items.push('You went over your calorie target.');
  } else if (checkin?.calsAdherence === 'no') {
    items.push('You were off your calorie target.');
  }
  return items;
}

export function buildFocus(output, checkin) {
  if (!output) return null;
  const { sessionsCompleted, sessionsPlanned, trend } = output;
  if (!trend?.delta && trend?.deltaLabel === 'Log morning weight') {
    return 'Log morning weight every day. The trend gets sharper with each log.';
  }
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    return 'Sleep is the priority this week. Aim for 7 hours or more. Nothing else moves until it does.';
  }
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    return `Hit all ${sessionsPlanned} sessions. Adherence beats everything else.`;
  }
  if (checkin?.jointPain) {
    return 'Reduce load on the painful joint. Substitute exercises if needed.';
  }
  if (checkin?.calsAdherence === 'untracked') {
    return 'Track your calories this week. Without that, the calorie target cannot be adjusted reliably.';
  }
  if (checkin?.calsAdherence === 'over' || checkin?.calsAdherence === 'no') {
    return 'Stay inside the calorie target.';
  }
  return 'Keep doing what you did this week.';
}

export const CONFIDENCE_CAPTIONS = {
  high: 'Confidence: high. A full week of data sits behind this decision.',
  medium: 'Confidence: medium. Some data was thin this week, so changes are sized cautiously.',
  low: 'Confidence: low. The trend is still building, so this week stays conservative.',
};

// ─── The "Your week" rows (D206, founder order 2026-09-26) ─────────────────
//
// "Cut the duplicate": the Coaching decision screen printed the same few
// facts three to five times over (stat chips, the coach's acknowledgement,
// the working/off ledger, the story's "what happened", the focus card). The
// week's facts now appear ONCE, as rows: a fact's name, its value, and at
// most one status mark. Pure: every value is read from facts the screen
// already holds; nothing here computes a new judgement.
//
// Marks are deliberately sparse. Training effort may be marked done
// ('good') or short ('attention'); a wellbeing answer that is worth a look
// is marked 'attention'. A body-weight row and a food row NEVER carry a
// mark: colour is never a verdict on body weight (styling HARD RULES) and,
// conservatively, never on food either.

/** The Weekly check-in's own scale words, 1 to 5 (WeeklyCheckInScreen). */
export const ENERGY_LABELS = Object.freeze({ 1: 'Low', 2: 'Below normal', 3: 'Normal', 4: 'Good', 5: 'High' });
export const SORENESS_LABELS = Object.freeze({ 1: 'None', 2: 'Mild', 3: 'Moderate', 4: 'High', 5: 'Very high' });

/** The check-in's calorie answer, as a value (never a mark). */
const CALORIE_VALUES = Object.freeze({
  yes: 'Hit your target',
  no: 'Off target',
  under: 'Under target',
  over: 'Over target',
  untracked: 'Not tracked',
});

const finite = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const capitalise = (s) => (typeof s === 'string' && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * @param {object} input
 * @param {number} [input.sessionsCompleted]
 * @param {number} [input.sessionsPlanned]
 * @param {number} [input.prsThisWeek]
 * @param {{value: string, icon: string, label: string, tooltip?: string}|null} [input.weight]
 *   the screen's already-formatted 7-day trend (units honoured there)
 * @param {{value: string, label: string, tooltip?: string}|null} [input.rate]
 *   the decision's coaching rate, as the engine labelled it
 * @param {object|null} [input.context] the coach context the run decided from
 * @param {object|null} [input.checkin] this week's check-in answers
 * @returns {Array<{key: string, icon: string, label: string, value: string,
 *   mark: ('good'|'attention'|null), tooltip: (string|null)}>}
 */
export function buildWeekRows({
  sessionsCompleted = null, sessionsPlanned = null, prsThisWeek = null,
  weight = null, rate = null, context = null, checkin = null,
} = {}) {
  const rows = [];
  const push = (key, icon, label, value, mark = null, tooltip = null) => {
    rows.push({ key, icon, label, value, mark, tooltip });
  };

  // Training.
  const done = finite(sessionsCompleted);
  const planned = finite(sessionsPlanned);
  if (planned != null && planned > 0 && done != null) {
    const mark = done >= planned ? 'good' : done < planned * 0.75 ? 'attention' : null;
    push('sessions', 'barbell-outline', 'Sessions', `${done} of ${planned}`, mark);
  } else if (done != null && done > 0) {
    push('sessions', 'barbell-outline', 'Sessions', String(done));
  }
  const progress = context?.training?.progress?.signal ?? null;
  if (progress === 'good') push('lifts', 'trending-up-outline', 'Main lifts', 'Moving up', 'good');
  else if (progress === 'poor') push('lifts', 'trending-up-outline', 'Main lifts', 'Not moving', 'attention');
  const prs = finite(prsThisWeek);
  if (prs != null && prs > 0) push('prs', 'flash-outline', 'PRs', String(prs), 'good');

  // Body weight: never marked.
  if (weight?.value) push('weight', weight.icon ?? 'remove-outline', weight.label ?? '7-day trend', weight.value, null, weight.tooltip ?? null);
  if (rate?.value) push('rate', 'analytics-outline', rate.label ?? 'Coaching trend', capitalise(rate.value), null, rate.tooltip ?? null);

  // Food: never marked.
  const coverage = context?.nutrition?.coverage ?? null;
  const days = finite(coverage?.value);
  if (days != null) push('food', 'restaurant-outline', 'Food logged', `${days} of 7 days`);
  const cals = checkin?.calsAdherence ?? null;
  if (cals && CALORIE_VALUES[cals]) push('calories', 'flame-outline', 'Calories', CALORIE_VALUES[cals]);

  // Recovery: an answer worth a look is marked; a fine one is simply stated.
  const energy = finite(checkin?.energyScore);
  if (energy != null && ENERGY_LABELS[energy]) {
    push('energy', 'battery-half-outline', 'Energy', ENERGY_LABELS[energy], energy <= 2 ? 'attention' : null);
  }
  const soreness = finite(checkin?.sorenessScore);
  if (soreness != null && SORENESS_LABELS[soreness]) {
    push('soreness', 'body-outline', 'Soreness', SORENESS_LABELS[soreness], soreness >= 4 ? 'attention' : null);
  }
  const sleep = finite(checkin?.sleepHours);
  if (sleep != null) {
    push('sleep', 'moon-outline', 'Sleep', `${sleep.toFixed(1)} h a night`, sleep < 6.5 ? 'attention' : null);
  }
  if (checkin?.jointPain) push('joints', 'medkit-outline', 'Joints', 'Flagged', 'attention');
  if (context?.recovery?.systemic?.signal === 'poor') {
    push('recovery', 'pulse-outline', 'Recovery', 'Harder than usual', 'attention');
  }
  return rows;
}

/**
 * Split an engine sentence into a row's title and its reason at the first
 * full stop ("Calories held. Trend is on target." -> title + sub). The
 * words are untouched; only where the line breaks changes. A sentence
 * with no second part is all title.
 */
export function splitLead(text) {
  if (typeof text !== 'string' || !text.trim()) return { title: '', sub: null };
  const at = text.indexOf('. ');
  if (at < 0) return { title: text.trim(), sub: null };
  return { title: text.slice(0, at + 1).trim(), sub: text.slice(at + 2).trim() || null };
}

/**
 * The coaching rate as a row value: signed like the 7-day trend row beside
 * it ("+0.28%/wk", "-0.4%/wk"), "Steady" inside the engine's own 0.01 band.
 * The number is the engine's coachingRatePct (C10F), already rounded for
 * display; nothing is recalculated. Non-finite input returns null.
 */
export function formatCoachingRate(pct) {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return null;
  if (Math.abs(pct) <= 0.01) return 'Steady';
  return `${pct > 0 ? '+' : '-'}${Math.abs(pct)}%/wk`;
}
