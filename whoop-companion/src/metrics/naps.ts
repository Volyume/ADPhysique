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

const MAX_NAP_CREDIT_MIN = 180;

export function napDetailFromSleep(sleep: SleepResult, autoDetected: boolean): StoredNapDetail {
  const coveragePct = Math.round((sleep.signalMin / Math.max(1, sleep.inBedMin)) * 100);
  return {
    kind: 'nap_sleep',
    autoDetected,
    startTs: sleep.startTs,
    endTs: sleep.endTs,
    inBedMin: sleep.inBedMin,
    asleepMin: sleep.asleepMin,
    restorativeMin: sleep.restorativeMin,
    efficiency: Math.round(sleep.efficiency * 100),
    signalMin: sleep.signalMin,
    coveragePct: Math.max(0, Math.min(100, coveragePct)),
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
  if (detail) return Math.min(MAX_NAP_CREDIT_MIN, Math.max(0, detail.asleepMin));
  const durationMin = Math.round((row.endTs - row.startTs) / 60000);
  return Math.min(MAX_NAP_CREDIT_MIN, Math.max(0, Math.round(durationMin * 0.85)));
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
