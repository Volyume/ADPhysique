/**
 * catalogue.js -- D219 lane B1: the standard exercise catalogue.
 *
 * Authority: register D219 (the founder's words: "the most standard exercises
 * that are available in all gyms. No random selection of complex exercises out
 * the box that aren't very well known. Users can swap exercises as they wish
 * but I don't want users looking and wondering what this exercise actually
 * is"), the design docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md section 4.7, and the evidence report 03-SCIENCE.md
 * Q12 and F13 in the same folder ("S Q12" below).
 *
 * WHAT IT IS. A curated list, per muscle, of roles in order (a first choice, a
 * second choice, and a third only when a session needs one). Each role names
 * corpus exercises in preference order. The order encodes the design's
 * tie-break among equivalent variants: the evidence-preferred or lengthened
 * position variant first where a trial names one, then equipment order
 * (barbell, dumbbell, machine, cable). The library's alphabetical position is
 * never a term. Every name a plan picks without being asked is a STAPLE row of
 * the canonicality registry (a test pins it); the exceptions are the opt-in
 * muscles (adductors, forearms, neck, tibialis, trained only when the person
 * adds them), the thin-kit fallbacks below, which are never below COMMON, and the
 * glutes' kickbacks and bridges (COMMON rows, named in catalogue.test.js: the
 * corpus has only two STAPLE glute-primary rows a gym carries, the barbell and
 * the machine hip thrust, and lead ruling 1 asks for at least three choices).
 *
 * ROLE FIELDS. id, rank (1 first choice, 2 second, 3 third; 4 and 5 only for the
 * quads' lunge and the glutes' kickback and bridge, lane B8), names, credited
 * (a role the design marks "credited from": the muscle's first choice is
 * indirect, the half credit it gets from other exercises, so the role has no
 * exercise of its own), optIn, credits (the fractional set one set of the
 * role gives each OTHER muscle, below), reason, grade (S's A to D) and source
 * (a line a person can read behind the rule). The reason reads beside the
 * exercise name and does not repeat it; it is one plain sentence, no stronger
 * than the grade (a D-graded role gets a plain description, never a claimed
 * result), and never an instruction (D204).
 *
 * CREDITS (lead ruling, D219 lane B7, D33). They follow ONE curated rule, by
 * the role an exercise fills, every equipment variant of the role included; the
 * corpus's own secondary muscles are never read, because the corpus credits
 * rear-delt flyes to back, squats to hamstrings and hip thrusts to quads, which
 * made the planner give back 4 direct sets a week. At half a set each: flat and
 * incline presses credit the triceps and front delts; the overhead press, the
 * triceps and side delts; vertical pulls, the biceps (the wide-grip pulldown the
 * rear delts as well); rows, the biceps, rear delts and traps; squats, the hack
 * squat and the leg press, the glutes and adductors; the Romanian deadlift and
 * other hinges, the glutes; the hip thrust and the bridge, the hamstrings; a
 * lunge or split squat, a quads choice, the glutes; a press listed under
 * triceps (the close-grip bench press, a dip, a diamond push-up), the chest and
 * front delts. Every isolation exercise credits nothing, and an exercise counts
 * 1 for the muscle its role trains.
 *
 * ONE ATTRIBUTION (D219 lane B8, lead ruling 1). Every choice is listed under
 * the muscle the rest of the app counts it for: its primary muscle in the corpus,
 * the one exercise/volumeAudit.countDeliveredSets and the heatmap read. A plan's
 * volume claim and the sets its saved rows deliver are then the same number
 * (campaign16.volumeIntegrity). The design's table listed the walking lunge and
 * the Bulgarian split squat as the glutes' third choice; the corpus counts both
 * for the quads, so they are a quads choice (its last role) and the glutes' own
 * extra choices are glute-primary rows (catalogue.test.js pins both).
 *
 * A THIN-KIT STAND-IN carries the credits of its OWN movement pattern, not of
 * the role it stands in for (lead ruling 2, lane B7 follow-up): a Bulgarian
 * split squat standing in for the leg extension credits the glutes, a dip
 * standing in for the overhead extension credits the chest and front delts.
 * Where its movement is the role's (a goblet squat for the squat, a push-up for
 * the flat press) the two are the same. A role whose names are of two kinds (the
 * back's third choice, a pulldown or a row; a role with such stand-ins) says so
 * in creditsByName. src/lib/plan/__tests__/fixtures/choices.js is the first
 * rule written out for the planner's tests, and the catalogue suite pins that
 * the two agree.
 *
 * THIN KITS. The six equipment profiles are exerciseMetadata.js's (full_gym,
 * machines_cables, dumbbells_only, barbell_plates, home_gym, bodyweight). Where
 * a profile carries NO listed name for a first or second choice, THIN_KIT may
 * name recognisable COMMON-or-better rows instead. Each is marked thinKit
 * true and the lead rules on every one. Nothing falls back silently, and
 * never to NICHE, NEVER_AUTO or SPECIALIST rows (opt-in muscles aside). Where
 * no recognisable row exists at all, the role resolves to nothing and the
 * planner reports it.
 *
 * resolveCatalogue turns the library and the person's equipment profile into,
 * per muscle, an ordered array of the chosen exercises (catalogue order,
 * credited roles left out). Among a role's names that exist in the library and
 * carry the profile, the person's own logged exercise comes first (the
 * repeated-bout effect, S Q5), else the first in order. A name chosen for one
 * role is not chosen again for another role of the same muscle.
 *
 * Pure: no I/O, no clock, no randomness, and no imports. This module may sit
 * under check-in placement, which coachApply.js reaches, so it must never
 * reach src/lib/recovery/ (edIsolation.guard.test.js). Its one small
 * derivation, the pool's paramKey, copies poolGenerator.deriveParamKey rule for
 * rule; catalogue.test.js pins it against the original.
 */

