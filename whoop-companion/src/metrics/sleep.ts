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
  ts: number; // epoch milliseconds, usually rounded to the minute
  hr: number | null;
  motion: number | null; // arbitrary units; higher = more movement
  rmssd?: number | null;
  bandSleepState?: number | null; // WHOOP 5 v18 @81 candidate: 0 wake-like, 1 still, 2 sleep-like, 3 up-like
};

export type SleepStage = 'awake' | 'light' | 'deep' | 'rem';
export type SleepSource = 'auto_hr' | 'manual_hr' | 'manual_duration';

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
  source: SleepSource;
  signalMin: number; // minutes that had a heart-rate sample
  hrvMin: number; // minutes with enough clean R-R intervals for RMSSD
  motionMin: number; // minutes with WHOOP IMU or counter-derived motion evidence
  stillMin: number; // minutes where the band reports still/low motion
  movingMin: number; // minutes where the band reports movement/activity
  sleepStateMin: number; // minutes with decoded band sleep-state evidence
  sleepStateWakeMin: number; // decoded state 0
  sleepStateStillMin: number; // decoded state 1
  sleepStateAsleepMin: number; // decoded state 2
  sleepStateUpMin: number; // decoded state 3
};

const BASE_NEED_MIN = 480; // 8h baseline sleep need
const MAX_AUTO_SLEEP_WINDOW_MIN = 11 * 60;
// Automatic detection must stay conservative: exceptional longer/polyphasic
// windows remain available through Adjust and rescan with explicit bounds.
const MAX_FRAGMENTED_AUTO_SLEEP_WINDOW_MIN = 16 * 60;
const MAX_AUTO_BRIDGE_MIN = 5;
const MAX_OBSERVED_AWAKENING_MIN = 120;
const MIN_STRONG_AUTO_CORE_MIN = 90;
const LONG_AUTO_SLEEP_MIN = 8 * 60;
const AUTO_SLEEP_BOUNDARY_WINDOW_MIN = 90;
const AUTO_SLEEP_BOUNDARY_DISTANCE_MIN = 20;
const AUTO_SLEEP_BOUNDARY_SIGNAL_MIN = 10;

type SleepWindowOptions = {
  minWindowMin: number;
  maxWindowMin: number;
  endAfterTs?: number;
  endBeforeTs?: number;
};

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

function percentile(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * pct)));
  return sorted[idx] ?? sorted[0] ?? 0;
}

function smoothedHr(samples: SleepMinute[], index: number): number | null {
  const cur = samples[index]?.hr;
  if (cur == null) return null;
  const prev = samples[index - 1]?.hr ?? cur;
  const next = samples[index + 1]?.hr ?? cur;
  return (prev + cur + next) / 3;
}

/** Fill minute gaps inside a detected/manual window so durations stay honest. */
function expandToMinutes(
  samples: SleepMinute[],
  startTs?: number,
  endTs?: number,
): SleepMinute[] {
  if (samples.length === 0 && (startTs == null || endTs == null)) return [];
  const firstTs = startTs ?? samples[0]?.ts;
  const sampleLastTs = samples[samples.length - 1]?.ts ?? firstTs;
  const lastTs = endTs ?? (sampleLastTs == null ? undefined : sampleLastTs + 60000);
  if (firstTs == null || lastTs == null || lastTs <= firstTs) return [];

  const startMinute = Math.floor(firstTs / 60000);
  const endMinute = Math.ceil(lastTs / 60000);
  const byMinute = new Map<number, SleepMinute>();
  for (const s of samples) {
    byMinute.set(Math.floor(s.ts / 60000), s);
  }

  const out: SleepMinute[] = [];
  for (let minute = startMinute; minute < endMinute; minute += 1) {
    const existing = byMinute.get(minute);
    out.push(existing ?? { ts: minute * 60000, hr: null, motion: null, rmssd: null, bandSleepState: null });
  }
  return out;
}

