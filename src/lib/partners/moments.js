/**
 * Partners: the MILESTONE MOMENTS ENGINE (DESIGN-SPEC B6, brief C3).
 *
 * A moment is a single, calm, once-a-week acknowledgement that surfaces inside
 * the PairCard (C2) and the post-workout partner beat (C3). It is derived
 * ENTIRELY from LOCAL, already-synced pair data — never a push, never a new
 * sync surface, weekly cadence by construction:
 *   - streak_week_kept : the shared streak advanced to >= 2 weeks (sharedStreak
 *                        over the local pair signals).
 *   - completed_block  : the PARTNER's own week signal carries the Step A
 *                        `completed_block` boolean (current or previous week).
 *   - hit_pb           : the PARTNER's own week signal carries `hit_pb`.
 *
 * Frequency caps (ED-owner mandate, applied to NON-flagged recipients too):
 *   - at most ONE rendered moment per pair per LOCAL day (priority
 *     streak_week_kept > completed_block > hit_pb);
 *   - hit_pb additionally capped at 2 surfaced per pair per rolling 7 days;
 *   - a moment older than 7 days is never surfaced.
 *
 * Suppression is FAIL-CLOSED and recipient-side, copied exactly from the
 * useWeeklyStreak.js pattern: an open ED flag, a FAILED flag read, SCOFF >= 2,
 * calm mode, or a FAILED wellbeing read all return []. getWellbeingMode is
 * NEVER used here — it swallows read failures OPEN. (The OUTBOUND direction is
 * already frozen at source in weekSignalWriter under the sender's ED freeze.)
 *
 * Copy is fixed (spec B6): first names only, no numbers, no exercise names,
 * full-stop endings, no exclamation marks. British English, no em dash.
 *
 * Pure-ish: getVisibleMoments is READ-ONLY (deterministic — same inputs, same
 * outputs; ids depend only on the pair, kind and a week key, never a raw
 * Date.now). markMomentSeen is the only writer.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPartnershipsLocal, getOpenEdPatternFlag, getUserBodyProfile,
  getPartnerWeekSignal, getPairWeekSignals,
} from '../database';
import { localWeekStartMs, todayLocalKey } from '../dayKey';
import { isCalm, WELLBEING_KEY } from '../wellbeing';
import { computeSharedStreak, buildSharedWeeks } from './sharedStreak';

const WEEK_MS = 7 * 86400000;
const HORIZON_MS = 7 * 86400000; // nothing older than 7 days is ever surfaced
const PB_ROLLING_CAP = 2; // hit_pb: at most 2 surfaced per pair per rolling 7 days

// Persistence keys. Seen ids never return; the shown-day map enforces the
// one-per-pair-per-local-day cap across the seen boundary; the pb log backs the
// rolling hit_pb cap.
const SEEN_KEY = '@volyume_partner_moments_seen_v1';
const SHOWN_KEY = '@volyume_partner_moments_shown_v1';
const PB_LOG_KEY = '@volyume_partner_moments_pb_v1';

// Priority: lower wins. partner_joined (the lifecycle welcome) tops the rest,
// then streak_week_kept > completed_block > hit_pb.
const PRIORITY = { partner_joined: -1, streak_week_kept: 0, completed_block: 1, hit_pb: 2 };

// Fixed copy (spec B6 + D5-B2). streak carries no name; block/pb/joined take the
// partner's first name. Full stops, no numbers, no exercise names, no
// exclamation marks.
const STREAK_LINE = 'Another week you both showed up.';
const blockLine = (name) => `${name} finished their training block.`;
const pbLine = (name) => `${name} set a new personal best.`;
const joinedLine = (name) => `${name} joined you.`;

/** Deterministic moment id: pair + kind + week key (dayKey/week convention). */
function momentId(pairId, kind, weekKey) {
  return `${pairId}:${kind}:${weekKey}`;
}

async function readJson(key, fallback) {
  try {
    const v = await AsyncStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    return parsed == null ? fallback : parsed;
  } catch (_) {
    // A read failure degrades to the empty default — persistence is best-effort
    // and must never crash the caller.
    return fallback;
  }
}

