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
  cappedBySafetyLimit?: boolean | null;
};

const LONG_AUTO_SLEEP_MIN = 7 * 60;
const MIN_LONG_AUTO_SLEEP_EVIDENCE_PCT = 35;
const MIN_VERY_LONG_AUTO_SLEEP_EVIDENCE_PCT = 45;
const MIN_SLEEP_CORROBORATION_PCT = 25;
const AUTO_SLEEP_SAFETY_CEILING_MIN = 11 * 60;

/** A result on the automatic ceiling was truncated, not naturally bounded. */
export function autoSleepAtSafetyCeiling(
  evidence: Pick<SleepCorroborationEvidence, 'inBedMin' | 'windowMin' | 'cappedBySafetyLimit'> | null | undefined,
  manual = false,
): boolean {
  if (manual) return false;
  if (typeof evidence?.cappedBySafetyLimit === 'boolean') return evidence.cappedBySafetyLimit;
  // Legacy persisted nights predate the explicit truncation flag.
  return evidenceWindowMin(evidence) >= AUTO_SLEEP_SAFETY_CEILING_MIN - 5;
}

export function sleepStateWakeConflict(_evidence: SleepStateEvidence | null | undefined): boolean {
  // Offset 81 has not been validated against labelled WHOOP 5 sleep. Keep its
  // distribution visible for decoder work, but never let it accept or veto sleep.
  return false;
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
  // Only explicitly low-motion epochs count as still. `motionMin-movingMin`
  // also includes the ambiguous 0.2-0.4 band and previously turned moderate
  // movement into false sleep corroboration.
  const stillMin = Math.max(0, evidence?.stillMin ?? 0);
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
  // history drain. Longer windows demand more independently observed motion.
  // The decoded v18 state nibble remains diagnostic until labelled validation.
  const requiredPct = windowMin >= 9 * 60
    ? MIN_VERY_LONG_AUTO_SLEEP_EVIDENCE_PCT
    : MIN_LONG_AUTO_SLEEP_EVIDENCE_PCT;
  return sleepEvidencePct(evidence) < requiredPct;
}

function evidenceWindowMin(evidence: SleepCorroborationEvidence | null | undefined): number {
  return evidence?.inBedMin ?? evidence?.windowMin ?? 0;
}