/** Find a sleep/nap window from HR-first wearable data. */
function findSleepWindow(
  samples: SleepMinute[],
  opts: SleepWindowOptions = { minWindowMin: 90, maxWindowMin: MAX_AUTO_SLEEP_WINDOW_MIN },
): { start: number; end: number } | null {
  if (samples.length < Math.min(30, opts.minWindowMin)) return null;
  const hrs = samples.map((s) => s.hr).filter((v): v is number => v != null);
  if (hrs.length === 0) return null;

  const p20 = percentile(hrs, 0.2);
  const p50 = percentile(hrs, 0.5);
  const p80 = percentile(hrs, 0.8);
  const spread = Math.max(6, p80 - p20);
  const sleepishThreshold = p20 + spread * 0.75;
  const bridgeThreshold = p20 + spread * 1.15;
  const asleepFlag = samples.map((s, i) => {
    // Motion is independent evidence, not a missing-value default. An HR-only
    // epoch cannot establish low movement for automatic window detection.
    if (s.hr == null || s.motion == null) return false;
    const smooth = smoothedHr(samples, i) ?? s.hr;
    const lowHr = smooth <= sleepishThreshold;
    return lowHr && s.motion < 0.2;
  });
  const bridgeFlag = samples.map((s, i) => {
    // A bridge is valid only for an observed, sleep-compatible epoch. Missing
    // samples therefore close the run instead of extending its duration.
    if (s.hr == null || s.motion == null) return false;
    const smooth = smoothedHr(samples, i) ?? s.hr;
    const quietEnough = smooth <= bridgeThreshold;
    return quietEnough && s.motion < 0.35;
  });

  // Longest quiet HR run, tolerating normal awakenings/arousals. The previous
  // 95%-of-mean rule missed HR-only nights where most samples were already from
  // sleep, so this uses the night's low-to-high HR distribution instead.
  let bestStart = 0;
  let bestEnd = 0;
  let bestElapsed = 0;
  let bestCoreCount = 1;
  const runs: Array<{ start: number; end: number }> = [];
  let runStart = -1;
  let gap = 0;
  const closeRun = (endExclusive: number) => {
    if (runStart < 0 || endExclusive <= runStart) return;
    runs.push({ start: runStart, end: endExclusive });
  };
  for (let i = 0; i < asleepFlag.length; i += 1) {
    const prev = samples[i - 1];
    const current = samples[i];
    if (prev && current && current.ts - prev.ts > 60000) {
      closeRun(i - gap);
      runStart = -1;
      gap = 0;
    }

    if (asleepFlag[i]) {
      if (runStart < 0) runStart = i;
      gap = 0;
    } else if (runStart >= 0 && bridgeFlag[i]) {
      gap += 1;
      if (gap > MAX_AUTO_BRIDGE_MIN) {
        // The current sample is the first bridge minute beyond the allowed
        // five-minute gap. Close after the preceding core sample; using
        // `i - gap` drops the final core minute as well.
        closeRun(i - gap + 1);
        runStart = -1;
        gap = 0;
      }
    } else if (runStart >= 0) {
      closeRun(i - gap);
      runStart = -1;
      gap = 0;
    }
  }
  if (runStart >= 0) {
    closeRun(asleepFlag.length - gap);
  }

  const fragmentedMaxWindowMin =
    opts.maxWindowMin >= MAX_AUTO_SLEEP_WINDOW_MIN ? MAX_FRAGMENTED_AUTO_SLEEP_WINDOW_MIN : opts.maxWindowMin;
  const considerRun = (start: number, end: number, coreCount = 1) => {
    const startTs = samples[start]?.ts ?? 0;
    const endTs = (samples[end - 1]?.ts ?? startTs) + 60000;
    if (opts.endAfterTs != null && endTs < opts.endAfterTs) return;
    if (opts.endBeforeTs != null && endTs >= opts.endBeforeTs) return;
    const elapsed = Math.round((endTs - startTs) / 60000);
    if (coreCount >= 2 && elapsed > fragmentedMaxWindowMin) return;
    if (elapsed > bestElapsed) {
      bestElapsed = elapsed;
      bestStart = start;
      bestEnd = end;
      bestCoreCount = coreCount;
    }
  };

  const strongSleepCore = (start: number, end: number): boolean => {
    const duration = end - start;
    if (duration < Math.max(MIN_STRONG_AUTO_CORE_MIN, opts.minWindowMin)) return false;
    let core = 0;
    const coreThreshold = p20 + spread * 0.65;
    for (let i = start; i < end; i += 1) {
      const sample = samples[i];
      if (!sample || sample.hr == null || sample.motion == null) return false;
      const hr = smoothedHr(samples, i);
      if (hr != null && sample.motion < 0.2 && hr <= coreThreshold) core += 1;
    }
    return core >= Math.ceil(duration * 0.8);
  };

  // A genuine awakening can be longer than the short quiet-arousal bridge, but
  // only observed data may join the two sleep cores. Missing HR, missing motion,
  // or a timestamp hole therefore keeps the cores separate.
  for (let i = 0; i < runs.length; i += 1) {
    const first = runs[i];
    if (!first) continue;
    considerRun(first.start, first.end);
    if (!strongSleepCore(first.start, first.end)) continue;
    let mergedEnd = first.end;
    let mergedCoreCount = 1;
    for (let j = i + 1; j < runs.length; j += 1) {
      const next = runs[j];
      if (!next || !observedAwakeningCanJoin(samples, mergedEnd, next.start, bridgeThreshold)) break;
      if (!strongSleepCore(next.start, next.end)) break;
      mergedEnd = next.end;
      mergedCoreCount += 1;
      const mergedElapsed = mergedEnd - first.start;
      if (mergedElapsed < LONG_AUTO_SLEEP_MIN || longWindowHasBoundaries(samples, first.start, mergedEnd, p20)) {
        considerRun(first.start, mergedEnd, mergedCoreCount);
      }
    }
  }
  if (bestElapsed >= opts.minWindowMin) {
    if (bestElapsed >= LONG_AUTO_SLEEP_MIN && !longWindowHasBoundaries(samples, bestStart, bestEnd, p20)) return null;
    const selectionOpts = bestCoreCount >= 2 ? { ...opts, maxWindowMin: fragmentedMaxWindowMin } : opts;
    return trimSleepWindow(samples, bestStart, bestEnd, p20, spread, selectionOpts);
  }

  // A low-variance capture can be sleep, but HR alone cannot distinguish it
  // from lying awake. Only accept the whole-span fallback when band motion
  // independently corroborates the window. The v18 state nibble is diagnostic
  // until a labelled capture validates it.
  const firstTs = samples[0]?.ts ?? 0;
  const lastTs = samples[samples.length - 1]?.ts ?? firstTs;
  const spanMin = Math.round((lastTs - firstTs) / 60000) + 1;
  const motionMin = samples.filter((s) => s.motion != null).length;
  const stillMin = samples.filter((s) => s.motion != null && s.motion < 0.2).length;
  const activeMin = samples.filter((s) => s.motion != null && s.motion >= 0.35).length;
  const activeRatio = activeMin / Math.max(1, samples.length);
  const motionProof = motionMin >= spanMin * 0.6 && stillMin >= motionMin * 0.85;
  const overnightRatio = samples.filter((s) => {
    const hour = new Date(s.ts).getHours();
    return hour >= 21 || hour < 10;
  }).length / Math.max(1, samples.length);
  if (
    spanMin >= opts.minWindowMin &&
    spanMin <= opts.maxWindowMin &&
    p50 <= 85 &&
    p80 - p20 <= 25 &&
    activeRatio <= 0.08 &&
    overnightRatio >= 0.65 &&
    motionProof &&
    (spanMin < LONG_AUTO_SLEEP_MIN || longWindowHasBoundaries(samples, 0, samples.length, p20)) &&
    (opts.endAfterTs == null || lastTs + 60000 >= opts.endAfterTs) &&
    (opts.endBeforeTs == null || lastTs + 60000 < opts.endBeforeTs)
  ) {
    return trimSleepWindow(samples, 0, samples.length, p20, spread, opts) ?? { start: 0, end: samples.length };
  }

  return null;
}

