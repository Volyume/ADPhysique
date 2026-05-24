/**
 * dailyNarrative.js
 *
 * Builds a single-line "today's story" for the Home hero. Reads
 * existing local signals (last session, weekly volume, deload flag,
 * fatigue trend, schedule context) and emits ONE sentence that turns
 * raw data into a sentence a coach would say.
 *
 * Tone rules:
 *   - Spoken voice, no jargon.
 *   - Always concrete: cite a muscle, a number, a day. No platitudes.
 *   - Confident, no hedging clusters.
 *   - One sentence, two at most. If a sentence isn't true, return null
 *     and the UI falls back to the existing greeting.
 *
 * The engine returns:
 *   { headline: string, tone: 'primary'|'success'|'warning'|'gold' }
 * or null when we don't have enough signal to say something useful.
 */

import {
  getAllWorkouts, getMorningWeightsLast14Days,
} from './database';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Build the morning narrative for this user. Returns null when we
 * can't say anything specific. Deload detection is handled by the
 * existing phase banner on Home so we deliberately don't repeat it.
 */
export async function buildDailyNarrative(userId) {
  if (!userId) return null;

  try {
    const all = await getAllWorkouts(userId);
    const completed = (all ?? []).filter(w => w.isCompleted).sort((a, b) => b.startedAt - a.startedAt);

    // Brand-new user: no sessions yet. Hand back null so the home
    // hero stays a clean greeting instead of forcing fake coaching.
    if (completed.length === 0) return null;

    const last = completed[0];
    const lastAtMs = last.startedAt;
    const daysSinceLast = Math.floor((Date.now() - lastAtMs) / MS_IN_DAY);

    // ── Rule 1: streak of training days ─────────────────────────────
    // 3+ consecutive training days = call it out positively. Bigger
    // signal than a single session because consistency is the real
    // lever and most apps never name it.
    if (daysSinceLast === 0) {
      const recent = completed.slice(0, 6).map(w => Math.floor(w.startedAt / MS_IN_DAY));
      let streak = 1;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i - 1] - recent[i] === 1) streak += 1; else break;
      }
      if (streak >= 3) {
        return {
          headline: `${streak} days on the trot. Consistency is doing the heavy lifting.`,
          tone: 'success',
        };
      }
      return null; // Don't restate the obvious "you trained today".
    }

    // ── Rule 2: recent PR ──────────────────────────────────────────
    // If the last session contains a PR we want to lead with that.
    // (PRs are detected at save time; the workout row carries a flag
    // we can check cheaply.)
    if (last.hasPersonalRecord || last.prCount > 0) {
      return {
        headline: 'Last session set a new high. Today builds on that.',
        tone: 'gold',
      };
    }

    // ── Rule 3: tonnage delta vs the user's 4-week average ─────────
    // Reads "last session was your best chest volume in 4 weeks" if it
    // was meaningfully heavier than your average. We compute on the
    // last session's tonnage (already on the row).
    const fourWeeksAgo = Date.now() - 28 * MS_IN_DAY;
    const last4w = completed.filter(w => w.startedAt >= fourWeeksAgo);
    if (last4w.length >= 4) {
      const lastT = last.tonnage || 0;
      const others = last4w.slice(1);
      const avg = others.reduce((s, w) => s + (w.tonnage || 0), 0) / Math.max(1, others.length);
      if (lastT > 0 && avg > 0) {
        const pct = ((lastT - avg) / avg) * 100;
        if (pct >= 12) {
          return {
            headline: `Last session beat your 4-week average by ${Math.round(pct)}%. Today, keep it tidy.`,
            tone: 'success',
          };
        }
        if (pct <= -18) {
          return {
            headline: `Last session was lighter than usual. Today is a good chance to climb back.`,
            tone: 'primary',
          };
        }
      }
    }

    // ── Rule 4: long gap ───────────────────────────────────────────
    if (daysSinceLast >= 5) {
      return {
        headline: `${daysSinceLast} days off. Ease in today; don't catch up in one session.`,
        tone: 'primary',
      };
    }

    // ── Rule 5: morning weight cadence (Pro signal) ────────────────
    try {
      const last14 = await getMorningWeightsLast14Days(userId);
      if (last14?.length >= 10) {
        return {
          headline: `Weight logged ${last14.length} of the last 14 days. Your coach has a clean read.`,
          tone: 'primary',
        };
      }
    } catch (_) {}

    // ── Default: simple "next session" framing ─────────────────────
    if (daysSinceLast === 1) {
      return { headline: 'Yesterday landed. Today, look for one extra rep on a key lift.', tone: 'primary' };
    }
    if (daysSinceLast === 2) {
      return { headline: 'Two days fresh. Today should feel strong.', tone: 'success' };
    }

    return null;
  } catch (_) {
    return null;
  }
}
