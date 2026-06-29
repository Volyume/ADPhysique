/**
 * Health Monitor — WHOOP's five overnight vitals, each shown against a personal
 * "typical range" with an in/out-of-range flag and a headline "X/N within range".
 *
 * What we can honestly derive from the strap over BLE:
 *   - Resting Heart Rate  (lowest sustained HR in the sleep window)
 *   - Heart Rate Variability (overnight RMSSD)
 *   - Respiratory Rate    (RSA in the R-R series — see respiratory.ts)
 *
 * What we CANNOT (yet) derive — no raw optical/PPG or thermistor stream is
 * exposed over BLE without the proprietary deep-data unlock:
 *   - Blood Oxygen (SpO₂)  — needs raw red/IR PPG
 *   - Skin Temperature     — needs the raw thermistor channel
 * These are shown for parity but flagged unavailable; they don't count toward
 * the ratio. (Honest: see docs/PROTOCOL.md.)
 *
 * "Typical range" follows WHOOP's idea of a personal baseline band: the 30-day
 * mean ± natural variation (SD-scaled, with a sensible minimum width).
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
  /** Educational copy mirrored from the WHOOP app. */
  blurb: string;
};

export type HealthMonitorResult = {
  vitals: Vital[];
  inRangeCount: number;
  measuredCount: number;
};

type VitalInput = { value: number | null; history: number[] };

const MIN_BAND: Record<string, number> = { rhr: 3, hrv: 8, respiratory: 1.5 };

function bandFor(key: string, history: number[]): { baseline: number; lo: number; hi: number } | null {
  const vals = history.filter((v) => Number.isFinite(v));
  if (vals.length < 3) return null;
  const baseline = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = stdev(vals);
  const half = Math.max(MIN_BAND[key] ?? 1, 1.5 * sd);
  return { baseline: round1(baseline), lo: round1(baseline - half), hi: round1(baseline + half) };
}

function measured(key: VitalKey, label: string, unit: string, blurb: string, input: VitalInput): Vital {
  const band = bandFor(key, input.history);
  const inRange =
    input.value != null && band ? input.value >= band.lo && input.value <= band.hi : null;
  return {
    key,
    label,
    unit,
    value: input.value,
    baseline: band?.baseline ?? null,
    range: band ? { lo: band.lo, hi: band.hi } : null,
    inRange,
    available: true,
    blurb,
  };
}

export function computeHealthMonitor(input: {
  rhr: VitalInput;
  hrv: VitalInput;
  respiratory: VitalInput;
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
      'Respiratory rate (RR) is the amount of breaths you take per minute while at rest, a general indicator of cardiovascular fitness. It is very stable night to night, so changes can be meaningful.',
      input.respiratory,
    ),
    {
      key: 'spo2',
      label: 'Blood Oxygen',
      unit: '%',
      value: null,
      baseline: null,
      range: null,
      inRange: null,
      available: false,
      blurb:
        'Blood oxygen (SpO₂) measures how much oxygen your red blood cells are carrying. Requires the raw red/infrared optical (PPG) stream, which this build cannot yet decode over Bluetooth — so it is not measured here.',
    },
    {
      key: 'skin_temp',
      label: 'Skin Temperature',
      unit: '°C',
      value: null,
      baseline: null,
      range: null,
      inRange: null,
      available: false,
      blurb:
        'Skin temperature indicates how your body is regulating heat and varies day to day. Requires the raw thermistor channel, which this build cannot yet decode over Bluetooth — so it is not measured here.',
    },
  ];

  const measurable = vitals.filter((v) => v.available && v.value != null && v.inRange != null);
  const inRangeCount = measurable.filter((v) => v.inRange === true).length;
  return { vitals, inRangeCount, measuredCount: measurable.length };
}
