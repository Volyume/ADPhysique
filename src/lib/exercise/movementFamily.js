/**
 * movementFamily.js — Campaign 16 job 3: what a generated plan means when it
 * says a muscle is "covered".
 *
 * THE PROBLEM THIS SOLVES
 *
 * Coverage was decided from the library's `subregion` tag, and that tag was
 * carrying two different jobs at once: sometimes an anatomical region,
 * sometimes a movement pattern, and in three places neither.
 *
 *   - The shoulder-extension family (straight-arm pulldown, cable pullover)
 *     was tagged `vertical_pull`, so a plan could believe it had a vertical
 *     pull while containing no pulldown or chin-up at all.
 *   - `horizontal_row` held every row there is, so a lat-biased row and a
 *     scapular-retraction upper-back row were indistinguishable and the
 *     "pick a different pattern next" rule had nothing to read.
 *   - `lower_lat` actually contained the deadlift family and back
 *     extensions. That is hip hinge and spinal erector work. Nothing in it
 *     was lat selection, but it could satisfy a lat slot and it produced
 *     user-facing copy telling people a deadlift builds their V-taper.
 *   - `V-Bar Pulldown` carried no tag at all, so it defaulted to the back
 *     muscle default - `horizontal_row` - and a pulldown was being counted
 *     as a row.
 *   - Quads split `sweep` vs `vasti`, where `sweep` contained BOTH
 *     knee-forward squats and the leg extension. Required coverage of both
 *     could therefore be satisfied by a front squat plus a back squat, with
 *     no knee-extension work anywhere in the week.
 *
 * On top of that, the two pools disagreed with EACH OTHER. planEngine's
 * hardcoded fallback POOL called `Cable High Row` a vertical pull while the
 * library called it a row, and called the straight-arm pulldown `lower_lat`
 * while the library called it `vertical_pull`. Which taxonomy a user's plan
 * obeyed depended on whether their library was thin enough to trigger the
 * fallback. This module is the single authority both now resolve through.
 *
 * FAMILY VERSUS ROLE - the distinction the old model could not express
 *
 *   FAMILY answers "are these two selections the same movement?" Two
 *   exercises in one family are redundant in a session. A wide-grip and a
 *   close-grip lat pulldown are one family, which is the exact redundancy
 *   observed in a real generated plan.
 *
 *   ROLE answers "does this plan cover the job?" A role is satisfied by any
 *   one of several families. Back needs actual horizontal rowing, and both
 *   a lat-biased row and an upper-back row are honest ways to do it.
 *
 * Because they are separate, a third back slot can be required to add a
 * family the plan does not yet have, instead of another grip variant of a
 * movement it already has.
 *
 * WHAT THIS IS NOT
 *
 * NOT dosage. There are no per-family MEV/MRV targets and there must not
 * be. Weekly volume is set per MUSCLE by the existing landmarks; families
 * decide only which exercises are chosen to deliver it. Splitting a muscle
 * into separately-dosed sub-muscles is a claim the evidence does not
 * support and Volyume does not make it.
 *
 * NOT a rename of everything. Chest (flat/incline/decline), calves
 * (gastro/soleus - straight-knee and bent-knee), hamstrings (hip extension
 * /knee flexion) and triceps (overhead/pushdown) already drew the
 * distinction the founder commissioned, under names that are already
 * correct and already in the database, the copy layer and the swap engine.
 * Renaming a working vocabulary is churn with a migration attached. Only
 * the two taxonomies that were WRONG are changed: back and quads.
 *
 * FAILING SIMPLE
 *
 * Every requirement here degrades. When volume, equipment, time or an
 * exclusion means a session cannot hold every family, the engine rotates
 * which family each session covers and falls back to a valid single-family
 * plan rather than failing to generate. A simple correct plan beats a
 * clever impossible one.
 */

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

