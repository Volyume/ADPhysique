/**
 * rulebook.js -- D222: the structure engine's rulebook, as data.
 *
 * Authority: the founder's research, docs/audit/plan-builder-map-2026-10-11/
 * 09-RESEARCH-FINDINGS.md (approved as the rulebook, founder 2026-10-11:
 * "2. Yes."), with the corrections and rulings in 10-RESEARCH-VERIFICATION.md
 * and register D222 (R1 to R10), inside the FIXED rules F1 to F6 of
 * 08-RULEBOOK-FRAMEWORK.md. Section numbers below ("09 B3", "09 s5") point
 * into 09. Rulings made while building this file are R11 onwards, each
 * recorded in the register under D222.
 *
 * Grades (09): A = meta-analysis; B = trials; C = indirect or survey
 * evidence; D = coach consensus or design judgement. Every exported value
 * has an entry in EVIDENCE (rulebook.test.js pins it), so a value cannot be
 * added without its grade and source.
 *
 * Pure data, no imports. The engine and the checker read this module and
 * hard-code no structure or limit of their own.
 */

// ── Muscles (09 B1, s2) ───────────────────────────────────────────────────
// The order is the rulebook muscle order, the engine's last tie-break.
export const MUSCLES = Object.freeze([
  'chest', 'lats', 'upper_back', 'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms', 'traps',
  'quads', 'hamstrings', 'glute_max', 'glute_med', 'adductors', 'calves', 'abs',
  'neck', 'tibialis',
]);
// Opt-in muscles are never trained unless the person adds them (09 B1).
export const OPT_IN_MUSCLES = Object.freeze(['neck', 'tibialis']);
// The large muscles (09 B5 first group): 72 h after a heavy dose; three
// exercises a session allowed (09 s5).
export const LARGE_MUSCLES = Object.freeze(['chest', 'lats', 'upper_back', 'quads', 'hamstrings', 'glute_max']);
// May appear in neighbouring sessions only when the earlier dose is light
// (09 s4, B5 third group).
export const FAST_MUSCLES = Object.freeze(['side_delts', 'rear_delts', 'calves', 'abs', 'forearms', 'neck', 'tibialis']);

// ── Counting (09 s3) ──────────────────────────────────────────────────────
// A set credits its own muscle 1 and each muscle in its pattern's credits
// this much (Pelland 2026, fractional counting).
export const CREDIT_FRACTION = 0.5;

