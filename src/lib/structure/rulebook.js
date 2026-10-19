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
  // R26 (register D222, coach audit of the rendered plans): every loaded
  // hinge loads the lower back, whatever the implement, so a dumbbell
  // Romanian deadlift counts for the lumbar rules (J5, J6) as a barbell one
  // does. The lower back is the commonest injury site (09 s6: Siewe 2014).
  hinge: { muscle: 'hamstrings', kind: 'compound', credits: ['glute_max'], joints: ['spinal_axial'] },
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
const CATEGORY_TIERS = Object.freeze({
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

// ── Physique archetypes (founder ruling 2026-10-19) ───────────────────────
// A person who is not competing picks a training style. Each is the general
// rulebook with some muscles re-tiered (never an indirect-only muscle, and
// never above P), and it may borrow an upper-biased rotation. The research's
// eight categories are untouched; an archetype is its own rulebook key,
// 'general_<archetype>', so every per-category lookup reads it as one.
// `balanced` is the general rulebook itself, exactly as before.
//  - split 'upper': the men's physique rotation (one leg day a week, F4)
//    with glutes trained on the leg day, since these archetypes keep them.
//  - minimal: every muscle's target is its minimum, not its normal volume.
//  - strength: a loaded heavy compound's reps are STRENGTH_REP_RANGE for an
//    intermediate or advanced lifter (a beginner keeps the normal range).
export const ARCHETYPES = Object.freeze({
  balanced: Object.freeze({ tiers: Object.freeze({}) }),
  v_taper: Object.freeze({ split: 'upper', tiers: Object.freeze({ lats: 'P', side_delts: 'P', upper_back: 'P' }) }),
  x_frame: Object.freeze({ tiers: Object.freeze({ lats: 'P', side_delts: 'P', quads: 'P', hamstrings: 'P' }) }),
  upper_density: Object.freeze({
    split: 'upper',
    tiers: Object.freeze({ chest: 'P', upper_back: 'P', lats: 'P', quads: 'M', hamstrings: 'M', glute_max: 'M', calves: 'M' }),
  }),
  powerbuilder: Object.freeze({
    strength: true,
    tiers: Object.freeze({ quads: 'P', glute_max: 'P', chest: 'P', upper_back: 'P', side_delts: 'M', biceps: 'M', calves: 'M' }),
  }),
  minimalist: Object.freeze({ minimal: true, tiers: Object.freeze({}) }),
});
export const ARCHETYPE_KEYS = Object.freeze(Object.keys(ARCHETYPES));
/** The rulebook key an archetype builds under ('balanced' is 'general'). */
export const archetypeCategory = (archetype) => (archetype === 'balanced' ? 'general' : `general_${archetype}`);
/** Every archetype rulebook key other than 'general' itself. */
export const ARCHETYPE_CATEGORIES = Object.freeze(ARCHETYPE_KEYS.filter((a) => a !== 'balanced').map(archetypeCategory));
/** The archetype a rulebook key was built from, or null for a research category. */
export const archetypeOfCategory = (category) => ARCHETYPE_KEYS.find((a) => a !== 'balanced' && archetypeCategory(a) === category) ?? null;
// Reps for a loaded heavy compound under a strength archetype (09 B11's
// strength band; the week's RIR still applies).
export const STRENGTH_REP_RANGE = Object.freeze([3, 6]);

/** Per muscle, per rulebook key (the eight categories and each archetype). */
export const TIERS = Object.freeze(Object.fromEntries(Object.entries(CATEGORY_TIERS).map(([m, byCategory]) => [m, Object.freeze({
  ...byCategory,
  ...Object.fromEntries(ARCHETYPE_KEYS.filter((a) => a !== 'balanced').map((a) => [
    archetypeCategory(a),
    byCategory.general === 'I' ? 'I' : (ARCHETYPES[a].tiers[m] || byCategory.general),
  ])),
})])));

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
  // R23 (register D222): beginners take the normal session limits. 09's
  // 5 exercises and 3 sets cannot hold a week that trains every muscle
  // directly (a 2-day upper session lists 7); beginners' lower weekly
  // volume (EXPERIENCE, applied to the minimum as well) keeps their
  // sessions short instead, about 4.5 exercises on average.
  beginnerExercises: 8,
  beginnerSetsPerExercise: 4,
  // R25 (register D222, from the user audit of the rendered plans): above
  // the minimum, a beginner's session stays inside 09's beginner limits, 5
  // exercises and 3 sets an exercise. R23 lets the minimum use the normal
  // limits so no muscle drops out; normal volume never takes a beginner's
  // session past 09's limits (a first leg day of 8 exercises and 24 sets
  // is not a beginner session).
  beginnerGrowthExercises: 5,
  beginnerGrowthSetsPerExercise: 3,
});