export const FAMILY = Object.freeze({
  // Back. Four real distinctions plus the hinge work that was hiding in
  // `lower_lat`.
  VERTICAL_PULL: 'vertical_pull',           // load line overhead: pulldowns, pull-ups
  HORIZONTAL_LAT: 'horizontal_lat',         // lat-biased row, elbow tucked to the torso
  UPPER_MID_ROW: 'upper_mid_row',           // scapular retraction, elbow away from the torso
  SHOULDER_EXTENSION: 'shoulder_extension', // straight-arm pulldown, pullover
  SPINAL_ERECTOR: 'spinal_erector',         // deadlift family, back extensions
  FACE_PULL: 'face_pull',

  // Quads.
  SQUAT_PRESS: 'squat_press',
  KNEE_EXTENSION: 'knee_extension',

  // Unchanged vocabularies, named here so every consumer has one import.
  FLAT: 'flat',
  INCLINE: 'incline',
  DECLINE: 'decline',
  HIP_EXTENSION: 'hip_extension',
  KNEE_FLEXION: 'knee_flexion',
  GASTRO: 'gastro',
  SOLEUS: 'soleus',
  TRICEPS_OVERHEAD: 'overhead',
  TRICEPS_PUSHDOWN: 'pushdown',
});

// ---------------------------------------------------------------------------
// Back
// ---------------------------------------------------------------------------

// A true vertical pull: the resistance line is overhead and the humerus
// adducts from an overhead position. This is the family a "vertical pull"
// slot exists to fill, and nothing else can stand in for it.
const BACK_VERTICAL_PULL = [
  'Lat Pulldown (Wide Grip)', 'Lat Pulldown (Close Grip)', 'Lat Pulldown (Neutral Grip)',
  'Pull-Up', 'Weighted Pull-Up', 'Chin-Up', 'Neutral Grip Pull-Up', 'Assisted Pull-Up',
  'Single-Arm Lat Pulldown', 'Plate-Loaded Lat Pulldown', 'Iso-Lateral Front Pulldown',
  'Band Lat Pulldown', 'Band Assisted Pull-Up', 'Wide-Grip Pull-Up',
  'Cable Reverse-Grip Pulldown', 'V-Bar Pulldown',
];

// Lat-biased horizontal pull: elbow travels close to the torso, the shoulder
// extends through a long range, the lat does most of the work.
const BACK_HORIZONTAL_LAT = [
  'Barbell Row (Supinated)', 'Dumbbell Row', 'T-Bar Row', 'Chest-Supported T-Bar Row', 'Seated Cable Row', 'Landmine Row',
  'Single-Arm Landmine Row', 'Single-Arm Cable Row', 'Meadows Row', 'Kroc Row',
  'Machine Row (Hammer Strength)', 'Machine Row (Chest Supported)', 'Helms Row',
  'Plate-Loaded Low Row', 'Half-Kneeling Cable Row', 'Smith Machine Row',
];

// Upper/mid-back row: elbow flares away from the torso, the scapulae retract,
// the rhomboids and mid traps do most of the work.
const BACK_UPPER_MID_ROW = [
  'Barbell Row (Bent Over)', 'Pendlay Row', 'Seal Row', 'Inverted Row', 'TRX Row',
  'Cable High Row', 'Cable Row (Wide Grip)', 'Wide-Grip Cable Row',
  'Seated Machine Row (Wide)', 'Chest-Supported Row (Dumbbell)',
  'Chest-Supported Row (Barbell)', 'Plate-Loaded Row', 'Plate-Loaded High Row',
  'Band Row', 'Batwing Row', 'Renegade Row', 'Barbell Upright Row (Wide)',
  'Cable Face Pull (Upper Back)',
];

// Shoulder extension with a straight arm. Real lat work, and NOT a
// substitute for a vertical pull: there is no elbow flexion, no overhead
// start position and a fraction of the load.
const BACK_SHOULDER_EXTENSION = [
  'Cable Straight-Arm Pulldown', 'Cable Lat Pullover',
  'Cable Rope Straight-Arm Pulldown (Single-Arm)',
];

// The hinge and extension work that was living in `lower_lat`. Named for
// what it trains. Deadlifts and back extensions are legitimate back
// exercises; they are not lat selection and must never satisfy a lat slot.
const BACK_SPINAL_ERECTOR = [
  'Conventional Deadlift', 'Sumo Deadlift', 'Rack Pull', 'Trap Bar Deadlift',
  'Snatch Grip Deadlift', 'Deficit Deadlift', 'Hyperextension (Back Extension)',
  'Reverse Hyperextension', 'Back Extension (Weighted)',
];

const BACK_FACE_PULL = ['Face Pull (Rope)', 'Cable Face Pull', 'Face Pull'];

