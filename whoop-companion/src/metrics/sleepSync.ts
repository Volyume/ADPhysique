type SleepSyncSource = { coveragePct?: number | null; signalMin?: number | null };

export function sleepNeedsMoreSync(sleepDetail: SleepSyncSource | null): boolean {
  if (!sleepDetail) return true;
  return (sleepDetail.coveragePct ?? 100) < 60 || (sleepDetail.signalMin ?? 999) < 150;
}

export function sleepSyncActionValue(sleepDetail: SleepSyncSource | null): string {
  if (sleepDetail?.coveragePct != null) return `${sleepDetail.coveragePct}% coverage`;
  return 'needs sync';
}
