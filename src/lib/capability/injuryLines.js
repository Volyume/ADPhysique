/**
 * capability/injuryLines.js - the three always-on Injuries & limitations lines
 * (D231, app layout rework, batch 2: Train).
 *
 * These were rows in the "Injuries & limitations" group at the foot of Today
 * (HomeScreen.js). The spec moves them under the Injuries & limitations row on
 * Train, so the logic that computes them lives here once, read by the
 * `useInjuryLines` hook, instead of being copied into a second screen. Nothing
 * about WHEN a line shows changed in the move:
 *
 *  - the works-around line ("Training leaves your knee out at the moment."):
 *    an episode rule that is APPLIED and not HELD (the serve gate in
 *    sessionEffective.js plus its hold filter, so the line never claims what
 *    serving does not do), shown only with an active plan;
 *  - the reintroduction line ("Training for your quads builds back up to your
 *    plan from here."): while any of the current block week's planned rows
 *    carries the section 23 ramp's source stamp;
 *  - the honest could-not-check line: the resolver's no-known-state signature
 *    (unavailable and not stale), or a read that threw. Stale-but-known state
 *    keeps serving normally (CAP-17) and never fires it. The signature is
 *    spoken through capabilityKnown(), the ONE predicate (capabilityCensus
 *    class 1), where the Today row used to spell the two flags out by hand;
 *    for every state the resolver returns the two are the same answer.
 *
 * The decision rows that used to share that group ("Still need it?", "A change
 * to your limitations is waiting for your decision.") are Today-line occupants
 * since batch 1 and are NOT here: HomeScreen still reads those.
 *
 * `deriveInjuryLines` is pure; the two readers below are best effort and never
 * throw (a failed read is the could-not-check line, never a crash).
 */
import { getCurrentMesocycleWeek, getPlannedMuscleVolume } from '../database';
import { MUSCLE_DISPLAY_NAMES } from '../algorithms';
import { logError } from '../errorLog';
import { rampMusclesFromPlannedRows, reintroductionRampLine } from './reintroduction';
import { capabilityKnown, loadCapabilityResolveState } from './resolve';

/** The line shown when the capability read failed with no last-known state. */
export const COULD_NOT_CHECK_LINE = 'Volyume could not check Injuries & limitations just now.';

/** Nothing to say: the shape before the first read and with no signed-in account. */
export const NO_INJURY_LINES = Object.freeze({
  activeConstraint: false,
  constraintSubject: null,
  rampLine: null,
  checkFailed: false,
});

/**
 * The works-around and could-not-check facts, from a resolved capability state
 * (loadCapabilityResolveState's result).
 *
 * @param {object|null|undefined} state
 * @param {{ subjectPhrase?: (rows: any[], opts: object) => (string|null) }} [deps]
 * @returns {{ activeConstraint: boolean, constraintSubject: string|null, checkFailed: boolean }}
 */
export function deriveInjuryLines(state, { subjectPhrase = null } = {}) {
  // Lead tighten (W3 review, D112 R8): a HELD episode must not drive the
  // "works around" line - the serve layer holds it, so the claim would be
  // false. Applied-and-not-held only, matching the serve gate plus the hold
  // filter it gained.
  const episodeRows = Array.isArray(state?.restrictions)
    ? state.restrictions.filter(r => r.role === 'episode' && r.effectiveChoice === 'applied' && r.adaptationMode !== 'hold') : [];
  let constraintSubject = null;
  try {
    // Natural coach-language order (2026-08-21): the short honest name for
    // what the temporary change covers, or null for the generic line.
    constraintSubject = subjectPhrase ? subjectPhrase(episodeRows, {}) : null;
  } catch (_) { constraintSubject = null; }
  return {
    activeConstraint: episodeRows.length > 0,
    constraintSubject,
    // B4/E1: not knowing is exactly the resolver's no-known-state failure branch
    // (the synthesised empty state: unavailable, not stale). No state at all is
    // not a failed check (the no-user case), as before.
    checkFailed: !!state && !capabilityKnown(state),
  };
}

/**
 * Read the capability state and derive the lines. Never throws: a failed read
 * is a failed check (B4/E1), said honestly rather than shown as nothing.
 *
 * @param {string} userId
 * @returns {Promise<{ activeConstraint: boolean, constraintSubject: string|null, checkFailed: boolean }>}
 */
export async function readInjuryLines(userId) {
  try {
    // eslint-disable-next-line global-require
    const { subjectPhrase } = require('./phrase');
    const state = await loadCapabilityResolveState(userId, {});
    return deriveInjuryLines(state, { subjectPhrase });
  } catch (_) {
    // This catch is also a failed check (the require or the read path itself
    // threw): say so rather than showing nothing.
    return { activeConstraint: false, constraintSubject: null, checkFailed: true };
  }
}

/**
 * The reintroduction line for the current block week, or null. T2-25: read the
 * ramp stamp off the week's planned rows. Never throws.
 *
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
export async function readRampLine(userId) {
  try {
    const week = await getCurrentMesocycleWeek(userId);
    if (!week) return null;
    const planned = await getPlannedMuscleVolume(week.id);
    const rampMuscles = rampMusclesFromPlannedRows(planned);
    return rampMuscles.length
      ? reintroductionRampLine(rampMuscles.map((m) => MUSCLE_DISPLAY_NAMES[m] || m))
      : null;
  } catch (e) {
    logError('injuryLines.readRampLine', e, { userId });
    return null;
  }
}
