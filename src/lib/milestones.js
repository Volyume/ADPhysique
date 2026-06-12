/**
 * milestones.js — the beginner early-win ladder (D1).
 *
 * int-04 finding F1: between the first-session line (COMP-013) and the
 * monthly-recap unlock at ten sessions there is a "celebration desert" —
 * the most fragile stretch of the new user's journey is the least rewarded.
 * This is the deterministic micro-milestone ladder that fills it: pure
 * derivations over local workout rows, no new data, no AI, no randomness.
 *
 * Scope of THIS ladder (the consistency spine):
 *   first_week (3 sessions inside any 7-day window), then 5 / 10 / 25 / 50 /
 *   100 lifetime sessions, plus first_pr.
 *
 * Two rungs are owned by surfaces that already celebrate them, so the ladder
 * models them but the WorkoutSummary card must not double up:
 *   - the very first session is owned by COMP-013's calibrated header line;
 *     it is deliberately NOT a rung here.
 *   - the first PR is owned by PRCelebration (the full-screen burst); first_pr
 *     stays in the ladder for a future "milestones strip" + next-rung maths,
 *     but the summary surface passes everHitPR:false so it never fires a second
 *     celebration on top of PRCelebration.
 *
 * ED/calm suppression is the CALLER's job (same gate as firstSessionLine): a
 * suppressed surface never calls claimMilestones, so a rung crossed during a
 * wellbeing hold is simply caught and shown later, never lost. First-30-days
 * rule (ext-05): every rung here is a positive, identity-framed acknowledgement
 * — there is no streak-loss, no shame, no "don't break it" framing anywhere.
 *
 * Record shape (AsyncStorage only, per-user key, matching streakState's v1):
 *   { v:1, seen:string[] }   // milestone keys already claimed
 * Like streakState this MUST move to a synced table before any multi-device
 * milestone surface; in v1 a new device re-derives from the synced workout rows
 * and re-claims, which can replay a rung once — acceptable for a celebration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KEY = (userId) => `@volyume_milestones_v1_${userId}`;

/**
 * The ladder, ascending. Order doubles as significance: when more than one rung
 * is newly earned at once (only really a first-run / imported-history case), the
 * LAST earned rung is the one shown. Copy is calm and identity-framed.
 */
export const MILESTONES = Object.freeze([
  Object.freeze({
    key: 'first_week', kind: 'first_week', icon: 'calendar-outline',
    title: 'Your first training week',
    body: 'Three sessions inside a week. That is what a training habit looks like — and you are building one.',
  }),
  Object.freeze({
    key: 'sessions_5', kind: 'sessions', threshold: 5, icon: 'flame-outline',
    title: 'Five sessions in',
    body: 'Five sessions logged. The habit is starting to hold.',
  }),
  Object.freeze({
    key: 'sessions_10', kind: 'sessions', threshold: 10, icon: 'flame-outline',
    title: 'Ten sessions',
    body: 'Ten in the book. You are not trying the gym any more — you train.',
  }),
  Object.freeze({
    key: 'sessions_25', kind: 'sessions', threshold: 25, icon: 'ribbon-outline',
    title: 'Twenty-five sessions',
    body: 'Twenty-five sessions logged. That is a genuine training history behind you now.',
  }),
  Object.freeze({
    key: 'sessions_50', kind: 'sessions', threshold: 50, icon: 'ribbon-outline',
    title: 'Fifty sessions',
    body: 'Fifty sessions of showing up. That is real, steady commitment.',
  }),
  Object.freeze({
    key: 'sessions_100', kind: 'sessions', threshold: 100, icon: 'medal-outline',
    title: 'One hundred sessions',
    body: 'One hundred sessions logged. You have built something most people only talk about.',
  }),
  Object.freeze({
    key: 'first_pr', kind: 'first_pr', icon: 'trophy-outline',
    title: 'Your first personal record',
    body: 'Your first logged PR. Proof the work is paying off.',
  }),
]);

