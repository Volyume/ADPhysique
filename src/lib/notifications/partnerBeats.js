/**
 * partnerBeats.js — NEW-002 rebuild part 3: the two partner pushes
 * (founder decision 2026-06-12: cheer received + weekly shared-streak kept).
 *
 * Pure helpers only (copy + watermark transforms), mirroring the
 * missedCheckin.js pattern: the OS-facing scheduling lives in scheduler.js
 * (schedulePartnerBeats), which applies quiet hours, the event push budget
 * (CATEGORY.PARTNER_CHEER), the preferences toggle and ED-flag suppression.
 *
 * Copy rules: calm, data-referenced, true by construction. The cheer push is
 * framed as FROM the partner, never from the app (the Duolingo nudge
 * lesson); no shame framing exists anywhere in the partner system by
 * design, and none is introduced here.
 *
 * Watermark record (AsyncStorage, per user, saved by the scheduler):
 *   { v:1, lastCheerId: string|null, lastStreakRun: number }
 */

const CHEER_FRESH_MS = 48 * 60 * 60 * 1000; // older cheers are history, not news
const JOIN_FRESH_MS = 48 * 60 * 60 * 1000; // a backlog-synced accept is history

/** Push copy for a received cheer. `partnerName` falls back warmly. */
export function cheerPush(partnerName) {
  const name = (typeof partnerName === 'string' && partnerName.trim()) ? partnerName.trim() : 'Your partner';
  return {
    title: `${name} cheered you on`,
    body: 'A tap from your training partner. They can see you\'re keeping up your training this week.',
  };
}

/** Push copy for a kept shared-streak week. True only when derived true. */
export function streakKeptPush(partnerName, run) {
  const name = (typeof partnerName === 'string' && partnerName.trim()) ? partnerName.trim() : 'your partner';
  const n = Math.max(0, Math.round(Number(run) || 0));
  return {
    title: `${n} ${n === 1 ? 'week' : 'weeks'} running, together`,
    body: `You and ${name} both kept up your training this week.`,
  };
}

/**
 * Push copy for a partner accepting the invite (D5-B2). Framed as the moment
 * they joined, never as pressure. `partnerName` falls back warmly.
 */
export function joinPush(partnerName) {
  const name = (typeof partnerName === 'string' && partnerName.trim()) ? partnerName.trim() : 'Your partner';
  return {
    title: `${name} joined you`,
    body: 'You are training together now. You\'ll see their training week here from now on.',
  };
}

/** Normalise a stored watermark record. */
export function normaliseBeatsState(raw) {
  if (!raw || typeof raw !== 'object') return { v: 1, lastCheerId: null, lastStreakRun: 0, joinedPairIds: [] };
  return {
    v: 1,
    lastCheerId: typeof raw.lastCheerId === 'string' ? raw.lastCheerId : null,
    lastStreakRun: Number.isFinite(raw.lastStreakRun) ? raw.lastStreakRun : 0,
    joinedPairIds: Array.isArray(raw.joinedPairIds)
      ? raw.joinedPairIds.filter((id) => typeof id === 'string')
      : [],
  };
}

/**
 * The cheer to notify, or null. Fires once per cheer id, and only while the
 * cheer is FRESH (a backlog synced days later is history, not news).
 *
 * @param state        normalised watermark record
 * @param lastReceived the latest received cheer row ({ id, createdAt }) or null
 * @param now          ms
 */
export function cheerToNotify(state, lastReceived, now = Date.now()) {
  if (!lastReceived?.id) return null;
  if (state.lastCheerId === lastReceived.id) return null;
  const at = Number(lastReceived.createdAt) || 0;
  if (!at || now - at > CHEER_FRESH_MS) return null;
  return lastReceived;
}

/**
 * The shared-streak run to notify, or null. Fires when the run GROWS past
 * the watermark and the pair has something real (>= 2 weeks together); a
 * lapsed or shrinking run never notifies (lapses are an absence, never a
 * shown state — the locked streak rule applies to pushes too).
 */
export function streakRunToNotify(state, sharedStreak) {
  const run = Number(sharedStreak?.run) || 0;
  if (sharedStreak?.status !== 'counting') return null;
  if (run < 2) return null;
  if (run <= state.lastStreakRun) return null;
  return run;
}

/**
 * The freshly joined pair to notify the INVITER about, or null (D5-B2). Fires
 * once per pair (watermarked by id), only while fresh (a backlog-synced accept
 * is history, not news), and only for the inviter — member_a, the person who was
 * waiting. The redeemer already saw the join when they tapped accept, so they
 * are never pushed. Closes the silent-accept dead spot.
 *
 * @param state  normalised watermark record
 * @param pair   a local partnership row ({ id, status, memberA, acceptedAt })
 * @param userId this device's user id
 * @param now    ms
 */
export function joinToNotify(state, pair, userId, now = Date.now()) {
  if (!pair || pair.status !== 'active' || !pair.id) return null;
  if (!userId || pair.memberA !== userId) return null; // only the waiting inviter
  const joined = Array.isArray(state.joinedPairIds) ? state.joinedPairIds : [];
  if (joined.includes(pair.id)) return null;
  const at = Number(pair.acceptedAt) || 0;
  if (!at || now - at > JOIN_FRESH_MS) return null;
  return pair.id;
}
