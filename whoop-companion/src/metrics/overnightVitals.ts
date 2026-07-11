import type { HrSampleRow } from '../db/database';
import { isDirectSleepHeartRateSample } from './dataQuality';
import { computeHrvSegments } from './hrv';
import { respiratoryRate } from './respiratory';
import type { SleepResult, SleepStage } from './sleep';

export type OvernightVitals = {
  rmssd: number | null;
  rhr: number | null;
  resp: number | null;
};

export type SleepEpochMaskEntry = {
  startTs: number;
  endTs: number;
  stage: SleepStage;
  stable: boolean;
};

export type SleepEpochMask = ReadonlyArray<SleepEpochMaskEntry>;

/** Independent sleep-quality evidence used to remove wake/motion epochs. */
export type IndependentSleepQuality = {
  startTs: number;
  endTs?: number;
  motion?: number | null;
  bandSleepState?: number | null;
};

type CleanRrRun = {
  values: number[];
  startTs: number;
  endTs: number;
};

type QualityRow = {
  row: HrSampleRow;
  runs: CleanRrRun[];
  rawCount: number;
  acceptedCount: number;
  acceptedDurationMs: number;
};

type QualityWindow = {
  rows: QualityRow[];
  segments: number[][];
  hrValues: number[];
  hrAcceptedCount: number;
  hrWallCoverage: number;
  hrLongestContiguousMs: number;
  rawCount: number;
  acceptedCount: number;
  acceptedDurationMs: number;
  editCoverage: number;
  wallCoverage: number;
  longestContiguousMs: number;
};

const RR_MIN_MS = 300;
const RR_MAX_MS = 2000;
const RR_EDIT_TOLERANCE = 0.22;
const ROW_CONTIGUITY_GAP_MS = 5000;
const QUALITY_WINDOW_MS = 5 * 60 * 1000;
const MIN_QUALITY_WINDOW_MS = 4 * 60 * 1000;
const MIN_RHR_WINDOWS = 3;
const MIN_HRV_WINDOWS = 3;
const MIN_HRV_INTERVALS = 90;
const MIN_HRV_WALL_COVERAGE = 0.7;
const MIN_HRV_EDIT_COVERAGE = 0.7;
const MIN_RHR_WALL_COVERAGE = 0.65;
const MIN_RESPIRATORY_SEGMENT_INTERVALS = 180;
const RESPIRATORY_AGREEMENT_MAX_DIFF = 1.5;
const MIN_RECOVERY_SIGNAL_MIN = 30;
const MAX_RECOVERY_SIGNAL_MIN = 240;
const MIN_SLEEP_COVERAGE = 0.7;

const VALID_SLEEP_SOURCES = new Set<SleepResult['source']>(['auto_hr', 'manual_hr']);

/**
 * SleepResult establishes the overnight boundary. Internal vital selection is
 * then driven only by independent motion/band-state evidence, avoiding an
 * HR-derived stage mask selecting the same HR/RR stream it later summarizes.
 */
export function buildSleepEpochMask(
  sleep: SleepResult | null | undefined,
  independentQuality: ReadonlyArray<IndependentSleepQuality> = [],
): SleepEpochMask {
  if (!hasValidatedSleepProvenance(sleep)) return [];
  if (!Number.isFinite(sleep.startTs) || !Number.isFinite(sleep.endTs) || sleep.endTs <= sleep.startTs) return [];

  const minuteCount = Math.max(1, Math.ceil((sleep.endTs - sleep.startTs) / 60000));
  const stages: SleepStage[] = [];
  for (const segment of sleep.hypnogram) {
    if (!segment || !isSleepStage(segment.stage) || !Number.isFinite(segment.minutes) || segment.minutes <= 0) continue;
    const minutes = Math.max(0, Math.round(segment.minutes));
    for (let i = 0; i < minutes && stages.length < minuteCount; i += 1) stages.push(segment.stage);
    if (stages.length >= minuteCount) break;
  }

  // A truncated/malformed hypnogram cannot prove that the uncovered tail was
  // asleep. Fill it as awake so the mask fails closed at the boundary.
  while (stages.length < minuteCount) stages.push('awake');

  // The HR-derived hypnogram is allowed to establish the night boundary, but
  // it must not cherry-pick internal HR/RR epochs for the vital calculations.
  // Keep the complete interior of that boundary stable, then apply only
  // independent motion/band-state evidence when it is available.
  const firstSleepIndex = stages.findIndex((stage) => stage !== 'awake');
  let lastSleepIndex = -1;
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    if (stages[index] !== 'awake') {
      lastSleepIndex = index;
      break;
    }
  }

  return stages.map((stage, index) => {
    const startTs = sleep.startTs + index * 60000;
    const endTs = Math.min(sleep.endTs, startTs + 60000);
    const insideStableWindow = firstSleepIndex >= 0 && index >= firstSleepIndex && index <= lastSleepIndex;
    return {
      startTs,
      endTs,
      stage,
      stable: insideStableWindow && independentEpochIsStable(startTs, endTs, independentQuality),
    };
  });
}

