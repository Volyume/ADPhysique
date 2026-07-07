export type SleepStateEvidence = {
  sleepStateMin?: number | null;
  sleepStateWakeMin?: number | null;
  sleepStateStillMin?: number | null;
  sleepStateAsleepMin?: number | null;
  sleepStateUpMin?: number | null;
};

export function sleepStateWakeConflict(evidence: SleepStateEvidence | null | undefined): boolean {
  const stateMin = evidence?.sleepStateMin ?? 0;
  if (stateMin < 30) return false;
  const wakeLike = sleepStateWakeLikeMin(evidence);
  const sleepLike = (evidence?.sleepStateAsleepMin ?? 0) + (evidence?.sleepStateStillMin ?? 0);
  return sleepLike < 10 && wakeLike / Math.max(1, stateMin) >= 0.85;
}

export function sleepStateWakeLikeMin(evidence: SleepStateEvidence | null | undefined): number {
  return (evidence?.sleepStateWakeMin ?? 0) + (evidence?.sleepStateUpMin ?? 0);
}

export function sleepStateWakeDisplay(evidence: SleepStateEvidence | null | undefined, unit = 'min wake'): string {
  return `${sleepStateWakeLikeMin(evidence)}/${evidence?.sleepStateMin ?? 0} ${unit}`;
}