// ── Patterns (09 B2) ──────────────────────────────────────────────────────
// kind: compound or isolation. joints: the joint tags the joint rules read.
// An exercise may add tags its pattern does not carry (a barbell hinge or a
// standing barbell press adds spinal_axial); that lives in the pattern map.
export const PATTERNS = Object.freeze({
  vpull: { muscle: 'lats', kind: 'compound', credits: ['upper_back', 'biceps'], joints: ['elbow'] },
  pullover: { muscle: 'lats', kind: 'isolation', credits: [], joints: ['shoulder'] },
  row_supported: { muscle: 'upper_back', kind: 'compound', credits: ['lats', 'biceps', 'rear_delts'], joints: ['elbow'] },
  row_barbell: { muscle: 'upper_back', kind: 'compound', credits: ['lats', 'biceps', 'rear_delts'], joints: ['spinal_axial'] },
  press_flat: { muscle: 'chest', kind: 'compound', credits: ['triceps', 'front_delts'], joints: ['shoulder_press'] },
  press_incline: { muscle: 'chest', kind: 'compound', credits: ['front_delts', 'triceps'], joints: ['shoulder_press'] },
  fly: { muscle: 'chest', kind: 'isolation', credits: [], joints: ['shoulder'] },
  dip: { muscle: 'chest', kind: 'compound', credits: ['triceps', 'front_delts'], joints: ['shoulder_press'] },
  ohp: { muscle: 'front_delts', kind: 'compound', credits: ['triceps', 'side_delts'], joints: ['shoulder_press'] },
  lateral: { muscle: 'side_delts', kind: 'isolation', credits: [], joints: ['shoulder'] },
  rear_fly: { muscle: 'rear_delts', kind: 'isolation', credits: [], joints: ['shoulder'] },
  face_pull: { muscle: 'rear_delts', kind: 'isolation', credits: ['traps'], joints: ['shoulder'] },
  curl: { muscle: 'biceps', kind: 'isolation', credits: [], joints: ['elbow'] },
  hammer: { muscle: 'biceps', kind: 'isolation', credits: ['forearms'], joints: ['elbow'] },
  tri_overhead: { muscle: 'triceps', kind: 'isolation', credits: [], joints: ['elbow'] },
  pushdown: { muscle: 'triceps', kind: 'isolation', credits: [], joints: ['elbow'] },
  skull: { muscle: 'triceps', kind: 'isolation', credits: [], joints: ['elbow'] },
  close_grip_press: { muscle: 'triceps', kind: 'compound', credits: ['chest', 'front_delts'], joints: ['shoulder_press', 'elbow'] },
  shrug: { muscle: 'traps', kind: 'isolation', credits: [], joints: [] },
  squat_barbell: { muscle: 'quads', kind: 'compound', credits: ['glute_max', 'adductors'], joints: ['spinal_axial', 'knee'] },
  squat_machine: { muscle: 'quads', kind: 'compound', credits: ['glute_max', 'adductors'], joints: ['knee'] },
  lunge: { muscle: 'quads', kind: 'compound', credits: ['glute_max'], joints: ['knee'] },
  leg_ext: { muscle: 'quads', kind: 'isolation', credits: [], joints: ['knee'] },
  hinge: { muscle: 'hamstrings', kind: 'compound', credits: ['glute_max'], joints: [] },
  leg_curl: { muscle: 'hamstrings', kind: 'isolation', credits: [], joints: ['knee'] },
  hip_thrust: { muscle: 'glute_max', kind: 'compound', credits: [], joints: [] },
  kickback: { muscle: 'glute_max', kind: 'isolation', credits: [], joints: [] },
  abduction: { muscle: 'glute_med', kind: 'isolation', credits: [], joints: [] },
  adduction: { muscle: 'adductors', kind: 'isolation', credits: [], joints: [] },
  calf: { muscle: 'calves', kind: 'isolation', credits: [], joints: [] },
  crunch: { muscle: 'abs', kind: 'isolation', credits: [], joints: [] },
  leg_raise: { muscle: 'abs', kind: 'isolation', credits: [], joints: [] },
});
// Pattern groups the joint rules name (09 s6, B6).
export const OHP_PATTERNS = Object.freeze(['ohp']);
export const KNEE_COMPOUND_PATTERNS = Object.freeze(['squat_barbell', 'squat_machine', 'lunge']);
export const ELBOW_ISOLATION_PATTERNS = Object.freeze(['curl', 'hammer', 'tri_overhead', 'pushdown', 'skull']);
export const SKULL_OVERHEAD_PATTERNS = Object.freeze(['skull', 'tri_overhead']);
export const REAR_DELT_HEALTH_PATTERNS = Object.freeze(['rear_fly', 'face_pull']);

// ── Categories and tiers (09 B3) ──────────────────────────────────────────
// The research's eight categories. R15: women's bodybuilding takes the open
// bodybuilding rulebook ("total package", 09 s1.1); strength_size and
// weak_point take the general rulebook (focus picks carry the weak point).
export const CATEGORIES = Object.freeze([
  'general', 'bodybuilding', 'classic_physique', 'mens_physique',
  'bikini', 'wellness', 'figure', 'womens_physique',
]);
export const CATEGORY_ALIASES = Object.freeze({
  womens_bodybuilding: 'bodybuilding',
  strength_size: 'general',
  weak_point: 'general',
});

