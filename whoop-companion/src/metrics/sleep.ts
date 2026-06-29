/**
 * Sleep detection + staging from an overnight stream of per-minute samples
 * (heart rate + motion, optionally RMSSD). This is a heuristic: WHOOP's true
 * staging uses proprietary models on raw PPG/accelerometer, which we don't have.
 * The approach here is the standard actigraphy + cardiac one used by open
 * projects:
 *   - sleep window = the longest stretch of low motion + below-average HR
 *   - within sleep: low HR + low motion + high HRV  -> deep
 *                   elevated HR + low motion (REM atonia) -> REM
 *                   otherwise -> light; brief motion bursts -> awake
 *
 * Output is labelled approximate. "Sleep need" follows a simple baseline + debt
 * model.
 */

export type SleepMinute = {
  ts: number; // epoch seconds
  hr: number | null;
  motion: number | null; // arbitrary units; higher = more movement
  rmssd?: number | null;
};

export type SleepStage = 'awake' | 'light' | 'deep' | 'rem';

export type SleepResult = {
  startTs: number;
  endTs: number;
  inBedMin: number; // time in bed (TIB): onset window incl. awakenings
  asleepMin: number; // LIGHT + SWS(deep) + REM
  restorativeMin: number; // SWS(deep) + REM
  latencyMin: number; // leading awake before first sustained sleep
  wakeEvents: number; // distinct awake episodes after sleep onset
  efficiency: number; // 0..1  (asleep / TIB)
  stages: Record<SleepStage, number>; // minutes
  /** Ordered stage segments across the night, for the hypnogram. */
  hypnogram: Array<{ stage: SleepStage; minutes: number }>;
  performance: number | null; // asleepMin / neededMin
  neededMin: number;
};

const BASE_NEED_MIN = 480; // 8h baseline sleep need

/**
 * WHOOP-style Sleep Need breakdown (HOW SLEEP NEED IS CALCULATED): a personal
 * baseline, plus extra need from recent day Strain, plus a portion of accrued
 * Sleep Debt, minus credit for recent naps. Each term is reported in minutes so
 * the UI can mirror WHOOP's stacked breakdown.
 */
export type SleepNeed = {
  baselineMin: number;
  strainMin: number;
  debtMin: number;
  napMin: number;
  neededMin: number;
};

// WHOOP's per-term coefficients are computed server-side and are NOT in the APK;
// these reproduce the confirmed breakdown STRUCTURE (baseline − naps + strain +
// debt) and are tuned to the founder's screenshot. Treat the strain/debt slopes
// as approximations, clearly the parts WHOOP keeps proprietary.
const STRAIN_NEED_THRESHOLD = 10; // strain below this adds ~no extra need
const STRAIN_NEED_SLOPE_MIN = 6; // minutes of need per strain-point above threshold
const MAX_DEBT_REPAY_MIN = 120; // fold at most ~2 h of accrued debt into one night
const SLEEP_NEED_FLOOR_MIN = 300; // never recommend below 5 h (wellbeing floor)

export function computeSleepNeed(input: {
  baselineMin?: number;
  recentStrain: number | null; // 0..21
  accruedDebtMin: number; // total positive shortfall over recent nights
  napMin?: number;
}): SleepNeed {
  const baselineMin = input.baselineMin ?? BASE_NEED_MIN;
  // Strain only adds meaningful need above a moderate threshold (matches WHOOP's
  // near-zero strain term on easy days, e.g. +0:02).
  const strainMin =
    input.recentStrain != null
      ? Math.round(
          Math.max(0, Math.min(11, input.recentStrain - STRAIN_NEED_THRESHOLD)) *
            STRAIN_NEED_SLOPE_MIN,
        )
      : 0;
  const debtMin = Math.round(Math.max(0, Math.min(MAX_DEBT_REPAY_MIN, input.accruedDebtMin)));
  const napMin = Math.round(Math.max(0, input.napMin ?? 0));
  const neededMin = Math.max(SLEEP_NEED_FLOOR_MIN, baselineMin - napMin + strainMin + debtMin);
  return { baselineMin, strainMin, debtMin, napMin, neededMin: Math.round(neededMin) };
}