/** Alias with the policy name used by callers that only need stable epochs. */
export function buildSleepStableEpochMask(sleep: SleepResult | null | undefined): SleepEpochMask {
  return buildSleepEpochMask(sleep);
}

export function hasValidatedSleepProvenance(sleep: SleepResult | null | undefined): sleep is SleepResult {
  return (
    !!sleep &&
    VALID_SLEEP_SOURCES.has(sleep.source) &&
    Array.isArray(sleep.hypnogram) &&
    sleep.hypnogram.length > 0 &&
    Number.isFinite(sleep.inBedMin) &&
    sleep.inBedMin > 0 &&
    Number.isFinite(sleep.signalMin) &&
    Number.isFinite(sleep.endTs) &&
    Number.isFinite(sleep.startTs) &&
    sleep.endTs > sleep.startTs
  );
}

/** Return only rows whose timestamp falls inside an independently stable epoch. */
export function maskHrSamplesToStableEpochs(
  samples: HrSampleRow[],
  sleep: SleepResult | null | undefined,
  mask = buildSleepEpochMask(sleep),
): HrSampleRow[] {
  if (!mask.length || !hasValidatedSleepProvenance(sleep)) return [];
  return samples
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => Number.isFinite(row.ts) && row.ts >= sleep.startTs && row.ts < sleep.endTs)
    .sort((a, b) => a.row.ts - b.row.ts || a.index - b.index)
    .filter(({ row }) => {
      const offset = Math.floor((row.ts - sleep.startTs) / 60000);
      return mask[offset]?.stable === true;
    })
    .map(({ row }) => row);
}

/** Compact duration/efficiency evidence for recovery, independent of HRV stress. */
export function recoverySleepEvidence(sleep: SleepResult | null | undefined, neededMin: number): number | null {
  if (!hasValidatedSleepProvenance(sleep) || !Number.isFinite(neededMin) || neededMin <= 0) return null;
  if (!Number.isFinite(sleep.asleepMin) || !Number.isFinite(sleep.efficiency)) return null;
  const durationPct = clamp((sleep.asleepMin / neededMin) * 100, 0, 100);
  const efficiencyPct = clamp(sleep.efficiency * 100, 0, 100);
  // Recovery already has HRV and sleep-stress inputs elsewhere. Keep this term
  // to duration and efficiency so the same autonomic signal is not counted twice.
  return round3((durationPct * 0.7 + efficiencyPct * 0.3) / 100);
}

/** Compute each overnight vital independently from the same stable mask. */
export function computeOvernightVitals(
  samples: HrSampleRow[],
  sleep: SleepResult | null,
  mask = buildSleepEpochMask(sleep),
): OvernightVitals {
  if (!hasValidatedSleepProvenance(sleep)) return emptyVitals();
  const coverage = sleep.signalMin / Math.max(1, sleep.inBedMin);
  const minimumSignal = Math.min(
    MAX_RECOVERY_SIGNAL_MIN,
    Math.max(MIN_RECOVERY_SIGNAL_MIN, Math.ceil(sleep.inBedMin * 0.5)),
  );
  if (sleep.signalMin < minimumSignal || coverage < MIN_SLEEP_COVERAGE) return emptyVitals();

  const stableRows = maskHrSamplesToStableEpochs(samples, sleep, mask);
  const directRows = stableRows.filter((row) => isDirectSleepHeartRateSample(row));
  if (!directRows.length) return emptyVitals();

  return {
    // No vital is used as a gate or selector for another vital.
    rhr: computeRhrFromRows(directRows),
    rmssd: computeRmssdFromRows(directRows),
    resp: computeRespiratoryRateFromRows(directRows),
  };
}

/** RHR from median HR in contiguous quality windows, never a low percentile. */
export function computeRhrFromRows(samples: HrSampleRow[]): number | null {
  const windows = qualityWindows(samples)
    .filter(
      (window) =>
        window.hrAcceptedCount >= 30 &&
        window.hrWallCoverage >= MIN_RHR_WALL_COVERAGE &&
        window.hrLongestContiguousMs >= MIN_QUALITY_WINDOW_MS,
    )
    .map((window) => median(window.hrValues))
    .filter((value) => Number.isFinite(value) && value >= 35 && value <= 130);

  if (windows.length < MIN_RHR_WINDOWS) return null;
  return Math.round(median(windows));
}