// ── Rest and reps by exercise kind (09 s5, B11; R6) ───────────────────────
// Kinds are the catalogue's: heavy_compound, mod_compound, machine, isolation.
export const REST_SECONDS = Object.freeze({
  heavy_compound: Object.freeze({ default: 180, floor: 120 }),
  mod_compound: Object.freeze({ default: 150, floor: 90 }),
  machine: Object.freeze({ default: 120, floor: 75 }),
  isolation: Object.freeze({ default: 75, floor: 60 }),
});
// R29 (register D222, coach audit of the rendered plans): a leg press, hack
// squat or machine hip thrust is a machine, but a lower-body compound under
// heavy load; it rests as a heavy compound does (a 75 s floor between leg
// press sets is not enough to repeat the load).
// R37: it orders with the heavy compounds too, so a 2-set dumbbell Romanian
// deadlift never opens ahead of a 4-set leg press; and an upper-body machine
// compound (a machine press or row) rests as a moderate compound.
export const HEAVY_REST_MACHINE_PATTERNS = Object.freeze(['squat_machine', 'hip_thrust']);
/** The rest class of an exercise: the REST_SECONDS row it rests by (R29, R37). */
export function restClassFor(kind, pattern) {
  if (kind === 'machine' && HEAVY_REST_MACHINE_PATTERNS.includes(pattern)) return 'heavy_compound';
  if (kind === 'machine' && PATTERNS[pattern] && PATTERNS[pattern].kind === 'compound') return 'mod_compound';
  return kind;
}
/** The rest default and floor for an exercise of this kind and pattern. */
export function restSecondsFor(kind, pattern) {
  return REST_SECONDS[restClassFor(kind, pattern)];
}
/**
 * The kind an exercise ranks as in a session's order (C17; R37). Round 6
 * coach audit (C6-3): a machine compound ranks as the moderate compound it
 * rests as (a chest-supported machine row with the dumbbell press it sits
 * beside), so a session's own rows come before a top-up press.
 */
export function orderKindFor(kind, pattern) {
  return restClassFor(kind, pattern);
}

/**
 * The ranks a session's order is judged by (C17): heavy, moderate, machine,
 * isolation, non-decreasing within each block. Round 6 audits: work of the
 * other half that came in for another muscle (`visitors`, a set of exercise
 * indexes) is its own block after the session's own (U6-10); and a hip
 * thrust after a hinge in its block ranks with the hinge (C6-8, F6: the
 * spine-loading lift goes first).
 */
export function orderRanks(exercises, visitors = new Set()) {
  const KIND = { heavy_compound: 0, mod_compound: 1, machine: 2, isolation: 3 };
  const out = [];
  for (const block of [false, true]) {
    let hingeRank = null;
    const ranks = [];
    exercises.forEach((ex, i) => {
      if (visitors.has(i) !== block) return;
      let r = KIND[orderKindFor(ex.kind, ex.pattern)] ?? 3;
      if (ex.pattern === 'hinge' && hingeRank == null) hingeRank = r;
      if (ex.pattern === 'hip_thrust' && hingeRank != null) r = Math.max(r, hingeRank);
      ranks.push({ i, r });
    });
    out.push(ranks);
  }
  return out;
}