function observedAwakeningCanJoin(
  samples: SleepMinute[],
  start: number,
  end: number,
  bridgeThreshold: number,
): boolean {
  const gapMin = end - start;
  if (gapMin <= 0 || gapMin > MAX_OBSERVED_AWAKENING_MIN) return false;
  let wakeEvidence = 0;
  for (let i = start; i < end; i += 1) {
    const sample = samples[i];
    const previous = samples[i - 1];
    if (
      !sample ||
      sample.hr == null ||
      sample.motion == null ||
      (previous && sample.ts - previous.ts !== 60000)
    ) return false;
    if (sample.motion >= 0.35 || sample.hr >= bridgeThreshold) wakeEvidence += 1;
  }
  return wakeEvidence >= Math.max(2, Math.ceil(gapMin * 0.1));
}

function longWindowHasBoundaries(samples: SleepMinute[], start: number, end: number, restingReference: number): boolean {
  const startTs = samples[start]?.ts;
  const endTs = (samples[end - 1]?.ts ?? startTs ?? 0) + 60000;
  if (startTs == null || endTs <= startTs) return false;
  const before = samples
    .slice(Math.max(0, start - AUTO_SLEEP_BOUNDARY_WINDOW_MIN), start)
    .filter((sample) => sample.hr != null || sample.motion != null);
  const after = samples
    .slice(end, Math.min(samples.length, end + AUTO_SLEEP_BOUNDARY_WINDOW_MIN))
    .filter((sample) => sample.hr != null || sample.motion != null);
  return (
    before.length >= AUTO_SLEEP_BOUNDARY_SIGNAL_MIN &&
    before.some((sample) => sample.ts <= startTs - AUTO_SLEEP_BOUNDARY_DISTANCE_MIN * 60000) &&
    after.length >= AUTO_SLEEP_BOUNDARY_SIGNAL_MIN &&
    after.some((sample) => sample.ts >= endTs + AUTO_SLEEP_BOUNDARY_DISTANCE_MIN * 60000) &&
    boundaryShowsWake(before, restingReference) &&
    boundaryShowsWake(after, restingReference)
  );
}

