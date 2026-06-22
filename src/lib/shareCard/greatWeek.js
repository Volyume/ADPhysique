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
 * @param {boolean} opts.suppress   ED-pattern flag OR calm mode active
 * @param {boolean} opts.isSquare   1:1 (true) vs 9:16 story (false)
 * @param {string}  opts.weekLabel  e.g. "Week 4"
 * @param {string}  opts.dateFormatted
 */
export function buildWeeklyRecapParams(output, { suppress = false, isSquare = true, weekLabel = '', dateFormatted = '' } = {}) {
  const o = output || {};
  const planned = Number(o.sessionsPlanned) || 0;
  const completed = Number(o.sessionsCompleted) || 0;
  const prs = Number(o.prsThisWeek) || 0;
  const recoveryGood = o.recoveryFlag === 'normal';
  const onTarget = o.trend?.onTarget === true;

  const stats = [];
  if (prs > 0) stats.push({ label: prs === 1 ? 'PR' : 'PRs', value: String(prs) });
  if (planned > 0) stats.push({ label: 'Sessions', value: `${completed}/${planned}` });
  if (recoveryGood) stats.push({ label: 'Recovery', value: 'Strong' });
  // Qualitative on-target progress — NEVER a number, and dropped under suppress
  // (calm mode / ED flag) so no weight/progress language reaches the card. A
  // short check-glyph value keeps it inside the stat box (values aren't shrunk).
  if (onTarget && !suppress) stats.push({ label: 'On target', value: '✓' });

  return {
    cardType: 'weekly',
    isSquare,
    tierLabel: HEADLINE,
    weekLabel,
    dateFormatted,
    stats: stats.slice(0, 4),
    coachLine: buildCoachLine({ completed, prs, onTarget, recoveryGood, suppress }),
  };
}

// Warm, deterministic, British English, numbers-before-narrative, no jargon.
function buildCoachLine({ completed, prs, onTarget, recoveryGood, suppress }) {
  const prBit = prs > 0 ? `, set ${prs} ${prs === 1 ? 'PR' : 'PRs'}` : '';
  if (suppress) {
    // No weight/progress language under calm mode / ED flag.
    return `You showed up ${completed} times${prBit} and trained consistently. Strong week.`;
  }
  const recBit = recoveryGood ? ' and recovered well' : '';
  const targetBit = onTarget ? ' and held your target' : '';
  return `You showed up ${completed} times${prBit}${targetBit}${recBit}. Textbook week.`;
}

export const GREAT_WEEK_HEADLINE = HEADLINE;