// ---------------------------------------------------------------------------
// Quads
// ---------------------------------------------------------------------------

// Knee extension with the hip essentially static. This is the family the old
// `sweep` tag buried alongside the front squat, which is how a plan could
// claim both quad families and contain two squats.
const QUAD_KNEE_EXTENSION = [
  'Leg Extension', 'Terminal Knee Extension', 'Sissy Squat', 'Sissy Squat Machine',
  'Spanish Squat', 'Reverse Nordic Curl', 'Wall Sit',
];

// Everything else quad-primary is a loaded squat or press pattern: the hip
// and knee extend together. Derived rather than listed, so a new squat
// variant is classified correctly the day it is added.

// The knee-forward, quad-sweep emphasis. This is an EMPHASIS, not a family:
// a hack squat and a back squat are both the squat/press family, and a
// division that judges outer-sweep development should be nudged toward the
// knee-forward one WITHOUT that nudge counting as separate coverage. Keeping
// it out of the family vocabulary is what stopped two squats from passing as
// two families.
const QUAD_SWEEP_BIASED = new Set([
  'Hack Squat Machine', 'Barbell Front Squat', 'Front Squat (Dumbbell)',
  'Smith Machine Front Squat', 'Cyclist Squat', 'Heel-Elevated Squat',
  'Pendulum Squat', 'Leg Press (Narrow Stance)', 'Sissy Squat',
  'Sissy Squat Machine', 'Spanish Squat',
]);

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

function buildRegistry() {
  const map = new Map();
  const add = (names, family) => { for (const n of names) map.set(n, family); };
  add(BACK_VERTICAL_PULL, FAMILY.VERTICAL_PULL);
  add(BACK_HORIZONTAL_LAT, FAMILY.HORIZONTAL_LAT);
  add(BACK_UPPER_MID_ROW, FAMILY.UPPER_MID_ROW);
  add(BACK_SHOULDER_EXTENSION, FAMILY.SHOULDER_EXTENSION);
  add(BACK_SPINAL_ERECTOR, FAMILY.SPINAL_ERECTOR);
  add(BACK_FACE_PULL, FAMILY.FACE_PULL);
  add(QUAD_KNEE_EXTENSION, FAMILY.KNEE_EXTENSION);
  return map;
}

const REGISTRY = buildRegistry();

// The families each classified muscle may legitimately carry. Used to tell
// an ALREADY-CORRECT stored tag from a legacy one, so a caller holding only
// a subregion (a synced row, a test fixture) is not silently re-defaulted.
const VALID_FAMILIES = Object.freeze({
  back: new Set([
    FAMILY.VERTICAL_PULL, FAMILY.HORIZONTAL_LAT, FAMILY.UPPER_MID_ROW,
    FAMILY.SHOULDER_EXTENSION, FAMILY.SPINAL_ERECTOR, FAMILY.FACE_PULL,
  ]),
  quads: new Set([FAMILY.SQUAT_PRESS, FAMILY.KNEE_EXTENSION]),
});

/** Exported for the curation guard test, not for selection. */
export const FAMILY_LISTS = Object.freeze({
  BACK_VERTICAL_PULL, BACK_HORIZONTAL_LAT, BACK_UPPER_MID_ROW,
  BACK_SHOULDER_EXTENSION, BACK_SPINAL_ERECTOR, BACK_FACE_PULL,
  QUAD_KNEE_EXTENSION,
});

/** The muscles whose coverage this module re-classifies by name. */
export const CLASSIFIED_MUSCLES = Object.freeze(['back', 'quads']);

/**
 * The movement family of an exercise.
 *
 * Back and quads resolve from the curated lists above, because their
 * classification is the thing being corrected. Every other muscle passes
 * its existing subregion straight through: those vocabularies are already
 * right, already in the database and already drive user-facing copy.
 *
 * The back default is deliberately UPPER_MID_ROW rather than a lat family:
 * an unclassified back exercise must never be able to satisfy a vertical
 * pull or claim to be lat work it may not be.
 *
 * @param {string} name       canonical exercise name
 * @param {string} muscle     primary muscle
 * @param {string|null} subregion  the library/POOL tag, used for pass-through muscles
 * @returns {string|null}
 */
