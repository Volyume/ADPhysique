/**
 * Sleep Regularity — Oura checks both your bedtime and wake-time consistency over
 * the trailing ~2 weeks. We measure the circular spread of bed and wake clock
 * times (circular statistics, so times either side of midnight don't distort the
 * mean) and map a tighter spread to a higher score.
 *
 * Needs several nights of stored sleep windows (sleep_start / sleep_end), so it
 * populates as history accumulates.
 */

export type SleepRegularity = {
  score: number; // 0..100
  bedSdMin: number; // circular SD of bedtimes (minutes)
  wakeSdMin: number; // circular SD of wake times (minutes)
  nights: number;
};

const MIN_NIGHTS = 5;
const MINUTES_PER_DAY = 1440;

function clockMinutes(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/** Circular standard deviation of a set of clock-minute values (0..1439). */
function circularSdMinutes(times: number[]): number {
  if (times.length < 2) return 0;
  let s = 0;
  let c = 0;
  for (const t of times) {
    const ang = (t / MINUTES_PER_DAY) * 2 * Math.PI;
    s += Math.sin(ang);
    c += Math.cos(ang);
  }
  s /= times.length;
  c /= times.length;
  const r = Math.sqrt(s * s + c * c);
  if (r <= 1e-6) return MINUTES_PER_DAY / 4;
  const sdRad = Math.sqrt(-2 * Math.log(r));
  return (sdRad / (2 * Math.PI)) * MINUTES_PER_DAY;
}

export function sleepRegularity(windows: Array<{ startTs: number; endTs: number }>): SleepRegularity | null {
  const valid = windows
    .filter((w) => w.startTs > 0 && w.endTs > w.startTs)
    .sort((a, b) => a.endTs - b.endTs)
    .slice(-14);
  if (valid.length < MIN_NIGHTS) return null;
  const bedSdMin = circularSdMinutes(valid.map((w) => clockMinutes(w.startTs)));
  const wakeSdMin = circularSdMinutes(valid.map((w) => clockMinutes(w.endTs)));
  const avgSd = (bedSdMin + wakeSdMin) / 2;
  // ~0 min SD → 100; ~110 min SD → ~0.
  const score = Math.max(1, Math.min(99, Math.round(100 - avgSd * 0.9)));
  return { score, bedSdMin: Math.round(bedSdMin), wakeSdMin: Math.round(wakeSdMin), nights: valid.length };
}
