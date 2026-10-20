// D228 item 2, tier c: the line Body metrics prints in the weight's place under
// an open flag, imported so the two screens can never say it differently.
import { BODY_METRICS_FLAG_LINE } from '../bodyMetricsPolicy';
import { formatBodyWeightRate } from '../units';

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
    return 'Log your morning weight every day. Each weigh-in makes your weight trend clearer.';
  }
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    return 'Sleep is the priority this week. Aim for 7 hours or more. Nothing else will improve until your sleep does.';
  }
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    return `Get all ${sessionsPlanned} sessions done. Sticking to the plan matters more than anything else.`;
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

/**
 * Item 12: the confidence line names its basis. `assessDataConfidence`
 * (weeklyCoach.js) reads morning-weigh-in days and the check-in answers,
 * never food or sessions, so that is all this line claims. The count is the
 * screen's observable weigh-in count; null falls back to the plain basis.
 * Safe under calm and an open flag: it quotes a count of weigh-ins, never a
 * weight (owner 2026-10-20). At low and medium confidence the engine needs
 * three off-target weeks instead of two before it changes calories
 * (weeklyCoach.js offTargetWeeksRequired); it never makes a change smaller.
 */
export function buildConfidenceLine(level, weighIns = null) {
  const n = Number.isFinite(weighIns) ? weighIns : null;
  const basis = n == null
    ? 'Based on your morning weigh-ins and your check-in.'
    : `Based on ${n} morning weigh-in${n === 1 ? '' : 's'} and your check-in.`;
  if (level === 'high') return `Confidence: high. ${basis}`;
  if (level === 'medium') {
    return `Confidence: medium. ${basis} That is less to go on than usual, so your coach waits an extra week before changing your calorie target.`;
  }
  if (level === 'low') {
    return `Confidence: low. ${basis} Your weight trend is still taking shape, so your coach waits an extra week before changing your calorie target.`;
  }
  return null;
}

/**
 * Item 15: the fourth part of a decision, when it is looked at again, and
 * from when a change takes effect. `pending` is true while an adjustment
 * waits for the person's tap (never in Manual mode, which has no Apply and
 * already says so above). Names the check-in day when it is known. Shown
 * on every decision, hold weeks included; it states no weight and no food.
 */
export function buildTimingLine({ checkinDayName = null, pending = false } = {}) {
  const again = checkinDayName
    ? `Your coach looks at this again at your ${checkinDayName} check-in.`
    : 'Your coach looks at this again at your next check-in.';
  if (pending) return `A change starts from the moment you tap Apply. ${again}`;
  return again;
}

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
 * @param {boolean} [input.withholdWeight] D228 item 2, tier c: true under an
 *   open ED flag, a failed safety read or the unknown state (never calm alone).
 *   The weight row then prints the Body metrics line in the chip's place, with
 *   no direction glyph and no gloss, and the coaching-rate row is left out.
 * @param {boolean} [input.suppressed] the safety verdict (`safetyState.js`
 *   `suppressed`: calm OR an open flag OR a failed read, and the unknown
 *   state). True leaves out the food rows (Food logged, Calories) and every
 *   good/attention mark, matching Today, which shows no rows at all then.
 * @param {object|null} [input.context] the coach context the run decided from
 * @param {object|null} [input.checkin] this week's check-in answers
 * @returns {Array<{key: string, icon: string, label: string, value: string,
 *   mark: ('good'|'attention'|null), tooltip: (string|null)}>}
 */
export function buildWeekRows({
  sessionsCompleted = null, sessionsPlanned = null, prsThisWeek = null,
  weight = null, rate = null, context = null, checkin = null, withholdWeight = false,
  suppressed = false,
} = {}) {
  const rows = [];
  const push = (key, icon, label, value, mark = null, tooltip = null, wrap = false) => {
    rows.push({ key, icon, label, value, mark: suppressed ? null : mark, tooltip, ...(wrap ? { wrap: true } : {}) });
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
  else if (progress === 'poor') push('lifts', 'trending-up-outline', 'Main lifts', 'Not going up', 'attention');
  const prs = finite(prsThisWeek);
  if (prs != null && prs > 0) push('prs', 'flash-outline', 'PRs', String(prs), 'good');

  // Body weight: never marked.
  if (withholdWeight) {
    // Withheld (D228 item 2, tier c): the weekly change and the coaching rate
    // are weight-change figures, and the arrow is the direction of one. The
    // row says only what Body metrics says; `wrap` lets the sentence run to
    // the lines the largest text size needs instead of clipping at two.
    push('weight', 'scale-outline', 'Body weight', BODY_METRICS_FLAG_LINE, null, null, true);
  } else {
    // Item 15: ONE weight row, the coaching rate (the number the decision was
    // made from). The scale reading moves into its info sheet. With no rate
    // (an output from before C10F) the scale reading stays as it was.
    if (rate?.value) {
      const scale = weight?.value && weight.value !== 'No weights logged'
        ? ` Your scale reading over the same seven days: ${weight.value}.` : '';
      push('rate', 'analytics-outline', rate.label ?? 'Coaching trend', capitalise(rate.value), null, `${rate.tooltip ?? ''}${scale}`.trim() || null);
    } else if (weight?.value) {
      push('weight', weight.icon ?? 'remove-outline', weight.label ?? '7-day trend', weight.value, null, weight.tooltip ?? null);
    }
  }

  // Food: never marked, and left out entirely under the safety verdict.
  if (!suppressed) {
    const coverage = context?.nutrition?.coverage ?? null;
    const days = finite(coverage?.value);
    if (days != null) push('food', 'restaurant-outline', 'Food logged', `${days} of 7 days`);
    const cals = checkin?.calsAdherence ?? null;
    if (cals && CALORIE_VALUES[cals]) push('calories', 'flame-outline', 'Calories', CALORIE_VALUES[cals]);
  }

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
/**
 * Item 15: the coaching rate in the person's own body-weight unit (kg users
 * read kg a week; lb and stone users read lb a week, the app's one spelling
 * of a rate, units.formatBodyWeightRate). Worked out from the engine's own
 * %/wk and its smoothed weight, nothing re-judged. "Steady" inside the
 * engine's 0.01 band. Null when either number is missing: no figure is
 * better than the old %/wk. Weight figures: the caller withholds this row
 * under withholdsWeightFigures.
 */
export function formatCoachingRateWeight(pct, weightKg, bodyWeightUnits = 'st') {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return null;
  if (Math.abs(pct) <= 0.01) return 'Steady';
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  const kgPerWeek = (pct / 100) * weightKg;
  const out = formatBodyWeightRate(kgPerWeek, bodyWeightUnits);
  // A rate that rounds to nothing in the person's unit reads as steady.
  return /^[+-]?0 /.test(out) ? 'Steady' : out;
}

export function formatCoachingRate(pct) {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return null;
  if (Math.abs(pct) <= 0.01) return 'Steady';
  return `${pct > 0 ? '+' : '-'}${Math.abs(pct)}%/wk`;
}
