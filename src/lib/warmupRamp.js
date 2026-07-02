/**
 * warmupRamp — deterministic warm-up ramp from the working weight (B8,
 * audit 05 §B8: "pure arithmetic, not a coaching decision").
 *
 * The scheme is the standard strength-community ramp, fixed and identical
 * for everyone:
 *
 *   bar × 10   (barbell exercises only — get the pattern moving)
 *   40% × 5
 *   60% × 3
 *   80% × 2
 *
 * Percentages are of the working weight, rounded to the nearest 2.5 kg
 * (the house stepper increment — gym weights are kg-only by design).
 * Rows that collapse into each other after rounding, fall to or below the
 * bar (barbell) or zero (everything else), or reach the working weight are
 * dropped, so light lifts get a shorter ramp and very light lifts get none.
 *
 * IMPORTANT (recorded product decision, ActiveWorkoutScreen): warm-up
 * suggestions must NEVER auto-appear — an earlier auto-suggest chip was
 * removed because it appeared uninvited on every first set and made no
 * sense inside supersets. This module only computes; the screen shows the
 * result strictly behind an explicit user tap (the exercise overflow
 * sheet), and tapping a row marks the entry as a Warm-up set via the same
 * setType machinery as the manual picker. Keep it pull, never push.
 *
 * Pure, no I/O, deterministic.
 */

export const WARMUP_STEPS = [
  { pct: 0.4, reps: 5 },
  { pct: 0.6, reps: 3 },
  { pct: 0.8, reps: 2 },
];

const roundTo = (kg, inc) => Math.round(kg / inc) * inc;

/**
 * @param {number} workingKg the working weight the ramp leads up to
 * @param {object} [opts]
 * @param {boolean} [opts.isBarbell=false] include the empty-bar row and
 *   floor percentage rows at the bar weight
 * @param {number} [opts.barKg=20] bar weight when isBarbell
 * @param {number} [opts.roundKg=2.5] rounding increment
 * @returns {{weight: number, reps: number, isBar: boolean}[]} ordered
 *   light-to-heavy; empty when the working weight is invalid or already
 *   light enough that no ramp row fits below it
 */
export function warmupRamp(workingKg, { isBarbell = false, barKg = 20, roundKg = 2.5 } = {}) {
  const working = Number(workingKg);
  if (!Number.isFinite(working) || working <= 0) return [];
  // Junk options fall back to the defaults rather than poisoning the
  // arithmetic: roundTo(w, 0) divides by zero and a NaN bar passes no
  // comparison, either of which would render "NaN kg" rows.
  const bar = Number(barKg);
  const safeBar = Number.isFinite(bar) && bar > 0 ? bar : 20;
  const inc = Number(roundKg);
  const safeInc = Number.isFinite(inc) && inc > 0 ? inc : 2.5;

  const rows = [];
  if (isBarbell && working > safeBar) {
    rows.push({ weight: safeBar, reps: 10, isBar: true });
  }

  for (const step of WARMUP_STEPS) {
    let w = roundTo(working * step.pct, safeInc);
    if (isBarbell) w = Math.max(w, safeBar);
    // Normalise -0 from rounding and drop rows that add nothing: at or
    // below the previous row, at or above the working weight, or zero.
    w += 0;
    const prev = rows.length ? rows[rows.length - 1].weight : 0;
    if (w <= prev || w >= working || w <= 0) continue;
    rows.push({ weight: w, reps: step.reps, isBar: false });
  }

  return rows;
}
