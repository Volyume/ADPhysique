/**
 * division/profile.js — THE canonical division model.
 *
 * FOUNDER ORDER (2026-08-13): "one canonical division-profile model", with
 * all nine divisions traced end to end, derived research-first from the
 * current IFBB Pro League / NPC judging criteria and from primary evidence
 * that exercise selection changes regional development.
 *
 * SOURCE OF TRUTH FOR EVERY LINE IN THIS FILE:
 *   docs/plan-generation-campaign-16/DIVISION-EVIDENCE-REGISTER.md
 * Each profile carries `source` and `criteria` (verbatim) so a rule can be
 * checked against the rulebook that produced it, and so a future rulebook
 * change has an obvious place to land. Nothing here is a judgement call
 * dressed as a fact: where the register found no criterion, the profile is
 * deliberately empty rather than invented.
 *
 * WHY IT EXISTS
 *
 * Division intelligence was real but scattered: volume multipliers in
 * coachingGoals, pool rules and subregion bias in two tables in planEngine,
 * split character in an inline `goal === 'bikini' || goal === 'wellness'`
 * in a third place, and the glute MRV ceiling in a fourth. Six of the nine
 * divisions had a bias entry and three had none, which is how Figure - the
 * one division whose published criteria name "sweep to the quads" in
 * writing - ended up as the division not getting it.
 *
 * THE THREE LAYERS, deliberately separate
 *
 *   1. HOW MUCH   per-muscle weekly volume bias. Still owned by
 *      GOAL_OVERLAYS in coachingGoals.js, which the engine's landmark maths
 *      reads directly; re-exported here by reference so this module is the
 *      one place to LOOK, without moving numbers a hundred pinned tests
 *      depend on.
 *   2. WHICH ROLE within a muscle. Owned here. Back depth and back width
 *      are different jobs; a division judged on both needs both.
 *   3. WHAT MAY BE PICKED for a role. Owned here (`poolRules`), for the
 *      cases where a division's criteria exclude a movement outright.
 *
 * ROLES ARE DURABLE, EXERCISES ARE NOT (register §2.3). Personal evidence -
 * what the athlete responds to, swaps away from, or has stopped progressing
 * on - chooses WHICH exercise fills a role. It never removes the role. A
 * plan that quietly loses its lat-width work because the athlete disliked
 * one pulldown is a different physique, not a personalised one.
 *
 * SAFETY. Nothing in this file consults or affects tier, calorie floors,
 * the FFM floor, ED-pattern detection or calm mode. A division may bias
 * distribution inside the engine's landmarks; it may never drive a muscle
 * to zero, because symmetry and balance are judged in every division
 * (register §1.1).
 */

import { FAMILY } from '../exercise/movementFamily';
import { GOAL_OVERLAYS } from '../coachingGoals';

/**
 * The within-muscle role vocabulary.
 *
 * Every value is either a real movement family (so `familySatisfiesRole`
 * can check it) or the one honest exception, SWEEP: a hack squat and a back
 * squat are the SAME family, so sweep is an emphasis token, not coverage.
 * Keeping that distinction is what stops two squats passing as two roles.
 */
export const DIVISION_ROLE = Object.freeze({
  /** Lat width. Overhead load line. Register §1.3 "width". */
  BACK_WIDTH: FAMILY.VERTICAL_PULL,
  /** Back thickness and depth. Register §1.3 "back depth". */
  BACK_DEPTH: FAMILY.UPPER_MID_ROW,
  /** Lat-biased row: width-adjacent thickness. */
  BACK_LAT_ROW: FAMILY.HORIZONTAL_LAT,
  /** Straight-arm work: lat width without spinal loading. */
  BACK_SHOULDER_EXTENSION: FAMILY.SHOULDER_EXTENSION,
  /** Upper chest. Register §1.3 "V taper" read from the front. */
  CHEST_UPPER: FAMILY.INCLINE,
  /**
   * The round glute. Contreras "activator": peak-contraction hip extension,
   * the hip-thrust family. Register §1.2 "full round glutes".
   *
   * Glutes are not one of the family-classified muscles, so these two use
   * the pool's own activator/stretcher/pumper vocabulary rather than the
   * FAMILY constants. Naming them here is what stops a future edit reaching
   * for FAMILY.HIP_EXTENSION, which is the HAMSTRING token and would match
   * nothing in the glute pool.
   */
  GLUTE_ROUND: 'activator',
  /** The stretched position: the glute half of the glute-ham tie-in. */
  GLUTE_TIE_IN: 'stretcher',
  /** The hamstring half of that tie-in: the RDL/hip-hinge family. */
  HAMSTRING_TIE_IN: FAMILY.HIP_EXTENSION,
  /** Knee flexion: the hamstring belly, curls. */
  HAMSTRING_KNEE_FLEXION: FAMILY.KNEE_FLEXION,
  /** Rectus femoris. PMID 41379528: leg extension grew all three RF sites. */
  QUAD_RECTUS: FAMILY.KNEE_EXTENSION,
  /** Vastus lateralis, the outer sweep. PMID 41379528: squat, distal VL. */
  QUAD_SWEEP: 'sweep',
});