// The curated credits (header, CREDITS), frozen and shared: resolveCatalogue and
// catalogueCredits hand out copies.
const credit = (map) => Object.freeze({ ...map });
const NO_CREDITS = credit({});
const PRESS_CREDITS = credit({ triceps: 0.5, front_delts: 0.5 });
const OVERHEAD_PRESS_CREDITS = credit({ triceps: 0.5, side_delts: 0.5 });
const VERTICAL_PULL_CREDITS = credit({ biceps: 0.5 });
const WIDE_GRIP_PULLDOWN_CREDITS = credit({ biceps: 0.5, rear_delts: 0.5 });
const ROW_CREDITS = credit({ biceps: 0.5, rear_delts: 0.5, traps: 0.5 });
const SQUAT_CREDITS = credit({ glutes: 0.5, adductors: 0.5 });
const HINGE_CREDITS = credit({ glutes: 0.5 });
const HIP_THRUST_CREDITS = credit({ hamstrings: 0.5 });
// A lunge or split squat is a quads choice and credits the glutes (header, CREDITS).
const LUNGE_CREDITS = credit({ glutes: 0.5 });
const TRICEPS_PRESS_CREDITS = credit({ chest: 0.5, front_delts: 0.5 });

// A role the person reads about, in one line. Frozen so a consumer cannot edit
// the table by accident.
function role(id, rank, names, extra) {
  return Object.freeze({
    id,
    rank,
    names: Object.freeze([...names]),
    credited: false,
    optIn: false,
    credits: NO_CREDITS,
    ...extra,
  });
}

// A "credited from" role: the muscle's first choice is the half credit it
// gets from other exercises, so there is nothing to choose.
function creditedRole(id, extra) {
  return role(id, 1, [], { credited: true, ...extra });
}

const NO_TRIAL = (what) => `No growth trial found for ${what}; chosen for what the movement does`;

// ── The catalogue ────────────────────────────────────────────────────────
// Muscle keys are algorithms.js VOLUME_LANDMARKS keys, the same vocabulary as
// src/lib/plan/roles.js.
export const CATALOGUE_MUSCLES = Object.freeze([
  'chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'traps',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs',
  'neck', 'tibialis',
]);

export const CATALOGUE_PROFILES = Object.freeze([
  'full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight',
]);

const VERTICAL_PULL_NAMES = ['Lat Pulldown (Wide Grip)', 'Pull-Up', 'Chin-Up', 'Lat Pulldown (Neutral Grip)'];
// A pulldown and a pull-up credit the biceps; the wide-grip pulldown the rear
// delts as well. Shared by the vertical pull and the back's third choice, whose
// names are of both kinds, so a name has one set of credits wherever it is listed.
const VERTICAL_PULL_CREDITS_BY_NAME = Object.freeze(Object.fromEntries(VERTICAL_PULL_NAMES.map((n) => [
  n, n === 'Lat Pulldown (Wide Grip)' ? WIDE_GRIP_PULLDOWN_CREDITS : VERTICAL_PULL_CREDITS,
])));
// The thin-kit stand-ins whose own movement is not the role's they stand in for
// (THIN_KIT below): lunges and split squats stand in for the quads' leg extension
// and squat, and dips and a diamond push-up for the triceps' extensions. Each
// carries its own movement's credits (header, CREDITS). Every other stand-in's
// movement is its role's.
const lungesUnderQuads = (...names) => Object.freeze(Object.fromEntries(names.map((n) => [n, LUNGE_CREDITS])));
const pressesUnderTriceps = (...names) => Object.freeze(Object.fromEntries(names.map((n) => [n, TRICEPS_PRESS_CREDITS])));
const HORIZONTAL_ROW_NAMES = [
  'Seated Cable Row', 'Chest-Supported Row (Dumbbell)', 'Machine Row (Chest Supported)',
  'Barbell Row (Bent Over)', 'Dumbbell Row',
];
const SQUAT_OR_PRESS_NAMES = ['Barbell Back Squat', 'Hack Squat Machine', 'Leg Press'];

