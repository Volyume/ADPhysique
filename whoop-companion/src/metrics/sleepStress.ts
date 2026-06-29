/**
 * Sleep Stress — WHOOP shows a 0–3 autonomic-stress curve across the night and
 * splits time into HIGH / MEDIUM / LOW bands (confirmed: BandPlotStyle.STRESS +
 * the stress legend strings). The "High Sleep Stress" contributor to Sleep
 * Performance is the share of the night in the HIGH band.
 *
 * WHOOP's exact 0–3 mapping is server-side. We derive it on-device from the same
 * autonomic signals WHOOP uses — HRV (RMSSD) and heart rate — per epoch, scored
 * against the night's own distribution (and, once available, the user's trailing
 * sleeping baseline). Lower HRV + higher HR ⇒ more stress.
 *
 * IMPORTANT (verified): the HIGH/MED/LOW percentages are over TIME IN BED, not
 * asleep time — that is what reproduces WHOOP's exact figures
 * (44/556=8%, 144/556=26%, 368/556=66%).
 */

export type StressEpoch = { hr: number; rmssd: number | null };
export type StressLevel = 0 | 1 | 2 | 3;
export type SleepStress = {
  curve: StressLevel[]; // per-epoch 0..3, in order
  highMin: number;
  medMin: number;
  lowMin: number;
  highPct: number; // % of TIB in HIGH (the contributor), 0..100
  medPct: number;
  lowPct: number;
  meanLevel: number; // 0..3 average
};

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function sd(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export type StressBaseline = { rmssdMean: number; rmssdSd: number; hrMean: number; hrSd: number };

/**
 * @param epochs  per-minute (or per-30s) night epochs across the whole TIB window
 * @param baseline optional trailing sleeping baseline; if absent the night
 *                 self-normalises (relative stress within the night)
 */
export function computeSleepStress(
  epochs: StressEpoch[],
  baseline?: StressBaseline | null,
): SleepStress | null {
  if (epochs.length < 5) return null;
  const hrs = epochs.map((e) => e.hr).filter((v) => Number.isFinite(v));
  const rmssds = epochs.map((e) => e.rmssd).filter((v): v is number => v != null && Number.isFinite(v));
  if (hrs.length < 5) return null;

  const hrMean = baseline?.hrMean ?? mean(hrs);
  const hrSd = baseline?.hrSd || sd(hrs, mean(hrs)) || 1;
  const rmMean = baseline?.rmssdMean ?? mean(rmssds);
  const rmSd = baseline?.rmssdSd || sd(rmssds, mean(rmssds)) || 1;

  const curve: StressLevel[] = epochs.map((e) => {
    const hrZ = (e.hr - hrMean) / hrSd;
    const rmZ = e.rmssd != null && rmSd ? (e.rmssd - rmMean) / rmSd : 0;
    const stressZ = 0.6 * -rmZ + 0.4 * hrZ;
    if (stressZ > 1.5) return 3;
    if (stressZ > 0.5) return 2;
    if (stressZ > -0.5) return 1;
    return 0;
  });

  const total = curve.length;
  const highMin = curve.filter((l) => l === 3).length;
  const medMin = curve.filter((l) => l === 2).length;
  const lowMin = total - highMin - medMin;
  const pct = (n: number) => Math.round((n / total) * 100);
  return {
    curve,
    highMin,
    medMin,
    lowMin,
    highPct: pct(highMin),
    medPct: pct(medMin),
    lowPct: pct(lowMin),
    meanLevel: Math.round((mean(curve) + Number.EPSILON) * 100) / 100,
  };
}
