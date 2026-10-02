/**
 * bodyMetricValidate.js
 *
 * Pure, shared validators plus the save-gate for user-entered body metrics.
 *
 * DATA-001 (adversarial audit): the BodyMetrics save gate used to treat only
 * body weight, body fat or CHEST as "a measurement", so a waist-only /
 * arm-only / thigh-only / hip-only / calf-only entry was rejected even though
 * the copy promises "at least ... one measurement". Separately the save loop
 * stored any finite parsed value with no sign or range check, so a negative or
 * physically impossible measurement could land in SQLite and then poison the
 * trend charts and the nutrition EWMA.
 *
 * These functions reject impossible values (negatives, zero, mistyped
 * 5000 kg) before they reach the database. The ranges are deliberately
 * generous: the job is to catch corrupt / mistyped input, not to police
 * plausible-but-unusual bodies. No I/O and no store reads, so this is safe to
 * unit-test and to import from a screen without pulling in the DB layer.
 */
// Comma-decimal tolerance on typed input (pre-release sweep 2026-07-27, B1).
import { parseDecimalInput } from './parseDecimalInput';

import { stoneLbsToKg, parseBodyWeightToKg, formatBodyWeight } from './units';
import { formatWeightAmount } from './bodyMetricsDisplay';
import { localDayKey } from './dayKey';
// A7 (pre-release sweep 2026-07-27): explicit calendar-validity check for the
// freeform metric_date field, shared with ProGoalSetupScreen's show date.
import { isValidCalendarDateString, parseCalendarDateString, INVALID_CALENDAR_DATE_MESSAGE } from './calendarDateValidate';

// Realistic human ranges. Generous on purpose (see header).
/** The form's own words when a weight is outside its range; Home's strip says the same (review S10). */
export const BODY_WEIGHT_RANGE_MESSAGE = 'That body weight looks off. Enter a realistic figure and try again.';
export const BODY_WEIGHT_MIN_KG = 20;
export const BODY_WEIGHT_MAX_KG = 500;
export const BODY_FAT_MIN_PCT = 1;
export const BODY_FAT_MAX_PCT = 80;
export const CIRCUMFERENCE_MIN_CM = 1;
export const CIRCUMFERENCE_MAX_CM = 300;

// D214 addendum 4 (Body metrics, lane 7; spec docs/audit/
// progress-recovery-consistency-audit-2026-10-01/
// 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 item 3): a weigh-in is for today
// or an earlier day, never a later one (BM-40: a date in 2027 was accepted and
// became the "newest" entry, the hero and the Progress card's 14-day test).
export const FUTURE_DATE_MESSAGE = 'That date is in the future. A weigh-in can only be logged for today or an earlier day.';

// The body-fat methods the person can name, the same four the setup wizard
// offers (ProOnboardingScreen BODY_FAT_SOURCE_OPTIONS) and the same values the
// engine reads (nutritionEngine isBaselineBodyFatSource /
// isAuthoritativeBodyFatSource). `coachGlossary.bodyFatMethod` explains them.
export const BODY_FAT_METHODS = Object.freeze([
  { value: 'visual', label: 'Best estimate' },
  { value: 'bia', label: 'BIA' },
  { value: 'caliper', label: 'Caliper' },
  { value: 'dexa', label: 'DEXA' },
]);
export const DEFAULT_BODY_FAT_METHOD = 'visual';
// FOUNDER-DECIDED 2026-10-02 (D214 addendum 11; the question was addendum 7,
// lane 7 question 1; CLAUDE.md section 2, the FFM energy floor): the form asks
// how a body-fat figure was measured (DEXA, caliper, smart scale, best
// estimate) and stores it, as the setup wizard does. A measured method moves
// the person's FFM floor to their typed figure through
// nutritionEngine.computeFFMFloor, exactly as it does from the wizard; the old
// form always stored 'manual' (the sex-based fallback floor). The engine is
// untouched: this is the wizard's own route, now open from the form too.
export const BODY_FAT_METHOD_CHOICE = true;