// Body halves (R30, R31): the upper-body muscles; abs are the trunk; the rest
// are lower body.
export const UPPER_MUSCLES = Object.freeze(['chest', 'lats', 'upper_back', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'forearms', 'traps', 'neck']);
export const regionOf = (m) => (m === 'abs' ? 'trunk' : UPPER_MUSCLES.includes(m) ? 'upper' : 'lower');
// F4 (founder, D219 addendum 4): men's physique trains legs in one session a
// week at every day count. The legs are these; calves are not among them
// (the founder-approved week carries a calf finisher on an upper day).
const LEGS_ONCE_MUSCLES = Object.freeze(['quads', 'hamstrings', 'glute_max', 'glute_med', 'adductors']);
// The archetypes on the men's physique rotation keep its one leg day.
export const LEGS_ONCE = Object.freeze({
  mens_physique: LEGS_ONCE_MUSCLES,
  ...Object.fromEntries(ARCHETYPE_KEYS.filter((a) => ARCHETYPES[a].split === 'upper').map((a) => [archetypeCategory(a), LEGS_ONCE_MUSCLES])),
});
export const REP_RANGES = Object.freeze({
  heavy_compound: Object.freeze([6, 10]),
  mod_compound: Object.freeze([8, 12]),
  machine: Object.freeze([8, 15]),
  isolation: Object.freeze([10, 20]),
});
// A compound done with body weight alone cannot be loaded to fit a range,
// so its reps follow effort: as many as the week's RIR allows, 6 to 30
// (round 4 coach audit: push-ups and split squats at 8 to 12 sit far from
// RIR 3 to 1 for an intermediate; pull-ups at 8 to 12 are beyond many).
export const REP_RANGE_UNLOADED_COMPOUND = Object.freeze([6, 30]);
// And an isolation with body weight alone (a side-lying clamshell): 15 to
// 30, to reach the week's RIR (round 5 coach audit).
export const REP_RANGE_UNLOADED_ISOLATION = Object.freeze([15, 30]);
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
// R23: the beginner factor also scales the weekly minimum (untrained people
// grow on low volume; Pelland 2026 puts the most growth per set at 5 to 10
// fractional sets a week). Advanced people keep the full minimum.
export const EXPERIENCE_MINIMUM = Object.freeze({ beginner: 0.7, intermediate: 1, advanced: 1 });

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

// ── Templates (09 B7; R11 to R13, R21) ───────────────────────────────────
// Each session lists the muscles it may train directly. The rotation is a
// cycle: the last session neighbours the first. Sessions may start anywhere
// in the cycle but are never reordered (09 s1.3). Indirect-only muscles are
// never listed; they are trained through credits. `hints` restricts a
// muscle to certain patterns in that session (09 B7 wellness 5d).
// `core` is what the session's name promises (the founder's sense order,
// D222): each group must be trained directly in the session by at least
// one of its muscles, so a "Chest & Triceps" day always holds chest and
// triceps work and an "Upper" day always holds a press and a pull.
const S = (key, name, muscles, hints) => Object.freeze({
  key, name, muscles: Object.freeze(muscles), ...(hints ? { hints: Object.freeze(hints) } : {}),
});
const BACK = ['lats', 'upper_back'];
const CORE = {
  upper: [['chest'], BACK], lower: [['quads'], ['hamstrings', 'glute_max']], push: [['chest']], pull: [BACK],
  legs: [['quads'], ['hamstrings']],
};
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

// (UPPER_BIASED_TEMPLATES, below the men's physique rotation it is made from.)
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
// Founder ruling 2026-10-19: the upper-biased rotation the v_taper and
// upper_density archetypes train on. The men's physique sessions, with the
// glutes (indirect only in men's physique, trained in these archetypes) on
// every session that trains the quads.
const withGlutes = (list) => (list.includes('quads') ? [...list, ...['glute_max', 'glute_med'].filter((g) => !list.includes(g))] : list);
const UPPER_BIASED_TEMPLATES = Object.freeze(Object.fromEntries(Object.entries(MENS_PHYSIQUE_TEMPLATES).map(([d, list]) => [d,
  Object.freeze(list.map((x) => Object.freeze({ ...x, muscles: Object.freeze(withGlutes(x.muscles)) })))])));