export const CATALOGUE = Object.freeze({
  // Chest: flat press, incline press, then a fly only when a session needs it.
  chest: Object.freeze([
    role('flat_press', 1, ['Barbell Bench Press', 'Dumbbell Bench Press', 'Machine Chest Press'], {
      credits: PRESS_CREDITS,
      reason: 'The standard flat press; in a 10-week trial of healthy men, bench pressing grew the chest, the front of the shoulder and the triceps.',
      grade: 'B',
      source: 'Lanza 2024: 10-week bench press trial in healthy men (S Q12)',
    }),
    role('incline_press', 2, ['Incline Dumbbell Press', 'Incline Barbell Bench Press', 'Incline Machine Press'], {
      credits: PRESS_CREDITS,
      reason: 'Covers the upper chest, which flat pressing reaches less; in an 8-week trial of untrained men, incline pressing grew the upper chest more.',
      grade: 'B',
      source: 'Chaves 2020: 8-week trial in 47 untrained men (S Q12)',
    }),
    role('chest_fly', 3, ['Pec Deck (Machine Fly)', 'Cable Crossover (High to Low)'], {
      reason: 'A fly movement that works the chest without the triceps; fly exercises have not been tested against presses for growth.',
      grade: 'D',
      source: NO_TRIAL('fly exercises'),
    }),
  ]),

  // Back: a vertical pull and a row; the third is the other variant of either.
  back: Object.freeze([
    role('vertical_pull', 1, VERTICAL_PULL_NAMES, {
      credits: VERTICAL_PULL_CREDITS,
      creditsByName: VERTICAL_PULL_CREDITS_BY_NAME,
      reason: 'A vertical pull works the lats and the width of the back; no trial has compared back exercises for growth, so it is chosen for what the movement does.',
      grade: 'D',
      source: NO_TRIAL('back exercises'),
    }),
    role('horizontal_row', 2, HORIZONTAL_ROW_NAMES, {
      credits: ROW_CREDITS,
      reason: 'A row works the lats and upper back from a different angle to a pulldown; no trial has compared back exercises for growth, so it is chosen for what the movement does.',
      grade: 'D',
      source: NO_TRIAL('back exercises'),
    }),
    role('other_pull', 3, [...VERTICAL_PULL_NAMES, ...HORIZONTAL_ROW_NAMES], {
      credits: ROW_CREDITS, // the rows; the pulls are in creditsByName
      creditsByName: VERTICAL_PULL_CREDITS_BY_NAME,
      reason: 'A second pulling angle for the back; no trial has compared back exercises for growth, so it is chosen for what the movement does.',
      grade: 'D',
      source: NO_TRIAL('back exercises'),
    }),
  ]),

  // Side delts: one variant is enough (S Q12); the second names the cable and
  // machine versions, which grew the muscle as much as the dumbbell raise.
  side_delts: Object.freeze([
    role('lateral_raise', 1, ['Dumbbell Lateral Raise'], {
      reason: 'Raising the arms out to the side works the side of the shoulder; dumbbell and cable raises grew it equally in an 8-week trial of 24 resistance-trained people.',
      grade: 'B',
      source: 'Larsen 2025: 8-week trial in 24 resistance-trained people (S Q12)',
    }),
    role('lateral_raise_alt', 2, ['Cable Lateral Raise', 'Machine Lateral Raise'], {
      reason: 'The same movement on a cable or machine; dumbbell and cable raises grew the side of the shoulder equally in an 8-week trial of 24 resistance-trained people.',
      grade: 'B',
      source: 'Larsen 2025: 8-week trial in 24 resistance-trained people (S Q12)',
    }),
  ]),

  rear_delts: Object.freeze([
    role('reverse_fly', 1, ['Reverse Pec Deck'], {
      reason: 'Moving the arms back and out works the rear of the shoulder; no growth trial was found for rear-shoulder exercises, so it is chosen for what the movement does.',
      grade: 'D',
      source: NO_TRIAL('rear-shoulder exercises'),
    }),
    role('rear_delt_alt', 2, ['Face Pull', 'Dumbbell Rear Delt Fly'], {
      reason: 'Pulling towards the face works the rear of the shoulder and the upper back; no growth trial was found, so it is chosen for what the movement does.',
      reasonByName: Object.freeze({
        'Dumbbell Rear Delt Fly': 'Raising dumbbells out to the sides while bent over works the rear of the shoulder; no growth trial was found, so it is chosen for what the movement does.',
      }),
      grade: 'D',
      source: NO_TRIAL('rear-shoulder exercises'),
    }),
  ]),

  // Front delts: credited from presses; an overhead press only if wanted.
  front_delts: Object.freeze([
    creditedRole('front_credit', {
      reason: 'The front of the shoulder gets about half a set from every press, and 10 weeks of bench pressing grew it in a trial of healthy men.',
      grade: 'B',
      source: 'Lanza 2024: 10-week bench press trial in healthy men (S Q12)',
    }),
    role('overhead_press', 2, ['Barbell Overhead Press', 'Dumbbell Shoulder Press', 'Machine Shoulder Press'], {
      credits: OVERHEAD_PRESS_CREDITS,
      reason: 'Pressing overhead works the front of the shoulder directly, on top of the half credit it gets from chest presses; no trial has tested direct front-shoulder work.',
      grade: 'D',
      source: NO_TRIAL('direct front-shoulder work'),
    }),
  ]),

  traps: Object.freeze([
    role('shrug', 1, ['Dumbbell Shrug', 'Barbell Shrug'], {
      reason: 'Shrugging the shoulders towards the ears works the upper traps; no growth trial was found for shrugs, so it is chosen for what the movement does.',
      grade: 'D',
      source: NO_TRIAL('shrugs'),
    }),
  ]),

  // Biceps: the preacher curl is the evidence-preferred first choice.
  biceps: Object.freeze([
    role('preacher_curl', 1, ['EZ Bar Preacher Curl', 'Preacher Curl (Dumbbell)', 'Preacher Curl Machine', 'Preacher Curl (Barbell)'], {
      reason: 'Curling with the upper arm supported in front; in a 9-week trial of 38 recreationally trained women, preacher curls grew the lower part of the biceps and incline curls grew none.',
      grade: 'B',
      source: 'Zabaleta-Korta 2023 (38 women, 9 weeks); Pedrosa 2023; Nunes 2020; Attarieh 2025 (S Q12)',
    }),
    role('standing_curl', 2, ['Barbell Curl', 'Dumbbell Curl', 'Cable Curl'], {
      reason: 'A standing curl works the whole biceps; in an 8-week trial of 10 untrained men, curling grew the muscles that bend the elbow about twice as much as rowing did.',
      grade: 'B',
      source: 'Mannarino 2021: 8-week trial in 10 untrained men (S Q12)',
    }),
    role('hammer_curl', 3, ['Hammer Curl'], {
      reason: 'Curling with the palms facing each other shares the work between the biceps and the forearm muscles; no growth trial was found for it.',
      grade: 'D',
      source: NO_TRIAL('hammer curls'),
    }),
  ]),

  // Triceps: the overhead extension is the evidence-preferred first choice.
  triceps: Object.freeze([
    role('overhead_extension', 1, ['Cable Overhead Tricep Extension', 'Dumbbell Overhead Tricep Extension'], {
      creditsByName: pressesUnderTriceps('Bench Dip', 'Tricep Dip (Parallel Bars)'),
      reason: 'Extending the elbow with the arm overhead works the long head of the triceps at a long length; in a 12-week trial of 21 adults it grew the triceps more than a neutral-arm extension (about 20% against 14%).',
      grade: 'B',
      source: 'Maeo 2023: 12-week trial in 21 adults (S Q12)',
    }),
    role('pushdown', 2, ['Tricep Pushdown (Rope)', 'Tricep Pushdown (Bar)'], {
      creditsByName: pressesUnderTriceps('Diamond Push-Up'),
      reason: 'Extending the elbow with the arm by your side works the lateral and medial triceps; in a 12-week trial this neutral-arm version grew the triceps about 14%.',
      grade: 'B',
      source: 'Maeo 2023: the neutral-arm comparison in a 12-week trial in 21 adults (S Q12)',
    }),
    role('close_grip_press', 3, ['Close-Grip Bench Press'], {
      credits: TRICEPS_PRESS_CREDITS,
      reason: 'Pressing with a close grip gives the triceps more of the work than a standard bench press, with the chest and front of the shoulder helping; no trial has measured triceps growth from it.',
      grade: 'D',
      source: NO_TRIAL('the close-grip bench press'),
    }),
  ]),

  // Quads: a squat or press to depth, the leg extension, then the other squat variant.
  quads: Object.freeze([
    role('squat_or_press', 1, SQUAT_OR_PRESS_NAMES, {
      credits: SQUAT_CREDITS,
      creditsByName: lungesUnderQuads('Bodyweight Split Squat'),
      reason: 'Squatting or pressing to depth works the muscles at the front of the thigh; a deep squat grew the front thigh 4 to 7% more than a shallow one in a 12-week trial of 17 men.',
      grade: 'B',
      source: 'Bloomquist 2013 (17 men, 12 weeks); Kubo 2019; Kinoshita 2026 (S Q12)',
    }),
    role('leg_extension', 2, ['Leg Extension'], {
      creditsByName: lungesUnderQuads(
        'Bulgarian Split Squat', 'Barbell Lunge', 'Split Squat', 'Bodyweight Reverse Lunge', 'Bodyweight Walking Lunge',
      ),
      reason: 'Works the rectus femoris, the part of the thigh a squat or leg press reaches less; in a 12-week trial of 17 untrained adults it grew about 13% against about 1% for the leg press.',
      grade: 'B',
      source: 'Kinoshita 2026: 12-week trial in 17 untrained adults; Kassiano 2026 (S Q12)',
    }),
    // The leg press first: it is in nearly every gym and it credits the glutes.
    role('other_squat', 3, ['Leg Press', 'Hack Squat Machine', 'Barbell Back Squat'], {
      credits: SQUAT_CREDITS,
      reason: 'A second squat or press variant for the front of the thigh; a deep squat grew the front thigh 4 to 7% more than a shallow one in a 12-week trial of 17 men.',
      grade: 'B',
      source: 'Bloomquist 2013 (17 men, 12 weeks); Kubo 2019; Kinoshita 2026 (S Q12)',
    }),
    // The design listed these two as the glutes' third choice; the corpus counts
    // both for the quads (header, ONE ATTRIBUTION), so they are a quads choice
    // that credits the glutes. A fourth role: a session never needs it in the
    // full gym, but a kit with no squat or press (dumbbells, a home gym) gets a
    // third quads exercise from it.
    role('lunge', 4, ['Walking Lunge', 'Bulgarian Split Squat'], {
      credits: LUNGE_CREDITS,
      reason: 'A lunge or split squat works the front of the thigh and the glutes together; no trial has measured thigh growth from it.',
      grade: 'D',
      source: NO_TRIAL('lunges and split squats'),
    }),
  ]),

  // Hamstrings: the seated curl first, a hip hinge second (in another session).
  hamstrings: Object.freeze([
    role('leg_curl', 1, ['Seated Leg Curl', 'Lying Leg Curl'], {
      reason: 'Works the hamstrings at a long length; in a 12-week trial of 20 adults the seated leg curl grew them about 14% against about 9% for the lying leg curl.',
      reasonByName: Object.freeze({
        'Lying Leg Curl': 'Bends the knee against resistance to work the hamstrings; the seated leg curl grew them more in a 12-week trial (about 14% against 9%), and the lying curl stands in where there is no seated machine.',
      }),
      grade: 'B',
      source: 'Maeo 2021: 12-week trial in 20 adults; Maeo 2024 (S Q12)',
    }),
    role('hip_hinge', 2, ['Romanian Deadlift (Barbell)', 'Romanian Deadlift (Dumbbell)'], {
      credits: HINGE_CREDITS,
      reason: 'Hinging at the hips works the hamstrings where they cross the hip, which a leg curl does not; a close relative, the stiff-leg deadlift, grew them about 7% in a 9-week trial of untrained adults.',
      grade: 'B',
      source: 'Morin 2025: 9-week trial in untrained adults, stiff-leg deadlift (S Q12)',
    }),
  ]),

  // Glutes: credited from squats and leg presses, then the hip thrust, and then
  // glute-primary variants only (ONE ATTRIBUTION, header): the other hip thrust,
  // a kickback, a bridge. A full gym gets four choices, every other kit one to
  // two as far as the corpus has a standard glute row that carries it.
  glutes: Object.freeze([
    creditedRole('glute_credit', {
      reason: 'The glutes get about half a set from every squat and leg press, and the leg press grew the gluteus maximus about 15% in a 12-week trial of untrained adults.',
      grade: 'B',
      source: 'Kinoshita 2026: 12-week trial in untrained adults; Kubo 2019 (S Q12)',
    }),
    role('hip_thrust', 2, ['Barbell Hip Thrust', 'Machine Hip Thrust'], {
      credits: HIP_THRUST_CREDITS,
      reason: 'Works the glutes at the top of the movement; in a 9-week trial of 34 untrained adults the hip thrust and the back squat grew the glutes by a similar amount.',
      grade: 'B',
      source: 'Plotkin 2023: 9-week trial in 34 untrained adults (S Q12)',
    }),
    // The other of the two: the full gym trains the barbell version in one session
    // and the machine in the next (the planner takes a muscle's first two choices
    // in turn).
    role('other_hip_thrust', 3, ['Machine Hip Thrust', 'Barbell Hip Thrust'], {
      credits: HIP_THRUST_CREDITS,
      reason: 'The other hip thrust variant, for a second glutes session; in a 9-week trial of 34 untrained adults the hip thrust and the back squat grew the glutes by a similar amount.',
      grade: 'B',
      source: 'Plotkin 2023: 9-week trial in 34 untrained adults (S Q12)',
    }),
    // A single-joint exercise, so it credits nothing.
    role('glute_kickback', 4, ['Glute Kickback Machine', 'Cable Kickback'], {
      reason: 'A kickback works the glutes on their own, with no other muscle sharing the work; no growth trial was found for it.',
      grade: 'D',
      source: NO_TRIAL('glute kickbacks'),
    }),
    // The same movement as the hip thrust from the floor; the three names carry
    // three different kits (barbell, dumbbells, bodyweight).
    role('glute_bridge', 5, ['Barbell Glute Bridge', 'Dumbbell Glute Bridge', 'Glute Bridge'], {
      credits: HIP_THRUST_CREDITS,
      reason: 'A glute bridge lifts the hips from the floor and works the glutes; no growth trial was found for it.',
      grade: 'D',
      source: NO_TRIAL('glute bridges'),
    }),
  ]),

  // Calves: standing (full stretch), seated, then the leg press calf raise.
  calves: Object.freeze([
    role('standing_calf', 1, ['Standing Calf Raise (Machine)'], {
      reason: 'Raising the heels with the knee straight works the gastrocnemius; in a 12-week trial of 14 untrained adults it grew the outer calf about 12% against about 2% for the seated raise.',
      grade: 'B',
      source: 'Kinoshita 2023: 12-week trial in 14 untrained adults; Kassiano 2023 (S Q12)',
    }),
    role('seated_calf', 2, ['Seated Calf Raise', 'Seated Machine Calf Raise'], {
      reason: 'Raising the heels with the knee bent is meant to put more of the work on the soleus, the deeper calf muscle; that is its design, not a measured advantage.',
      grade: 'D',
      source: 'Theory only: the soleus emphasis has not been measured (S Q12)',
    }),
    role('leg_press_calf', 3, ['Leg Press Calf Raise'], {
      reason: 'Raising the heels on the leg press with the knee straight, the same position as a standing calf raise; no trial has measured it on its own.',
      grade: 'D',
      source: NO_TRIAL('the leg press calf raise'),
    }),
  ]),

  // Abs: only acute (single session) data exists, so these are plain descriptions.
  abs: Object.freeze([
    role('loaded_crunch', 1, ['Cable Crunch', 'Machine Crunch'], {
      reason: 'Curling the ribs towards the hips under load works the upper abs; an ultrasound study of 15 people showed this in a single session, and no trial has measured growth.',
      grade: 'C',
      source: 'Gomirato 2023: single-session ultrasound study in 15 people (S Q12)',
    }),
    role('hanging_raise', 2, ['Hanging Knee Raise', 'Hanging Leg Raise'], {
      reason: 'Raising the knees or legs while hanging works the lower abs; an ultrasound study of 15 people showed this in a single session, and no trial has measured growth.',
      grade: 'C',
      source: 'Gomirato 2023: single-session ultrasound study in 15 people (S Q12)',
    }),
  ]),

  // ── Opt-in muscles: trained directly only when the person adds them ─────
  forearms: Object.freeze([
    role('wrist_curl', 1, ['Barbell Wrist Curl', 'Dumbbell Wrist Curl', 'Cable Wrist Curl', 'Band Wrist Curl'], {
      optIn: true,
      reason: 'Curling the wrist against a weight works the forearm muscles; no growth trial was found for it, and rows and pulldowns already load the grip.',
      grade: 'D',
      source: NO_TRIAL('wrist curls'),
    }),
  ]),
  adductors: Object.freeze([
    creditedRole('adductor_credit', {
      optIn: true,
      reason: 'The inner thigh gets about half a set from every squat and leg press, and a full squat grew the adductor muscles more than a half squat in a 10-week trial of 17 men.',
      grade: 'B',
      source: 'Kubo 2019: 10-week trial in 17 men; Kinoshita 2026 (S Q12)',
    }),
    role('adduction_machine', 2, ['Hip Adduction Machine'], {
      optIn: true,
      reason: 'Squeezing the legs together against a pad works the inner thigh directly; no growth trial was found for it.',
      grade: 'D',
      source: NO_TRIAL('hip adduction machines'),
    }),
  ]),
  neck: Object.freeze([
    role('neck_machine', 1, ['Neck Flexion (Machine)', 'Neck Extension (Machine)', 'Plate Neck Curl', 'Neck Curl'], {
      optIn: true,
      reason: 'Moving the head against resistance works the neck muscles; no growth trial was found for it.',
      grade: 'D',
      source: NO_TRIAL('neck exercises'),
    }),
  ]),
  tibialis: Object.freeze([
    // The wall raise first: it needs no kit and every profile carries it.
    role('tibialis_raise', 1, ['Tibialis Raise (Wall)', 'Seated Tibialis Raise', 'Dumbbell Tibialis Raise (Seated)'], {
      optIn: true,
      reason: 'Lifting the toes towards the shin works the muscle at the front of the shin; no growth trial was found for it.',
      grade: 'D',
      source: NO_TRIAL('tibialis raises'),
    }),
  ]),
});

