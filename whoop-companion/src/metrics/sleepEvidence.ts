export type SleepStateEvidence = {
  sleepStateMin?: number | null;
  sleepStateWakeMin?: number | null;
  sleepStateStillMin?: number | null;
  sleepStateAsleepMin?: number | null;
  sleepStateUpMin?: number | null;
};

export type SleepCorroborationEvidence = SleepStateEvidence & {
  source?: 'auto_hr' | 'manual_hr' | 'manual_duration' | null;
  inBedMin?: number | null;
  windowMin?: number | null;
  motionMin?: number | null;
  stillMin?: number | null;
  movingMin?: number | null;
};

const LONG_AUTO_SLEEP_MIN = 7 * 60;
const MIN_LONG_AUTO_SLEEP_EVIDENCE_PCT = 35;
const MIN_VERY_LONG_AUTO_SLEEP_EVIDENCE_PCT = 45;
const MIN_SLEEP_CORROBORATION_PCT = 25;
const MIN_LONG_AUTO_SLEEP_STATE_MIN = 60;
const MIN_LONG_AUTO_SLEEP_STATE_PROOF_RATIO = 0.35;
const MIN_LONG_AUTO_SLEEP_WINDOW_PROOF_RATIO = 0.12;

export function sleepStateWakeConflict(evidence: SleepStateEvidence | null | undefined): boolean {
  const stateMin = evidence?.sleepStateMin ?? 0;
  // This byte is still a candidate decode. Do not treat an all-zero stream as
  // authoritative wake until the same capture has emitted sleep-like state 2.
  if (stateMin < 30 || (evidence?.sleepStateAsleepMin ?? 0) < 3) return false;
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

export function sleepEvidencePct(evidence: SleepCorroborationEvidence | null | undefined): number {
  const windowMin = evidenceWindowMin(evidence);
  if (!windowMin) return 0;
  const stateValidated = (evidence?.sleepStateAsleepMin ?? 0) >= 3;
  const stillMin = Math.max(
    evidence?.stillMin ?? 0,
    stateValidated ? evidence?.sleepStateAsleepMin ?? 0 : 0,
    stateValidated ? evidence?.sleepStateStillMin ?? 0 : 0,
    Math.max(0, (evidence?.motionMin ?? 0) - (evidence?.movingMin ?? 0)),
  );
  return Math.round((stillMin / Math.max(1, windowMin)) * 100);
}

export function sleepHasCorroboration(evidence: SleepCorroborationEvidence | null | undefined): boolean {
  return sleepEvidencePct(evidence) >= MIN_SLEEP_CORROBORATION_PCT;
}

export function longAutoSleepNeedsCorroboration(
  evidence: SleepCorroborationEvidence | null | undefined,
  manual: boolean,
): boolean {
  if (manual) return false;
  if (evidence?.source && evidence.source !== 'auto_hr') return false;
  const windowMin = evidenceWindowMin(evidence);
  if (windowMin < LONG_AUTO_SLEEP_MIN) return false;
  // A couple of hours of stillness is not enough to call a whole night asleep:
  // it can equally be a quiet evening, a strap on a bedside table, or a partial
  // history drain. Longer windows demand more independently observed stillness
  // unless the decoded strap sleep-state stream proves otherwise.
  const requiredPct = windowMin >= 9 * 60
    ? MIN_VERY_LONG_AUTO_SLEEP_EVIDENCE_PCT
    : MIN_LONG_AUTO_SLEEP_EVIDENCE_PCT;
  return sleepEvidencePct(evidence) < requiredPct && !hasSleepStateProof(evidence);
}

function hasSleepStateProof(evidence: SleepCorroborationEvidence | null | undefined): boolean {
  const stateMin = evidence?.sleepStateMin ?? 0;
  const windowMin = evidenceWindowMin(evidence);
  const proofMin = (evidence?.sleepStateAsleepMin ?? 0) + (evidence?.sleepStateStillMin ?? 0);
  return (
    stateMin >= MIN_LONG_AUTO_SLEEP_STATE_MIN &&
    (evidence?.sleepStateAsleepMin ?? 0) >= 10 &&
    proofMin / Math.max(1, stateMin) >= MIN_LONG_AUTO_SLEEP_STATE_PROOF_RATIO &&
    proofMin / Math.max(1, windowMin) >= MIN_LONG_AUTO_SLEEP_WINDOW_PROOF_RATIO
  );
}

function evidenceWindowMin(evidence: SleepCorroborationEvidence | null | undefined): number {
  return evidence?.inBedMin ?? evidence?.windowMin ?? 0;
}
