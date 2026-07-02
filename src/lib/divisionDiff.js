/**
 * divisionDiff.js
 * A4 (audit/04-competitive.md section 4): the division set-count diff.
 *
 * "A general plan gives glutes N sets; yours has M." This module makes the
 * division fingerprint legible on daily surfaces by diffing the DELIVERED
 * weekly set counts of the user's division plan against the plan the same
 * inputs would produce with the 'general' division. Pure re-presentation:
 * both sides come from planEngine.generatePlan (deterministic, no I/O, no
 * randomness), so this adds no new computation beyond a subtraction of
 * numbers the engine already produces. No constants are duplicated here;
 * the overlay truth stays in coachingGoals.GOAL_OVERLAYS and the applied
 * result in generatePlan's weeklyVolumeSummary.
 *
 * Pure functions only. No side effects, no DB, no store.
 */

import { generatePlan } from './planEngine';
import { GOAL_OVERLAYS, GOAL_LABELS } from './coachingGoals';
import { MUSCLE_DISPLAY_NAMES } from './algorithms';

// Rounding and the systemic-volume cap can move an un-emphasised muscle by a
// set either way between two runs of the engine with different goals. A
// difference below this is not a division fingerprint, so surfaces filter to
// deltas of at least this many weekly sets before marking a muscle.
export const FINGERPRINT_MIN_DELTA = 2;

// True when this training goal is a physique division with a real volume
// overlay (anything other than the balanced 'general' default). Derived from
// GOAL_OVERLAYS so a new division added there is covered automatically.
export function hasDivisionOverlay(goal) {
  if (!goal || goal === 'general') return false;
  return Object.keys(GOAL_OVERLAYS[goal] ?? {}).length > 0;
}

// True when an ACTIVE plan is the generated division plan for this goal.
// Generated plan names always lead with the division label (planEngine's
// goalShort matches GOAL_LABELS for every division), so a user who has since
// activated a manually built or library plan does not get a fingerprint
// claimed for a plan that never had the overlay applied.
//
// Weak-point and strength-size blocks shadow the name label ('Specialisation'
// / 'Strength + Size') but KEEP the division overlay (applyGoalOverlay runs
// for every goal, including during those phases), so those generated names
// also qualify. The ' · ' separator is part of every generated name, which is
// what keeps a seed routine like "Chest & Shoulder Specialisation" out.
const PHASE_SHADOWED_NAME_PREFIXES = ['Specialisation · ', 'Strength + Size · '];

export function planWearsDivision(planName, goal) {
  if (!hasDivisionOverlay(goal) || typeof planName !== 'string') return false;
  const label = GOAL_LABELS[goal];
  if (!!label && planName.includes(label)) return true;
  return PHASE_SHADOWED_NAME_PREFIXES.some(p => planName.startsWith(p));
}

// Flatten a plan's weeklyVolumeSummary into { internalMuscleKey: directSets },
// expanding the aggregate shoulders bucket into its per-head counts (the
// summary carries them under shoulders.heads) so the diff speaks the same
// muscle keys as the heatmap and MUSCLE_DISPLAY_NAMES.
function summaryToMuscleSets(summary) {
  const out = {};
  for (const [key, entry] of Object.entries(summary ?? {})) {
    if (key === 'shoulders') {
      const heads = entry?.heads ?? {};
      out.side_delts = heads.side_delts ?? 0;
      out.rear_delts = heads.rear_delts ?? 0;
      out.front_delts = heads.front_delts ?? 0;
    } else {
      out[key] = entry?.plannedSets ?? 0;
    }
  }
  return out;
}

/**
 * Per-muscle weekly set-count diff between the user's division plan and the
 * general plan for the SAME inputs (experience, days, equipment, phase, weak
 * points all held constant, only the division changes).
 *
 * @param {object} planInputs generatePlan inputs, as built by
 *   planAutoGen.buildPlanInputs(profile) (may include exerciseLibrary).
 * @returns {Array<{muscle: string, yours: number, general: number,
 *   delta: number, direction: 'elevated'|'capped'|'same'}>}
 *   sorted by delta descending (most elevated first), then muscle key.
 */
export function computeDivisionDiff(planInputs) {
  if (!planInputs?.goal) return [];
  const division = planInputs.goal;
  const yours = summaryToMuscleSets(
    generatePlan({ ...planInputs, goal: division }).weeklyVolumeSummary,
  );
  const general = division === 'general'
    ? yours
    : summaryToMuscleSets(generatePlan({ ...planInputs, goal: 'general' }).weeklyVolumeSummary);

  const muscles = [...new Set([...Object.keys(yours), ...Object.keys(general)])];
  return muscles
    .map(muscle => {
      const y = yours[muscle] ?? 0;
      const g = general[muscle] ?? 0;
      const delta = y - g;
      return {
        muscle,
        yours: y,
        general: g,
        delta,
        direction: delta > 0 ? 'elevated' : delta < 0 ? 'capped' : 'same',
      };
    })
    .sort((a, b) => (b.delta - a.delta) || (a.muscle < b.muscle ? -1 : 1));
}

/**
 * Heatmap markers: { muscleKey: 'elevated' | 'capped' } for every muscle whose
 * division delta is meaningful (|delta| >= minDelta). Returns null when the
 * diff carries no fingerprint, so callers can render nothing at all.
 */
export function fingerprintMarkers(diff, minDelta = FINGERPRINT_MIN_DELTA) {
  if (!Array.isArray(diff)) return null;
  const out = {};
  for (const d of diff) {
    if (d.direction !== 'same' && Math.abs(d.delta) >= minDelta) {
      out[d.muscle] = d.direction;
    }
  }
  return Object.keys(out).length ? out : null;
}

/**
 * One quiet line for routine detail, naming the division and its strongest
 * emphases: "Built for Bikini: Glutes and Hamstrings elevated, Abs and Chest
 * capped." Top `maxEach` muscles each way, by delta size. Returns null when
 * the diff carries no meaningful fingerprint.
 */
export function divisionFingerprintLine(goal, diff, maxEach = 2) {
  if (!hasDivisionOverlay(goal) || !Array.isArray(diff)) return null;
  const label = GOAL_LABELS[goal] ?? goal;
  const name = d => MUSCLE_DISPLAY_NAMES[d.muscle]
    ?? d.muscle.charAt(0).toUpperCase() + d.muscle.slice(1).replace(/_/g, ' ');
  const elevated = diff
    .filter(d => d.direction === 'elevated' && d.delta >= FINGERPRINT_MIN_DELTA)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, maxEach);
  const capped = diff
    .filter(d => d.direction === 'capped' && -d.delta >= FINGERPRINT_MIN_DELTA)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, maxEach);
  if (!elevated.length && !capped.length) return null;
  const parts = [];
  if (elevated.length) parts.push(`${elevated.map(name).join(' and ')} elevated`);
  if (capped.length) parts.push(`${capped.map(name).join(' and ')} capped`);
  return `Built for ${label}: ${parts.join(', ')}.`;
}