/** The emphasis token that is not a family. Consumers must special-case it. */
export const SWEEP = DIVISION_ROLE.QUAD_SWEEP;

/**
 * How a division's legs are treated by the SPLIT, from the rulebook rather
 * than from taste.
 */
export const LEG_CHARACTER = Object.freeze({
  /** Lower body is the point of the division. Bikini, Wellness. */
  LOWER_LED: 'lower_led',
  /** Legs are fully judged and want their own balanced share. */
  FULLY_JUDGED: 'fully_judged',
  /** Legs are not presented to the judges. Men's Physique, board shorts. */
  NOT_PRESENTED: 'not_presented',
  /** No competition context: the engine's own balance applies. */
  BALANCED: 'balanced',
});

const REGISTER = 'docs/plan-generation-campaign-16/DIVISION-EVIDENCE-REGISTER.md';

/**
 * The nine profiles. Every division Volyume offers has one; there is no
 * unprofiled division and no silent default masquerading as a profile.
 */
export const DIVISION_PROFILES = Object.freeze({
  // ── Not competing ────────────────────────────────────────────────────────
  general: {
    label: 'General',
    source: `${REGISTER} §1.10`,
    criteria: 'No judging criteria exist. Balanced development, the engine\'s own landmarks, and no invented emphasis.',
    priority: [],
    deEmphasised: [],
    roles: {},
    poolRules: {},
    legs: LEG_CHARACTER.BALANCED,
    raisedGluteCeiling: false,
  },

  // ── Male divisions ───────────────────────────────────────────────────────
  mens_physique: {
    label: "Men's Physique",
    source: `${REGISTER} §1.7`,
    criteria: 'Judges will be looking for fit competitors who display proper shape and symmetry combined with muscularity and overall condition. This is not a bodybuilding contest so extreme muscularity will be marked down. Judged in board shorts, front and back turns only.',
    // The V-taper, read from the front and the back.
    priority: ['side_delts', 'back', 'rear_delts', 'chest'],
    // Board shorts: the legs are not presented. Maintenance, never zero -
    // symmetry is still judged (register §1.1).
    deEmphasised: ['traps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'],
    roles: {
      back: [DIVISION_ROLE.BACK_WIDTH],
      chest: [DIVISION_ROLE.CHEST_UPPER],
    },
    poolRules: {
      // No back or front squat for legs nobody will see: the fatigue buys
      // nothing that is judged, and it costs the upper-body sessions.
      quads: { denyParams: ['heavy_compound'] },
    },
    legs: LEG_CHARACTER.NOT_PRESENTED,
    raisedGluteCeiling: false,
  },

  classic_physique: {
    label: 'Classic Physique',
    source: `${REGISTER} §1.8`,
    criteria: 'Judges shall score competitors according to the "total package", which is a balance of size, symmetry, and muscularity. Favorite Classic Pose (no Most Muscular). Inability to properly perform the vacuum pose should relegate the athlete to last place.',
    priority: ['calves', 'side_delts', 'back', 'quads'],
    // Waist and line: the vacuum requirement and the absence of Most
    // Muscular are proportion criteria, not stylistic ones.
    deEmphasised: ['traps', 'abs'],
    roles: {
      back: [DIVISION_ROLE.BACK_WIDTH],
      quads: [DIVISION_ROLE.QUAD_SWEEP],
    },
    poolRules: {},
    legs: LEG_CHARACTER.FULLY_JUDGED,
    raisedGluteCeiling: false,
  },

  bodybuilding: {
    label: 'Bodybuilding',
    source: `${REGISTER} §1.9`,
    criteria: 'Judges shall score competitors according to the "total package", which is a balance of size, symmetry, and muscularity. Mandatory poses include Most Muscular.',
    // Everything is judged from every angle, so nothing is de-emphasised
    // and the two-role muscles want both roles.
    priority: ['chest', 'back', 'side_delts', 'quads', 'calves'],
    deEmphasised: [],
    roles: {
      back: [DIVISION_ROLE.BACK_WIDTH, DIVISION_ROLE.BACK_DEPTH],
      quads: [DIVISION_ROLE.QUAD_SWEEP, DIVISION_ROLE.QUAD_RECTUS],
    },
    poolRules: {},
    legs: LEG_CHARACTER.FULLY_JUDGED,
    raisedGluteCeiling: false,
  },

  // ── Female divisions ─────────────────────────────────────────────────────
  bikini: {
    label: 'Bikini',
    source: `${REGISTER} §1.2`,
    criteria: 'Bikini athletes should display a foundation of muscle which gives shape to the female body; full round glutes with a slight separation between the hamstring and glute area; small amount of roundness in the delts; conditioned core. They should NOT display muscular density seen in a figure physique, squared glutes, muscle separation seen in figure competitors, graininess or striations anywhere.',
    priority: ['glutes', 'hamstrings', 'side_delts'],
    deEmphasised: ['chest', 'abs', 'traps', 'calves', 'quads'],
    roles: {
      // "Full round glutes with a slight separation between the hamstring
      // and glute area": the round shape AND the tie-in are both named, so
      // both roles are wanted, round first.
      glutes: [DIVISION_ROLE.GLUTE_ROUND, DIVISION_ROLE.GLUTE_TIE_IN],
      // The hamstring half of that same junction is the hinge, not the curl.
      hamstrings: [DIVISION_ROLE.HAMSTRING_TIE_IN],
      // Width only. Judged front and back, and figure-like density is a
      // named fault, so the lats are shaped without thickening the waist.
      back: [DIVISION_ROLE.BACK_WIDTH, DIVISION_ROLE.BACK_SHOULDER_EXTENSION],
    },
    poolRules: {
      // An allow-list, not a deny-list, so a hinge can never leak in: rows
      // and deadlifts build the erector and trap thickness that blunts the
      // taper this division is judged on.
      back: { allowSubs: [FAMILY.VERTICAL_PULL, FAMILY.SHOULDER_EXTENSION] },
      quads: { denyParams: ['heavy_compound'] },
      chest: { denyParams: ['heavy_compound'] },
      // Round delts come from lateral raises. Pressing adds front delt and
      // upper-body density, which is the named fault.
      side_delts: { denySubs: ['press'] },
      front_delts: { denySubs: ['press'] },
    },
    legs: LEG_CHARACTER.LOWER_LED,
    // The glute ceiling this division works to is genuinely higher than the
    // general MRV; see divisionMRV in planEngine.
    raisedGluteCeiling: true,
  },

  wellness: {
    label: 'Wellness',
    source: `${REGISTER} §1.5`,
    criteria: 'The overall body development and shape should have more muscle size in the lower body than in the upper body. Similar to bikini athletes, but slightly more development in the upper body and a bigger lower body than in Bikini. The physique should not be excessively muscular; physiques considered too muscular or too hard must be marked down.',
    // Defined relative to Bikini by the rulebook itself: the lower body is
    // larger, and quads are part of what is judged here.
    priority: ['glutes', 'hamstrings', 'quads', 'adductors'],
    deEmphasised: ['chest', 'abs', 'traps'],
    roles: {
      glutes: [DIVISION_ROLE.GLUTE_ROUND, DIVISION_ROLE.GLUTE_TIE_IN],
      hamstrings: [DIVISION_ROLE.HAMSTRING_TIE_IN],
      quads: [DIVISION_ROLE.QUAD_SWEEP],
    },
    poolRules: {},
    legs: LEG_CHARACTER.LOWER_LED,
    raisedGluteCeiling: true,
  },

  figure: {
    label: 'Figure',
    source: `${REGISTER} §1.3`,
    criteria: 'Figure athletes should display an overall balance of muscular development which includes rounded delts, sweep to the quads, back depth, and width - emphasis is on balance and symmetry; a nice "V" taper; tight glutes with separation between the hamstring and glute area; balance between the upper and lower body.',
    priority: ['side_delts', 'back', 'glutes', 'quads'],
    deEmphasised: ['traps', 'abs'],
    roles: {
      // The criteria name BOTH in one sentence: "back depth, and width".
      back: [DIVISION_ROLE.BACK_WIDTH, DIVISION_ROLE.BACK_DEPTH],
      chest: [DIVISION_ROLE.CHEST_UPPER],
      // "sweep to the quads", verbatim. This is the gap the register found.
      quads: [DIVISION_ROLE.QUAD_SWEEP],
    },
    poolRules: {},
    legs: LEG_CHARACTER.FULLY_JUDGED,
    raisedGluteCeiling: false,
  },

  womens_physique: {
    label: "Women's Physique",
    source: `${REGISTER} §1.4`,
    criteria: 'More muscular density than seen in figure; clear muscle separation; emphasis is on muscular development with full muscle bellies; muscular development should be balanced between upper and lower body.',
    priority: ['back', 'side_delts', 'quads', 'hamstrings'],
    deEmphasised: ['abs'],
    roles: {
      back: [DIVISION_ROLE.BACK_WIDTH, DIVISION_ROLE.BACK_DEPTH],
      quads: [DIVISION_ROLE.QUAD_SWEEP, DIVISION_ROLE.QUAD_RECTUS],
    },
    poolRules: {},
    legs: LEG_CHARACTER.FULLY_JUDGED,
    raisedGluteCeiling: false,
  },

  womens_bodybuilding: {
    label: "Women's Bodybuilding",
    source: `${REGISTER} §1.6`,
    criteria: 'Competitors are expected to present the overall athletic development of the musculature but also balanced and symmetrical development of all muscle groups as well their sport condition and quality, with visible separation between them.',
    priority: ['back', 'chest', 'side_delts', 'quads', 'hamstrings'],
    deEmphasised: [],
    roles: {
      back: [DIVISION_ROLE.BACK_WIDTH, DIVISION_ROLE.BACK_DEPTH],
      quads: [DIVISION_ROLE.QUAD_SWEEP, DIVISION_ROLE.QUAD_RECTUS],
    },
    poolRules: {},
    legs: LEG_CHARACTER.FULLY_JUDGED,
    raisedGluteCeiling: false,
  },
});