const T = (gen, bb, cl, mp, bk, wl, fg, wp) => Object.freeze({
  general: gen, bodybuilding: bb, classic_physique: cl, mens_physique: mp,
  bikini: bk, wellness: wl, figure: fg, womens_physique: wp,
});
/** Per muscle, per category: P priority, S standard, M maintenance, I indirect only. */
export const TIERS = Object.freeze({
  chest: T('S', 'P', 'S', 'S', 'M', 'M', 'S', 'S'),
  lats: T('S', 'P', 'P', 'P', 'S', 'S', 'P', 'P'),
  upper_back: T('S', 'P', 'S', 'P', 'S', 'M', 'S', 'S'),
  front_delts: T('I', 'I', 'I', 'I', 'I', 'I', 'I', 'I'),
  side_delts: T('S', 'P', 'P', 'P', 'S', 'S', 'P', 'P'),
  rear_delts: T('S', 'S', 'S', 'S', 'S', 'M', 'S', 'S'),
  biceps: T('S', 'S', 'S', 'S', 'M', 'M', 'S', 'S'),
  triceps: T('S', 'S', 'S', 'S', 'M', 'M', 'S', 'S'),
  forearms: T('I', 'I', 'I', 'I', 'I', 'I', 'I', 'I'),
  traps: T('I', 'I', 'I', 'I', 'I', 'I', 'I', 'I'),
  quads: T('S', 'P', 'P', 'M', 'M', 'P', 'S', 'S'),
  hamstrings: T('S', 'P', 'P', 'M', 'S', 'P', 'S', 'S'),
  glute_max: T('S', 'S', 'S', 'I', 'P', 'P', 'S', 'S'),
  glute_med: T('M', 'M', 'M', 'I', 'S', 'S', 'M', 'M'),
  adductors: T('I', 'I', 'I', 'I', 'I', 'S', 'I', 'I'),
  calves: T('S', 'S', 'P', 'M', 'M', 'M', 'M', 'S'),
  abs: T('S', 'S', 'S', 'S', 'M', 'M', 'S', 'S'),
});

// ── Weekly volume, fractional sets at the peak week (09 s3) ───────────────
// min by day count; typical and max for every day count. I: no direct work
// by default, at most 4 direct sets when a rule allows it (09 s3, B12).
export const VOLUME = Object.freeze({
  P: Object.freeze({ min: Object.freeze({ 2: 6, 3: 8, 4: 10, 5: 10, 6: 10 }), typical: 14, max: 20 }),
  S: Object.freeze({ min: Object.freeze({ 2: 4, 3: 5, 4: 6, 5: 6, 6: 6 }), typical: 10, max: 14 }),
  M: Object.freeze({ min: Object.freeze({ 2: 2, 3: 3, 4: 4, 5: 4, 6: 4 }), typical: 6, max: 8 }),
  I: Object.freeze({ min: Object.freeze({ 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }), typical: 0, max: 0, maxDirect: 4 }),
});
export const DAY_COUNTS = Object.freeze([2, 3, 4, 5, 6]);

// ── Per muscle, per session (09 s3, s5; R7) ───────────────────────────────
export const PER_SESSION = Object.freeze({ directCap: 8, fractionalCap: 11 });

// ── Recovery (09 s4, B5; R1) ──────────────────────────────────────────────
// A muscle counts as trained in a session at 2 or more direct sets, or 4 or
// more fractional sets from other exercises' credits.
export const TRAINED = Object.freeze({ directSets: 2, indirectFractional: 4 });
// A light dose: at most 4 direct sets, isolation only, every set at RIR 2 or
// more in every week of the block (R1).
export const LIGHT_DOSE = Object.freeze({ maxDirectSets: 4, isolationOnly: true, minRir: 2 });
// Hours each dose class needs (09 B5). The engine never prescribes heavy
// (its caps and the RIR ladder keep every dose light or moderate), and the
// adjacency rule guarantees 48 h when at most one session is trained a day.
export const RECOVERY_HOURS = Object.freeze({
  large: Object.freeze({ light: 24, moderate: 48, heavy: 72 }),
  other: Object.freeze({ light: 24, moderate: 48, heavy: 48 }),
});
// The app warns when a session starts this soon after the previous one.
export const MIN_HOURS_BETWEEN_SESSIONS_WARNING = 20;