const BIKINI_UPPER = ['lats', 'upper_back', 'side_delts', 'rear_delts', 'chest', 'biceps', 'triceps'];
const BIKINI_TEMPLATES = Object.freeze({
  2: Object.freeze([
    S('lower', 'Lower', ['glute_max', 'glute_med', 'hamstrings', 'quads', 'calves', 'abs']),
    S('upper', 'Upper', BIKINI_UPPER),
  ]),
  3: Object.freeze([
    S('glutes_hams', 'Glutes & Hamstrings', ['glute_max', 'hamstrings']),
    S('upper', 'Upper', BIKINI_UPPER),
    S('quads_glute_med', 'Quads, Side Glutes & Abs', ['quads', 'glute_med', 'calves', 'abs']),
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
    S('glute_med_abs', 'Side Glutes, Abs & Calves', ['glute_med', 'abs', 'calves']),
  ]),
});

const WELLNESS_LOWER = ['quads', 'hamstrings', 'glute_max', 'glute_med', 'adductors', 'calves', 'abs'];
const WELLNESS_TEMPLATES = Object.freeze({
  // R12: 09 gives no 2-day wellness week; Lower | Upper as for bikini.
  2: Object.freeze([S('lower', 'Lower', WELLNESS_LOWER), S('upper', 'Upper', UPPER)]),
  3: Object.freeze([
    S('glutes_hams', 'Glutes & Hamstrings', ['glute_max', 'hamstrings']),
    S('upper', 'Upper', [...UPPER, 'abs']),
    S('quads_glute_med', 'Quads, Side Glutes & Inner Thighs', ['quads', 'glute_med', 'adductors', 'calves']),
  ]),
  4: Object.freeze([
    S('lower_a', 'Lower A', WELLNESS_LOWER), S('upper_a', 'Upper A', UPPER),
    S('lower_b', 'Lower B', WELLNESS_LOWER), S('upper_b', 'Upper B', UPPER),
  ]),
  5: Object.freeze([
    S('glutes_hams_quads', 'Glutes, Hamstrings & Quads', ['glute_max', 'hamstrings', 'quads', 'calves'], { hamstrings: ['leg_curl'] }),
    S('upper_a', 'Upper A', [...UPPER, 'abs']),
    S('hams_glute_med', 'Hamstrings, Side Glutes & Inner Thighs', ['hamstrings', 'glute_med', 'adductors', 'calves'], { hamstrings: ['hinge'] }),
    S('quads_glutes', 'Quads & Glutes', ['quads', 'glute_max']),
    S('upper_b', 'Upper B', [...UPPER, 'abs']),
  ]),
  // R13: Glutes A also lists hamstrings. In 09's list hamstrings (a priority
  // muscle, minimum 10) sit in one session, where the 8-set cap and no
  // crediting pattern make the minimum impossible.
  6: Object.freeze([
    S('glutes_a', 'Glutes A & Hamstrings', ['glute_max', 'hamstrings']),
    S('upper_a', 'Upper A', [...UPPER, 'abs']),
    S('quads_a', 'Quads A & Side Glutes', ['quads', 'glute_med', 'calves']),
    S('hams_glutes_b', 'Hamstrings & Glutes B', ['hamstrings', 'glute_max']),
    S('upper_b', 'Upper B', [...UPPER, 'abs']),
    S('quads_b', 'Quads B & Inner Thighs', ['quads', 'adductors', 'calves']),
  ]),
});

