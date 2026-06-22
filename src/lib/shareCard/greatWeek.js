/**
 * "Great week" detection + weekly-recap share-card params.
 * Blueprint: docs/blueprint-great-week-share-card-2026-06-22.md
 *
 * Pure functions, no side effects. Maps a Precision Coaching weekly output to
 * (a) whether the week warrants an opt-in "share your week" prompt, and (b) the
 * ED-safe params for the recap card.
 *
 * Founder decisions 2026-06-22:
 *  - warm "Textbook Week" coach voice;
 *  - weight celebrated QUALITATIVELY only (never a raw kg/rate number on the
 *    shared card); the raw number stays private/in-app;
 *  - Pro-gated (enforced at the screen, not here).
 *
 * SAFETY: a week is never "great"/shareable while any ED-safety signal is open,
 * and when `suppress` is set (ED-pattern flag OR calm mode) the card carries no
 * weight/progress language at all — only the controllable, self-referential
 * wins (sessions, PRs, recovery). Self-referential only: never a comparison to
 * other users.
 */

const HEADLINE = 'Textbook Week';

// A week is never celebratable while a safety signal is open, regardless of the
// positives (mirrors the engine's own hard gates).
function safetyClear(o) {
  return !o?.edPatternFired && !o?.ffmFloorHeld && !o?.rapidWeightLossFlag;
}

/**
 * Should we offer the opt-in "share your week" prompt?
 * @returns {{ great: boolean, reasons: string[] }}
 */
export function isGreatWeek(output) {
  const o = output || {};
  if (!o.hasEnoughData) return { great: false, reasons: [] };
  if (!safetyClear(o)) return { great: false, reasons: [] };

  const onTarget = o.trend?.onTarget === true;
  const planned = Number(o.sessionsPlanned) || 0;
  const completed = Number(o.sessionsCompleted) || 0;
  const hitSessions = planned > 0 && completed >= Math.ceil(planned * 0.75);
  const prs = Number(o.prsThisWeek) || 0;
  const recoveryGood = o.recoveryFlag === 'normal';
  const noDeload = o.deloadSuggested !== true;

  // Core: on-target + showed up + no deload needed, plus at least one standout
  // (a PR or clean recovery). All self-referential and within the user's control.
  const great = onTarget && hitSessions && noDeload && (prs > 0 || recoveryGood);

  const reasons = [];
  if (great) {
    if (prs > 0) reasons.push('pr');
    if (hitSessions) reasons.push('sessions');
    if (onTarget) reasons.push('onTarget');
    if (recoveryGood) reasons.push('recovery');
  }
  return { great, reasons };
}

/**
 * Build the params the weekly-recap card renderer consumes. ED-safe by
 * construction: qualitative-only weight, dropped entirely under `suppress`.
 *
 * @param {object} output  the coach output
 * @param {object} opts
 * @param {boolean} opts.suppress   ED-pattern flag OR calm mode active. ED-safe
 *   by construction: this drops the on-target stat, the best-lift hero AND all
 *   weight/progress language, regardless of the toggles below.
 * @param {boolean} opts.includeOnTarget  user toggle (default true). When false,
 *   the qualitative on-target stat and the progress coach-line are dropped — but
 *   the best-lift hero is NOT (the two are independent surfaces).
 * @param {boolean} opts.isSquare   1:1 (true) vs 9:16 story (false)
 * @param {string}  opts.weekLabel  e.g. "Week 4"
 * @param {string}  opts.dateFormatted
 * @param {object}  opts.bestLift   { exerciseName, weight, reps, isNewBest, gainKg }
 *   the week's standout lift (see src/lib/bestLift.js), or null. Featured as the
 *   card hero — a competence win, not a bodyweight number — but a lift weight is
 *   still a number, so it is dropped entirely under `suppress`.
 */
export function buildWeeklyRecapParams(output, { suppress = false, includeOnTarget = true, isSquare = true, weekLabel = '', dateFormatted = '', bestLift = null } = {}) {
  const o = output || {};
  const planned = Number(o.sessionsPlanned) || 0;
  const completed = Number(o.sessionsCompleted) || 0;
  const prs = Number(o.prsThisWeek) || 0;
  const recoveryGood = o.recoveryFlag === 'normal';
  const onTarget = o.trend?.onTarget === true;

  // The on-target stat shows only when on target, not safety-suppressed, and not
  // toggled off. No-progress coach line whenever progress is hidden for any of
  // those reasons.
  const showOnTarget = onTarget && !suppress && includeOnTarget;
  const noProgressLanguage = suppress || !includeOnTarget;

  const stats = [];
  if (prs > 0) stats.push({ label: prs === 1 ? 'PR' : 'PRs', value: String(prs) });
  if (planned > 0) stats.push({ label: 'Sessions', value: `${completed}/${planned}` });
  if (recoveryGood) stats.push({ label: 'Recovery', value: 'Strong' });
  // Qualitative on-target progress — NEVER a number. A short check-glyph value
  // keeps it inside the stat box (values aren't shrunk).
  if (showOnTarget) stats.push({ label: 'On target', value: '✓' });

  return {
    cardType: 'weekly',
    isSquare,
    tierLabel: HEADLINE,
    weekLabel,
    dateFormatted,
    // A lift weight is a number; under safety suppress (calm mode / ED flag) the
    // hero is stripped so the card carries only bare wins.
    bestLift: suppress ? null : (bestLift || null),
    stats: stats.slice(0, 4),
    coachLine: buildCoachLine({ completed, planned, prs, onTarget, recoveryGood, suppress: noProgressLanguage }),
  };
}

// The coach voice: plain second-person British declaratives, numbers before
// narrative, no jargon — matching weeklyCoach.js's "what's working" lines
// ("You hit all 4 of your sessions", "You set 2 new PRs this week"). The tier
// headline already says "Textbook Week", so the line doesn't repeat it.
function buildCoachLine({ completed, planned, prs, onTarget, recoveryGood, suppress }) {
  const clauses = [];
  clauses.push(
    planned > 0 && completed >= planned
      ? `You hit all ${planned} sessions`
      : `You hit ${completed} of your ${planned} sessions`,
  );
  if (prs > 0) clauses.push(`set ${prs} new PR${prs === 1 ? '' : 's'}`);
  // No weight/progress language under calm mode / ED flag.
  if (onTarget && !suppress) clauses.push('your weight stayed on target');
  if (recoveryGood) clauses.push('recovery was strong');

  // Join British-style: "a, b, c and d." (no Oxford comma).
  const rest = clauses.slice(1);
  let line = clauses[0];
  if (rest.length === 1) line += ` and ${rest[0]}`;
  else if (rest.length > 1) line += `, ${rest.slice(0, -1).join(', ')} and ${rest[rest.length - 1]}`;
  return `${line}.`;
}

export const GREAT_WEEK_HEADLINE = HEADLINE;