// The plausibility rule (spec section 3 item 3): a typed weigh-in more than 5%
// or 5 kg from the last one is asked about before it is saved. Whichever
// bound is smaller applies, so for anyone under 100 kg it is the 5% bound.
export const PLAUSIBILITY_FRACTION = 0.05;
export const PLAUSIBILITY_KG = 5;

/**
 * Is a typed weigh-in far enough from the last one to ask about?
 * @param {number} kg      the typed weight in kg
 * @param {?number} lastKg the last weigh-in in kg, or null when there is none
 * @returns {{ implausible: boolean, diffKg: number }} diffKg = kg - lastKg
 */
export function weighInPlausibility(kg, lastKg) {
  const k = Number(kg);
  const last = Number(lastKg);
  if (!Number.isFinite(k) || !Number.isFinite(last) || last <= 0) return { implausible: false, diffKg: 0 };
  const diffKg = k - last;
  const bound = Math.min(PLAUSIBILITY_KG, PLAUSIBILITY_FRACTION * last);
  return { implausible: Math.abs(diffKg) > bound, diffKg };
}

/**
 * The one sentence the plausibility prompt carries, in the person's units
 * (Body metrics' form and Home's quick entry share it).
 * @returns {string} e.g. "That is 54 kg below your last weigh-in of 82.4 kg. Save it anyway?"
 */
export function plausibilityMessage({ kg, lastKg, bwu, withholdFigures = false }) {
  // Under an open flag or calm mode (D214 addendum 7, lane 7 open question
  // 14) the prompt still guards the series against a typo, but carries no
  // figure and no direction: a withhold strengthened, never weakened.
  if (withholdFigures) return 'That is a long way from your last weigh-in. Save it anyway?';
  const diff = Number(kg) - Number(lastKg);
  const relation = diff < 0 ? 'below' : 'above';
  return `That is ${formatWeightAmount(Math.abs(diff), bwu)} ${relation} your last weigh-in of ${formatBodyWeight(lastKg, bwu)}. Save it anyway?`;
}

// Body weight in kg: finite, positive, within a realistic human range.
export function isValidBodyWeightKg(kg) {
  const n = parseDecimalInput(kg);
  return Number.isFinite(n) && n >= BODY_WEIGHT_MIN_KG && n <= BODY_WEIGHT_MAX_KG;
}

// Body fat as a percentage: finite, within a realistic range.
export function isValidBodyFatPercent(pct) {
  const n = parseDecimalInput(pct);
  return Number.isFinite(n) && n >= BODY_FAT_MIN_PCT && n <= BODY_FAT_MAX_PCT;
}

// A body circumference in cm: finite, positive (>= 1cm), within a realistic
// range. Rejects negatives, zero and absurd values.
export function isValidCircumferenceCm(cm) {
  const n = parseDecimalInput(cm);
  return Number.isFinite(n) && n >= CIRCUMFERENCE_MIN_CM && n <= CIRCUMFERENCE_MAX_CM;
}

// Circumference inputs only (body weight and body fat are handled separately,
// each with their own unit). form-key → SQLite field + a friendly label used
// in the calm rejection copy.
export const CIRCUMFERENCE_FIELDS = [
  { key: 'chest',      dbField: 'chestCm',     label: 'chest' },
  { key: 'shoulders',  dbField: 'shouldersCm', label: 'shoulders' },
  { key: 'arms',       dbField: 'armCm',       label: 'arm' },
  { key: 'forearms',   dbField: 'forearmCm',   label: 'forearm' },
  { key: 'waist',      dbField: 'waistCm',     label: 'waist' },
  { key: 'hips',       dbField: 'hipsCm',      label: 'hip' },
  { key: 'quads',      dbField: 'thighCm',     label: 'thigh' },
  { key: 'hamstrings', dbField: 'hamCm',       label: 'hamstring' },
  { key: 'calves',     dbField: 'calfCm',      label: 'calf' },
];

