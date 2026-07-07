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
const MIN_LONG_AUTO_SLEEP_EVIDENCE_PCT = 18;
const MIN_SLEEP_CORROBORATION_PCT = 25;
const MIN_LONG_AUTO_SLEEP_STATE_MIN = 60;
const MIN_LONG_AUTO_SLEEP_STATE_PROOF_RATIO = 0.35;
const MIN_LONG_AUTO_SLEEP_WINDOW_PROOF_RATIO = 0.12;

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

export function sleepEvidencePct(evidence: SleepCorroborationEvidence | null | undefined): number {
  const windowMin = evidenceWindowMin(evidence);
  if (!windowMin) return 0;
  const stillMin = Math.max(
    evidence?.stillMin ?? 0,
    evidence?.sleepStateAsleepMin ?? 0,
    evidence?.sleepStateStillMin ?? 0,
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
  return sleepEvidencePct(evidence) < MIN_LONG_AUTO_SLEEP_EVIDENCE_PCT && !hasSleepStateProof(evidence);
}

function hasSleepStateProof(evidence: SleepCorroborationEvidence | null | undefined): boolean {
  const stateMin = evidence?.sleepStateMin ?? 0;
  const windowMin = evidenceWindowMin(evidence);
  const proofMin = (evidence?.sleepStateAsleepMin ?? 0) + (evidence?.sleepStateStillMin ?? 0);
  return (
    stateMin >= MIN_LONG_AUTO_SLEEP_STATE_MIN &&
    proofMin / Math.max(1, stateMin) >= MIN_LONG_AUTO_SLEEP_STATE_PROOF_RATIO &&
    proofMin / Math.max(1, windowMin) >= MIN_LONG_AUTO_SLEEP_WINDOW_PROOF_RATIO
  );
}

function evidenceWindowMin(evidence: SleepCorroborationEvidence | null | undefined): number {
  return evidence?.inBedMin ?? evidence?.windowMin ?? 0;
}
