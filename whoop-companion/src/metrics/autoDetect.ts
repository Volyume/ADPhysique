/**
 * Auto-activity detection — finds sustained elevated-HR periods that look like a
 * workout you didn't manually start, so the app can SUGGEST adding them (WHOOP/
 * Garmin do the same). We never auto-create: the user confirms. A candidate is a
 * run of ≥15 min with HR at/above ~60% of max (zone 2+), tolerating brief dips,
 * that doesn't overlap an already-logged activity.
 */

import { hrMaxFor, UserProfile } from './strain';

export type DetectedActivity = {
  startTs: number;
  endTs: number;
  avgHr: number;
  label?: string;
  steps?: number | null;
  cadenceSpm?: number | null;
};

const MIN_MINUTES = 15;
const GAP_TOLERANCE_MIN = 3; // brief dips below threshold don't end the bout

export function detectActivities(
  perMin: Array<{ tsMs: number; hr: number }>,
  profile: UserProfile,
  existing: Array<{ startTs: number; endTs: number }>,
): DetectedActivity[] {
  if (perMin.length < MIN_MINUTES) return [];
  const thr = hrMaxFor(profile) * 0.6;

  const out: DetectedActivity[] = [];
  let runStart = -1;
  let runHrs: number[] = [];
  let gap = 0;
  let lastIdxTs = 0;

  const flush = (endTs: number) => {
    if (runStart >= 0 && runHrs.length >= MIN_MINUTES) {
      const avg = Math.round(runHrs.reduce((a, b) => a + b, 0) / runHrs.length);
      out.push({ startTs: runStart, endTs, avgHr: avg });
    }
    runStart = -1;
    runHrs = [];
    gap = 0;
  };

  for (const p of perMin) {
    if (p.hr >= thr) {
      if (runStart < 0) runStart = p.tsMs;
      runHrs.push(p.hr);
      gap = 0;
    } else if (runStart >= 0) {
      gap += 1;
      if (gap > GAP_TOLERANCE_MIN) flush(lastIdxTs);
    }
    lastIdxTs = p.tsMs;
  }
  flush(lastIdxTs);

  // Drop candidates overlapping an already-logged activity.
  return out.filter((d) => !existing.some((e) => d.startTs < e.endTs && d.endTs > e.startTs));
}
