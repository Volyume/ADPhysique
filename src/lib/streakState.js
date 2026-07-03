/**
 * COMP-018 — the small per-user record behind the weekly consistency streak.
 *
 * v1 is AsyncStorage only (`@volyume_streak_v1_<userId>`), matching the app's
 * per-user key convention; it MUST move to a synced table before NEW-002
 * (partner view + multi-device need pause state server-side) — flagged in the
 * NEW-002 dependency list, not done here.
 *
 * The pure transforms (pausedWeekKeys / addPauseSpan / recordHighWater /
 * longestRun / pendingMilestone) carry the rules and are unit-tested; the I/O
 * wrappers are thin load-modify-save helpers.
 *
 * Record shape (weekKey is the resolver's week key — in v1 the epoch-ms string
 * of the local Monday, String(localWeekStartMs); NOT a 'YYYY-MM-DD' date.
 * The NEW-002 synced-table migration must preserve whatever key the resolver
 * emits, since pausedWeekKeys matches startKey against that exact format):
 *   { v:1, manualGoal:number|null,
 *     pauses:[{ startKey:weekKey, weeks:number }],
 *     highWater:{ [weekKey]:number },   // shown run per week — never shrinks
 *     milestonesSeen:number[] }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectPerfectMonth } from './streak';

export const MILESTONES = Object.freeze([4, 12, 26, 52]);
const KEY = (userId) => `@volyume_streak_v1_${userId}`;

const EMPTY = Object.freeze({ v: 1, manualGoal: null, pauses: [], highWater: {}, milestonesSeen: [], perfectMonthsSeen: [], longestRunPbSeen: null });

// S2c: never "record" a trivial 1-week run as a personal best.
export const LONGEST_RUN_PB_FLOOR = 2;

function normalise(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  return {
    v: 1,
    manualGoal: Number.isFinite(raw.manualGoal) ? raw.manualGoal : null,
    pauses: Array.isArray(raw.pauses) ? raw.pauses.filter(p => p && p.startKey) : [],
    highWater: (raw.highWater && typeof raw.highWater === 'object') ? raw.highWater : {},
    milestonesSeen: Array.isArray(raw.milestonesSeen) ? raw.milestonesSeen.filter(Number.isFinite) : [],
    // The lastWeekKey of each perfect month already celebrated, so it fires once.
    perfectMonthsSeen: Array.isArray(raw.perfectMonthsSeen) ? raw.perfectMonthsSeen.filter(k => typeof k === 'string') : [],
    // S2c: the highest run already celebrated as a longest-run PB. null means
    // "not seeded yet" -> the resolver seeds it to the current high without
    // celebrating, so an existing long run never retro-fires on first update.
    longestRunPbSeen: Number.isFinite(raw.longestRunPbSeen) ? raw.longestRunPbSeen : null,
  };
}

// ── Pure transforms ─────────────────────────────────────────────────────────

/**
 * The set of week keys covered by any pause span. Operates over the resolver's
 * ordered (oldest-first, consecutive-Monday) week-key list, so a span starting
 * at `startKey` covers that week plus the next `weeks-1` in the list — no date
 * arithmetic, no drift. (A pause whose start predates the window is out of
 * scope for v1; pauses are created "now", inside the window.)
 */
export function pausedWeekKeys(pauses, orderedWeekKeys) {
  const set = new Set();
  if (!pauses?.length || !orderedWeekKeys?.length) return set;
  for (const p of pauses) {
    const start = orderedWeekKeys.indexOf(p.startKey);
    if (start < 0) continue;
    const span = Math.max(1, p.weeks || 1);
    for (let i = start; i < start + span && i < orderedWeekKeys.length; i++) {
      set.add(orderedWeekKeys[i]);
    }
  }
  return set;
}

/** Add or renew a pause span (same start replaces — renewable without limit). */
export function addPauseSpan(pauses = [], startKey, weeks) {
  const others = (pauses || []).filter(p => p.startKey !== startKey);
  return [...others, { startKey, weeks: Math.max(1, weeks || 1) }];
}

/** Raise the high-water run for a week; never lowers it (retro-shrink guard). */
export function recordHighWater(highWater = {}, weekKey, runLength) {
  if (!weekKey || runLength == null) return highWater;
  const prev = highWater[weekKey] ?? 0;
  if (runLength <= prev) return highWater;
  return { ...highWater, [weekKey]: runLength };
}

