import { SLEEP_TRUST_LOW_COVERAGE_PCT, SLEEP_TRUST_LOW_SIGNAL_MIN } from './sleepTrustWeight';

type SleepSyncSource = { coveragePct?: number | null; signalMin?: number | null };

export function sleepNeedsMoreSync(sleepDetail: SleepSyncSource | null): boolean {
  if (!sleepDetail) return true;
  return (
    (sleepDetail.coveragePct ?? 100) < SLEEP_TRUST_LOW_COVERAGE_PCT ||
    (sleepDetail.signalMin ?? 999) < SLEEP_TRUST_LOW_SIGNAL_MIN
  );
}

export function sleepSyncActionValue(sleepDetail: SleepSyncSource | null): string {
  if (sleepDetail?.coveragePct != null) return `${sleepDetail.coveragePct}% coverage`;
  return 'needs sync';
}