/** RMSSD from independent, well-covered contiguous RR windows. */
export function computeRmssdFromRows(samples: HrSampleRow[]): number | null {
  const windows = qualityWindows(samples)
    .filter(
      (window) =>
        window.acceptedCount >= MIN_HRV_INTERVALS &&
        window.wallCoverage >= MIN_HRV_WALL_COVERAGE &&
        window.editCoverage >= MIN_HRV_EDIT_COVERAGE &&
        window.longestContiguousMs >= MIN_QUALITY_WINDOW_MS,
    )
    .map((window) => {
      const hrv = computeHrvSegments(window.segments);
      if (!hrv || hrv.count < MIN_HRV_INTERVALS || hrv.rmssd < 5 || hrv.rmssd > 180) return null;
      const medianHr = median(window.hrValues);
      if (Math.abs(hrv.meanHr - medianHr) > Math.max(8, medianHr * 0.12)) return null;
      return hrv.rmssd;
    })
    .filter((value): value is number => value != null);

  if (windows.length < MIN_HRV_WINDOWS) return null;
  const centre = median(windows);
  const deviations = windows.map((value) => Math.abs(value - centre));
  const mad = median(deviations);
  const inliers = windows.filter((value) => Math.abs(value - centre) <= Math.max(18, mad * 3));
  return round1(median(inliers.length >= MIN_HRV_WINDOWS ? inliers : windows));
}

/** Respiratory estimates are accepted only when independent segments agree. */
export function computeRespiratoryRateFromRows(samples: HrSampleRow[]): number | null {
  const windows = qualityWindows(samples).filter(
    (window) =>
      window.acceptedCount >= MIN_RESPIRATORY_SEGMENT_INTERVALS &&
      window.wallCoverage >= MIN_HRV_WALL_COVERAGE &&
      window.editCoverage >= MIN_HRV_EDIT_COVERAGE &&
      window.longestContiguousMs >= MIN_QUALITY_WINDOW_MS,
  );
  const candidateSegments = windows.flatMap((window) => window.segments.filter((segment) => segment.length >= MIN_RESPIRATORY_SEGMENT_INTERVALS));
  if (candidateSegments.length < 2) return null;

  const estimates = candidateSegments.map((segment) => respiratoryRate(segment));
  if (estimates.some((value) => value == null)) return null;
  const rates = estimates as number[];
  if (rates.some((value) => value < 9 || value > 24)) return null;
  const centre = median(rates);
  if (rates.some((value) => Math.abs(value - centre) > RESPIRATORY_AGREEMENT_MAX_DIFF)) return null;
  return Math.round(median(rates) * 2) / 2;
}

/** Clean contiguous RR runs for other local physiology consumers. */
export function contiguousRrSegments(rows: HrSampleRow[], maxGapMs = ROW_CONTIGUITY_GAP_MS): number[][] {
  return contiguousQualityRrSegments(qualityRows(rows), maxGapMs);
}

function contiguousQualityRrSegments(rows: QualityRow[], maxGapMs: number): number[][] {
  const segments: number[][] = [];
  let current: number[] | null = null;
  let lastTs: number | null = null;
  for (const quality of rows) {
    if (!quality.runs.length) {
      current = null;
      lastTs = null;
      continue;
    }
    for (const run of quality.runs) {
      if (!current || lastTs == null || quality.row.ts <= lastTs || quality.row.ts - lastTs > maxGapMs) {
        current = [];
        segments.push(current);
      }
      current.push(...run.values);
      lastTs = quality.row.ts;
    }
  }
  return segments;
}

function qualityWindows(samples: HrSampleRow[]): QualityWindow[] {
  const rows = qualityRows(samples);
  const byBucket = new Map<number, QualityRow[]>();
  for (const row of rows) {
    const bucket = Math.floor(row.row.ts / QUALITY_WINDOW_MS);
    const current = byBucket.get(bucket) ?? [];
    current.push(row);
    byBucket.set(bucket, current);
  }

  return [...byBucket.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, bucketRows]) => {
      const sortedRows = bucketRows.slice().sort((a, b) => a.row.ts - b.row.ts);
      const acceptedRows = sortedRows.filter((row) => row.runs.length > 0);
      const segments = contiguousQualityRrSegments(sortedRows, ROW_CONTIGUITY_GAP_MS);
      const hrStats = contiguousHrStats(sortedRows);
      const hrValues = sortedRows.map((row) => row.row.bpm);
      const rawCount = sortedRows.reduce((sum, row) => sum + row.rawCount, 0);
      const acceptedCount = sortedRows.reduce((sum, row) => sum + row.acceptedCount, 0);
      const acceptedDurationMs = sortedRows.reduce((sum, row) => sum + row.acceptedDurationMs, 0);
      const editCoverage = rawCount > 0 ? acceptedCount / rawCount : 0;
      const wallCoverage = acceptedDurationMs / QUALITY_WINDOW_MS;
      return {
        rows: sortedRows,
        segments,
        hrValues,
        hrAcceptedCount: sortedRows.length,
        hrWallCoverage: Math.min(1, hrStats.durationMs / QUALITY_WINDOW_MS),
        hrLongestContiguousMs: hrStats.longestMs,
        rawCount,
        acceptedCount,
        acceptedDurationMs,
        editCoverage,
        wallCoverage: Math.min(1, wallCoverage),
        longestContiguousMs: longestContiguousMs(sortedRows),
      };
    });
}