/** The longest run ever shown (for "Longest run: N weeks"). */
export function longestRun(highWater = {}, currentRun = 0) {
  const vals = Object.values(highWater || {}).filter(Number.isFinite);
  return Math.max(currentRun || 0, ...(vals.length ? vals : [0]));
}

/** The highest milestone newly crossed by `runLength` and not yet seen, or null. */
export function pendingMilestone(runLength, seen = []) {
  if (runLength == null) return null;
  const reached = MILESTONES.filter(m => runLength >= m && !(seen || []).includes(m));
  return reached.length ? Math.max(...reached) : null;
}

/**
 * A newly-completed perfect month not yet celebrated, or null. Keyed off the
 * month's last week so it fires once and can recur next month.
 */
export function pendingPerfectMonth(weeks, seen = []) {
  const pm = detectPerfectMonth(weeks);
  if (!pm) return null;
  return (seen || []).includes(pm.lastWeekKey) ? null : pm;
}

/**
 * A newly-reached longest-run personal best (S2c), or null. Founder call
 * 2026-07-03: fires on EVERY new all-time-high run, not only after a break.
 * Guards keep it sane: never below the floor (no 1-week "record"); never on a
 * value a fixed milestone already celebrates (that card owns it); and only when
 * the run strictly exceeds the highest run already celebrated as a PB. `seen`
 * being null means "not seeded yet" -> null here, and the resolver seeds it to
 * the current high without celebrating, so an existing run never retro-fires.
 */
export function pendingLongestRunPb(currentRun, seen) {
  if (!Number.isFinite(currentRun) || currentRun < LONGEST_RUN_PB_FLOOR) return null;
  if (!Number.isFinite(seen)) return null;
  if (MILESTONES.includes(currentRun)) return null;
  return currentRun > seen ? currentRun : null;
}

// ── I/O wrappers ────────────────────────────────────────────────────────────

export async function loadStreakState(userId) {
  if (!userId) return { ...EMPTY };
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    return normalise(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return { ...EMPTY };
  }
}

async function saveStreakState(userId, state) {
  if (!userId) return;
  try { await AsyncStorage.setItem(KEY(userId), JSON.stringify(normalise(state))); } catch (_) {}
}

export async function setManualGoal(userId, goal) {
  const state = await loadStreakState(userId);
  state.manualGoal = Number.isFinite(goal) ? goal : null;
  await saveStreakState(userId, state);
  return state;
}

export async function addPause(userId, startKey, weeks) {
  const state = await loadStreakState(userId);
  state.pauses = addPauseSpan(state.pauses, startKey, weeks);
  await saveStreakState(userId, state);
  return state;
}

export async function persistHighWater(userId, weekKey, runLength) {
  const state = await loadStreakState(userId);
  const next = recordHighWater(state.highWater, weekKey, runLength);
  if (next !== state.highWater) {
    state.highWater = next;
    await saveStreakState(userId, state);
  }
  return state;
}

export async function markMilestoneSeen(userId, milestone) {
  const state = await loadStreakState(userId);
  if (!state.milestonesSeen.includes(milestone)) {
    state.milestonesSeen = [...state.milestonesSeen, milestone];
    await saveStreakState(userId, state);
  }
  return state;
}

export async function markPerfectMonthSeen(userId, weekKey) {
  const state = await loadStreakState(userId);
  if (weekKey && !state.perfectMonthsSeen.includes(weekKey)) {
    state.perfectMonthsSeen = [...state.perfectMonthsSeen, weekKey];
    await saveStreakState(userId, state);
  }
  return state;
}

/**
 * Seed the longest-run PB baseline to the current all-time high ONCE (only when
 * unset), so an already-long run on the first update after this feature ships
 * never fires a retro celebration. No-op if already seeded.
 */
export async function seedLongestRunPbSeen(userId, currentHigh) {
  const state = await loadStreakState(userId);
  if (state.longestRunPbSeen == null) {
    state.longestRunPbSeen = Number.isFinite(currentHigh) ? Math.max(0, currentHigh) : 0;
    await saveStreakState(userId, state);
  }
  return state;
}

/** Record a celebrated longest-run PB so it fires once per new record level. */
export async function markLongestRunPbSeen(userId, value) {
  const state = await loadStreakState(userId);
  if (Number.isFinite(value) && (state.longestRunPbSeen == null || value > state.longestRunPbSeen)) {
    state.longestRunPbSeen = value;
    await saveStreakState(userId, state);
  }
  return state;
}