function trimSleepWindow(
  samples: SleepMinute[],
  start: number,
  end: number,
  p20: number,
  spread: number,
  opts: SleepWindowOptions,
): { start: number; end: number } | null {
  if (end - start < opts.minWindowMin) return null;
  const coreThreshold = p20 + spread * 0.65;
  const core = (index: number): boolean => {
    const s = samples[index];
    if (!s) return false;
    const hr = smoothedHr(samples, index);
    if (hr == null) return false;
    return s.motion != null && s.motion < 0.2 && hr <= coreThreshold;
  };
  const sustainedCore = (from: number, to: number): boolean => {
    let n = 0;
    for (let i = from; i < to; i += 1) {
      if (core(i)) n += 1;
    }
    return n >= Math.max(8, Math.ceil((to - from) * 0.45));
  };

  let trimmedStart = start;
  for (let i = start; i < Math.min(end, start + 180); i += 1) {
    const to = Math.min(end, i + 20);
    if (to - i >= 12 && sustainedCore(i, to)) {
      trimmedStart = Math.max(start, i - 8);
      break;
    }
  }

  let trimmedEnd = end;
  for (let i = end - 1; i >= Math.max(trimmedStart, end - 180); i -= 1) {
    const from = Math.max(trimmedStart, i - 19);
    if (i - from + 1 >= 12 && sustainedCore(from, i + 1)) {
      trimmedEnd = Math.min(end, i + 9);
      break;
    }
  }

  const constrainedWindow = (
    windowStart: number,
    windowEnd: number,
  ): { start: number; end: number } | null => {
    if (windowEnd - windowStart < opts.minWindowMin) return null;
    if (windowEnd - windowStart > opts.maxWindowMin) {
      return lowestHrSubwindow(samples, windowStart, windowEnd, opts.maxWindowMin, opts);
    }
    const window = { start: windowStart, end: windowEnd };
    return sleepWindowEndAllowed(samples, window, opts) ? window : null;
  };

  // Trimming and the 11-hour safety cap must preserve the requested wake day.
  // Otherwise an unusually long run crossing midnight can be capped to the
  // previous day even though its raw end was valid.
  return constrainedWindow(trimmedStart, trimmedEnd) ?? constrainedWindow(start, end);
}