// ── Thin kits ────────────────────────────────────────────────────────────
// profile -> muscle -> role id -> names, recognisable COMMON-or-better rows,
// proposed for the lead's ruling. Used only for a first or second choice that
// has no listed name carrying the profile. Where the only candidate would be
// the same movement as an exercise the muscle already has (a second lateral
// raise, a second rear-delt fly) no fallback is offered: one variant is enough
// (S Q12), and the planner's thin-equipment rule carries the sets.
const DUMBBELL_KIT = {
  triceps: { pushdown: ['Dumbbell Skull Crusher'] },
  quads: { squat_or_press: ['Goblet Squat'], leg_extension: ['Bulgarian Split Squat'] },
  glutes: { hip_thrust: ['Dumbbell Hip Thrust', 'Dumbbell Glute Bridge'] },
  calves: { standing_calf: ['Dumbbell Calf Raise (Standing)'], seated_calf: ['Seated Dumbbell Calf Raise'] },
  abs: { loaded_crunch: ['Decline Crunch', 'Weighted Dumbbell Crunch'] },
};

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

export const THIN_KIT = deepFreeze({
  full_gym: {},
  machines_cables: {
    traps: { shrug: ['Cable Shrug', 'Machine Shrug'] },
    hamstrings: { hip_hinge: ['Smith Machine Romanian Deadlift'] },
  },
  dumbbells_only: DUMBBELL_KIT,
  home_gym: DUMBBELL_KIT,
  barbell_plates: {
    // Unloaded and the only recognisable rear-delt row a barbell kit carries:
    // the lead rules on it.
    rear_delts: { reverse_fly: ['Prone Reverse Fly'] },
    triceps: { overhead_extension: ['EZ Bar Skull Crusher'] },
    quads: { leg_extension: ['Barbell Lunge', 'Split Squat'] },
    calves: { standing_calf: ['Standing Calf Raise (Barbell)'], seated_calf: ['Seated Calf Raise (Barbell)'] },
    abs: { loaded_crunch: ['Decline Crunch', 'Weighted Sit-Up'] },
  },
  bodyweight: {
    chest: { flat_press: ['Push-Up', 'Band Chest Press (Single-Arm)'], incline_press: ['Decline Push-Up'] },
    back: { horizontal_row: ['Inverted Row', 'Band Row (Single-Arm)'] },
    rear_delts: {
      reverse_fly: ['Band Pull-Apart', 'Band Rear Delt Fly'],
      rear_delt_alt: ['Band Rear Delt Fly', 'Prone Reverse Fly'],
    },
    front_delts: { overhead_press: ['Pike Push-Up', 'Band Shoulder Press (Seated)'] },
    biceps: {
      preacher_curl: ['Band Standing Curl (Single-Arm)', 'Band Hammer Curl'],
      standing_curl: ['Band Hammer Curl', 'Band Standing Curl (Single-Arm)'],
    },
    triceps: {
      overhead_extension: ['Bench Dip', 'Tricep Dip (Parallel Bars)'],
      pushdown: ['Diamond Push-Up', 'Band Tricep Kickback'],
    },
    quads: {
      squat_or_press: ['Bodyweight Split Squat'],
      leg_extension: ['Bodyweight Reverse Lunge', 'Bodyweight Walking Lunge'],
    },
    hamstrings: { hip_hinge: ['Band Romanian Deadlift (Bilateral)'] },
    glutes: { hip_thrust: ['Single-Leg Glute Bridge', 'Glute Bridge'] },
    // The only calf row of COMMON tier or better that a bodyweight kit carries.
    calves: { standing_calf: ['Donkey Calf Raise'] },
    abs: { loaded_crunch: ['Decline Crunch', 'Crunch'] },
  },
});