// ── Session limits (09 s5; R3, R4) ────────────────────────────────────────
export const SESSION_LIMITS = Object.freeze({
  exercisesHard: 8,
  exercisesSoftUpTo60Min: 6,
  workingSetsHard: 24,
  setsPerExerciseMin: 2,
  setsPerExerciseMax: 4,
  // Only when the muscle has exactly one pattern in the person's kit, never
  // in a full gym (09 s7).
  setsPerExerciseSolePattern: 5,
  exercisesPerMuscleLarge: 3,
  exercisesPerMuscleOther: 2,
  exercisesPerMuscleFrontDelts: 1,
  beginnerExercises: 5,
  beginnerSetsPerExercise: 3,
});

// ── Rest and reps by exercise kind (09 s5, B11; R6) ───────────────────────
// Kinds are the catalogue's: heavy_compound, mod_compound, machine, isolation.
export const REST_SECONDS = Object.freeze({
  heavy_compound: Object.freeze({ default: 180, floor: 120 }),
  mod_compound: Object.freeze({ default: 150, floor: 90 }),
  machine: Object.freeze({ default: 120, floor: 75 }),
  isolation: Object.freeze({ default: 75, floor: 60 }),
});
export const REP_RANGES = Object.freeze({
  heavy_compound: Object.freeze([6, 10]),
  mod_compound: Object.freeze([8, 12]),
  machine: Object.freeze([8, 15]),
  isolation: Object.freeze([10, 20]),
});
// The order rest is shortened in when a session runs over, least costly
// first (09 s5 step 2; F3): isolation, then machine, then moderate and
// heavy compounds, each to its floor.
export const REST_TRIM_ORDER = Object.freeze(['isolation', 'machine', 'mod_compound', 'heavy_compound']);

// ── Time model (09 s5, kept from the map: allocate.js sessionMinutes) ─────
export const TIME_MODEL = Object.freeze({
  overheadMinutes: 7.5,
  perCompoundAfterFirstMinutes: 1,
  setSeconds: 60,
  transitionSeconds: Object.freeze({
    full_gym: 120, machines_cables: 90, home_gym: 60, dumbbells_only: 45, barbell_plates: 75, bodyweight: 30,
  }),
  defaultTransitionSeconds: 90,
  // Q1 = C (D222): past the chosen length by more than this after rest is
  // shortened, the person chooses a longer session or more days before saving.
  toleranceMinutes: 5,
  lengths: Object.freeze([30, 45, 60, 75, 90]),
});

// ── Focus and experience (09 s3, B4) ──────────────────────────────────────
export const FOCUS = Object.freeze({ addFractional: 4, cap: 20, maxPicks: 3 });
export const EXPERIENCE = Object.freeze({ beginner: 0.7, intermediate: 1, advanced: 1.15 });

// ── Joint protection (09 s6, B6) ──────────────────────────────────────────
export const JOINT_RULES = Object.freeze({
  // J1: overhead pressing sessions a week; men's physique none by default.
  ohpSessionsMax: 1,
  ohpSessionsMaxByCategory: Object.freeze({ mens_physique: 0 }),
  // J2: no neighbouring pair with this much front-delt fractional load in both.
  frontDeltAdjacentFractional: 4,
  // J3: lateral raises to 90 degrees at most; no high-elbow upright rows.
  lateralMaxDegrees: 90,
  // J4 (soft): weekly rear-fly or face-pull sets.
  rearDeltHealthWeeklySets: 3,
  // J5 and J6: spinal loading.
  spinalAxialPerSession: 2,
  heavyHingeSessionsPerWeek: 2,
  // J7: elbow isolation sets per session, and skull or overhead extensions.
  elbowIsolationSetsPerSession: 10,
  skullOverheadSetsPerSession: 4,
  // J8: no neighbouring pair with this many knee-dominant compound sets in both.
  kneeCompoundAdjacentSets: 4,
});

// ── Progression (09 s8, B9; R1) ───────────────────────────────────────────
export const PROGRESSION = Object.freeze({
  weeks: 6,
  peakWeek: 5,
  deloadWeek: 6,
  week1Fraction: 0.7,
  week1MinSets: 2,
  maxStepPerWeek: 1,
  deloadFraction: 0.5,
  rirLadder: Object.freeze([3, 2, 2, 1, 1, 4]),
  // R1: an exercise under the next-day exception never goes below RIR 2.
  nextDayExceptionMinRir: 2,
  // No compound set to failure (09 s8).
  compoundMinRir: 1,
});
export const CHECKIN = Object.freeze({
  raiseSetsPerExercise: 1,
  raiseMaxMuscles: 2,
  reduceFraction: 0.2,
});