function lowestHrSubwindow(
  samples: SleepMinute[],
  start: number,
  end: number,
  sizeMin: number,
  opts: SleepWindowOptions,
): { start: number; end: number } | null {
  let bestStart: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  const candidateStarts = new Set<number>();
  for (let i = start; i + sizeMin <= end; i += 5) candidateStarts.add(i);
  candidateStarts.add(Math.max(start, end - sizeMin));
  for (const i of candidateStarts) {
    const candidate = { start: i, end: Math.min(end, i + sizeMin) };
    if (!sleepWindowEndAllowed(samples, candidate, opts)) continue;
    let hrSum = 0;
    let hrCount = 0;
    let active = 0;
    for (let j = i; j < i + sizeMin; j += 1) {
      const s = samples[j];
      if (!s) continue;
      if (s.motion != null && s.motion >= 0.35) active += 1;
      if (s.hr != null) {
        hrSum += s.hr;
        hrCount += 1;
      }
    }
    if (hrCount < sizeMin * 0.35) continue;
    const score = hrSum / hrCount + active * 0.25;
    if (score < bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }
  return bestStart == null ? null : { start: bestStart, end: Math.min(end, bestStart + sizeMin) };
}

function sleepWindowEndAllowed(
  samples: SleepMinute[],
  window: { start: number; end: number },
  opts: Pick<SleepWindowOptions, 'endAfterTs' | 'endBeforeTs'>,
): boolean {
  if (window.end <= window.start) return false;
  const startTs = samples[window.start]?.ts;
  const endSampleTs = samples[window.end - 1]?.ts;
  if (startTs == null || endSampleTs == null) return false;
  const endTs = endSampleTs + 60000;
  return (
    (opts.endAfterTs == null || endTs >= opts.endAfterTs) &&
    (opts.endBeforeTs == null || endTs < opts.endBeforeTs)
  );
}

export function durationOnlySleep(
  startTs: number,
  endTs: number,
  neededMin = BASE_NEED_MIN,
): SleepResult {
  const inBedMin = Math.max(1, Math.round((endTs - startTs) / 60000));
  const asleepMin = Math.round(inBedMin * 0.9);
  const awakeMin = inBedMin - asleepMin;
  return {
    startTs,
    endTs,
    inBedMin,
    asleepMin,
    restorativeMin: 0,
    latencyMin: 0,
    wakeEvents: 0,
    efficiency: 0.9,
    stages: { awake: awakeMin, light: asleepMin, deep: 0, rem: 0 },
    hypnogram: [
      ...(awakeMin > 0 ? [{ stage: 'awake' as const, minutes: awakeMin }] : []),
      { stage: 'light', minutes: asleepMin },
    ],
    performance: neededMin > 0 ? Math.min(1, asleepMin / neededMin) : null,
    neededMin,
    source: 'manual_duration',
    signalMin: 0,
    hrvMin: 0,
    motionMin: 0,
    stillMin: 0,
    movingMin: 0,
    sleepStateMin: 0,
    sleepStateWakeMin: 0,
    sleepStateStillMin: 0,
    sleepStateAsleepMin: 0,
    sleepStateUpMin: 0,
  };
}

export function computeSleep(
  samples: SleepMinute[],
  neededMin = BASE_NEED_MIN,
  opts: {
    forceWindow?: boolean;
    startTs?: number;
    endTs?: number;
    source?: SleepSource;
    minWindowMin?: number;
    maxWindowMin?: number;
    endAfterTs?: number;
    endBeforeTs?: number;
  } = {},
): SleepResult | null {
  // forceWindow: treat the WHOLE input as the sleep window (used when the user
  // has manually logged or adjusted the sleep period, so we score exactly those
  // bounds instead of auto-detecting within them).
  const win = opts.forceWindow
    ? { start: 0, end: samples.length }
    : findSleepWindow(samples, {
        minWindowMin: opts.minWindowMin ?? 90,
        maxWindowMin: opts.maxWindowMin ?? MAX_AUTO_SLEEP_WINDOW_MIN,
        endAfterTs: opts.endAfterTs,
        endBeforeTs: opts.endBeforeTs,
      });
  if (!win || win.end - win.start < 1) {
    if (opts.forceWindow && opts.startTs != null && opts.endTs != null) {
      return durationOnlySleep(opts.startTs, opts.endTs, neededMin);
    }
    return null;
  }

  const rawWindow = samples.slice(win.start, win.end);
  const window = expandToMinutes(rawWindow, opts.startTs, opts.endTs);
  if (window.length < 1) return null;
  const hrs = window.map((s) => s.hr).filter((v): v is number => v != null);
  const hrvMin = window.filter((s) => s.rmssd != null).length;
  const motionMin = window.filter((s) => s.motion != null).length;
  const stillMin = window.filter((s) => s.motion != null && s.motion < 0.2).length;
  const movingMin = window.filter((s) => s.motion != null && s.motion >= 0.4).length;
  const sleepStateMin = window.filter((s) => s.bandSleepState != null).length;
  const sleepStateWakeMin = window.filter((s) => s.bandSleepState === 0).length;
  const sleepStateStillMin = window.filter((s) => s.bandSleepState === 1).length;
  const sleepStateAsleepMin = window.filter((s) => s.bandSleepState === 2).length;
  const sleepStateUpMin = window.filter((s) => s.bandSleepState === 3).length;
  if (hrs.length === 0) {
    if (opts.forceWindow && (opts.source ?? 'manual_hr') === 'manual_hr') return null;
    const start = opts.startTs ?? window[0]?.ts ?? 0;
    const end = opts.endTs ?? ((window[window.length - 1]?.ts ?? start) + 60000);
    return durationOnlySleep(start, end, neededMin);
  }
  const meanHr = hrs.reduce((a, b) => a + b, 0) / hrs.length;
  const p20 = percentile(hrs, 0.2);
  const p50 = percentile(hrs, 0.5);
  const p80 = percentile(hrs, 0.8);
  const spread = Math.max(6, p80 - p20);
  const sustainedWakeHr = Math.min(meanHr * 1.08, Math.max(p50 + 6, p20 + spread * 0.85));
  const rmssds = window.map((s) => s.rmssd).filter((v): v is number => v != null);
  const meanRmssd = rmssds.length ? rmssds.reduce((a, b) => a + b, 0) / rmssds.length : null;
  const stages: Record<SleepStage, number> = { awake: 0, light: 0, deep: 0, rem: 0 };
  const timeline: SleepStage[] = [];
  const observedTimeline: boolean[] = [];
  for (const s of window) {
    // HR is the required sleep signal. Missing motion means the independent
    // movement channel was not decoded for this minute, not that the wearer
    // was awake; manual windows and already-corroborated auto windows can still
    // classify it from observed HR/RR. Missing HR remains unknown/awake.
    if (s.hr == null) {
      const stage: SleepStage = 'awake';
      stages[stage] += 1;
      timeline.push(stage);
      observedTimeline.push(false);
      continue;
    }
    const hr = s.hr;
    const motion = s.motion;
    const rmssd = s.rmssd;
    let stage: SleepStage;
    // Sleep/wake is decided independently from the approximate stage label.
    // Missing beat-to-beat data must not be imputed as observed REM/deep evidence.
    if ((motion != null && motion > 0.4) || hr >= sustainedWakeHr) stage = 'awake';
    else if (rmssd != null && meanRmssd != null && hr <= meanHr * 0.95 && rmssd >= meanRmssd) stage = 'deep';
    else if (
      rmssd != null &&
      meanRmssd != null &&
      hr >= meanHr &&
      rmssd < meanRmssd &&
      (motion == null || motion < 0.2)
    )
      stage = 'rem';
    else stage = 'light';
    stages[stage] += 1;
    timeline.push(stage);
    observedTimeline.push(true);
  }

  const smoothedTimeline = smoothStageTimeline(timeline, observedTimeline);
  if (smoothedTimeline !== timeline) {
    stages.awake = 0;
    stages.light = 0;
    stages.deep = 0;
    stages.rem = 0;
    for (const stage of smoothedTimeline) stages[stage] += 1;
  }

  // Compress the per-minute timeline into stage segments for the hypnogram.
  const hypnogram: Array<{ stage: SleepStage; minutes: number }> = [];
  for (const stage of smoothedTimeline) {
    const last = hypnogram[hypnogram.length - 1];
    if (last && last.stage === stage) last.minutes += 1;
    else hypnogram.push({ stage, minutes: 1 });
  }

  const inBedMin = window.length;
  const asleepMin = inBedMin - stages.awake;
  const restorativeMin = stages.deep + stages.rem;
  const efficiency = inBedMin > 0 ? asleepMin / inBedMin : 0;
  const startTs = opts.startTs ?? window[0]?.ts ?? 0;
  const endTs = opts.endTs ?? ((window[window.length - 1]?.ts ?? startTs) + 60000);
  const source = opts.source ?? (opts.forceWindow ? 'manual_hr' : 'auto_hr');
  // A manual HR window with unknown motion can be useful for review, but an
  // all-awake result must not be persisted as a trusted zero-sleep night.
  if (opts.forceWindow && source === 'manual_hr' && asleepMin === 0 && motionMin < inBedMin) return null;

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
    source,
    signalMin: hrs.length,
    hrvMin,
    motionMin,
    stillMin,
    movingMin,
    sleepStateMin,
    sleepStateWakeMin,
    sleepStateStillMin,
    sleepStateAsleepMin,
    sleepStateUpMin,
  };
}

