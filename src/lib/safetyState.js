/**
 * safetyState: the ONE place the app composes its three safety reads
 * (D228 item 2, founder 2026-10-15; survey area 1).
 *
 * Before this module three compositions lived side by side: calm OR flag OR
 * failed read (the photo hook and nine inline chains), the same plus a SCOFF
 * score of 2 or more (Today, the You tab, the coach PDF), and flag only (the
 * Diary bank, the goal-change summary). They agreed today by luck, not by
 * construction. Every surface now derives its verdict from this one shape,
 * so the OR can never drift between screens again.
 *
 * FAIL CLOSED, always: a failed read of either input counts as suppressed,
 * and the unknown state (before any read resolves) is suppressed. Nothing
 * here lowers a floor, moves a gate or reads tier (proGate.js mandate): it
 * only composes the reads the ED-safety system already makes.
 *
 * Pure derivation + one async reader; no React (the hook lives in
 * src/hooks/useSafetyState.js).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isCalm, WELLBEING_KEY } from './wellbeing';
import { getOpenEdPatternFlag } from './database';

/** The verdict before any read resolves: suppressed, nothing known. */
export const SAFETY_STATE_UNKNOWN = Object.freeze({
  calm: false,
  edFlagOpen: false,
  readFailed: true,
  scoffPositive: false,
  suppressed: true,
  known: false,
});

/**
 * Pure. `mode` is the raw wellbeing value ('calm' | 'normal' |
 * 'unspecified' | 'read_failed'); `edFlag` is the open row, null, or the
 * 'read_failed' sentinel; `scoffScore` is the profile's screening score or
 * undefined.
 *
 * `suppressed` is calm OR an open flag OR a failed read: exactly the photo
 * hook's law (usePhotoSuppression.derivePhotoSuppression), so every surface
 * that read that hook keeps its verdict. `scoffPositive` is carried
 * separately for the two surfaces that add it (Today, the You tab); it never
 * widens `suppressed` on its own.
 */
export function deriveSafetyState({ mode, edFlag, scoffScore } = {}) {
  const readFailed = mode === 'read_failed' || edFlag === 'read_failed';
  const calm = isCalm(mode);
  const edFlagOpen = !!edFlag && edFlag !== 'read_failed';
  const scoffPositive = Number.isFinite(scoffScore) && scoffScore >= 2;
  return Object.freeze({
    calm,
    edFlagOpen,
    readFailed,
    scoffPositive,
    suppressed: calm || edFlagOpen || readFailed,
    known: true,
  });
}

/**
 * The raw reads, fail closed. The wellbeing key is read RAW (never through
 * the failure-swallowing getWellbeingMode, which would fail OPEN); the flag
 * read is the SQLite row. A null userId binds nothing and reads as "no
 * flag", as the photo hook always has; callers that can lack a user pass
 * nothing and get the unknown, suppressed state.
 *
 * @param {string|null|undefined} userId
 * @param {{ scoffScore?: number }} [opts]
 * @returns {Promise<object>} a deriveSafetyState() result
 */
export async function readSafetyState(userId, opts = {}) {
  if (!userId) return SAFETY_STATE_UNKNOWN;
  const [mode, edFlag] = await Promise.all([
    AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
    getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
  ]);
  return deriveSafetyState({ mode, edFlag, scoffScore: opts.scoffScore });
}