export function movementFamily(name, muscle, subregion = null) {
  const known = name ? REGISTRY.get(name) : undefined;
  if (known) return known;

  const valid = VALID_FAMILIES[muscle];
  if (valid) {
    // An already-corrected tag is trusted. Without this a caller holding a
    // row but not its name - a synced record, a fixture - would have a
    // correct family silently replaced by the muscle default.
    if (subregion && valid.has(subregion)) return subregion;
    // Otherwise the tag is legacy (`lower_lat`, `horizontal_row`, `sweep`)
    // or absent. Back defaults to the upper-back row deliberately: an
    // unclassified back exercise must never be able to satisfy a vertical
    // pull or claim to be lat work it may not be. A quad-primary movement
    // that is not one of the listed knee-extension lifts is a loaded squat
    // or press pattern.
    return muscle === 'back' ? FAMILY.UPPER_MID_ROW : FAMILY.SQUAT_PRESS;
  }

  return subregion ?? null;
}

/** Does this division-level emphasis token describe a knee-forward quad lift? */
export function isSweepBiased(name) {
  return QUAD_SWEEP_BIASED.has(name);
}

// ---------------------------------------------------------------------------
// Calm, non-clinical display labels (D107-2 injury/constraint layer)
// ---------------------------------------------------------------------------
// A user avoiding a movement PATTERN never sees the raw key ('vertical_pull').
// Covers every FAMILY constant plus the subregion vocabularies the pass-
// through muscles use (movementFamily() returns these verbatim for any
// muscle outside CLASSIFIED_MUSCLES), so a constraint set against ANY
// muscle's pattern - not just back/quads - still renders in plain English.
// Anything genuinely unlisted (a future subregion tag) falls back to the raw
// key with underscores turned to spaces rather than ever going unlabelled.
const FAMILY_LABELS = Object.freeze({
  [FAMILY.VERTICAL_PULL]: 'vertical pulling',
  [FAMILY.HORIZONTAL_LAT]: 'lat-biased rowing',
  [FAMILY.UPPER_MID_ROW]: 'upper-back rowing',
  [FAMILY.SHOULDER_EXTENSION]: 'straight-arm pulldown work',
  [FAMILY.SPINAL_ERECTOR]: 'deadlifting and back extensions',
  [FAMILY.FACE_PULL]: 'face pulls',
  [FAMILY.SQUAT_PRESS]: 'squatting and pressing',
  [FAMILY.KNEE_EXTENSION]: 'knee extension work',
  [FAMILY.FLAT]: 'flat pressing',
  [FAMILY.INCLINE]: 'incline pressing',
  [FAMILY.DECLINE]: 'decline pressing',
  [FAMILY.HIP_EXTENSION]: 'hip extension work',
  [FAMILY.KNEE_FLEXION]: 'knee flexion work',
  [FAMILY.GASTRO]: 'straight-knee calf raises',
  [FAMILY.SOLEUS]: 'bent-knee calf raises',
  [FAMILY.TRICEPS_OVERHEAD]: 'overhead triceps extensions',
  [FAMILY.TRICEPS_PUSHDOWN]: 'triceps pushdown work',
  // Pass-through subregion vocabularies from movementFamily.js's other
  // muscles (side/rear/front delts, biceps, glutes, abs), not part of the
  // FAMILY enum above because those muscles were never re-taxonomised - the
  // raw tag already passes straight through movementFamily().
  overhead_press: 'overhead pressing',
  lateral_raise: 'lateral raises',
  side: 'lateral raises',
  press: 'overhead pressing',
  horiz_abduction: 'rear-delt raises',
  long_head: 'long-head biceps work',
  short_head: 'short-head biceps work',
  brachialis: 'brachialis work',
  activator: 'glute activation work',
  stretcher: 'glute stretch-position work',
  pumper: 'glute pump-range work',
  flexion: 'ab flexion work',
  anti_extension: 'anti-extension core work',
  anti_rotation: 'anti-rotation core work',
});

/**
 * Calm, non-clinical display label for a movementFamily key. Never returns
 * the raw enum value unlabelled - an unrecognised key still gets its
 * underscores turned to spaces rather than being shown verbatim.
 * @param {string|null} familyKey
 * @returns {string|null}
 */
