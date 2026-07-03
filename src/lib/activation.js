/**
 * activation.js — the pure early-activation model (S6).
 *
 * Research premise: a user with fewer than ACTIVATION_TARGET_SESSIONS completed
 * workouts in their first ACTIVATION_WINDOW_DAYS days churns at ~3-4x the rate
 * of one who reaches it. This module is the single, deterministic definition of
 * that state, reused by both the telemetry event and any re-engagement lever so
 * the two can never disagree on who is activated.
 *
 * Pure: no I/O, no store, no clock of its own. Callers pass the install time,
 * the completed-session start times, and 'now'. It returns counts and flags
 * ONLY — never a body value — so its output is safe to fold into a telemetry
 * payload (GDPR: no health data) and into user-facing copy alike.
 */

export const ACTIVATION_TARGET_SESSIONS = 3;
export const ACTIVATION_WINDOW_DAYS = 14;

const DAY_MS = 86400000;

/**
 * @param {number} installMs   epoch ms of first run (session.user.created_at)
 * @param {number[]} completedStartedAtMs  started_at of each COMPLETED workout
 * @param {number} nowMs        epoch ms of the moment being evaluated
 * @returns {{
 *   daysSinceInstall: number, windowDays: number, windowClosed: boolean,
 *   sessionsInWindow: number, targetSessions: number, sessionsToTarget: number,
 *   activated: boolean
 * } | null}  null when the inputs are unknowable, so callers fall back to no
 *            intervention (fail safe: never nudge on a guess).
 */
export function computeActivationState(installMs, completedStartedAtMs, nowMs) {
  const install = Number.isFinite(installMs) ? installMs : null;
  const now = Number.isFinite(nowMs) ? nowMs : null;
  if (install == null || now == null || now < install) return null;

  const windowEnd = install + ACTIVATION_WINDOW_DAYS * DAY_MS;
  const list = Array.isArray(completedStartedAtMs) ? completedStartedAtMs : [];
  // A session counts when it starts on or after install and strictly before the
  // window closes. Timestamps outside the window (or non-finite) are ignored.
  const sessionsInWindow = list.reduce(
    (n, t) => (Number.isFinite(t) && t >= install && t < windowEnd ? n + 1 : n),
    0,
  );

  const daysSinceInstall = Math.floor((now - install) / DAY_MS);
  const windowClosed = now >= windowEnd;
  const activated = sessionsInWindow >= ACTIVATION_TARGET_SESSIONS;
  const sessionsToTarget = Math.max(0, ACTIVATION_TARGET_SESSIONS - sessionsInWindow);

  return {
    daysSinceInstall,
    windowDays: ACTIVATION_WINDOW_DAYS,
    windowClosed,
    sessionsInWindow,
    targetSessions: ACTIVATION_TARGET_SESSIONS,
    sessionsToTarget,
    activated,
  };
}