/**
 * Recipient-side suppression, FAIL-CLOSED. Copied exactly from useWeeklyStreak's
 * pattern (its lines 83 + 88 + 116-119): the ED-flag read maps a failure to the
 * truthy 'read_failed' sentinel; the wellbeing key is read RAW so a genuine
 * failure is distinguishable from 'unspecified' and fails closed; SCOFF and calm
 * mode suppress in line with every other coach surface. Never uses
 * getWellbeingMode (which swallows failures OPEN).
 */
async function isSuppressed(userId) {
  const [edFlag, wellbeing, profile] = await Promise.all([
    getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
    AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
    getUserBodyProfile(userId).catch(() => null),
  ]);
  const scoffScore = Number(profile?.scoffScore);
  return !!edFlag
    || (Number.isFinite(scoffScore) && scoffScore >= 2)
    || wellbeing === 'read_failed'
    || isCalm(wellbeing);
}

/**
 * Every moment the user should see right now — at most one per active pair,
 * already suppression-checked, priority-ordered, horizon- and cap-limited.
 * READ-ONLY: two consecutive calls return the same result.
 *
 * @param {string} userId
 * @returns {Promise<Array<{ id:string, pairId:string, kind:string, line:string, atMs:number }>>}
 */
export async function getVisibleMoments(userId) {
  if (!userId) return [];
  try {
    // Fail-closed suppression gate — before ANY moment is derived or returned.
    if (await isSuppressed(userId)) return [];

    const partnerships = await getPartnershipsLocal(userId).catch(() => []);
    const active = (partnerships || []).filter((p) => p && p.status === 'active');
    if (!active.length) return [];

    const now = Date.now();
    const currentWeekStart = localWeekStartMs(now);
    const prevWeekStart = currentWeekStart - WEEK_MS;
    const today = todayLocalKey();

    const [seen, shown, pbLog] = await Promise.all([
      readJson(SEEN_KEY, []),
      readJson(SHOWN_KEY, {}),
      readJson(PB_LOG_KEY, []),
    ]);
    const seenSet = new Set(Array.isArray(seen) ? seen : []);
    const shownMap = (shown && typeof shown === 'object') ? shown : {};
    const pbEntries = Array.isArray(pbLog) ? pbLog : [];

    const out = [];
    for (const pair of active) {
      // One moment per pair per LOCAL day: once a moment for this pair has been
      // surfaced-and-acknowledged today, nothing more for this pair today.
      if (shownMap[pair.id] === today) continue;

      const partnerId = pair.memberA === userId ? pair.memberB : pair.memberA;
      const name = pair.partnerFirstName || 'Your partner';
      const candidates = [];

      // partner_joined (D5-B2): the missing accept-signal, for the INVITER only
      // (member_a). Fresh window (7-day horizon below); the redeemer saw the join
      // when they accepted, so it is never surfaced to them. Deterministic id off
      // the accepted-at moment so it is shown once and never returns.
      if (pair.memberA === userId) {
        const acceptedAt = Number(pair.acceptedAt) || 0;
        if (acceptedAt) {
          candidates.push({
            id: momentId(pair.id, 'partner_joined', String(acceptedAt)),
            pairId: pair.id,
            kind: 'partner_joined',
            line: joinedLine(name),
            atMs: acceptedAt,
          });
        }
      }

      // streak_week_kept: the shared streak advanced to >= 2 weeks this week.
      // status 'counting' means the most recent finished week was 'met' (an
      // advance), not merely a held resting/quiet week.
      if (pair.streakEnabled) {
        try {
          const signals = await getPairWeekSignals(pair.id);
          const weeks = buildSharedWeeks(signals, userId, partnerId);
          const streak = computeSharedStreak({ enabled: true, weeks });
          if (streak.run >= 2 && streak.status === 'counting') {
            candidates.push({
              id: momentId(pair.id, 'streak_week_kept', String(currentWeekStart)),
              pairId: pair.id,
              kind: 'streak_week_kept',
              line: STREAK_LINE,
              atMs: currentWeekStart,
            });
          }
        } catch (_) { /* streak read failed -> no streak moment (fail quiet) */ }
      }

      // completed_block / hit_pb: the PARTNER's own week signal booleans for the
      // current or previous week (the fresher week wins).
      let sig = null;
      try {
        sig = await getPartnerWeekSignal(pair.id, partnerId, currentWeekStart);
        if (!sig || (!sig.completedBlock && !sig.hitPb)) {
          const prev = await getPartnerWeekSignal(pair.id, partnerId, prevWeekStart);
          if (prev && (prev.completedBlock || prev.hitPb)) sig = prev;
        }
      } catch (_) { sig = null; }

      if (sig) {
        const sigAtMs = Number(sig.updatedAt) || currentWeekStart;
        const sigWeekKey = String(sig.weekStart ?? currentWeekStart);
        if (sig.completedBlock) {
          candidates.push({
            id: momentId(pair.id, 'completed_block', sigWeekKey),
            pairId: pair.id,
            kind: 'completed_block',
            line: blockLine(name),
            atMs: sigAtMs,
          });
        }
        if (sig.hitPb) {
          candidates.push({
            id: momentId(pair.id, 'hit_pb', sigWeekKey),
            pairId: pair.id,
            kind: 'hit_pb',
            line: pbLine(name),
            atMs: sigAtMs,
          });
        }
      }

      // 7-day horizon + already-seen pruning.
      let visible = candidates.filter(
        (m) => m.atMs >= now - HORIZON_MS && !seenSet.has(m.id),
      );

      // hit_pb rolling cap: at most 2 surfaced (seen) per pair per rolling 7 days.
      const pbCount = pbEntries.filter(
        (e) => e && e.pairId === pair.id && Number(e.ts) >= now - HORIZON_MS,
      ).length;
      if (pbCount >= PB_ROLLING_CAP) visible = visible.filter((m) => m.kind !== 'hit_pb');

      if (!visible.length) continue;

      // Priority: streak > block > pb. Exactly one per pair.
      visible.sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]);
      out.push(visible[0]);
    }
    return out;
  } catch (_) {
    // Any unexpected failure suppresses (fail-closed): return nothing.
    return [];
  }
}

