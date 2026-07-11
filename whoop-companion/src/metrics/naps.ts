import type { CardioRow } from '../db/database';
import type { SleepResult } from './sleep';

export type StoredNapDetail = {
  kind: 'nap_sleep';
  autoDetected: boolean;
  startTs: number;
  endTs: number;
  inBedMin: number;
  asleepMin: number;
  restorativeMin: number;
  efficiency: number;
  signalMin: number;
  coveragePct: number;
  source: SleepResult['source'];
};

const MAX_NAP_CREDIT_MIN = 120;
const MAX_UNVERIFIED_NAP_CREDIT_MIN = 60;
const MINUTE_MS = 60_000;

export type NapInterval = Pick<CardioRow, 'startTs' | 'endTs'>;

/** Strict half-open overlap used when admitting auto-detected nap intervals. */
export function napIntervalsOverlap(a: NapInterval, b: NapInterval): boolean {
  return isValidInterval(a.startTs, a.endTs) && isValidInterval(b.startTs, b.endTs) && a.startTs < b.endTs && b.startTs < a.endTs;
}

export function hasOverlappingNap(candidate: NapInterval, existing: NapInterval[]): boolean {
  return existing.some((nap) => napIntervalsOverlap(candidate, nap));
}

export function canInsertAutoNap(candidate: NapInterval, existing: NapInterval[]): boolean {
  return isValidInterval(candidate.startTs, candidate.endTs) && !hasOverlappingNap(candidate, existing);
}

export function napDetailFromSleep(sleep: SleepResult, autoDetected: boolean): StoredNapDetail {
  const isDurationOnly = sleep.source === 'manual_duration';
  const coveragePct = Math.round((sleep.signalMin / Math.max(1, sleep.inBedMin)) * 100);
  return {
    kind: 'nap_sleep',
    autoDetected,
    startTs: sleep.startTs,
    endTs: sleep.endTs,
    inBedMin: sleep.inBedMin,
    // A timer proves time in bed only. Do not persist durationOnlySleep's
    // convenience estimate as if it were observed sleep or restorative sleep.
    asleepMin: isDurationOnly ? 0 : sleep.asleepMin,
    restorativeMin: isDurationOnly ? 0 : sleep.restorativeMin,
    efficiency: isDurationOnly ? 0 : Math.round(sleep.efficiency * 100),
    signalMin: isDurationOnly ? 0 : sleep.signalMin,
    coveragePct: isDurationOnly ? 0 : Math.max(0, Math.min(100, coveragePct)),
    source: sleep.source,
  };
}

export function encodeNapDetail(detail: StoredNapDetail | null): string | null {
  return detail ? JSON.stringify(detail) : null;
}

export function parseNapDetail(notes: string | null | undefined): StoredNapDetail | null {
  if (!notes) return null;
  try {
    const raw = JSON.parse(notes) as Partial<StoredNapDetail>;
    if (raw.kind !== 'nap_sleep') return null;
    const inBedMin = cleanMin(raw.inBedMin);
    const asleepMin = cleanMin(raw.asleepMin);
    if (inBedMin == null || asleepMin == null) return null;
    return {
      kind: 'nap_sleep',
      autoDetected: raw.autoDetected === true,
      startTs: cleanTs(raw.startTs) ?? 0,
      endTs: cleanTs(raw.endTs) ?? 0,
      inBedMin,
      asleepMin,
      restorativeMin: cleanMin(raw.restorativeMin) ?? 0,
      efficiency: cleanPct(raw.efficiency) ?? 0,
      signalMin: cleanMin(raw.signalMin) ?? 0,
      coveragePct: cleanPct(raw.coveragePct) ?? 0,
      source: raw.source === 'auto_hr' || raw.source === 'manual_hr' || raw.source === 'manual_duration' ? raw.source : 'manual_duration',
    };
  } catch {
    return null;
  }
}

export function napCreditMin(row: CardioRow): number {
  if (row.source !== 'nap') return 0;
  const detail = parseNapDetail(row.notes);
  if (detail) {
    if (detail.source === 'manual_duration') {
      return Math.min(MAX_UNVERIFIED_NAP_CREDIT_MIN, Math.max(0, Math.round(detail.inBedMin * 0.5)));
    }
    const signalFactor =
      detail.coveragePct >= 80 ? 1 : detail.coveragePct >= 50 ? 0.75 : 0.5;
    const efficiencyFactor = detail.efficiency >= 80 ? 1 : detail.efficiency >= 65 ? 0.85 : 0.65;
    const cap = detail.coveragePct < 50 ? MAX_UNVERIFIED_NAP_CREDIT_MIN : MAX_NAP_CREDIT_MIN;
    return Math.min(cap, Math.max(0, Math.round(detail.asleepMin * signalFactor * efficiencyFactor)));
  }
  const durationMin = Math.round((row.endTs - row.startTs) / 60000);
  return Math.min(MAX_UNVERIFIED_NAP_CREDIT_MIN, Math.max(0, Math.round(durationMin * 0.5)));
}

/** Credit only the portion of a nap overlapping the requested load window. */
export function napCreditMinWithin(row: CardioRow, startTs: number, endTs: number): number {
  if (!isValidInterval(row.startTs, row.endTs) || !isValidInterval(startTs, endTs)) return 0;
  const fullCredit = napCreditMin(row);
  const durationMs = row.endTs - row.startTs;
  const overlapMs = Math.max(0, Math.min(row.endTs, endTs) - Math.max(row.startTs, startTs));
  if (overlapMs <= 0 || fullCredit <= 0) return 0;

  // Floors are intentional: independently scoring split windows must never
  // create more credit than scoring the nap once, and credit cannot exceed
  // the elapsed duration of the overlap itself.
  const proportionalCredit = Math.floor(fullCredit * (overlapMs / durationMs));
  const elapsedCredit = Math.floor(overlapMs / MINUTE_MS);
  return Math.max(0, Math.min(fullCredit, proportionalCredit, elapsedCredit));
}

function isValidInterval(startTs: number, endTs: number): boolean {
  return Number.isFinite(startTs) && Number.isFinite(endTs) && endTs > startTs;
}

function cleanMin(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function cleanTs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function cleanPct(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null;
}