/**
 * Pure save-gate for a body-metric form. Returns one of:
 *   { ok: true,  data }      — `data` is ready to hand to logBodyMetric()
 *   { ok: false, message }   — a calm, British-English reason for the toast
 *
 * "One measurement" means ANY non-empty VALID field: body weight, body fat,
 * or any single circumference (not just chest). Any entered value that is
 * non-finite, non-positive or outside a realistic range fails the whole save,
 * so an impossible figure is never stored.
 */
export function validateBodyMetricForm(form, { bwu, nowMs = Date.now() } = {}) {
  const f = form || {};
  const data = { notes: f.notes || null };

  // A7 (pre-release sweep 2026-07-27): the date field used to go straight
  // into `new Date(f.metric_date)`, and a native Date silently rolls an
  // impossible-but-syntactically-shaped date ("2026-02-30") forward to a
  // different real date with no error, so getTime() is finite and the old
  // NaN fallback never caught it -- a mistyped date landed silently on the
  // wrong day. An explicit calendar check now rejects it with a calm message
  // instead of guessing. An empty date still defaults to now, exactly as
  // before.
  const trimmedDate = f.metric_date ? String(f.metric_date).trim() : '';
  if (trimmedDate) {
    if (!isValidCalendarDateString(trimmedDate)) {
      return { ok: false, message: INVALID_CALENDAR_DATE_MESSAGE };
    }
    // D214 addendum 4: no future dates. 'YYYY-MM-DD' compares correctly as a
    // string once the calendar check above has passed.
    const todayKey = localDayKey(nowMs);
    if (trimmedDate > todayKey) return { ok: false, message: FUTURE_DATE_MESSAGE };
    // An entry for today carries the time it was made (the replace notice
    // names the earlier weigh-in's time); an earlier day is dated at its
    // local midnight, as before.
    data.loggedAt = trimmedDate === todayKey ? nowMs : parseCalendarDateString(trimmedDate);
  } else {
    data.loggedAt = nowMs;
  }

  let hasValidField = false;

  // Body weight, converted to kg from the user's display unit first.
  const bwEntered = bwu === 'st' ? !!f.body_weight_st : !!f.body_weight;
  if (bwEntered) {
    const kg = bwu === 'st'
      ? stoneLbsToKg(f.body_weight_st, f.body_weight_st_lbs || '0')
      : parseBodyWeightToKg(f.body_weight, bwu);
    if (!isValidBodyWeightKg(kg)) {
      return { ok: false, message: BODY_WEIGHT_RANGE_MESSAGE };
    }
    data.weightKg = kg;
    hasValidField = true;
  }

  // Body fat %. Stored with its source so a future scale/scan import can be
  // told apart from a typed-in value.
  if (f.body_fat !== '' && f.body_fat != null) {
    const bf = parseDecimalInput(f.body_fat);
    if (!isValidBodyFatPercent(bf)) {
      return { ok: false, message: 'That body fat looks off. Enter a percentage between 1 and 80.' };
    }
    data.bodyFatPercent = Math.round(bf * 10) / 10;
    // D214 addendum 4: the method the person named (the form asks); 'manual'
    // stays the value for a caller that names none.
    data.bodyFatSource = BODY_FAT_METHOD_CHOICE && BODY_FAT_METHODS.some((m) => m.value === f.body_fat_source)
      ? f.body_fat_source
      : 'manual';
    hasValidField = true;
  }

  // Circumference measurements (cm).
  for (const { key, dbField, label } of CIRCUMFERENCE_FIELDS) {
    if (f[key] !== '' && f[key] != null) {
      const n = parseDecimalInput(f[key]);
      if (!isValidCircumferenceCm(n)) {
        return { ok: false, message: `That ${label} measurement looks off. Enter a realistic figure in cm.` };
      }
      data[dbField] = n;
      hasValidField = true;
    }
  }

  if (!hasValidField) {
    return { ok: false, message: 'Enter at least body weight, body fat, or one measurement.' };
  }

  return { ok: true, data };
}