// ── Priority order when goals conflict (09 B8, with Q1 = C) ──────────────
// HARD items are never traded. Under Q1 = C the full plan (minimum, typical
// and focus) is always built inside the hard items; the clock never removes
// a set: a session still over its length by more than the tolerance after
// rest is shortened needs the person's choice before saving.
export const PRIORITY = Object.freeze([
  Object.freeze({ goal: 'recovery', type: 'hard' }),
  Object.freeze({ goal: 'joint_protection', type: 'hard' }),
  Object.freeze({ goal: 'session_limits', type: 'hard' }),
  Object.freeze({ goal: 'category_minimum_and_template', type: 'hard' }),
  Object.freeze({ goal: 'real_length_shown', type: 'hard' }),
  Object.freeze({ goal: 'focus_additions', type: 'soft' }),
  Object.freeze({ goal: 'typical_volume', type: 'soft' }),
  Object.freeze({ goal: 'chosen_length', type: 'confirm' }),
]);

// ── Templates (09 B7; R11 to R14) ─────────────────────────────────────────
// Each session lists the muscles it may train directly. The rotation is a
// cycle: the last session neighbours the first. Sessions may start anywhere
// in the cycle but are never reordered (09 s1.3). Indirect-only muscles are
// never listed; they are trained through credits. `hints` restricts a
// muscle to certain patterns in that session (09 B7 wellness 5d).
const S = (key, name, muscles, hints) => Object.freeze({
  key, name, muscles: Object.freeze(muscles), ...(hints ? { hints: Object.freeze(hints) } : {}),
});
const UPPER = ['chest', 'lats', 'upper_back', 'side_delts', 'rear_delts', 'biceps', 'triceps'];
const LOWER = ['quads', 'hamstrings', 'glute_max', 'glute_med', 'calves', 'abs'];
const PUSH = ['chest', 'side_delts', 'triceps'];
const PULL = ['lats', 'upper_back', 'rear_delts', 'biceps'];

const GENERAL_TEMPLATES = Object.freeze({
  2: Object.freeze([S('upper', 'Upper', UPPER), S('lower', 'Lower', LOWER)]),
  3: Object.freeze([
    S('push', 'Push', [...PUSH, 'abs']),
    S('pull', 'Pull', PULL),
    S('legs', 'Legs', ['quads', 'hamstrings', 'glute_max', 'glute_med', 'calves']),
  ]),
  4: Object.freeze([
    S('upper_a', 'Upper A', UPPER), S('lower_a', 'Lower A', LOWER),
    S('upper_b', 'Upper B', UPPER), S('lower_b', 'Lower B', LOWER),
  ]),
  5: Object.freeze([
    S('legs_a', 'Legs A', LOWER), S('push', 'Push', PUSH), S('pull', 'Pull', PULL),
    S('legs_b', 'Legs B', LOWER),
    S('shoulders_arms', 'Shoulders & Arms', ['side_delts', 'rear_delts', 'biceps', 'triceps']),
  ]),
  6: Object.freeze([
    S('push_a', 'Push A', PUSH), S('pull_a', 'Pull A', PULL), S('legs_a', 'Legs A', LOWER),
    S('push_b', 'Push B', PUSH), S('pull_b', 'Pull B', PULL), S('legs_b', 'Legs B', LOWER),
  ]),
});

