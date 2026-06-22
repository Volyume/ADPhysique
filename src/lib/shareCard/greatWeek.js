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
 *  - Pro-gated (enforced at the screen, not here).
 *
 * Founder correction 2026-06-22 (SUPERSEDES the earlier "qualitative-only
 * weight" call): the card MUST celebrate the real achievement — the actual
 * weight lost/gained and the PRs — because that is what the user is proud of and
 * what makes the card worth sharing. A tick celebrates nothing. The real number
 * is shown because the card only ever fires on a verified-SAFE, on-target week
 * (isGreatWeek already gates rapid-loss / FFM-floor / ED-flag), so we only put a
 * number on the card when the progress has been confirmed safe and on target.
 *
 * SAFETY (unchanged): a week is never "great"/shareable while any ED-safety
 * signal is open, and when `suppress` is set (ED-pattern flag OR calm mode) the
 * card carries no weight/progress language at all — only the controllable,
 * self-referential wins (sessions, PRs, recovery). Never a comparison to others;
 * never reward overshoot (off-target weeks don't qualify in the first place).
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
 * Build the params the weekly-recap card renderer consumes.
 *
 * The hero is the user's real goal achievement — the actual weight lost/gained
 * this week — shown because the card only fires on a safe, on-target week. Under
 * `suppress` every number/progress surface is dropped to the bare wins.
 *
 * @param {object} output  the coach output
 * @param {object} opts
 * @param {boolean} opts.suppress   ED-pattern flag OR calm mode active. Drops the
 *   weight progress hero, the best-lift hero AND all weight/progress language.
 * @param {boolean} opts.includeProgress  user toggle (default true). When false,
 *   the weight progress hero + progress coach-line are dropped — the best-lift
 *   hero is NOT (independent surfaces).
 * @param {string}  opts.units      'kg' | 'lbs' (gym/body unit label)
 * @param {boolean} opts.isSquare   1:1 (true) vs 9:16 story (false)
 * @param {string}  opts.weekLabel  e.g. "Week 4 · Moderate cut"
 * @param {string}  opts.dateFormatted
 * @param {object}  opts.bestLift   { exerciseName, weight, reps, isNewBest } or null.
 */
export function buildWeeklyRecapParams(output, { suppress = false, includeProgress = true, units = 'kg', isSquare = true, weekLabel = '', dateFormatted = '', bestLift = null } = {}) {
  const o = output || {};
  const planned = Number(o.sessionsPlanned) || 0;
  const completed = Number(o.sessionsCompleted) || 0;
  const prs = Number(o.prsThisWeek) || 0;
  const recoveryGood = o.recoveryFlag === 'normal';
  const onTarget = o.trend?.onTarget === true;
  const delta = Number(o.trend?.delta);
  const hasWeight = o.trend?.delta != null && Number.isFinite(delta);
  const u = units === 'lbs' ? 'lbs' : 'kg';

  // The real weight achievement is the hero — shown when on target, not
  // safety-suppressed, and not toggled off. (The card only fires on-target, so
  // this never celebrates overshoot.) Progress language follows the same gate.
  // Weight is celebrated ONLY when the goal is a cut and the week actually lost
  // weight on target (founder 2026-06-22): a number with no heading is
  // meaningless, and a cut is the only goal where the scale moving down IS the
  // win. So the hero gets an explicit heading ("weight lost this week") + the
  // magnitude ("0.7 kg") + the goal status ("right on target"). Bulk/recomp/
  // maintenance never put a scale number on the card.
  const isCut = /cut/i.test(String(o.goalPhase || ''));
  const lostWeight = delta < -0.01;
  const showProgress = hasWeight && onTarget && isCut && lostWeight && !suppress && includeProgress;
  const abs = Math.round(Math.abs(delta) * 10) / 10;
  const progress = showProgress
    ? { heading: 'weight lost this week', value: `${abs} ${u}`, context: 'right on target' }
    : null;

  const stats = [];
  if (prs > 0) stats.push({ label: prs === 1 ? 'PR' : 'PRs', value: String(prs) });
  if (planned > 0) stats.push({ label: 'Sessions', value: `${completed}/${planned}` });
  if (recoveryGood) stats.push({ label: 'Recovery', value: 'Strong' });

  return {
    cardType: 'weekly',
    isSquare,
    tierLabel: HEADLINE,
    weekLabel,
    dateFormatted,
    // The headline achievement: real weight change toward the goal.
    progress,
    // A lift weight is a number; under safety suppress (calm mode / ED flag) the
    // hero is stripped so the card carries only bare wins.
    bestLift: suppress ? null : (bestLift || null),
    stats: stats.slice(0, 4),
    // Name the weight only when the hero shows it (on target, safe, not toggled
    // off) — never on an off-target week.
    coachLine: buildCoachLine({ completed, planned, prs, recoveryGood, delta, u, showWeight: showProgress }),
  };
}

// The coach voice: plain second-person British declaratives, numbers before
// narrative, no jargon — matching weeklyCoach.js's "what's working" lines
// ("You hit all 4 of your sessions", "You set 2 new PRs this week"). Names the
// real weight change. The tier headline already says "Textbook Week", so the
// line doesn't repeat it.
function buildCoachLine({ completed, planned, prs, recoveryGood, delta, u, showWeight }) {
  const clauses = [];
  clauses.push(
    planned > 0 && completed >= planned
      ? `You hit all ${planned} sessions`
      : `You hit ${completed} of your ${planned} sessions`,
  );
  if (prs > 0) clauses.push(`set ${prs} new PR${prs === 1 ? '' : 's'}`);
  // The real weight change — only when the hero shows it (on target, safe, not
  // suppressed); never on an off-target week or under calm mode / an ED flag.
  if (showWeight) {
    const a = Math.round(Math.abs(delta) * 10) / 10;
    clauses.push(delta < -0.01 ? `lost ${a} ${u}` : delta > 0.01 ? `gained ${a} ${u}` : 'held steady');
  }
  if (recoveryGood) clauses.push('recovery was strong');

  // Join British-style: "a, b, c and d." (no Oxford comma).
  const rest = clauses.slice(1);
  let line = clauses[0];
  if (rest.length === 1) line += ` and ${rest[0]}`;
  else if (rest.length > 1) line += `, ${rest.slice(0, -1).join(', ')} and ${rest[rest.length - 1]}`;
  return `${line}.`;
}

export const GREAT_WEEK_HEADLINE = HEADLINE;
