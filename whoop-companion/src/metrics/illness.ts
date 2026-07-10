/**
 * Illness / Sick-Risk early warning — an analogue of Oura's "Symptom Radar".
 * When the firmware history layout exposes a validated worn-skin temperature,
 * it is included alongside the three cardio/respiratory channels:
 *   - Resting heart rate ELEVATED vs your baseline
 *   - HRV (RMSSD) SUPPRESSED vs your baseline
 *   - Respiratory rate ELEVATED vs your baseline
 * A coordinated adverse move across these is a well-documented pre-symptomatic
 * signal of infection/strain. Temperature remains optional because WHOOP 5
 * firmware layouts do not expose it consistently.
 *
 * Output mirrors Oura's three states: No signs / Minor signs / Major signs, with
 * a per-biometric breakdown of which channels are flagged and by how much.
 */

export type IllnessSignal = {
  metric: 'rhr' | 'hrv' | 'respiratory' | 'skin_temp';
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
  skinTemperature?: Channel;
}): IllnessResult | null {
  const defs: Array<{ metric: IllnessSignal['metric']; label: string; ch: Channel; higherIsWorse: boolean; absolute?: boolean }> = [
    { metric: 'rhr', label: 'Resting heart rate', ch: input.rhr, higherIsWorse: true },
    { metric: 'hrv', label: 'Heart rate variability', ch: input.hrv, higherIsWorse: false },
    { metric: 'respiratory', label: 'Respiratory rate', ch: input.respiratory, higherIsWorse: true },
  ];
  if (input.skinTemperature) {
    defs.push({ metric: 'skin_temp', label: 'Skin temperature', ch: input.skinTemperature, higherIsWorse: true, absolute: true });
  }

  const signals: IllnessSignal[] = [];
  for (const d of defs) {
    const directionalZ = adverseZ(d.ch.value, d.ch.baseline, d.ch.sd, d.higherIsWorse);
    const z = d.absolute && directionalZ != null ? Math.abs(directionalZ) : directionalZ;
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
