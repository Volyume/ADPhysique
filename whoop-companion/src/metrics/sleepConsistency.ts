/**
 * Sleep Consistency — how similar your bed and wake times are night to night.
 * WHOOP delivers this pre-computed (FormattedTimeInBed.projectedSleepConsistency)
 * with no client formula in the APK, and shows a "Optimal bed/waketime" envelope
 * on the chart. We reproduce it with the standard regularity measure:
 *
 *   for each consecutive night pair, the circular |bedΔ| and |wakeΔ| in minutes,
 *   consistency = 100 · (1 − meanAbsΔ / SCALE), clamped 0–100
 *
 * where meanAbsΔ averages (|bedΔ|+|wakeΔ|)/2 over the window and SCALE=240 min
 * (4 h) is the zero-score spread. Bands (confirmed): Optimal 80+, Sufficient
 * 70–79, Poor <70. Needs ≥3 nights or it returns null ("calibrating").
 */

export type SleepConsistency = {
  score: number; // 0..100
  nights: number;
  bedMedianMin: number; // median bedtime, minutes-of-day (for the optimal envelope)
  wakeMedianMin: number; // median waketime, minutes-of-day
  bedSdMin: number;
  wakeSdMin: number;
};

const MIN_NIGHTS = 3;
const WINDOW = 5; // WHOOP shows the last 5 nights
const SCALE_MIN = 240; // 4 h spread → 0%
const DAY = 1440;

function clockMin(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/** Smallest circular difference between two clock-minute values (0..720). */
function circDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % DAY;
  return Math.min(d, DAY - d);
}

function circularMedianSd(times: number[]): { median: number; sd: number } {
  // Work in angle space so times either side of midnight don't distort.
  let s = 0;
  let c = 0;
  for (const t of times) {
    const ang = (t / DAY) * 2 * Math.PI;
    s += Math.sin(ang);
    c += Math.cos(ang);
  }
  s /= times.length;
  c /= times.length;
  const meanAng = Math.atan2(s, c);
  const median = ((meanAng / (2 * Math.PI)) * DAY + DAY) % DAY;
  const r = Math.sqrt(s * s + c * c);
  const sd = r <= 1e-6 ? DAY / 4 : (Math.sqrt(-2 * Math.log(r)) / (2 * Math.PI)) * DAY;
  return { median: Math.round(median), sd: Math.round(sd) };
}

export function sleepConsistency(
  windows: Array<{ startTs: number; endTs: number }>,
): SleepConsistency | null {
  const valid = windows
    .filter((w) => w.startTs > 0 && w.endTs > w.startTs)
    .sort((a, b) => a.endTs - b.endTs)
    .slice(-WINDOW);
  if (valid.length < MIN_NIGHTS) return null;
  const beds = valid.map((w) => clockMin(w.startTs));
  const wakes = valid.map((w) => clockMin(w.endTs));

  let sum = 0;
  let pairs = 0;
  for (let i = 1; i < valid.length; i += 1) {
    const bedD = circDelta(beds[i]!, beds[i - 1]!);
    const wakeD = circDelta(wakes[i]!, wakes[i - 1]!);
    sum += (bedD + wakeD) / 2;
    pairs += 1;
  }
  const meanAbs = pairs ? sum / pairs : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - meanAbs / SCALE_MIN))));

  const bed = circularMedianSd(beds);
  const wake = circularMedianSd(wakes);
  return {
    score,
    nights: valid.length,
    bedMedianMin: bed.median,
    wakeMedianMin: wake.median,
    bedSdMin: bed.sd,
    wakeSdMin: wake.sd,
  };
}