const FIGURE_TEMPLATES = Object.freeze({
  // R12: 09 gives no 2-day figure week; Upper | Lower as for general.
  2: GENERAL_TEMPLATES[2],
  // R35: side delts, figure's signature muscle, also take a light dose in
  // Legs, the session before Push, as men's physique does (R11). Women's
  // physique keeps the general week (below): measured, its leg session
  // cannot then hold the hamstrings' and calves' minimums.
  3: Object.freeze([
    GENERAL_TEMPLATES[3][0], GENERAL_TEMPLATES[3][1],
    S('legs_side', 'Legs & Side Delts', ['quads', 'hamstrings', 'glute_max', 'glute_med', 'calves', 'side_delts']),
  ]),
  4: Object.freeze([
    // Named for what they hold (user audit, D222): the first upper session
    // pulls and the second presses, so "Upper A" and "Upper B" misled.
    S('upper_a', 'Back, Delts & Biceps', ['lats', 'upper_back', 'side_delts', 'rear_delts', 'biceps']),
    S('lower_a', 'Lower A', LOWER),
    S('upper_b', 'Delts, Chest & Triceps', ['side_delts', 'rear_delts', 'chest', 'triceps']),
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

// R21: open bodybuilding's 5-day week trains the upper body twice. In 09's
// general 5-day week chest sits in Push alone, and a priority muscle with a
// minimum of 10 cannot reach it in one session under the 8-set cap; the
// fifth session (Shoulders & Arms) becomes a full upper session, which
// neighbours only the two leg sessions.
const BODYBUILDING_TEMPLATES = Object.freeze({
  ...GENERAL_TEMPLATES,
  5: Object.freeze([
    GENERAL_TEMPLATES[5][0], GENERAL_TEMPLATES[5][1], GENERAL_TEMPLATES[5][2], GENERAL_TEMPLATES[5][3],
    S('upper', 'Upper', UPPER),
  ]),
});

// What each session's name promises, by session key; a key not listed
// takes the shared default below. Each entry is a list of groups; each group
// needs at least one of its muscles trained directly in the session.
const SESSION_CORE = {
  general: {
    upper: CORE.upper, upper_a: CORE.upper, upper_b: CORE.upper, lower: CORE.lower, lower_a: CORE.lower, lower_b: CORE.lower,
    push: CORE.push, push_a: CORE.push, push_b: CORE.push, pull: CORE.pull, pull_a: CORE.pull, pull_b: CORE.pull,
    legs: CORE.legs, legs_a: CORE.legs, legs_b: CORE.legs,
    shoulders_arms: [['side_delts'], ['biceps'], ['triceps']],
  },
  mens_physique: {
    upper: CORE.upper, legs_abs: [['quads'], ['hamstrings'], ['abs']],
    push: CORE.push, pull: CORE.pull, legs_side: [['quads'], ['hamstrings'], ['side_delts']],
    back_a_delts: [BACK, ['side_delts', 'rear_delts']], back_b_delts: [BACK, ['side_delts', 'rear_delts']],
    legs: [['quads'], ['hamstrings']], chest_triceps: [['chest'], ['triceps']],
    back_a: [BACK, ['biceps']], back_b: [BACK, ['biceps']], delts_abs: [['side_delts', 'rear_delts'], ['abs']],
    shoulders_a: [['side_delts', 'rear_delts']], shoulders_b: [['side_delts', 'rear_delts'], ['abs']],
  },
  bikini: {
    lower: [['glute_max'], ['hamstrings']], upper: [BACK], upper_a: [BACK], upper_b: [BACK],
    glutes_hams: [['glute_max'], ['hamstrings']], quads_glute_med: [['quads'], ['glute_med']],
    lower_a: [['glute_max']], lower_b: [['glute_max', 'quads'], ['glute_med', 'quads']], lower_c: [['glute_max'], ['hamstrings']],
    glute_med_abs: [['glute_med'], ['abs']],
  },
  wellness: {
    lower: [['quads'], ['hamstrings'], ['glute_max']], upper: [BACK], upper_a: [BACK], upper_b: [BACK],
    lower_a: [['quads'], ['glute_max', 'hamstrings']], lower_b: [['quads'], ['glute_max', 'hamstrings']],
    glutes_hams: [['glute_max'], ['hamstrings']], quads_glute_med: [['quads'], ['glute_med']],
    glutes_hams_quads: [['glute_max'], ['hamstrings'], ['quads']], hams_glute_med: [['hamstrings'], ['glute_med']],
    quads_glutes: [['quads'], ['glute_max']], glutes_a: [['glute_max'], ['hamstrings']], quads_a: [['quads'], ['glute_med']],
    hams_glutes_b: [['hamstrings'], ['glute_max']], quads_b: [['quads'], ['adductors']],
  },
  figure: {
    legs_side: [['quads'], ['hamstrings', 'glute_max'], ['side_delts']],
    upper_a: [BACK, ['side_delts']], upper_b: [['side_delts'], ['chest']],
    back_rear_biceps: [BACK, ['rear_delts'], ['biceps']], side_chest_triceps: [['side_delts'], ['chest'], ['triceps']],
    back_side_biceps: [BACK, ['side_delts'], ['biceps']],
  },
};
const withCore = (templates, cores) => Object.freeze(Object.fromEntries(Object.entries(templates).map(([d, list]) => [d,
  Object.freeze(list.map((x) => Object.freeze({ ...x, core: Object.freeze((cores[x.key] || SESSION_CORE.general[x.key] || []).map((g) => Object.freeze([...g]))) })))])));

/** TEMPLATES[category][days] = the rotation's sessions, in order. */
export const TEMPLATES = Object.freeze({
  general: withCore(GENERAL_TEMPLATES, SESSION_CORE.general),
  bodybuilding: withCore(BODYBUILDING_TEMPLATES, SESSION_CORE.general),
  classic_physique: withCore(GENERAL_TEMPLATES, SESSION_CORE.general),
  mens_physique: withCore(MENS_PHYSIQUE_TEMPLATES, SESSION_CORE.mens_physique),
  bikini: withCore(BIKINI_TEMPLATES, SESSION_CORE.bikini),
  wellness: withCore(WELLNESS_TEMPLATES, SESSION_CORE.wellness),
  figure: withCore(FIGURE_TEMPLATES, SESSION_CORE.figure),
  womens_physique: withCore(Object.freeze({ ...FIGURE_TEMPLATES, 3: GENERAL_TEMPLATES[3] }), SESSION_CORE.figure),
  ...Object.fromEntries(ARCHETYPE_KEYS.filter((a) => a !== 'balanced').map((a) => [
    archetypeCategory(a),
    ARCHETYPES[a].split === 'upper'
      ? withCore(UPPER_BIASED_TEMPLATES, SESSION_CORE.mens_physique)
      : withCore(GENERAL_TEMPLATES, SESSION_CORE.general),
  ])),
});

// R22: when a muscle cannot reach its category minimum in the sessions its
// template lists it in (one session, or a kit with one exercise for it), it
// may also go in a session that does not neighbour any session training it
// and that already lists a muscle of its own group, so a glute-med set joins
// a glute session, never a chest day.
export const SIBLING_MUSCLES = Object.freeze({
  chest: ['triceps'], triceps: ['chest', 'biceps'], biceps: ['triceps', 'lats'],
  lats: ['upper_back'], upper_back: ['lats'],
  side_delts: ['rear_delts'], rear_delts: ['side_delts', 'upper_back'],
  quads: ['hamstrings', 'glute_max'], hamstrings: ['quads', 'glute_max'],
  glute_max: ['glute_med', 'hamstrings'], glute_med: ['glute_max'],
  adductors: ['quads', 'glute_med'], calves: ['quads', 'hamstrings'], abs: [],
});

/** The rulebook's category for an app goal key (R15). */
export function rulebookCategory(goal, archetype = null) {
  const category = CATEGORIES.includes(goal) ? goal : (CATEGORY_ALIASES[goal] ?? 'general');
  // An archetype is for a person who is not competing: it shapes the general
  // rulebook only, and a competing category ignores it.
  if (category === 'general' && archetype != null && ARCHETYPES[archetype]) return archetypeCategory(archetype);
  return category;
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
  SESSION_LIMITS: 'D: 09 s5; 24 working sets, R4; beginner limits R23 (register D222).',
  REST_SECONDS: 'B for the isolation floor (Singer 2024), D for the rest: 09 s5 table, R6 (register D222).',
  HEAVY_REST_MACHINE_PATTERNS: 'D: coaching consensus for loaded lower-body compounds; lead ruling R29 (register D222).',
  restSecondsFor: 'D: 09 s5 rest table with R29 and R37 (register D222).',
  orderKindFor: 'D: 09 s7 order with R37; a machine compound ranks as its rest class (round 6, C6-3; register D222).',
  orderRanks: 'D: 09 s7 order judged per block (the session\'s own work, then the other half\'s visiting work, U6-10) with a hip thrust after a hinge ranking with it (C6-8, F6); register D222 round 6.',
  UPPER_MUSCLES: 'D: the body halves the session order and focus overflow read (R30, R31; register D222).',
  regionOf: 'D: the body half of a muscle, abs the trunk (R30, R31; register D222).',
  LEGS_ONCE: 'A: founder F4 (D219 addendum 4): men\'s physique trains legs in one session a week at every day count; calves are not among them (the approved week carries a calf finisher on an upper day). Round 6, C6-1.',
  restClassFor: 'D: 09 s5 rest table with R29, R37 and R43 (register D222).',
  REP_RANGES: 'D: 09 B11.',
  REP_RANGE_UNLOADED_ISOLATION: 'B: Schoenfeld 2017 (as for unloaded compounds); D: lead ruling, round 5 coach audit (register D222).',
  REP_RANGE_UNLOADED_COMPOUND: 'B: Schoenfeld 2017 (J Strength Cond Res 31:3508, low and high loads give similar hypertrophy taken near failure); D: lead ruling, round 4 coach audit (register D222).',
  REST_TRIM_ORDER: 'D: 09 s5 step 2; founder F3 (rest shortened first).',
  TIME_MODEL: 'D: kept from the map (allocate.js sessionMinutes); tolerance from Q1 = C (register D222).',
  FOCUS: 'D: 09 s3 and B4.',
  EXPERIENCE: 'D: 09 s3 and B4.',
  EXPERIENCE_MINIMUM: 'A for low-volume growth in untrained people (Pelland 2026 efficiency tiers); D: lead ruling R23 (register D222).',
  JOINT_RULES: 'C/D: 09 s6 and B6 (Siewe 2014 injury sites; Kolber 2014 for J3 and J4).',
  PROGRESSION: 'C: Rogerson 2024 (deload every 5.6 weeks, volume cut, frequency kept); B: compounds short of failure (Robinson 2024, Refalo 2024); D: the ladder; R1 (register D222).',
  CHECKIN: 'D: 09 s8.',
  PRIORITY: 'D: 09 B8, with founder Q1 = C (register D222).',
  TEMPLATES: 'D for structure, A for frequency (Pelland 2026): 09 B7; R11 to R13 and R21 (register D222).',
  SIBLING_MUSCLES: 'D: lead ruling R22 (register D222); where a muscle may take a session it is not listed in to reach its minimum.',
  rulebookCategory: 'D: lead ruling R15 (register D222); A: founder ruling 2026-10-19, an archetype shapes the general rulebook only.',
  ARCHETYPES: 'A: founder ruling 2026-10-19 (answers 1a, 2b, 3b, 4b): the five training styles and their re-tiered muscles, as approved; D: tiers per 09 B3.',
  ARCHETYPE_KEYS: 'A: founder ruling 2026-10-19.',
  archetypeCategory: 'A: founder ruling 2026-10-19; balanced is the general rulebook itself.',
  ARCHETYPE_CATEGORIES: 'A: founder ruling 2026-10-19.',
  archetypeOfCategory: 'A: founder ruling 2026-10-19.',
  STRENGTH_REP_RANGE: 'A: founder ruling 2026-10-19 (powerbuilder, 2b); B: Schoenfeld 2017 heavy-load band (1 to 6 reps near failure builds strength more than moderate loads); D: 09 B11 strength band, intermediate and advanced only.',
});
