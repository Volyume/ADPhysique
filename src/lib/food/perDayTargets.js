/**
 * food/perDayTargets.js — per-day-of-week calorie planning offsets (gap #13).
 *
 * A PLANNING layer, not a coaching one. A user who eats more at weekends (or
 * trims midweek) can set a kcal offset per weekday; the diary then shows that
 * day's target shifted by the offset. It is display-only and additive:
 *
 *   - The engine's stored nutrition target is NEVER written or changed. The
 *     coach's 7-day rolling average, the rapid-loss gate and the ED-pattern
 *     detector all keep seeing the real stored target — this layer only changes
 *     the number the diary DISPLAYS for the day (resolveEffectiveTargets).
 *   - Every offset is HARD-clamped so a day can never display below the safe
 *     floor (max sex floor 1500/1200, FFM floor). The clamp lives in
 *     resolveEffectiveTargets where the floor is known; this module is the pure
 *     store + weekday maths.
 *   - It applies ONLY on an otherwise-plain day. A refeed, carb cycle or banked
 *     day takes precedence, so the planning offset never fights a coaching-driven
 *     adjustment (effectiveTargets precedence).
 *
 * Offsets are kcal deltas (… −200, 0, +300 …), so they auto-track changes to the
 * base target instead of going stale like an absolute goal would. Stored device-
 * local in AsyncStorage, like the meals-per-day and meal-reminder prefs.
 *
 * Sync (design-usability audit 2026-07-09, L05-PDT1): the offsets were
 * device-local only and lost on reinstall/device change, below the
 * portability bar CLAUDE.md sets for a Pro feature. `loadPerDayOffsetsForSync`
 * / `applyPerDayOffsetsFromCloud` back the new `perday_target_offsets` cloud
 * table (src/lib/sync/tables/perDayTargetOffsets.js, registry entry, cloud
 * migration 110 — founder-run, not yet applied). A second AsyncStorage key
 * tracks when the offsets were last WRITTEN LOCALLY (ms epoch) so the sync
 * handler has a last-write-wins clock without changing the existing
 * `loadPerDayOffsets`/`savePerDayOffsets` contract every screen already uses.
 * Nothing here feeds the engine or a floor; see the module header above.
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
