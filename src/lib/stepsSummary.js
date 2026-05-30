/**
 * stepsSummary: turn a week of daily_steps rows into the single figure the
 * weekly coach and the check-in use.
 *
 * Registered (automatic) path: at least `minDays` of the last seven days carry
 * a step count, so the average of the logged days is a fair weekly figure.
 * Below that threshold the week is too sparse to trust, so `registered` is
 * false and the check-in falls back to asking the user for an average.
 *
 * Pure and side-effect free. Rows are { steps } shaped; any other fields are
 * ignored. A zero or missing step count does not count as a logged day.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */

export const DEFAULT_MIN_DAYS = 4;

export function summariseWeekSteps(rows, minDays = DEFAULT_MIN_DAYS) {
  const logged = (Array.isArray(rows) ? rows : [])
    .map((r) => Math.round(Number(r?.steps) || 0))
    .filter((n) => n > 0);

  const daysLogged = logged.length;
  const avgSteps = daysLogged > 0
    ? Math.round(logged.reduce((a, b) => a + b, 0) / daysLogged)
    : null;
  const registered = daysLogged >= minDays;

  return { daysLogged, avgSteps, registered };
}