function independentEpochIsStable(
  startTs: number,
  endTs: number,
  quality: ReadonlyArray<IndependentSleepQuality>,
): boolean {
  const relevant = quality.filter((entry) => {
    const entryEnd = Number.isFinite(entry.endTs) ? (entry.endTs as number) : entry.startTs + 60000;
    return Number.isFinite(entry.startTs) && entry.startTs < endTs && entryEnd > startTs;
  });
  if (!relevant.length) return true;

  for (const entry of relevant) {
    if (entry.bandSleepState != null) {
      if (![0, 1, 2, 3].includes(entry.bandSleepState)) return false;
      if (entry.bandSleepState === 0 || entry.bandSleepState === 3) return false;
    }
    if (entry.motion != null) {
      if (!Number.isFinite(entry.motion) || entry.motion < 0 || entry.motion > 1) return false;
      if (entry.motion >= 0.35) return false;
    }
  }
  return true;
}

function qualityRows(samples: HrSampleRow[]): QualityRow[] {
  return samples
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => Number.isFinite(row.ts) && isFiniteHeartRate(row.bpm))
    .sort((a, b) => a.row.ts - b.row.ts || a.index - b.index)
    .map(({ row }) => cleanRow(row));
}

function cleanRow(row: HrSampleRow): QualityRow {
  const raw = Array.isArray(row.rr) ? row.rr : [];
  const rawCount = raw.length;
  const finiteInRange = raw.filter((value) => Number.isFinite(value) && value >= RR_MIN_MS && value <= RR_MAX_MS);
  const localMedian = median(finiteInRange);
  const robust: Array<number | null> = raw.map((value) => {
    if (!Number.isFinite(value) || value < RR_MIN_MS || value > RR_MAX_MS) return null;
    const beatHr = 60000 / value;
    if (Math.abs(beatHr - row.bpm) > Math.max(10, row.bpm * 0.18)) return null;
    if (localMedian > 0 && Math.abs(value - localMedian) > Math.max(180, localMedian * RR_EDIT_TOLERANCE)) return null;
    return value;
  });

  const runs: CleanRrRun[] = [];
  let values: number[] = [];
  const close = () => {
    if (values.length) {
      runs.push({ values, startTs: row.ts, endTs: row.ts });
      values = [];
    }
  };
  for (const value of robust) {
    if (value == null) close();
    else values.push(value);
  }
  close();

  const acceptedCount = runs.reduce((sum, run) => sum + run.values.length, 0);
  const acceptedDurationMs = runs.reduce((sum, run) => sum + run.values.reduce((total, value) => total + value, 0), 0);
  return { row, runs, rawCount, acceptedCount, acceptedDurationMs };
}

function longestContiguousMs(rows: QualityRow[]): number {
  let longest = 0;
  let current = 0;
  let previousTs: number | null = null;
  for (const row of rows) {
    if (!row.runs.length) {
      current = 0;
      previousTs = null;
      continue;
    }
    const gap = previousTs == null ? 0 : row.row.ts - previousTs;
    if (previousTs == null || gap <= ROW_CONTIGUITY_GAP_MS && gap > 0) {
      const cadence = gap > 0 ? gap : 1000;
      current += cadence;
    } else {
      current = 1000;
    }
    longest = Math.max(longest, current);
    previousTs = row.row.ts;
  }
  return longest;
}

function contiguousHrStats(rows: QualityRow[]): { durationMs: number; longestMs: number } {
  let durationMs = 0;
  let longestMs = 0;
  let currentMs = 0;
  let previousTs: number | null = null;
  for (const row of rows) {
    const ts = row.row.ts;
    if (previousTs == null) {
      currentMs = 1000;
      durationMs += currentMs;
    } else {
      const gap = ts - previousTs;
      if (gap > 0 && gap <= ROW_CONTIGUITY_GAP_MS) {
        currentMs += gap;
        durationMs += gap;
      } else {
        currentMs = 1000;
        durationMs += currentMs;
      }
    }
    longestMs = Math.max(longestMs, currentMs);
    previousTs = ts;
  }
  return { durationMs, longestMs };
}

function isSleepStage(value: unknown): value is SleepStage {
  return value === 'awake' || value === 'light' || value === 'deep' || value === 'rem';
}

function isFiniteHeartRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 30 && value <= 220;
}

function emptyVitals(): OvernightVitals {
  return { rmssd: null, rhr: null, resp: null };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[middle] as number) : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