// What a person reads for a fallback: a plain fact, no claim about the result.
const MUSCLE_WORDS = Object.freeze({
  chest: 'chest', back: 'back', side_delts: 'side of the shoulder', rear_delts: 'rear of the shoulder',
  front_delts: 'front of the shoulder', traps: 'upper traps', biceps: 'biceps', triceps: 'triceps',
  quads: 'front of the thigh', hamstrings: 'hamstrings', glutes: 'glutes', calves: 'calves', abs: 'abs',
});
const thinKitReason = (muscle) =>
  `A standard exercise for the ${MUSCLE_WORDS[muscle] ?? muscle} that fits your equipment, used because the usual choice needs kit your setup does not include.`;
const THIN_KIT_SOURCE = 'Chosen because it suits your equipment, not from a trial';

// ── Resolver ─────────────────────────────────────────────────────────────

// Every name the catalogue can return, so the library is scanned once.
const CATALOGUE_NAME_SET = (() => {
  const names = new Set();
  for (const roles of Object.values(CATALOGUE)) for (const r of roles) for (const n of r.names) names.add(n);
  for (const byMuscle of Object.values(THIN_KIT)) {
    for (const byRole of Object.values(byMuscle)) for (const list of Object.values(byRole)) for (const n of list) names.add(n);
  }
  return names;
})();