/** The session-count rungs, ascending — used for the "next rung" maths. */
const SESSION_RUNGS = Object.freeze(
  MILESTONES.filter((m) => m.kind === 'sessions').map((m) => m.threshold),
);

function normalise(raw) {
  if (!raw || typeof raw !== 'object') return { v: 1, seen: [] };
  return {
    v: 1,
    seen: Array.isArray(raw.seen) ? raw.seen.filter((k) => typeof k === 'string') : [],
  };
}

// ── Pure transforms ─────────────────────────────────────────────────────────

/**
 * True once at least three sessions fall inside any rolling 7-day window.
 * Counts logged sessions (two on one day still count as two); deterministic,
 * plan-independent. `daysMs` is the list of completed-session timestamps.
 */
export function hasThreeInSeven(daysMs = []) {
  const ts = (Array.isArray(daysMs) ? daysMs : []).filter(Number.isFinite).sort((a, b) => a - b);
  for (let i = 0; i + 2 < ts.length; i++) {
    if (ts[i + 2] - ts[i] <= WEEK_MS) return true;
  }
  return false;
}

/**
 * Whether a single ladder rung is earned by the gathered facts.
 * facts: { sessionCount:number, sessionDaysMs:number[], everHitPR:boolean }
 */
export function isEarned(milestone, facts = {}) {
  if (!milestone) return false;
  const { sessionCount = 0, sessionDaysMs = [], everHitPR = false } = facts;
  switch (milestone.kind) {
    case 'first_week': return hasThreeInSeven(sessionDaysMs);
    case 'sessions': return Number(sessionCount) >= milestone.threshold;
    case 'first_pr': return !!everHitPR;
    default: return false;
  }
}

/** Every rung currently earned, in ladder order. */
export function earnedMilestones(facts = {}) {
  return MILESTONES.filter((m) => isEarned(m, facts));
}

/**
 * The single rung to show given what's already been seen: the most significant
 * (last-in-ladder) earned rung not yet in `seen`, or null. Pure — the IO claim
 * lives in claimMilestones.
 */
export function selectMilestone(facts = {}, seen = []) {
  const seenSet = new Set(seen || []);
  const earnedUnseen = earnedMilestones(facts).filter((m) => !seenSet.has(m.key));
  return earnedUnseen.length ? earnedUnseen[earnedUnseen.length - 1] : null;
}

/**
 * The next session-count rung above the current count, with how many sessions
 * remain — for a "2 sessions to your first 10" strip. null once 100 is passed.
 */
export function nextSessionRung(sessionCount = 0) {
  const n = Number(sessionCount) || 0;
  const next = SESSION_RUNGS.find((t) => n < t);
  return next ? { threshold: next, remaining: next - n } : null;
}

// ── IO wrappers ─────────────────────────────────────────────────────────────

export async function loadMilestoneState(userId) {
  if (!userId) return { v: 1, seen: [] };
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    return normalise(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return { v: 1, seen: [] };
  }
}

async function saveMilestoneState(userId, state) {
  if (!userId) return;
  try { await AsyncStorage.setItem(KEY(userId), JSON.stringify(normalise(state))); } catch (_) {}
}

/**
 * Atomically claim the milestone to celebrate now: marks EVERY currently
 * earned-and-unseen rung as seen (so an existing user's already-passed history
 * is never replayed rung-by-rung on later sessions) and returns only the single
 * most significant one to display, or null.
 *
 * The caller must apply ED/calm suppression BEFORE calling this — a suppressed
 * surface skips the call entirely, leaving the rung unclaimed for next time.
 */
export async function claimMilestones(userId, facts = {}) {
  if (!userId) return null;
  const state = await loadMilestoneState(userId);
  const seenSet = new Set(state.seen);
  const earnedUnseen = earnedMilestones(facts).filter((m) => !seenSet.has(m.key));
  if (!earnedUnseen.length) return null;
  const toShow = earnedUnseen[earnedUnseen.length - 1];
  await saveMilestoneState(userId, {
    v: 1,
    seen: [...state.seen, ...earnedUnseen.map((m) => m.key)],
  });
  return toShow;
}