/** Find the main sleep window: the longest low-motion, low-HR stretch. */
function findSleepWindow(samples: SleepMinute[]): { start: number; end: number } | null {
  if (samples.length < 30) return null;
  const hrs = samples.map((s) => s.hr).filter((v): v is number => v != null);
  if (hrs.length === 0) return null;
  const meanHr = hrs.reduce((a, b) => a + b, 0) / hrs.length;

  const asleepFlag = samples.map((s) => {
    const lowHr = s.hr != null ? s.hr < meanHr * 0.95 : false;
    const lowMotion = s.motion != null ? s.motion < 0.2 : true;
    return lowHr && lowMotion;
  });

  // Longest run of asleepFlag, tolerating short awakenings (<=5 min).
  let bestStart = 0;
  let bestLen = 0;
  let runStart = -1;
  let gap = 0;
  for (let i = 0; i < asleepFlag.length; i += 1) {
    if (asleepFlag[i]) {
      if (runStart < 0) runStart = i;
      gap = 0;
    } else if (runStart >= 0) {
      gap += 1;
      if (gap > 5) {
        const len = i - gap - runStart;
        if (len > bestLen) {
          bestLen = len;
          bestStart = runStart;
        }
        runStart = -1;
        gap = 0;
      }
    }
  }
  if (runStart >= 0) {
    const len = asleepFlag.length - runStart;
    if (len > bestLen) {
      bestLen = len;
      bestStart = runStart;
    }
  }
  if (bestLen < 30) return null;
  return { start: bestStart, end: bestStart + bestLen };
}

export function computeSleep(
  samples: SleepMinute[],
  neededMin = BASE_NEED_MIN,
  opts: { forceWindow?: boolean } = {},
): SleepResult | null {
  // forceWindow: treat the WHOLE input as the sleep window (used when the user
  // has manually logged or adjusted the sleep period, so we score exactly those
  // bounds instead of auto-detecting within them).
  const win = opts.forceWindow ? { start: 0, end: samples.length } : findSleepWindow(samples);
  if (!win || win.end - win.start < 1) return null;

  const window = samples.slice(win.start, win.end);
  const hrs = window.map((s) => s.hr).filter((v): v is number => v != null);
  const meanHr = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
  const rmssds = window.map((s) => s.rmssd).filter((v): v is number => v != null);
  const meanRmssd = rmssds.length ? rmssds.reduce((a, b) => a + b, 0) / rmssds.length : 0;

  const stages: Record<SleepStage, number> = { awake: 0, light: 0, deep: 0, rem: 0 };
  const timeline: SleepStage[] = [];
  for (const s of window) {
    const hasMotion = s.motion != null;
    const motion = s.motion ?? 0;
    const hr = s.hr ?? meanHr;
    const rmssd = s.rmssd ?? meanRmssd;
    let stage: SleepStage;
    // Cardiac-first staging: the overnight stream is HR/HRV (no motion channel
    // over BLE), so awake/REM are detected from heart-rate arousal relative to
    // the night's sleeping mean, with motion used as an extra signal when present.
    if ((hasMotion && motion > 0.4) || hr >= meanHr * 1.08) stage = 'awake';
    else if (hr <= meanHr * 0.95 && (meanRmssd === 0 || rmssd >= meanRmssd)) stage = 'deep';
    else if (hr >= meanHr * 1.0 && (meanRmssd === 0 || rmssd < meanRmssd) && (!hasMotion || motion < 0.2))
      stage = 'rem';
    else stage = 'light';
    stages[stage] += 1;
    timeline.push(stage);
  }

  // Compress the per-minute timeline into stage segments for the hypnogram.
  const hypnogram: Array<{ stage: SleepStage; minutes: number }> = [];
  for (const stage of timeline) {
    const last = hypnogram[hypnogram.length - 1];
    if (last && last.stage === stage) last.minutes += 1;
    else hypnogram.push({ stage, minutes: 1 });
  }

  const inBedMin = window.length;
  const asleepMin = inBedMin - stages.awake;
  const restorativeMin = stages.deep + stages.rem;
  const efficiency = inBedMin > 0 ? asleepMin / inBedMin : 0;
  const startTs = window[0]?.ts ?? 0;
  const endTs = window[window.length - 1]?.ts ?? startTs;

  // Sleep latency = leading awake before the first sustained sleep segment.
  let latencyMin = 0;
  for (const seg of hypnogram) {
    if (seg.stage === 'awake') latencyMin += seg.minutes;
    else break;
  }
  // Wake events = distinct awake episodes occurring after sleep onset and before
  // the final wake (mid-sleep disturbances), each merged run counting once.
  const firstSleep = hypnogram.findIndex((s) => s.stage !== 'awake');
  let lastSleep = -1;
  for (let i = hypnogram.length - 1; i >= 0; i -= 1) {
    if (hypnogram[i]!.stage !== 'awake') {
      lastSleep = i;
      break;
    }
  }
  let wakeEvents = 0;
  if (firstSleep >= 0 && lastSleep > firstSleep) {
    for (let i = firstSleep + 1; i < lastSleep; i += 1) {
      if (hypnogram[i]!.stage === 'awake') wakeEvents += 1;
    }
  }

  return {
    startTs,
    endTs,
    inBedMin,
    asleepMin,
    restorativeMin,
    latencyMin,
    wakeEvents,
    efficiency: Math.round(efficiency * 100) / 100,
    stages,
    hypnogram,
    performance: neededMin > 0 ? Math.min(1, asleepMin / neededMin) : null,
    neededMin,
  };
}