export function autoSleepBoundariesCovered(
  sleep: Pick<SleepResult, 'startTs' | 'endTs'>,
  samples: SleepMinute[],
): boolean {
  const evidence = samples.filter((sample) => sample.hr != null || sample.motion != null);
  const windowMs = AUTO_SLEEP_BOUNDARY_WINDOW_MIN * 60000;
  const distanceMs = AUTO_SLEEP_BOUNDARY_DISTANCE_MIN * 60000;
  const before = evidence.filter((sample) => sample.ts >= sleep.startTs - windowMs && sample.ts < sleep.startTs);
  const after = evidence.filter((sample) => sample.ts >= sleep.endTs && sample.ts <= sleep.endTs + windowMs);
  const insideHr = samples
    .filter((sample) => sample.ts >= sleep.startTs && sample.ts < sleep.endTs && sample.hr != null)
    .map((sample) => sample.hr as number);
  if (insideHr.length < 30) return false;
  const restingReference = percentile(insideHr, 0.35);
  return (
    before.length >= AUTO_SLEEP_BOUNDARY_SIGNAL_MIN &&
    before.some((sample) => sample.ts <= sleep.startTs - distanceMs) &&
    boundaryShowsWake(before, restingReference) &&
    after.length >= AUTO_SLEEP_BOUNDARY_SIGNAL_MIN &&
    after.some((sample) => sample.ts >= sleep.endTs + distanceMs) &&
    boundaryShowsWake(after, restingReference)
  );
}

function boundaryShowsWake(samples: SleepMinute[], restingReference: number): boolean {
  const motion = samples.filter((sample) => sample.motion != null).map((sample) => sample.motion as number);
  const activeMotion = motion.filter((value) => value >= 0.35).length;
  if (activeMotion >= Math.max(2, Math.ceil(motion.length * 0.1))) return true;

  const hrs = samples.map((sample) => sample.hr).filter((value): value is number => value != null);
  const wakeThreshold = restingReference + Math.max(4, restingReference * 0.06);
  const elevated = hrs.filter((hr) => hr >= wakeThreshold).length;
  return elevated >= Math.max(3, Math.ceil(hrs.length * 0.15));
}

function smoothStageTimeline(timeline: SleepStage[], observed: boolean[]): SleepStage[] {
  if (timeline.length < 3) return timeline;
  let changed = false;
  const out = timeline.slice();

  for (let i = 1; i < timeline.length - 1; i += 1) {
    const prev = timeline[i - 1];
    const cur = timeline[i];
    const next = timeline[i + 1];
    if (!prev || !cur || !next) continue;
    if (!observed[i]) continue;
    if (prev === next && cur !== prev) {
      out[i] = prev;
      changed = true;
    }
  }

  return changed ? out : timeline;
}