const MENS_PHYSIQUE_TEMPLATES = Object.freeze({
  2: Object.freeze([
    S('upper', 'Upper', UPPER),
    S('legs_abs', 'Legs & Abs', ['quads', 'hamstrings', 'calves', 'abs']),
  ]),
  // R11: the light side-delt dose sits in Legs & Side Delts, the session
  // before Push in the rotation; the engine derives it from adjacency.
  3: Object.freeze([
    S('push', 'Push', ['chest', 'triceps', 'side_delts', 'abs']),
    S('pull', 'Pull', PULL),
    S('legs_side', 'Legs & Side Delts', ['quads', 'hamstrings', 'calves', 'side_delts']),
  ]),
  4: Object.freeze([
    S('back_a_delts', 'Back A & Delts', ['lats', 'upper_back', 'side_delts', 'rear_delts', 'biceps']),
    S('legs', 'Legs', ['quads', 'hamstrings', 'calves', 'abs']),
    S('back_b_delts', 'Back B & Delts', ['lats', 'upper_back', 'side_delts', 'rear_delts', 'biceps']),
    S('chest_triceps', 'Chest & Triceps', ['chest', 'triceps', 'abs']),
  ]),
  5: Object.freeze([
    S('back_a', 'Back A & Biceps', ['lats', 'upper_back', 'biceps']),
    S('delts_abs', 'Delts & Abs', ['side_delts', 'rear_delts', 'abs']),
    S('chest_triceps', 'Chest & Triceps', ['chest', 'triceps']),
    S('back_b', 'Back B & Biceps', ['lats', 'upper_back', 'biceps', 'rear_delts']),
    S('legs_side', 'Legs & Side Delts', ['quads', 'hamstrings', 'calves', 'side_delts']),
  ]),
  6: Object.freeze([
    S('shoulders_a', 'Shoulders A', ['side_delts', 'rear_delts']),
    S('back_a', 'Back A & Biceps', ['lats', 'upper_back', 'biceps']),
    S('chest_triceps', 'Chest & Triceps', ['chest', 'triceps']),
    S('shoulders_b', 'Shoulders B & Abs', ['side_delts', 'rear_delts', 'abs']),
    S('back_b', 'Back B & Biceps', ['lats', 'upper_back', 'biceps']),
    S('legs', 'Legs & Calves', ['quads', 'hamstrings', 'calves']),
  ]),
});

const BIKINI_UPPER = ['lats', 'upper_back', 'side_delts', 'rear_delts', 'chest', 'biceps', 'triceps'];
const BIKINI_TEMPLATES = Object.freeze({
  2: Object.freeze([
    S('lower', 'Lower', ['glute_max', 'glute_med', 'hamstrings', 'quads', 'calves', 'abs']),
    S('upper', 'Upper', BIKINI_UPPER),
  ]),
  3: Object.freeze([
    S('glutes_hams', 'Glutes & Hamstrings', ['glute_max', 'hamstrings']),
    S('upper', 'Upper', BIKINI_UPPER),
    S('quads_glute_med', 'Quads, Glute Med & Abs', ['quads', 'glute_med', 'calves', 'abs']),
  ]),
  4: Object.freeze([
    S('lower_a', 'Lower A', ['glute_max', 'hamstrings', 'abs']),
    S('upper_a', 'Upper A', BIKINI_UPPER),
    S('lower_b', 'Lower B', ['glute_max', 'quads', 'glute_med', 'calves']),
    S('upper_b', 'Upper B', BIKINI_UPPER),
  ]),
  5: Object.freeze([
    S('lower_a', 'Lower A', ['glute_max', 'hamstrings', 'quads']),
    S('upper_a', 'Upper A', BIKINI_UPPER),
    S('lower_b', 'Lower B', ['quads', 'glute_med', 'calves', 'abs']),
    S('lower_c', 'Lower C', ['glute_max', 'hamstrings']),
    S('upper_b', 'Upper B', BIKINI_UPPER),
  ]),
  6: Object.freeze([
    S('lower_a', 'Lower A', ['glute_max', 'hamstrings', 'quads']),
    S('upper_a', 'Upper A', BIKINI_UPPER),
    S('lower_b', 'Lower B', ['quads', 'glute_med', 'calves', 'abs']),
    S('lower_c', 'Lower C', ['glute_max', 'hamstrings']),
    S('upper_b', 'Upper B', BIKINI_UPPER),
    S('glute_med_abs', 'Glute Med, Abs & Calves', ['glute_med', 'abs', 'calves']),
  ]),
});

