/**
 * Health Monitor: overnight vitals against a personal typical range.
 *
 * Trusted channels are derived from HR/R-R during the sleep window:
 * - Resting Heart Rate
 * - Heart Rate Variability
 * - Respiratory Rate
 *
 * WHOOP 5 history also exposes raw-sensor layouts in this user's captures. The
 * SpO2 and skin-temperature fields below are labelled experimental candidates
 * and do not count toward the headline range score until confirmed further.
 */

import { stdev } from './ema';

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export type VitalKey = 'rhr' | 'hrv' | 'respiratory' | 'spo2' | 'skin_temp';

export type Vital = {
  key: VitalKey;
  label: string;
  value: number | null;
  unit: string;
  baseline: number | null;
  range: { lo: number; hi: number } | null;
  inRange: boolean | null;
  available: boolean;
  experimental?: boolean;
  blurb: string;
};

export type HealthMonitorResult = {
  vitals: Vital[];
  inRangeCount: number;
  measuredCount: number;
  valueCount: number;
};

type VitalInput = { value: number | null; history: number[] };

const MIN_BAND: Record<string, number> = { rhr: 3, hrv: 8, respiratory: 1.5, spo2: 1, skin_temp: 0.4 };

function bandFor(key: string, history: number[]): { baseline: number; lo: number; hi: number } | null {
  const vals = history.filter((v) => Number.isFinite(v));
  if (vals.length < 3) return null;
  const baseline = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = stdev(vals);
  const half = Math.max(MIN_BAND[key] ?? 1, 1.5 * sd);
  return { baseline: round1(baseline), lo: round1(baseline - half), hi: round1(baseline + half) };
}

function measured(
  key: VitalKey,
  label: string,
  unit: string,
  blurb: string,
  input: VitalInput,
  experimental = false,
): Vital {
  const band = bandFor(key, input.history);
  const inRange = input.value != null && band ? input.value >= band.lo && input.value <= band.hi : null;
  return {
    key,
    label,
    unit,
    value: input.value,
    baseline: band?.baseline ?? null,
    range: band ? { lo: band.lo, hi: band.hi } : null,
    inRange,
    available: !experimental || input.value != null,
    experimental,
    blurb,
  };
}

export function computeHealthMonitor(input: {
  rhr: VitalInput;
  hrv: VitalInput;
  respiratory: VitalInput;
  spo2: VitalInput;
  skinTemp: VitalInput;
}): HealthMonitorResult {
  const vitals: Vital[] = [
    measured(
      'rhr',
      'Resting Heart Rate',
      'bpm',
      'Your resting heart rate is the number of times your heart beats per minute at complete rest. A lower RHR generally indicates better cardiovascular fitness and recovery.',
      input.rhr,
    ),
    measured(
      'hrv',
      'Heart Rate Variability',
      'ms',
      'HRV is the variation in time between heartbeats. Higher HRV reflects a well-recovered, adaptable nervous system; a drop can signal strain, illness or poor recovery.',
      input.hrv,
    ),
    measured(
      'respiratory',
      'Respiratory Rate',
      'rpm',
      'Respiratory rate is the amount of breaths you take per minute while at rest. It is very stable night to night, so changes can be meaningful.',
      input.respiratory,
    ),
    measured(
      'spo2',
      'Blood Oxygen',
      '%',
      'Blood oxygen measures how much oxygen your red blood cells are carrying. This is an experimental candidate decoded from raw WHOOP 5 v21 history records and is not yet counted in the headline range score.',
      input.spo2,
      true,
    ),
    measured(
      'skin_temp',
      'Skin Temperature',
      'C',
      'Skin temperature indicates how your body is regulating heat and varies day to day. This is an experimental candidate decoded from raw WHOOP 5 v20 history records and is not yet counted in the headline range score.',
      input.skinTemp,
      true,
    ),
  ];

  const withValues = vitals.filter((v) => v.available && v.value != null);
  const measurable = withValues.filter((v) => !v.experimental && v.inRange != null);
  const inRangeCount = measurable.filter((v) => v.inRange === true).length;
  return { vitals, inRangeCount, measuredCount: measurable.length, valueCount: withValues.length };
}
