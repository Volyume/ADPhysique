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
  inBedMin: number;
  asleepMin: number;
  efficiency: number; // 0..1
  stages: Record<SleepStage, number>; // minutes
  /** Ordered stage segments across the night, for the hypnogram. */
  hypnogram: Array<{ stage: SleepStage; minutes: number }>;
  performance: number | null; // asleepMin / neededMin
  neededMin: number;
};

const BASE_NEED_MIN = 480; // 8h baseline sleep need

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

export function computeSleep(samples: SleepMinute[], neededMin = BASE_NEED_MIN): SleepResult | null {
  const win = findSleepWindow(samples);
  if (!win) return null;

  const window = samples.slice(win.start, win.end);
  const hrs = window.map((s) => s.hr).filter((v): v is number => v != null);
  const meanHr = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
  const rmssds = window.map((s) => s.rmssd).filter((v): v is number => v != null);
  const meanRmssd = rmssds.length ? rmssds.reduce((a, b) => a + b, 0) / rmssds.length : 0;

  const stages: Record<SleepStage, number> = { awake: 0, light: 0, deep: 0, rem: 0 };
  const timeline: SleepStage[] = [];
  for (const s of window) {
    const motion = s.motion ?? 0;
    const hr = s.hr ?? meanHr;
    const rmssd = s.rmssd ?? meanRmssd;
    let stage: SleepStage;
    if (motion > 0.4) stage = 'awake';
    else if (hr < meanHr * 0.97 && (meanRmssd === 0 || rmssd >= meanRmssd)) stage = 'deep';
    else if (hr > meanHr * 1.03 && motion < 0.2) stage = 'rem';
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
  const efficiency = inBedMin > 0 ? asleepMin / inBedMin : 0;
  const startTs = window[0]?.ts ?? 0;
  const endTs = window[window.length - 1]?.ts ?? startTs;

  return {
    startTs,
    endTs,
    inBedMin,
    asleepMin,
    efficiency: Math.round(efficiency * 100) / 100,
    stages,
    hypnogram,
    performance: neededMin > 0 ? Math.min(1, asleepMin / neededMin) : null,
    neededMin,
  };
}
