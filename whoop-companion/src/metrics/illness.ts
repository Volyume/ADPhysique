/**
 * Illness / Sick-Risk early warning — an analogue of Oura's "Symptom Radar".
 * Oura's strongest channel is body temperature, which we CANNOT read over WHOOP
 * BLE, so this is built from the three cardio/respiratory channels we DO derive:
 *   - Resting heart rate ELEVATED vs your baseline
 *   - HRV (RMSSD) SUPPRESSED vs your baseline
 *   - Respiratory rate ELEVATED vs your baseline
 * A coordinated adverse move across these is a well-documented pre-symptomatic
 * signal of infection/strain. Honestly lower-sensitivity than Oura (no temp).
 *
 * Output mirrors Oura's three states: No signs / Minor signs / Major signs, with
 * a per-biometric breakdown of which channels are flagged and by how much.
 */

export type IllnessSignal = {
  metric: 'rhr' | 'hrv' | 'respiratory';
  label: string;
  z: number; // adverse deviation in SDs (positive = worse)
  flagged: boolean;
};

export type IllnessResult = {
  level: 'none' | 'minor' | 'major';
  signals: IllnessSignal[];
  flaggedCount: number;
};

type Channel = { value: number | null; baseline: number | null; sd: number | null };

const FLAG_Z = 1.0; // beyond ~1 SD adverse = flagged
const STRONG_Z = 2.0;

function adverseZ(value: number | null, baseline: number | null, sd: number | null, higherIsWorse: boolean): number | null {
  if (value == null || baseline == null || sd == null || sd <= 0) return null;
  const z = (value - baseline) / sd;
  return higherIsWorse ? z : -z;
}

export function illnessRisk(input: {
  rhr: Channel;
  hrv: Channel;
  respiratory: Channel;
}): IllnessResult | null {
  const defs: Array<{ metric: IllnessSignal['metric']; label: string; ch: Channel; higherIsWorse: boolean }> = [
    { metric: 'rhr', label: 'Resting heart rate', ch: input.rhr, higherIsWorse: true },
    { metric: 'hrv', label: 'Heart rate variability', ch: input.hrv, higherIsWorse: false },
    { metric: 'respiratory', label: 'Respiratory rate', ch: input.respiratory, higherIsWorse: true },
  ];

  const signals: IllnessSignal[] = [];
  for (const d of defs) {
    const z = adverseZ(d.ch.value, d.ch.baseline, d.ch.sd, d.higherIsWorse);
    if (z == null) continue;
    signals.push({ metric: d.metric, label: d.label, z: Math.round(z * 10) / 10, flagged: z >= FLAG_Z });
  }
  if (signals.length === 0) return null;

  const flaggedCount = signals.filter((s) => s.flagged).length;
  const anyStrong = signals.some((s) => s.z >= STRONG_Z);

  let level: IllnessResult['level'] = 'none';
  if (flaggedCount >= 2 || anyStrong) level = 'major';
  else if (flaggedCount === 1) level = 'minor';

  return { level, signals, flaggedCount };
}
