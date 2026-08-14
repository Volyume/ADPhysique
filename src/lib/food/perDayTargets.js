/**
 * food/perDayTargets.js — STORAGE ONLY. Retired as a product feature.
 *
 * ONE DAILY TRUTH (Campaign 17A, founder law): "VOLYUME HAS THE SAME BASE
 * CALORIE AND MACRO TARGET EVERY DAY... The user's training days are not fixed
 * calendar days. They train whenever life allows. Nutrition must not depend on
 * knowing which weekday they train."
 *
 * This module used to back a Pro control (the deleted PerDayTargetsScreen)
 * where an athlete set a kcal offset per weekday, which the diary then applied
 * to that day's displayed target. Both the screen and the application are
 * gone: nothing in the app reads these offsets into a target any more, and
 * there is no hidden setting left that could move one.
 *
 * WHY THE MODULE SURVIVES. Deleting it would destroy numbers real users
 * entered, locally and in the `perday_target_offsets` cloud table. The founder
 * order is to stop APPLYING retired per-day state, not to delete it
 * ("preserve data only where deletion would be destructive"). So the store and
 * its sync handler stay, the rows keep round-tripping untouched, and nothing
 * consumes them. If per-day planning ever returns as a deliberate product
 * decision, the athlete's own numbers are still there.
 *
 * Offsets are kcal deltas (… −200, 0, +300 …) keyed Monday-first, stored
 * device-local in AsyncStorage with a separate last-write-wins clock
 * (ms epoch) that backs the cloud table in
 * src/lib/sync/tables/perDayTargetOffsets.js.
 *
 * The one day an athlete CAN still move is a banked day - and only because
 * they banked it themselves (src/lib/food/calorieBank.js).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PERDAY_TARGETS_KEY = '@volyume_perday_target_offsets';
// Last-write-wins clock for the cloud sync handler. Stored separately from
// PERDAY_TARGETS_KEY so the existing offsets payload shape never changes.
export const PERDAY_TARGETS_UPDATED_AT_KEY = '@volyume_perday_target_offsets_updated_at';

// Monday-first, matching the diary's weekDatesMon week model.
export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

// A sane bound on a single day's manual offset so a fat-fingered entry can't show
// an absurd target. Safety (the floor) is enforced separately and is senior; this
// is just presentation hygiene on the upside and a symmetric downside cap.
export const MAX_PERDAY_OFFSET_KCAL = 1500;

export const DEFAULT_PERDAY_OFFSETS = Object.freeze(
  WEEKDAY_KEYS.reduce((acc, k) => { acc[k] = 0; return acc; }, {}),
);

/**
 * The Monday-first weekday key for an ISO 'yyyy-mm-dd' date. Parsed as a LOCAL
 * calendar date (not UTC) so the weekday matches the day the user sees in the
 * diary, irrespective of timezone.
 *
 * @param {string} iso  'yyyy-mm-dd'
 * @returns {string|null} one of WEEKDAY_KEYS, or null on a malformed input
 */
export function weekdayKeyFromIso(iso) {
  if (typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  // getDay(): 0=Sun … 6=Sat. Map to Monday-first index.
  const jsDay = dt.getDay();
  const mondayIdx = (jsDay + 6) % 7; // Mon=0 … Sun=6
  return WEEKDAY_KEYS[mondayIdx];
}

/** Coerce any stored/passed value into a clean, bounded integer offset. */
export function sanitiseOffset(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(-MAX_PERDAY_OFFSET_KCAL, Math.min(MAX_PERDAY_OFFSET_KCAL, n));
}

/** Normalise a partial/loose offsets map to a full, bounded one (every weekday). */
export function normaliseOffsets(raw) {
  const out = {};
  for (const k of WEEKDAY_KEYS) {
    out[k] = sanitiseOffset(raw && typeof raw === 'object' ? raw[k] : 0);
  }
  return out;
}

/** The kcal offset for an ISO date (0 when none / malformed). */
export function offsetForDate(offsets, iso) {
  const key = weekdayKeyFromIso(iso);
  if (!key) return 0;
  return sanitiseOffset(offsets ? offsets[key] : 0);
}

/** True when at least one weekday carries a non-zero offset. */
export function hasAnyOffset(offsets) {
  return WEEKDAY_KEYS.some((k) => sanitiseOffset(offsets ? offsets[k] : 0) !== 0);
}

export async function loadPerDayOffsets() {
  try {
    const raw = await AsyncStorage.getItem(PERDAY_TARGETS_KEY);
    if (!raw) return { ...DEFAULT_PERDAY_OFFSETS };
    return normaliseOffsets(JSON.parse(raw));
  } catch (_) {
    return { ...DEFAULT_PERDAY_OFFSETS };
  }
}

/** The ms epoch the offsets were last written locally, or 0 if never saved. */
export async function loadPerDayOffsetsUpdatedAtMs() {
  try {
    const raw = await AsyncStorage.getItem(PERDAY_TARGETS_UPDATED_AT_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch (_) {
    return 0;
  }
}

// Shared write path. Never called directly by screens: savePerDayOffsets
// (user edits, bumps the clock to now and queues a push) and
// applyPerDayOffsetsFromCloud (a cloud pull, stamps the cloud's own clock so
// the LWW comparison stays meaningful) both go through this.
async function _writeOffsets(offsets, updatedAtMs) {
  const clean = normaliseOffsets(offsets);
  try {
    await AsyncStorage.setItem(PERDAY_TARGETS_KEY, JSON.stringify(clean));
    await AsyncStorage.setItem(PERDAY_TARGETS_UPDATED_AT_KEY, String(updatedAtMs));
  } catch (_) { /* tolerate, matches the pre-existing best-effort save */ }
  return clean;
}

export async function savePerDayOffsets(offsets) {
  const clean = await _writeOffsets(offsets, Date.now());
  // Queue a push like every other food-domain write. Lazy-required so a test
  // environment or a require cycle can't break a plain local save.
  try {
    // eslint-disable-next-line global-require
    require('../sync').scheduleSync();
  } catch (_) { /* sync module unavailable, tolerate */ }
  return clean;
}

/**
 * Read the current offsets + their local last-write-wins clock, for the
 * sync push handler. Never throws; a storage read failure reads as
 * "never saved" (updatedAtMs 0), matching loadPerDayOffsets' own fallback.
 */
export async function loadPerDayOffsetsForSync() {
  const [offsets, updatedAtMs] = await Promise.all([
    loadPerDayOffsets(),
    loadPerDayOffsetsUpdatedAtMs(),
  ]);
  return { offsets, updatedAtMs };
}

/**
 * Apply a cloud row under a strict last-write-wins gate: only overwrite the
 * local offsets when the cloud row is NEWER than the local clock. Never
 * calls scheduleSync (this is a pull, not a user edit) so a pull can never
 * loop back into an immediate push. Returns true when applied, false when
 * skipped because the local copy was already as new or newer.
 */
export async function applyPerDayOffsetsFromCloud(rawOffsets, cloudUpdatedAtMs) {
  const localUpdatedAtMs = await loadPerDayOffsetsUpdatedAtMs();
  const cloudMs = Number.isFinite(cloudUpdatedAtMs) ? cloudUpdatedAtMs : 0;
  if (localUpdatedAtMs > 0 && cloudMs <= localUpdatedAtMs) return false;
  await _writeOffsets(rawOffsets, cloudMs);
  return true;
}
