/**
 * activationNudge.js — the staged early-activation re-engagement lever (S6).
 *
 * A brand-new user who stalls short of the activation threshold (< 3 completed
 * sessions in their first 14 days) churns at ~3-4x the rate of one who reaches
 * it. This module is the pure state machine + copy for a single-shot nudge at
 * each stall stage; the OS-facing scheduling (quiet hours, push budget, ED-flag
 * suppression, the one-tap toggle, the single-shot-per-stage flags) lives in
 * scheduler.js, and the same stage value drives the in-app Home banner so push
 * and banner can never disagree.
 *
 * Three stages, by current completed-session count inside the window:
 *   0 -> cold_start  (they signed up but have not trained; anchor = account
 *                     creation + COLD_START_GAP_DAYS)
 *   1 -> stalled_1   (one session, then quiet; anchor = that session + STALL_GAP)
 *   2 -> stalled_2   (two sessions, then quiet; anchor = 2nd session + STALL_GAP)
 *   3+ -> null       (activated; nothing fires)
 * At any instant the user sits in exactly one stage (a function of their session
 * count), so at most one nudge is ever pending; advancing a session cancels the
 * pending stage and may lay the next. Each stage fires at most once ever.
 *
 * The window has a hard stop: an elapsed activation window is never chased. A
 * never-active account that stays quiet past day 17 simply gets no further
 * nudge (no hand-off to lapseDetect, which is built for post-active churn).
 *
 * Kept pure (only the activation constants are imported) so the maths and copy
 * are trivially testable. Copy is forward-looking and never shames (no "you
 * missed", no "behind", no streaks); British English, no em dash.
 */

import { ACTIVATION_WINDOW_DAYS, ACTIVATION_TARGET_SESSIONS } from './activation';

const DAY_MS = 86400000;

export const NUDGE_STAGE = Object.freeze({
  COLD_START: 'cold_start',
  STALLED_1: 'stalled_1',
  STALLED_2: 'stalled_2',
});

export const COLD_START_GAP_DAYS = 3; // account creation -> first-session nudge
export const STALL_GAP_DAYS = 4; // last session -> stall nudge (a real stall, not a normal rest day)
export const NUDGE_GRACE_DAYS = 3; // grace past the 14-day window; never fire beyond

// The hard stop: past the activation window + grace, the lever is done for this
// user. Exported so the scheduler's early-out and the Home banner's early-out
// share ONE source of truth (never a duplicated literal that could desync if
// the window/grace is tuned).
export const NUDGE_WINDOW_GRACE_MS = (ACTIVATION_WINDOW_DAYS + NUDGE_GRACE_DAYS) * DAY_MS;

/**
 * Resolve the pending activation-nudge stage and its ideal fire time.
 *
 * @param {object} args
 * @param {number} args.accountCreatedAtMs  epoch ms of account creation (install proxy)
 * @param {number[]} args.completedStartedAtMs  started_at of each COMPLETED workout
 * @param {number} args.nowMs
 * @returns {{ stage: string, fireAtMs: number } | null}  null when activated,
 *          out of window, or the inputs are unknowable. fireAtMs is the anchored
 *          ideal fire time and MAY be in the past; the scheduler SKIPS a past
 *          fireAtMs -- an anchored slot that has already passed is never re-laid
 *          (the single-shot rule) -- and never fires past the window + grace.
 */
export function resolveActivationNudge({ accountCreatedAtMs, completedStartedAtMs, nowMs } = {}) {
  const created = Number.isFinite(accountCreatedAtMs) ? accountCreatedAtMs : null;
  const now = Number.isFinite(nowMs) ? nowMs : null;
  if (created == null || now == null || now < created) return null;

  const windowEnd = created + ACTIVATION_WINDOW_DAYS * DAY_MS;
  const lastFireMs = windowEnd + NUDGE_GRACE_DAYS * DAY_MS; // hard stop; never chase beyond

  const inWindow = (Array.isArray(completedStartedAtMs) ? completedStartedAtMs : [])
    .filter((t) => Number.isFinite(t) && t >= created && t < windowEnd)
    .sort((a, b) => a - b);
  const count = inWindow.length;

  if (count >= ACTIVATION_TARGET_SESSIONS) return null; // activated -> silence

  let stage;
  let fireAtMs;
  if (count === 0) {
    stage = NUDGE_STAGE.COLD_START;
    fireAtMs = created + COLD_START_GAP_DAYS * DAY_MS;
  } else if (count === 1) {
    stage = NUDGE_STAGE.STALLED_1;
    fireAtMs = inWindow[0] + STALL_GAP_DAYS * DAY_MS;
  } else {
    stage = NUDGE_STAGE.STALLED_2;
    fireAtMs = inWindow[1] + STALL_GAP_DAYS * DAY_MS;
  }

  if (fireAtMs > lastFireMs) return null; // the window has elapsed; never chase
  return { stage, fireAtMs };
}

/**
 * Push copy for a stage. `name` is the pre-formatted ', First' suffix (or ''),
 * matching the other schedulers. Warm, forward-looking, never a barked command
 * and never shame. Returns null for an unknown stage.
 */
export function activationNudgePush(stage, name = '') {
  switch (stage) {
    case NUDGE_STAGE.COLD_START:
      return {
        title: `Ready when you are${name}`,
        body: 'Your plan is set up and waiting. Your first session is whenever it suits you.',
      };
    case NUDGE_STAGE.STALLED_1:
      return {
        title: `One session down${name}`,
        body: 'Whenever you\'re ready, your next one is waiting exactly where you left it.',
      };
    case NUDGE_STAGE.STALLED_2:
      return {
        title: `Two sessions in${name}`,
        body: 'One more and this starts feeling automatic. Your plan is ready whenever you are.',
      };
    default:
      return null;
  }
}

/**
 * The in-app Home banner line for a stage (same stage value as the push, so the
 * two never drift). Returns null for an unknown stage.
 */
export function activationBannerLine(stage) {
  switch (stage) {
    case NUDGE_STAGE.COLD_START:
      return {
        title: 'Your plan is ready',
        body: 'Your first session is set up and waiting. Start whenever suits you today.',
      };
    case NUDGE_STAGE.STALLED_1:
      return {
        title: 'You\'ve made a start',
        body: 'A second session is what turns a first one into a habit. Pick up wherever suits you today.',
      };
    case NUDGE_STAGE.STALLED_2:
      return {
        title: 'You\'re nearly there',
        body: 'Two sessions logged. A third is what makes the habit stick.',
      };
    default:
      return null;
  }
}