const WELLNESS_LOWER = ['quads', 'hamstrings', 'glute_max', 'glute_med', 'adductors', 'calves', 'abs'];
const WELLNESS_TEMPLATES = Object.freeze({
  // R12: 09 gives no 2-day wellness week; Lower | Upper as for bikini.
  2: Object.freeze([S('lower', 'Lower', WELLNESS_LOWER), S('upper', 'Upper', UPPER)]),
  3: Object.freeze([
    S('glutes_hams', 'Glutes & Hamstrings', ['glute_max', 'hamstrings']),
    S('upper', 'Upper', [...UPPER, 'abs']),
    S('quads_glute_med', 'Quads, Glute Med & Adductors', ['quads', 'glute_med', 'adductors', 'calves']),
  ]),
  4: Object.freeze([
    S('lower_a', 'Lower A', WELLNESS_LOWER), S('upper_a', 'Upper A', UPPER),
    S('lower_b', 'Lower B', WELLNESS_LOWER), S('upper_b', 'Upper B', UPPER),
  ]),
  5: Object.freeze([
    S('glutes_hams_quads', 'Glutes, Hamstrings & Quads', ['glute_max', 'hamstrings', 'quads', 'calves'], { hamstrings: ['leg_curl'] }),
    S('upper_a', 'Upper A', [...UPPER, 'abs']),
    S('hams_glute_med', 'Hamstrings, Glute Med & Adductors', ['hamstrings', 'glute_med', 'adductors', 'calves'], { hamstrings: ['hinge'] }),
    S('quads_glutes', 'Quads & Glutes', ['quads', 'glute_max']),
    S('upper_b', 'Upper B', [...UPPER, 'abs']),
  ]),
  // R13: Glutes A also lists hamstrings. In 09's list hamstrings (a priority
  // muscle, minimum 10) sit in one session, where the 8-set cap and no
  // crediting pattern make the minimum impossible.
  6: Object.freeze([
    S('glutes_a', 'Glutes A & Hamstrings', ['glute_max', 'hamstrings']),
    S('upper_a', 'Upper A', [...UPPER, 'abs']),
    S('quads_a', 'Quads A & Glute Med', ['quads', 'glute_med', 'calves']),
    S('hams_glutes_b', 'Hamstrings & Glutes B', ['hamstrings', 'glute_max']),
    S('upper_b', 'Upper B', [...UPPER, 'abs']),
    S('quads_b', 'Quads B & Adductors', ['quads', 'adductors', 'calves']),
  ]),
});

const FIGURE_TEMPLATES = Object.freeze({
  // R12: 09 gives no 2-day figure week; Upper | Lower as for general.
  2: GENERAL_TEMPLATES[2],
  3: GENERAL_TEMPLATES[3],
  4: Object.freeze([
    S('upper_a', 'Upper A', ['lats', 'upper_back', 'side_delts', 'rear_delts', 'biceps']),
    S('lower_a', 'Lower A', LOWER),
    S('upper_b', 'Upper B', ['side_delts', 'rear_delts', 'chest', 'triceps']),
    S('lower_b', 'Lower B', LOWER),
  ]),
  5: Object.freeze([
    S('legs_a', 'Legs A', LOWER),
    S('back_rear_biceps', 'Back, Rear Delts & Biceps', ['lats', 'upper_back', 'rear_delts', 'biceps']),
    S('side_chest_triceps', 'Side Delts, Chest & Triceps', ['side_delts', 'chest', 'triceps']),
    S('legs_b', 'Legs B', LOWER),
    S('back_side_biceps', 'Back, Side Delts & Biceps', ['lats', 'upper_back', 'side_delts', 'biceps']),
  ]),
  6: GENERAL_TEMPLATES[6],
});

/** TEMPLATES[category][days] = the rotation's sessions, in order. */
export const TEMPLATES = Object.freeze({
  general: GENERAL_TEMPLATES,
  bodybuilding: GENERAL_TEMPLATES,
  classic_physique: GENERAL_TEMPLATES,
  mens_physique: MENS_PHYSIQUE_TEMPLATES,
  bikini: BIKINI_TEMPLATES,
  wellness: WELLNESS_TEMPLATES,
  figure: FIGURE_TEMPLATES,
  womens_physique: FIGURE_TEMPLATES,
});

