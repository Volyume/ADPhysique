/**
 * Walking-minutes to estimated-steps conversion, for the no-wearable path.
 *
 * Roughly 80% of users have no tracker, so the daily step entry cannot
 * assume a number read off a device. The standard coaching workaround
 * (docs/audit/volyume-cardio-steps-audit-2026-05-30.md, real-world coaching
 * section) is to take self-reported walking minutes and convert at a normal
 * cadence. Moderate walking is about 100 to 120 steps a minute; we use 110
 * as the midpoint and round to the nearest 100 so the result reads as the
 * estimate it is, not a false-precision figure.
 *
 * This is deliberately an estimate and is labelled as one in the UI. Phone
 * and self-report step figures are not exact, so we never present a converted
 * number as a measured one.
 */

export const STEPS_PER_MINUTE = 110;

// Convert walking minutes to an estimated step count, rounded to the
// nearest 100. Returns 0 for non-positive or non-finite input.
export function estimateStepsFromMinutes(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return 0;
  const raw = m * STEPS_PER_MINUTE;
  return Math.round(raw / 100) * 100;
}
