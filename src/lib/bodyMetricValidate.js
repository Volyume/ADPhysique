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

import { stoneLbsToKg, parseBodyWeightToKg } from './units';
// A7 (pre-release sweep 2026-07-27): explicit calendar-validity check for the
// freeform metric_date field, shared with ProGoalSetupScreen's show date.
import { isValidCalendarDateString, parseCalendarDateString, INVALID_CALENDAR_DATE_MESSAGE } from './calendarDateValidate';

// Realistic human ranges. Generous on purpose (see header).
export const BODY_WEIGHT_MIN_KG = 20;
export const BODY_WEIGHT_MAX_KG = 500;
export const BODY_FAT_MIN_PCT = 1;
export const BODY_FAT_MAX_PCT = 80;
export const CIRCUMFERENCE_MIN_CM = 1;
export const CIRCUMFERENCE_MAX_CM = 300;

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
export function validateBodyMetricForm(form, { bwu } = {}) {
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
    data.loggedAt = parseCalendarDateString(trimmedDate);
  } else {
    data.loggedAt = Date.now();
  }

  let hasValidField = false;

  // Body weight, converted to kg from the user's display unit first.
  const bwEntered = bwu === 'st' ? !!f.body_weight_st : !!f.body_weight;
  if (bwEntered) {
    const kg = bwu === 'st'
      ? stoneLbsToKg(f.body_weight_st, f.body_weight_st_lbs || '0')
      : parseBodyWeightToKg(f.body_weight, bwu);
    if (!isValidBodyWeightKg(kg)) {
      return { ok: false, message: 'That body weight looks off. Enter a realistic figure and try again.' };
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
    data.bodyFatSource = 'manual';
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
