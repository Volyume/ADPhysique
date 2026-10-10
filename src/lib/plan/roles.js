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
import { ROLE_TARGETS, GROWTH_FLOOR, OBJECTIVE, BLOCK, STANDARD_DIRECT_FLOOR, STANDARD_DIRECT_FLOOR_DEFAULT } from './science';
import { GOAL_OVERLAYS } from '../coachingGoals';
import { divisionDirectFloor } from './divisionStandard';

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
 * @returns {Object<string, { role: string, weight: number, peak: number, growthFloor: number, directFloor: number, direct: boolean }>}
 *   `peak` and `growthFloor` are fractional sets a week; `directFloor` is the standard in the muscle's own
 *   sets (founder order 2026-10-10); `direct` says whether the muscle gets exercises of its own (false: it
 *   is held on indirect work).
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
        directFloor: divisionDirectFloor(goal, m) ?? STANDARD_DIRECT_FLOOR[m] ?? STANDARD_DIRECT_FLOOR_DEFAULT,
        direct: true,
      };
      continue;
    }

    const judged = typeof o === 'number' && o >= 1.0;
    // Founder order 2026-10-10 (register D219 addendum, the standard floor):
    // every growth muscle keeps its standard role in every goal. A division's
    // overlay below 1.0 says where the emphasis is NOT, never that the muscle
    // is held: men's physique still trains its legs for growth, bikini its
    // chest and arms. The overlay raises a muscle's weight above standard or
    // leaves it at standard; it never lowers it to maintenance.
    const growth = GROWTH_MUSCLES.includes(m) || judged || added.has(m);

    if (growth && canTrain) {
      const weight = typeof o === 'number' && o > 1.0
        ? Math.min(OBJECTIVE.roleWeight.focus, o)
        : OBJECTIVE.roleWeight.standard;
      const directFloor = divisionDirectFloor(goal, m) ?? STANDARD_DIRECT_FLOOR[m] ?? STANDARD_DIRECT_FLOOR_DEFAULT;
      // A muscle the division de-emphasises (overlay below 1.0) keeps its
      // standard and is held there: its growth sets go to the judged
      // muscles (research 2026-10-10: bikini chest at a median of 7.5 sets,
      // wellness chest at 1, men's physique glutes at 9).
      const deEmphasised = typeof o === 'number' && o < 1.0;
      out[m] = {
        role: ROLE.STANDARD,
        weight: deEmphasised ? 0 : weight,
        peak: deEmphasised ? Math.max(directFloor, MAINTENANCE_TARGET.deEmphasised) - (cut > 0 ? Math.min(cut, 2) : 0) : standardPeak - cut,
        growthFloor: deEmphasised ? Math.min(GROWTH_FLOOR.standard, directFloor) : GROWTH_FLOOR.standard,
        directFloor,
        direct: true,
      };
      continue;
    }

    if (OPT_IN_MUSCLES.includes(m)) continue;

    // Held at maintenance on indirect work alone: the muscles a goal does
    // not judge (front delts from presses, traps from rows and deadlifts).
    out[m] = {
      role: ROLE.MAINTENANCE,
      weight: 0,
      peak: MAINTENANCE_TARGET.indirect,
      growthFloor: 0,
      directFloor: 0,
      direct: false,
    };
  }
  return out;
}