/** Every division key, in the order the register documents them. */
export const DIVISION_KEYS = Object.freeze(Object.keys(DIVISION_PROFILES));

/**
 * The profile for a goal.
 *
 * Non-division goals (hypertrophy, strength_hypertrophy, cut, weak_point
 * blocks) legitimately arrive here: they are training INTENTS, not
 * divisions, and they carry no judging criteria, so they read the General
 * profile. That is a real answer, not a fallback hiding a missing case.
 */
export function divisionProfile(goal) {
  return DIVISION_PROFILES[goal] ?? DIVISION_PROFILES.general;
}

/** Is this goal an actual competition division? */
export function isDivision(goal) {
  return goal !== 'general' && Object.prototype.hasOwnProperty.call(DIVISION_PROFILES, goal);
}

/**
 * The muscles this division is judged on.
 *
 * Used by the time resolver to protect division intent: a Bikini athlete's
 * glutes are the point of the plan, so trimming them for the clock returns
 * a different plan rather than a shorter one.
 */
export function divisionPriorityMuscles(goal) {
  return divisionProfile(goal).priority;
}

/** The muscles this division deliberately holds at maintenance. Never zero. */
export function divisionDeEmphasised(goal) {
  return divisionProfile(goal).deEmphasised;
}

/**
 * The ordered within-muscle roles this division wants, most judged first.
 *
 * Empty for a muscle the division has no published criterion about, which
 * is the honest answer: the engine's own coverage requirements then decide,
 * exactly as they do for a General user.
 */