/** The rulebook's category for an app goal key (R15). */
export function rulebookCategory(goal) {
  if (CATEGORIES.includes(goal)) return goal;
  return CATEGORY_ALIASES[goal] ?? 'general';
}

// ── Sources (pinned by rulebook.test.js) ──────────────────────────────────
export const EVIDENCE = Object.freeze({
  MUSCLES: 'D: 09 B1 and s2; delts split front, side and rear (B/C: Campos 2020 EMG, Lanza 2024 MRI); back split lats and upper back, glutes split max and med (D).',
  OPT_IN_MUSCLES: 'D: 09 B1.',
  LARGE_MUSCLES: 'C/D: 09 B5 first group.',
  FAST_MUSCLES: 'D: 09 s4 next-day exceptions, coach consensus with no direct evidence.',
  CREDIT_FRACTION: 'A: Pelland et al. 2026, Sports Med 56:481-505; fractional counting fitted best (10 s6).',
  PATTERNS: 'A for the 0.5 method, D for the assignments: 09 B2.',
  OHP_PATTERNS: 'D: 09 B6 J1.',
  KNEE_COMPOUND_PATTERNS: 'C/D: 09 s6 knee rule, B6 J8.',
  ELBOW_ISOLATION_PATTERNS: 'D: 09 s6 elbow rule, B6 J7.',
  SKULL_OVERHEAD_PATTERNS: 'D: 09 B6 J7.',
  REAR_DELT_HEALTH_PATTERNS: 'C: Kolber 2014 (external-rotator work protective), 09 B6 J4.',
  CATEGORIES: 'D: 09 s1.1 federation judging text.',
  CATEGORY_ALIASES: 'D: lead ruling R15 (register D222); 09 covers eight categories.',
  TIERS: 'D: 09 B3, from the federation text in 09 s1.1.',
  VOLUME: 'B/C for P and S (Pelland 2026 efficiency tiers; surveys), C/D for M, D for I: 09 s3.',
  DAY_COUNTS: 'D: the app offers 2 to 6 days.',
  PER_SESSION: 'C: Remmert et al. 2025 SportRxiv preprint (~11 fractional); kept hard as a conservative design limit, R7 (register D222).',
  TRAINED: 'D: 09 s4 indirect load counts.',
  LIGHT_DOSE: 'D: 09 s4 dose classes; held at RIR 2 or more all block, R1 (register D222).',
  RECOVERY_HOURS: 'B: Moran-Navarro 2017 (failure slows recovery 24-48 h); C: Miller 2005 (tendon collagen to 72 h); D: per-muscle hours, 09 B5.',
  MIN_HOURS_BETWEEN_SESSIONS_WARNING: 'D: 09 s4.',
  SESSION_LIMITS: 'D: 09 s5; 24 working sets, R4 (register D222).',
  REST_SECONDS: 'B for the isolation floor (Singer 2024), D for the rest: 09 s5 table, R6 (register D222).',
  REP_RANGES: 'D: 09 B11.',
  REST_TRIM_ORDER: 'D: 09 s5 step 2; founder F3 (rest shortened first).',
  TIME_MODEL: 'D: kept from the map (allocate.js sessionMinutes); tolerance from Q1 = C (register D222).',
  FOCUS: 'D: 09 s3 and B4.',
  EXPERIENCE: 'D: 09 s3 and B4.',
  JOINT_RULES: 'C/D: 09 s6 and B6 (Siewe 2014 injury sites; Kolber 2014 for J3 and J4).',
  PROGRESSION: 'C: Rogerson 2024 (deload every 5.6 weeks, volume cut, frequency kept); B: compounds short of failure (Robinson 2024, Refalo 2024); D: the ladder; R1 (register D222).',
  CHECKIN: 'D: 09 s8.',
  PRIORITY: 'D: 09 B8, with founder Q1 = C (register D222).',
  TEMPLATES: 'D for structure, A for frequency (Pelland 2026): 09 B7; R11 to R13 (register D222).',
  rulebookCategory: 'D: lead ruling R15 (register D222).',
});
