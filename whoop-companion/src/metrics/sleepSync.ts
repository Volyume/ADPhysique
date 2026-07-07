import type { DailyMetricRow } from '../db/database';

type SleepDetail = DailyMetricRow['sleepDetail'];

export function sleepNeedsMoreSync(sleepDetail: SleepDetail | null): boolean {
  if (!sleepDetail) return true;
  return (sleepDetail.coveragePct ?? 100) < 60 || (sleepDetail.signalMin ?? 999) < 150;
}

export function sleepSyncActionValue(sleepDetail: SleepDetail | null): string {
  if (sleepDetail?.coveragePct != null) return `${sleepDetail.coveragePct}% coverage`;
  return 'needs sync';
}
