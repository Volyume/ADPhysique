/**
 * Energy Reserve - all-day usable energy estimate.
 *
 * This is deliberately separate from Training Readiness: readiness answers
 * "should I train hard?", while Energy Reserve answers "how much usable energy is
 * left right now?". It blends overnight recharge with same-day drains.
 */

export type EnergyReserveTrend = 'charging' | 'stable' | 'draining';
export type EnergyReserveEffect = 'charge' | 'drain' | 'neutral';

export type EnergyReserve = {
  score: number; // 5..100
  label: string; // Full / Strong / Steady / Low / Depleted
  trend: EnergyReserveTrend;
  contributors: Array<{
    key: string;
    label: string;
    value: string;
    effect: EnergyReserveEffect;
    note: string;
  }>;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function label(score: number): string {
  if (score >= 85) return 'Full';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Steady';
  if (score >= 30) return 'Low';
  return 'Depleted';
}

function fmtPct(n: number | null): string {
  return n == null ? '-' : `${Math.round(n)}%`;
}

export function computeEnergyReserve(input: {
  recovery: number | null; // 0..100
  sleepPerformance: number | null; // 0..100
  sleepDebtMin: number;
  hrvBalance: number | null; // 0..100
  strain: number | null; // 0..21
  stress: number | null; // 0..3
}): EnergyReserve | null {
  const { recovery, sleepPerformance, sleepDebtMin, hrvBalance, strain, stress } = input;
  if (
    recovery == null &&
    sleepPerformance == null &&
    hrvBalance == null &&
    strain == null &&
    stress == null
  ) {
    return null;
  }

  const rec = recovery ?? sleepPerformance ?? hrvBalance ?? 55;
  const sleep = sleepPerformance ?? rec;
  const hrv = hrvBalance ?? rec;
  const overnightRecharge = clamp(22 + 0.45 * rec + 0.25 * sleep + 0.12 * hrv, 10, 100);

  const sleepDebtDrain = clamp((Math.max(0, sleepDebtMin) / 180) * 24, 0, 24);
  const strainDrain = strain == null ? 0 : clamp((strain / 21) * 34, 0, 34);
  const stressDrain = stress == null ? 0 : clamp((stress / 3) * 24, 0, 24);

  const score = clamp(Math.round(overnightRecharge - sleepDebtDrain - strainDrain - stressDrain), 5, 100);
  const trend: EnergyReserveTrend =
    stress != null && stress < 0.7 && (strain ?? 0) < 3
      ? 'charging'
      : (stress ?? 0) >= 1.4 || (strain ?? 0) >= 8
        ? 'draining'
        : 'stable';

  const contributors: EnergyReserve['contributors'] = [
    {
      key: 'recovery',
      label: 'Recovery charge',
      value: fmtPct(recovery),
      effect: recovery == null ? 'neutral' : recovery >= 60 ? 'charge' : 'drain',
      note: recovery == null ? 'Needs overnight vitals' : recovery >= 60 ? 'Good recharge base' : 'Low recovery limits charge',
    },
    {
      key: 'sleep',
      label: 'Sleep charge',
      value: fmtPct(sleepPerformance),
      effect: sleepPerformance == null ? 'neutral' : sleepPerformance >= 75 ? 'charge' : 'drain',
      note: sleepPerformance == null ? 'Needs scored sleep' : sleepPerformance >= 75 ? 'Sleep supported recharge' : 'Sleep held recharge back',
    },
    {
      key: 'debt',
      label: 'Sleep debt drain',
      value: `${Math.round(Math.max(0, sleepDebtMin))}m`,
      effect: sleepDebtMin > 45 ? 'drain' : sleepDebtMin <= 0 ? 'charge' : 'neutral',
      note: sleepDebtMin > 45 ? 'Unpaid sleep need is draining energy' : 'Debt is controlled',
    },
    {
      key: 'stress',
      label: 'Stress drain',
      value: stress == null ? '-' : stress.toFixed(1),
      effect: stress == null ? 'neutral' : stress >= 1.4 ? 'drain' : stress < 0.7 ? 'charge' : 'neutral',
      note: stress == null ? 'Needs R-R stress data' : stress >= 1.4 ? 'Elevated stress is draining' : 'Stress is not a major drain',
    },
    {
      key: 'strain',
      label: 'Activity drain',
      value: strain == null ? '-' : strain.toFixed(1),
      effect: strain == null ? 'neutral' : strain >= 8 ? 'drain' : strain < 3 ? 'charge' : 'neutral',
      note: strain == null ? 'Needs today activity load' : strain >= 8 ? 'Training load is drawing energy down' : 'Activity load is controlled',
    },
  ];

  return { score, label: label(score), trend, contributors };
}
