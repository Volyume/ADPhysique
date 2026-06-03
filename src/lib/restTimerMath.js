// Pure rest-timer math, kept dependency-free so it's unit-testable (the
// RestTimer component pulls in native modules that can't load in jest).

// Clamp a rest-timer adjustment so a decrement never drops below 5s and never
// flips sign (WK-4). The old form `Math.max(delta, -(remaining - 5))` inverted
// to a POSITIVE value when remaining < 5 (e.g. remaining 2: -(2-5) = +3), so a
// "-30s" tap added time. maxReduce is how much we may subtract (0 at/under 5s).
export function clampRestDelta(delta, remaining) {
  if (!Number.isFinite(delta)) return 0;
  if (delta >= 0) return delta;
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  const maxReduce = Math.max(0, safeRemaining - 5);
  const reduce = Math.min(-delta, maxReduce);
  return reduce === 0 ? 0 : -reduce; // avoid -0
}