export function divisionRoles(goal, muscle) {
  return divisionProfile(goal).roles[muscle] ?? [];
}

/** The division's hard pool restriction for a muscle, or null. */
export function divisionPoolRule(goal, muscle) {
  return divisionProfile(goal).poolRules[muscle] ?? null;
}

/** How this division's legs are treated by the split. */
export function divisionLegCharacter(goal) {
  return divisionProfile(goal).legs;
}

/** Does this division work to the raised glute ceiling? */
export function hasRaisedGluteCeiling(goal) {
  return divisionProfile(goal).raisedGluteCeiling === true;
}

/**
 * The per-muscle weekly volume bias, by reference.
 *
 * Deliberately NOT copied: GOAL_OVERLAYS stays the one place the numbers
 * live, and this is the one place to look for the whole model.
 */
export function divisionVolumeBias(goal) {
  return GOAL_OVERLAYS[goal] ?? {};
}

/**
 * Does `family` fill one of the division's roles for `muscle`?
 *
 * `exerciseName` is needed only for SWEEP, which is an emphasis rather than
 * a family and so cannot be answered from the family alone.
 */
export function fillsDivisionRole(goal, muscle, family, isSweep = false) {
  const roles = divisionRoles(goal, muscle);
  if (roles.length === 0) return false;
  return roles.some(role => (role === SWEEP ? isSweep : role === family));
}
