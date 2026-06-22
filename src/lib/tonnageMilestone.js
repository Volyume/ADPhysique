/**
 * Lifetime-tonnage landmark (Phase 2 premium share card).
 *
 * Pure threshold logic + a tiny per-user AsyncStorage "seen" record, mirroring
 * streakState's milestone-seen pattern. Tonnage is the all-time total weight
 * lifted across every completed, non-warmup working set (getLifetimeTonnage in
 * database.js), in the user's gym unit (kg).
 *
 * Pure win, never bodyweight: total weight lifted is a training-volume figure,
 * so it carries none of the ED-sensitivity of a scale number.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Round landmarks, in the user's gym unit. Each fires once, in ascending order.
export const TONNAGE_MILESTONES = Object.freeze([100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000]);

const KEY = (userId) => `@volyume_tonnage_v1_${userId}`;

/** The highest landmark reached by `tonnage` and not yet seen, or null. */
export function pendingTonnageMilestone(tonnage, seen = []) {
  if (!Number.isFinite(tonnage)) return null;
  const reached = TONNAGE_MILESTONES.filter((m) => tonnage >= m && !(seen || []).includes(m));
  return reached.length ? Math.max(...reached) : null;
}

/** Group digits for display, e.g. 100000 -> "100,000". */
export function formatTonnage(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export async function loadSeenTonnage(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Number.isFinite) : [];
  } catch (_) {
    return [];
  }
}

export async function markTonnageMilestoneSeen(userId, milestone) {
  if (!userId || !Number.isFinite(milestone)) return;
  try {
    const seen = await loadSeenTonnage(userId);
    if (!seen.includes(milestone)) {
      await AsyncStorage.setItem(KEY(userId), JSON.stringify([...seen, milestone]));
    }
  } catch (_) { /* best-effort: a missed write just re-offers next focus */ }
}