const HEAVY_CATEGORIES = new Set(['barbell', 'landmine']);
const MACHINE_CATEGORIES = new Set(['machine_selectorised', 'machine_plate_loaded']);

// poolGenerator.deriveParamKey, rule for rule.
function paramKeyOf(row) {
  const category = row.equipmentCategory ?? row.equipment_category;
  const compoundIsolation = row.compoundIsolation ?? row.compound_isolation;
  if (compoundIsolation === 'isolation') return 'isolation';
  if (HEAVY_CATEGORIES.has(category)) return 'heavy_compound';
  if (MACHINE_CATEGORIES.has(category)) return 'machine';
  return 'mod_compound';
}

// poolGenerator.parseProfiles: an array, or the JSON string SQLite returns.
function profilesOf(row) {
  const p = row.equipmentProfiles ?? row.equipment_profiles;
  if (Array.isArray(p)) return p;
  if (typeof p === 'string' && p.length) {
    try {
      const parsed = JSON.parse(p);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// The pool admits weight-and-reps and weighted-bodyweight rows only (a
// duration or distance row cannot take an automatic rep prescription).
function hasLoadPrescription(row) {
  const type = row.exerciseType ?? row.exercise_type ?? 'weight_reps';
  return type === 'weight_reps' || type === 'weighted_bodyweight';
}

const isCustomRow = (row) => row.isCustom === true || row.isCustom === 1 || row.is_custom === true || row.is_custom === 1;

// One row per catalogue name, whatever order the library is in: a built-in row
// beats a custom row of the same name, then the lower id.
function indexLibrary(library) {
  const byName = new Map();
  if (!Array.isArray(library)) return byName;
  for (const row of library) {
    if (!row || typeof row.name !== 'string' || !CATALOGUE_NAME_SET.has(row.name)) continue;
    const held = byName.get(row.name);
    if (!held) { byName.set(row.name, row); continue; }
    const a = isCustomRow(row);
    const b = isCustomRow(held);
    if (a !== b) { if (!a) byName.set(row.name, row); continue; }
    if (String(row.id ?? '') < String(held.id ?? '')) byName.set(row.name, row);
  }
  return byName;
}

function toNameSet(names) {
  if (!names) return new Set();
  if (names instanceof Set) return names;
  return new Set(Array.isArray(names) ? names : []);
}

/**
 * @typedef {object} CatalogueChoice
 * @property {string} name            the corpus exercise name
 * @property {string|null} exerciseId the library row's id
 * @property {string} role            the catalogue role id it fills
 * @property {number} rank            1 first choice, 2 second, 3 third, and 4 or 5 for the quads' lunge and the glutes' kickback and bridge (credited roles are left out, so a muscle's first array item is not always rank 1)
 * @property {'heavy_compound'|'mod_compound'|'machine'|'isolation'} kind  the pool's paramKey for the row
 * @property {Object<string, number>} credits  the fractional set one set gives each OTHER muscle: the curated rule for the role (header, CREDITS), never the corpus's secondary muscles; for a bench press { triceps: 0.5, front_delts: 0.5 }
 * @property {number} direct          what one set gives the muscle the role trains: always 1 (lead ruling, D219 lane B7: a lunge, a quads choice, counts a full set for the quads and credits the glutes half a set)
 * @property {string} primaryMuscle   the library row's own primary muscle
 * @property {string} reason          one plain sentence a person reads beside the exercise name
 * @property {'A'|'B'|'C'|'D'} grade  the evidence grade behind the role (03-SCIENCE.md section 0.1)
 * @property {string} source          a line a person can read behind the rule
 * @property {boolean} thinKit        true for a fallback proposed for a kit with no listed name for the role
 * @property {boolean} optIn          true for adductors, forearms, neck and tibialis: trained directly only when the person adds them
 * @property {boolean} logged         true when the person's own logged exercise was chosen
 */

// The curated credits of a name in a role: the role's own, unless the role says
// otherwise for that name. A fresh object, so a caller can never edit the table.
const creditsOfRole = (r, name) => ({ ...(r.creditsByName?.[name] ?? r.credits ?? NO_CREDITS) });

/**
 * The curated credits (header, CREDITS) of `name` as an exercise of `muscle`:
 * the credits of the role of that muscle's catalogue that lists the name, a
 * thin-kit fallback for the role included. A name the muscle's catalogue does
 * not list (an unknown name, an unknown muscle, or a name the catalogue lists
 * under another muscle) gets {}: the same answer for a person's own exercise
 * that the planner is handed in the catalogue's place. A fresh object.
 *
 * @param {string} muscle  a catalogue muscle key
 * @param {string} name    the corpus exercise name
 * @returns {Object<string, number>}
 */
export function catalogueCredits(muscle, name) {
  const roles = CATALOGUE[muscle];
  if (!roles || typeof name !== 'string') return {};
  for (const r of roles) {
    if (r.names.includes(name)) return creditsOfRole(r, name);
    for (const byMuscle of Object.values(THIN_KIT)) {
      if (byMuscle[muscle]?.[r.id]?.includes(name)) return creditsOfRole(r, name);
    }
  }
  return {};
}

/**
 * The standard exercises for the person's equipment profile, per muscle, in
 * catalogue order, credited roles left out.
 *
 * @param {object} args
 * @param {Array<object>} args.library              the exercise library (camelCase rows, or snake_case rows as SQLite returns them)
 * @param {string} [args.profile]                   full_gym, machines_cables, dumbbells_only, barbell_plates, home_gym or bodyweight; full_gym when omitted
 * @param {Iterable<string>} [args.loggedExerciseNames] exercises the person has logged
 * @returns {Object<string, CatalogueChoice[]>} every catalogue muscle has a key; an empty array means no recognisable exercise fits the kit
 */
export function resolveCatalogue({ library, profile, loggedExerciseNames } = {}) {
  const kit = profile == null || profile === '' ? 'full_gym' : String(profile);
  const logged = toNameSet(loggedExerciseNames);
  const rows = indexLibrary(library);
  const thinKit = THIN_KIT[kit] ?? {};
  const out = {};

  for (const muscle of CATALOGUE_MUSCLES) {
    const taken = new Set();
    const chosen = [];

    // Among the names that exist, carry the profile and are not already taken,
    // the person's own logged exercise first, else the first in order.
    const pick = (names) => {
      const usable = names.filter((n) => {
        if (taken.has(n)) return false;
        const row = rows.get(n);
        return !!row && hasLoadPrescription(row) && profilesOf(row).includes(kit);
      });
      if (usable.length === 0) return null;
      const own = usable.find((n) => logged.has(n));
      return own ?? usable[0];
    };

    for (const r of CATALOGUE[muscle]) {
      if (r.credited) continue;
      let name = pick(r.names);
      let fallback = false;
      if (name == null && r.rank <= 2) {
        const names = thinKit[muscle]?.[r.id];
        if (names) {
          name = pick(names);
          fallback = name != null;
        }
      }
      if (name == null) continue;
      taken.add(name);
      const row = rows.get(name);
      chosen.push({
        name,
        exerciseId: row.id ?? null,
        role: r.id,
        rank: r.rank,
        kind: paramKeyOf(row),
        credits: creditsOfRole(r, name),
        direct: 1,
        primaryMuscle: String(row.primaryMuscle ?? row.primary_muscle ?? '').toLowerCase(),
        reason: fallback ? thinKitReason(muscle) : (r.reasonByName?.[name] ?? r.reason),
        grade: fallback ? 'D' : r.grade,
        source: fallback ? THIN_KIT_SOURCE : r.source,
        thinKit: fallback,
        optIn: r.optIn === true,
        logged: logged.has(name),
      });
    }
    out[muscle] = chosen;
  }
  return out;
}
