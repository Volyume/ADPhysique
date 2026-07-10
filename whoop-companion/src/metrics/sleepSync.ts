import { SLEEP_TRUST_LOW_COVERAGE_PCT, SLEEP_TRUST_LOW_SIGNAL_MIN } from './sleepTrustWeight';

type SleepSyncSource = { coveragePct?: number | null; signalMin?: number | null };

export function sleepNeedsMoreSync(sleepDetail: SleepSyncSource | null): boolean {
  if (!sleepDetail) return true;
  if (sleepDetail.coveragePct == null || sleepDetail.signalMin == null) return true;
  return (
    sleepDetail.coveragePct < SLEEP_TRUST_LOW_COVERAGE_PCT ||
    sleepDetail.signalMin < SLEEP_TRUST_LOW_SIGNAL_MIN
  );
}

export function sleepSyncActionValue(sleepDetail: SleepSyncSource | null): string {
  if (sleepDetail?.coveragePct != null) return `${sleepDetail.coveragePct}% coverage`;
  return 'needs sync';
}
