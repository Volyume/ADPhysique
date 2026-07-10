import type { DailyMetricRow, JournalRow } from '../db/database';
import type { Behaviour } from '../data/journalBehaviours';
import { sleepTrustTier } from './sleepTrustWeight';

export type JournalImpact = {
  behaviour: string;
  question: string;
  yesCount: number;
  noCount: number;
  recoveryDelta: number | null;
  sleepDelta: number | null;
  confidence: 'building' | 'established';
};

function nextDay(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dateOfMonth = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateOfMonth}`;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function delta(yes: number[], no: number[]): number | null {
  if (yes.length < 2 || no.length < 2) return null;
  const yesAverage = average(yes);
  const noAverage = average(no);
  return yesAverage == null || noAverage == null ? null : Math.round((yesAverage - noAverage) * 10) / 10;
}

/**
 * Compare yes/no journal answers with the following wake day's trusted
 * recovery and sleep performance. These are observational associations only;
 * sample thresholds prevent a single unusual day becoming an "insight".
 */
export function computeJournalImpacts(
  entries: JournalRow[],
  days: DailyMetricRow[],
  behaviours: Behaviour[],
): JournalImpact[] {
  const outcomes = new Map(days.map((day) => [day.day, day]));
  const labels = new Map(behaviours.filter((item) => item.type === 'yesno').map((item) => [item.id, item.question]));
  const buckets = new Map<string, {
    yesRecovery: number[];
    noRecovery: number[];
    yesSleep: number[];
    noSleep: number[];
  }>();

  for (const entry of entries) {
    if (!labels.has(entry.behaviour) || (entry.value !== 'yes' && entry.value !== 'no')) continue;
    const outcome = outcomes.get(nextDay(entry.day));
    if (!outcome || sleepTrustTier(outcome.sleepDetail) === 'low') continue;
    const bucket = buckets.get(entry.behaviour) ?? {
      yesRecovery: [],
      noRecovery: [],
      yesSleep: [],
      noSleep: [],
    };
    const recovery = outcome.recovery;
    const sleepPerformance = outcome.sleepDetail?.performance ?? null;
    if (entry.value === 'yes') {
      if (recovery != null) bucket.yesRecovery.push(recovery);
      if (sleepPerformance != null) bucket.yesSleep.push(sleepPerformance);
    } else {
      if (recovery != null) bucket.noRecovery.push(recovery);
      if (sleepPerformance != null) bucket.noSleep.push(sleepPerformance);
    }
    buckets.set(entry.behaviour, bucket);
  }

  const impacts: JournalImpact[] = [];
  for (const [behaviour, bucket] of buckets) {
    const yesCount = Math.max(bucket.yesRecovery.length, bucket.yesSleep.length);
    const noCount = Math.max(bucket.noRecovery.length, bucket.noSleep.length);
    if (yesCount < 5 || noCount < 5) continue;
    const recoveryDelta = delta(bucket.yesRecovery, bucket.noRecovery);
    const sleepDelta = delta(bucket.yesSleep, bucket.noSleep);
    if (recoveryDelta == null && sleepDelta == null) continue;
    const minGroup = Math.min(yesCount, noCount);
    impacts.push({
      behaviour,
      question: labels.get(behaviour) ?? behaviour,
      yesCount,
      noCount,
      recoveryDelta,
      sleepDelta,
      confidence: minGroup >= 10 ? 'established' : 'building',
    });
  }

  return impacts
    .sort((a, b) => Math.max(Math.abs(b.recoveryDelta ?? 0), Math.abs(b.sleepDelta ?? 0)) - Math.max(Math.abs(a.recoveryDelta ?? 0), Math.abs(a.sleepDelta ?? 0)))
    .slice(0, 8);
}