/**
 * Mark a moment seen. A seen moment never returns. Also records the pair's
 * shown-day (enforcing the one-per-pair-per-day cap) and, for a hit_pb moment,
 * bumps the rolling pb counter. Best-effort local persistence; never throws.
 */
export async function markMomentSeen(id) {
  if (!id) return;
  try {
    const [seenRaw, shownRaw, pbRaw] = await Promise.all([
      readJson(SEEN_KEY, []),
      readJson(SHOWN_KEY, {}),
      readJson(PB_LOG_KEY, []),
    ]);
    const seen = Array.isArray(seenRaw) ? seenRaw : [];
    const shown = (shownRaw && typeof shownRaw === 'object') ? shownRaw : {};
    const pbLog = Array.isArray(pbRaw) ? pbRaw : [];

    if (!seen.includes(id)) seen.push(id);

    const [pairId, kind] = String(id).split(':');
    if (pairId) shown[pairId] = todayLocalKey();
    if (kind === 'hit_pb' && !pbLog.some((e) => e && e.id === id)) {
      pbLog.push({ id, pairId, ts: Date.now() });
    }
    // Prune the pb log to the rolling window so it cannot grow unbounded.
    const prunedPb = pbLog.filter((e) => e && Number(e.ts) >= Date.now() - HORIZON_MS);

    await Promise.all([
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen)).catch(() => {}),
      AsyncStorage.setItem(SHOWN_KEY, JSON.stringify(shown)).catch(() => {}),
      AsyncStorage.setItem(PB_LOG_KEY, JSON.stringify(prunedPb)).catch(() => {}),
    ]);
  } catch (_) { /* best-effort local persistence */ }
}
