// Per-muscle recovery / freshness banding. PURE + DETERMINISTIC: no AI, no
// randomness, no clock reads — the caller passes in days-since-last-trained
// (already computed from getLastTrainedByMuscle). Given how long ago a muscle
// was last trained and a sensible per-muscle recovery window, this returns a
// freshness band so the heatmap can show "fresh vs recently trained" alongside
// the volume-vs-target view. This is a presentation layer only; it never feeds
// the coaching engine and never lowers any safety floor.

// Recovery windows in DAYS: roughly how long a muscle needs before it reads as
// fully recovered ("fresh"). Smaller, fast-recovering muscles (calves, abs,
// forearms) clear sooner than large compound movers (back, quads, hamstrings).
// These are display heuristics, not training prescriptions. Keys mirror
// VOLUME_LANDMARKS / MUSCLE_DISPLAY_NAMES in algorithms.js.
export const RECOVERY_WINDOW_DAYS = {
  chest: 2,
  back: 3,
  front_delts: 2,
  side_delts: 2,
  rear_delts: 2,
  biceps: 2,
  triceps: 2,
  forearms: 1,
  quads: 3,
  hamstrings: 3,
  glutes: 2,
  adductors: 2,
  calves: 1,
  abs: 1,
  traps: 2,
  neck: 2,
  tibialis: 1,
};

// Fallback window for any muscle without an explicit entry above.
export const DEFAULT_RECOVERY_WINDOW_DAYS = 2;

// Freshness bands, ordered fatigued -> recovering -> fresh.
export const FRESHNESS_BANDS = ['fatigued', 'recovering', 'fresh'];

// Resolve the recovery window (days) for a muscle key. Non-finite / unknown
// keys fall back to the default. Pure.
export function recoveryWindowDays(muscle) {
  const w = RECOVERY_WINDOW_DAYS[muscle];
  return Number.isFinite(w) ? w : DEFAULT_RECOVERY_WINDOW_DAYS;
}

// Banding logic (deterministic, boundary-inclusive on the "fresh" side):
//   daysSince <= 0                  -> 'fatigued'   (trained today)
//   0 < daysSince < window          -> 'recovering' (mid-recovery)
//   daysSince >= window             -> 'fresh'      (window elapsed)
// Null / undefined / non-finite daysSince (a muscle never trained, or sparse
// data) returns null so the caller can render a neutral "no data" state rather
// than guess. A negative window is clamped to 1 so the bands stay well-ordered.
export function freshnessBand(daysSince, muscle) {
  if (daysSince == null || !Number.isFinite(daysSince)) return null;
  const window = Math.max(1, recoveryWindowDays(muscle));
  if (daysSince <= 0) return 'fatigued';
  if (daysSince >= window) return 'fresh';
  return 'recovering';
}
