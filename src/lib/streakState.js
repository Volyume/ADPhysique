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

export const MILESTONES = Object.freeze([4, 12, 26, 52]);
const KEY = (userId) => `@volyume_streak_v1_${userId}`;

const EMPTY = Object.freeze({ v: 1, manualGoal: null, pauses: [], highWater: {}, milestonesSeen: [] });

function normalise(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  return {
    v: 1,
    manualGoal: Number.isFinite(raw.manualGoal) ? raw.manualGoal : null,
    pauses: Array.isArray(raw.pauses) ? raw.pauses.filter(p => p && p.startKey) : [],
    highWater: (raw.highWater && typeof raw.highWater === 'object') ? raw.highWater : {},
    milestonesSeen: Array.isArray(raw.milestonesSeen) ? raw.milestonesSeen.filter(Number.isFinite) : [],
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
