/**
 * roles.js -- D219: every muscle's role in a plan, its weight in the
 * objective and its peak weekly target (design 3 and 4.2,
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md).
 *
 * Roles:
 *   focus        up to three muscles the person picked to bring up, in any
 *                goal and any phase (today weak points act only in the
 *                weak_point phase, R1 section 7). Weight 1.5, peak 22
 *                fractional sets a week, never planned below 20 by the
 *                readiness check.
 *   standard     every other muscle the goal trains for growth. Weight 1.0,
 *                or the division's priority (its overlay, 1.0 to 1.5); peak
 *                up to 20 (14 in a beginner's first block); growth floor 10.
 *   maintenance  muscles the goal holds: a division's de-emphasised muscles
 *                (overlay under 1.0) at 6, and the muscles a goal only trains
 *                indirectly (front delts from presses, for example) at 4.
 *   (raised      a standard muscle a check-in lifted above 20; read from the
 *                rows, never assigned here.)
 *
 * Opt-in muscles (neck, tibialis; forearms and adductors unless the goal's
 * division judges them) get no direct work unless the person adds them or
 * picks them as a focus (design 4.7).
 *
 * Lead rulings (D219 build): a goal overlay of 1.0 or more makes a muscle
 * standard with that weight (division intent is senior, Campaign 16), so
 * open bodybuilding trains traps, front delts and forearms directly and the
 * glute and leg divisions train adductors; general trains the eleven
 * growth muscles below and holds traps and front delts on indirect work.
 *
 * Pure: no I/O, no clock, no randomness.
 */
import { ROLE } from './bands';
import { ROLE_TARGETS, GROWTH_FLOOR, OBJECTIVE, BLOCK } from './science';
import { GOAL_OVERLAYS } from '../coachingGoals';

/** Every muscle key the plan knows (algorithms.js VOLUME_LANDMARKS keys). */
export const PLAN_MUSCLES = Object.freeze([
  'chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'traps',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs',
  'neck', 'tibialis',
]);

/** Trained for growth in every goal unless a division de-emphasises them. */
export const GROWTH_MUSCLES = Object.freeze([
  'chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs',
]);

/** Held on the indirect work of other exercises unless the goal judges them. */
export const INDIRECT_MUSCLES = Object.freeze(['front_delts', 'traps', 'forearms', 'adductors']);

/** Never trained directly unless the person adds them or picks them as a focus. */
export const OPT_IN_MUSCLES = Object.freeze(['neck', 'tibialis']);

export const MAX_FOCUS_MUSCLES = 3;

/** Maintenance targets (fractional sets a week). */
export const MAINTENANCE_TARGET = Object.freeze({ deEmphasised: 6, indirect: ROLE_TARGETS.maintenance.target });

const AGGRESSIVE_CUT_PHASES = new Set(['aggressive_cut']);

/**
 * @param {object} input
 * @param {string} input.goal                    training goal key (general, bodybuilding, a division)
 * @param {string[]} [input.focusMuscles]        muscle keys the person picked, in their order
 * @param {string[]} [input.addedMuscles]        opt-in muscles the person added
 * @param {string} [input.experience]            beginner | intermediate | advanced
 * @param {boolean} [input.firstBlock]           the person's first block on a plan
 * @param {string} [input.nutritionPhase]        aggressive_cut lowers the peaks by 2
 * @param {string[]|null} [input.trainedMuscles] muscles the plan's sessions can train (a division's
 *                                                 session lists); null means every muscle
 * @returns {Object<string, { role: string, weight: number, peak: number, growthFloor: number, direct: boolean }>}
 *   `peak` and `growthFloor` are fractional sets a week; `direct` says whether the muscle gets
 *   exercises of its own (false: it is held on indirect work).
 */
export function assignRoles({
  goal = 'general', focusMuscles = [], addedMuscles = [], experience = 'intermediate',
  firstBlock = true, nutritionPhase = null, trainedMuscles = null,
} = {}) {
  const overlay = GOAL_OVERLAYS[goal] ?? {};
  const trainable = trainedMuscles ? new Set(trainedMuscles) : null;
  const focus = [];
  for (const m of Array.isArray(focusMuscles) ? focusMuscles : []) {
    if (PLAN_MUSCLES.includes(m) && !focus.includes(m) && focus.length < MAX_FOCUS_MUSCLES) focus.push(m);
  }
  const added = new Set(Array.isArray(addedMuscles) ? addedMuscles : []);
  const cut = AGGRESSIVE_CUT_PHASES.has(nutritionPhase) ? BLOCK.cutPhasePeakReduction : 0;
  const standardPeak = (experience === 'beginner' && firstBlock)
    ? ROLE_TARGETS.standard.firstBlockBeginnerPeak
    : ROLE_TARGETS.standard.peakMax;

  const out = {};
  for (const m of PLAN_MUSCLES) {
    const o = overlay[m];
    const canTrain = trainable ? trainable.has(m) : true;

    if (focus.includes(m)) {
      out[m] = {
        role: ROLE.FOCUS,
        weight: OBJECTIVE.roleWeight.focus,
        peak: ROLE_TARGETS.focus.peak - cut,
        growthFloor: GROWTH_FLOOR.focus,
        direct: true,
      };
      continue;
    }

    const judged = typeof o === 'number' && o >= 1.0;
    const deEmphasised = typeof o === 'number' && o < 1.0;
    const growth = (GROWTH_MUSCLES.includes(m) && !deEmphasised) || judged || added.has(m);

    if (growth && canTrain) {
      const weight = typeof o === 'number' && o > 1.0
        ? Math.min(OBJECTIVE.roleWeight.focus, o)
        : OBJECTIVE.roleWeight.standard;
      out[m] = {
        role: ROLE.STANDARD,
        weight,
        peak: standardPeak - cut,
        growthFloor: GROWTH_FLOOR.standard,
        direct: true,
      };
      continue;
    }

    if (OPT_IN_MUSCLES.includes(m)) continue;

    // Held at maintenance: directly when the plan's sessions train it and a
    // division lists it, otherwise on indirect work alone.
    const directMaintenance = deEmphasised && canTrain && GROWTH_MUSCLES.includes(m);
    out[m] = {
      role: ROLE.MAINTENANCE,
      weight: 0,
      peak: directMaintenance ? MAINTENANCE_TARGET.deEmphasised : MAINTENANCE_TARGET.indirect,
      growthFloor: 0,
      direct: directMaintenance,
    };
  }
  return out;
}