export function familyLabel(familyKey) {
  if (!familyKey) return null;
  return FAMILY_LABELS[familyKey] ?? String(familyKey).replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Coverage roles
// ---------------------------------------------------------------------------

/**
 * ROLE -> the families that honestly satisfy it.
 *
 * Only muscles whose role is broader than a single family need an entry;
 * everything else is a one-to-one match handled by the fallback in
 * familySatisfiesRole.
 *
 * Back's `horizontal_row` role accepts EITHER row family, because both are
 * genuine horizontal pulling. The families still differ for redundancy, so
 * a second back slot after a lat row prefers an upper-back row rather than
 * another lat row.
 */
export const COVERAGE_ROLES = Object.freeze({
  back: Object.freeze({
    vertical_pull: [FAMILY.VERTICAL_PULL],
    horizontal_row: [FAMILY.HORIZONTAL_LAT, FAMILY.UPPER_MID_ROW],
  }),
});

/**
 * Does an exercise in `family` satisfy the coverage `role` for `muscle`?
 *
 * Unmapped roles fall back to exact family equality, which is what every
 * already-correct muscle needs.
 */
export function familySatisfiesRole(muscle, role, family) {
  if (!role || !family) return false;
  const families = COVERAGE_ROLES[muscle]?.[role];
  if (families) return families.includes(family);
  return role === family;
}

/**
 * CONTESTED classifications, recorded rather than silently decided.
 *
 * Each of these is a real exercise whose family depends on how it is
 * performed - grip, handle, elbow path - which is information a generated
 * plan does not have. Every one is held at the classification that is
 * SAFEST for coverage: if the call is wrong, the plan contains an extra
 * honest movement rather than a missing one.
 */
export const CONTESTED = Object.freeze([
  {
    name: 'T-Bar Row',
    heldAt: FAMILY.HORIZONTAL_LAT,
    argument: 'Performed with the close neutral handle it is lat-biased, which is the default implementation in most gyms. With a wide pronated handle it is an upper-back row. Held at lat-biased because the close handle is what is bolted to the machine.',
  },
  {
    name: 'Barbell Row (Bent Over)',
    heldAt: FAMILY.UPPER_MID_ROW,
    argument: 'The pronated shoulder-width default flares the elbow and loads the mid back. The supinated version is a separate library entry and is classified lat-biased, so both readings exist as distinct exercises rather than one ambiguous tag.',
  },
  {
    name: 'Seated Cable Row',
    heldAt: FAMILY.HORIZONTAL_LAT,
    argument: 'The close neutral V-handle is the standard attachment and is lat-biased. The wide-grip cable row is a separate entry classified as an upper-back row.',
  },
  {
    name: 'Machine Row (Chest Supported)',
    heldAt: FAMILY.HORIZONTAL_LAT,
    argument: 'Most chest-supported machines offer both handles. Held lat-biased because the neutral narrow handle is the more common default, and because the wide plate-loaded and seated-wide machines are separately classified.',
  },
  {
    name: 'Renegade Row',
    heldAt: FAMILY.UPPER_MID_ROW,
    argument: 'Arguably an anti-rotation core movement carrying a row rather than a back exercise at all. Left in the back taxonomy at the upper-back reading because that is where the library puts it; it is SPECIALIST for auto-generation regardless.',
  },
  {
    name: 'Wall Sit',
    heldAt: FAMILY.KNEE_EXTENSION,
    argument: 'An isometric with no hip travel under load, so it groups with knee extension rather than the squat pattern. It is bodyweight endurance work and rarely generated, so the call has little practical reach.',
  },
  {
    name: 'Glute-Ham Raise Machine',
    heldAt: FAMILY.HIP_EXTENSION,
    argument: 'A true GHD glute-ham raise is knee-flexion dominant, but many gyms call their 45-degree hip-extension bench the glute-ham machine, and the library already carries a separate `Glute Ham Raise` classified as knee flexion. Left at hip extension because it is the ONLY machine-profile hip-extension hamstring movement in the library: reclassifying it starves a machines-only user of hamstring hip extension entirely, which is a worse error than an arguable tag.',
  },
  {
    name: 'Barbell Upright Row (Wide)',
    heldAt: FAMILY.UPPER_MID_ROW,
    argument: 'Library-tagged back-primary, though it is as much a trap and side-delt movement. Kept in the upper-back family rather than moved between muscles, which would be a library change beyond this job.',
  },
]);
