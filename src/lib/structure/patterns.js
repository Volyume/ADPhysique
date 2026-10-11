/**
 * patterns.js -- D222: the exercise catalogue, read as the rulebook's
 * movement patterns, for each equipment kit.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/09-RESEARCH-FINDINGS.md
 * s7 and B2 ("keep from the new planner: catalogue and roles"), as corrected
 * in 10-RESEARCH-VERIFICATION.md (R5) and register D222 (R16, below).
 *
 * WHAT IT DOES. Every role of the catalogue (src/lib/plan/catalogue.js) and
 * every thin-kit stand-in is given a rulebook pattern key, so the engine
 * reads a pattern's muscle, credits and joint tags from the rulebook, never
 * the catalogue's own credit table. A pattern decides the split muscles: a
 * vertical pull trains the lats and a row the upper back (both "back" to the
 * rest of the app); a hip thrust trains glute_max and an abduction glute_med
 * (both "glutes"). Every name keeps the muscle the rest of the app counts it
 * for, so a plan's volume claim and the sets its rows deliver stay the same
 * number.
 *
 * SUPPLEMENTS (R16). The catalogue has no glute-med, pullover or (in two
 * kits) lateral-raise choice, which the rulebook needs. The dumbbell lat
 * pullover is the library's Straight-Arm Dumbbell Pullover (register D222),
 * never the contested Dumbbell Pullover. They are added here,
 * not in the catalogue, so the older planner is untouched. Each is the plain
 * movement a person recognises. Two are rows the canonicality registry
 * ranks niche: the plate lateral raise (09 s7 names it for barbell kits) and
 * the band lateral raise (the bodyweight kit carries bands; without it side
 * delts, a priority muscle in five categories, would go untrained, which
 * founder rule F2 does not allow).
 *
 * Pure, no I/O, deterministic.
 */
import { CATALOGUE, THIN_KIT } from '../plan/catalogue';
import { PATTERNS } from './rulebook';

// The catalogue role each pattern comes from, by default for every name.
const ROLE_PATTERN = Object.freeze({
  'chest.flat_press': 'press_flat',
  'chest.incline_press': 'press_incline',
  'chest.chest_fly': 'fly',
  'back.vertical_pull': 'vpull',
  'back.horizontal_row': 'row_supported',
  'back.other_pull': 'row_supported',
  'side_delts.lateral_raise': 'lateral',
  'side_delts.lateral_raise_alt': 'lateral',
  'rear_delts.reverse_fly': 'rear_fly',
  'rear_delts.rear_delt_alt': 'rear_fly',
  'front_delts.overhead_press': 'ohp',
  'traps.shrug': 'shrug',
  'biceps.preacher_curl': 'curl',
  'biceps.standing_curl': 'curl',
  'biceps.hammer_curl': 'hammer',
  'triceps.overhead_extension': 'tri_overhead',
  'triceps.pushdown': 'pushdown',
  'triceps.close_grip_press': 'close_grip_press',
  'quads.squat_or_press': 'squat_machine',
  'quads.leg_extension': 'leg_ext',
  'quads.other_squat': 'squat_machine',
  'quads.lunge': 'lunge',
  'hamstrings.leg_curl': 'leg_curl',
  'hamstrings.hip_hinge': 'hinge',
  'glutes.hip_thrust': 'hip_thrust',
  'glutes.other_hip_thrust': 'hip_thrust',
  'glutes.glute_kickback': 'kickback',
  'glutes.glute_bridge': 'hip_thrust',
  'calves.standing_calf': 'calf',
  'calves.seated_calf': 'calf',
  'calves.leg_press_calf': 'calf',
  'abs.loaded_crunch': 'crunch',
  'abs.hanging_raise': 'leg_raise',
  'adductors.adduction_machine': 'adduction',
});

// Names whose movement is not their role's default pattern.
const NAME_PATTERN = Object.freeze({
  'Lat Pulldown (Wide Grip)': 'vpull',
  'Lat Pulldown (Neutral Grip)': 'vpull',
  'Pull-Up': 'vpull',
  'Chin-Up': 'vpull',
  'Barbell Row (Bent Over)': 'row_barbell',
  'Barbell Back Squat': 'squat_barbell',
  'Bodyweight Split Squat': 'lunge',
  'Bulgarian Split Squat': 'lunge',
  'Barbell Lunge': 'lunge',
  'Split Squat': 'lunge',
  'Bodyweight Reverse Lunge': 'lunge',
  'Bodyweight Walking Lunge': 'lunge',
  'Face Pull': 'face_pull',
  'EZ Bar Skull Crusher': 'skull',
  'Dumbbell Skull Crusher': 'skull',
  'Bench Dip': 'close_grip_press',
  'Tricep Dip (Parallel Bars)': 'close_grip_press',
  'Diamond Push-Up': 'close_grip_press',
  'Band Tricep Kickback': 'pushdown',
  'Band Hammer Curl': 'hammer',
});

// Joint tags a name adds to its pattern's (09 B2: barbell hinges and
// standing barbell presses load the spine; a barbell lunge carries the bar).
const NAME_EXTRA_JOINTS = Object.freeze({
  'Romanian Deadlift (Barbell)': ['spinal_axial'],
  'Smith Machine Romanian Deadlift': ['spinal_axial'],
  'Barbell Overhead Press': ['spinal_axial'],
  'Barbell Lunge': ['spinal_axial'],
  'Stiff-Leg Deadlift': ['spinal_axial'],
});

// R16: choices the catalogue lacks, per pattern, in preference order. Each
// is offered only where the person's kit carries it.
export const SUPPLEMENTS = Object.freeze({
  abduction: Object.freeze([
    { name: 'Abduction Machine', reason: 'Trains the side of the glutes, which hip thrusts reach less.', grade: 'D' },
    { name: 'Cable Hip Abduction', reason: 'Trains the side of the glutes, which hip thrusts reach less.', grade: 'D' },
    { name: 'Clamshell (Side-Lying)', reason: 'Trains the side of the glutes with no equipment.', grade: 'D' },
    { name: 'Band Standing Hip Abduction', reason: 'Trains the side of the glutes with a band.', grade: 'D' },
  ]),
  pullover: Object.freeze([
    { name: 'Cable Straight-Arm Pulldown', reason: 'Works the lats with straight arms, a second angle to a pulldown.', grade: 'D' },
    { name: 'Cable Lat Pullover', reason: 'Works the lats with straight arms, a second angle to a pulldown.', grade: 'D' },
    // 09 B11: "Dumbbells-only, men's physique 4d: pullover + one-arm row".
    { name: 'Straight-Arm Dumbbell Pullover', reason: 'Works the lats with straight arms, a second angle to a row.', grade: 'D' },
  ]),
  lateral: Object.freeze([
    { name: 'Seated Lateral Raise', reason: 'A lateral raise sitting down, so the body stays still.', grade: 'D' },
    { name: 'Leaning Lateral Raise', reason: 'A lateral raise leaning away from a support, hardest near the top.', grade: 'D' },
    { name: 'Plate Lateral Raise', reason: 'A lateral raise holding a plate.', grade: 'D' },
    { name: 'Band Lateral Raise', reason: 'A lateral raise with a band.', grade: 'D' },
  ]),
  // A chest-supported row trains the upper back without loading the spine
  // (09 B2 joint tags), so a barbell kit need not pair a bent-over row with
  // its squats and hinges.
  row_supported: Object.freeze([
    { name: 'Chest-Supported T-Bar Row', reason: 'A row with the chest supported, so the lower back is not loaded.', grade: 'D' },
    { name: 'Seal Row', reason: 'A row lying on a bench, so the lower back is not loaded.', grade: 'D' },
    { name: 'Chest-Supported Row (Barbell)', reason: 'A row with the chest supported, so the lower back is not loaded.', grade: 'D' },
  ]),
  hinge: Object.freeze([
    { name: 'Stiff-Leg Deadlift (Dumbbell)', reason: 'A hip hinge for the hamstrings with straight legs.', grade: 'D' },
    { name: 'Single-Leg Romanian Deadlift (DB)', reason: 'A one-leg hip hinge for the hamstrings with dumbbells.', grade: 'D' },
    { name: 'Stiff-Leg Deadlift', reason: 'A hip hinge for the hamstrings with straight legs.', grade: 'D' },
  ]),
  // R41: a dumbbell or home kit's elbow extension with the arm at the side,
  // so triceps are not held to the two overhead patterns' elbow cap.
  pushdown: Object.freeze([
    { name: 'Tricep Kickback', reason: 'Straightens the elbow with the arm at your side, for the triceps.', grade: 'D' },
  ]),
  // A kit with no bar to hang from still trains the lower abs (R16, user
  // audit: hanging raises are offered only where there is a bar).
  leg_raise: Object.freeze([
    { name: 'Reverse Crunch', reason: 'Curls the hips up off the floor for the lower abs.', grade: 'D' },
    { name: 'Leg Raise', reason: 'Raises straight legs lying on the floor for the lower abs.', grade: 'D' },
  ]),
  leg_curl: Object.freeze([
    { name: 'TRX Hamstring Curl', reason: 'A hamstring curl with suspension straps.', grade: 'D' },
    { name: 'Slider Leg Curl (Bodyweight)', reason: 'A hamstring curl on sliders.', grade: 'D' },
  ]),
});

// R24 (the sense order, D222): one movement once per session. A coach never
// writes two Romanian deadlifts, or a seated calf raise beside a seated
// machine calf raise, into one session. Two exercises of one pattern are
// the same movement unless they load the muscle differently; these are the
// differences that count:
// - lateral raises: the implement and lean (dumbbell, leaning, cable,
//   machine, plate, band) move the hardest point of the lift; a seated and a
//   standing dumbbell raise are one movement;
// - rows: a seated cable row, a chest-supported row (dumbbell, machine or
//   barbell on a bench), a T-bar row and a one-arm row each pull a different
//   path;
// - flyes, machine squats, lunges: each name loads the muscle differently;
// - calves: knee straight or bent (the bent knee shifts the work to the
//   soleus);
// - leg curls: seated (hip bent, the hamstring lengthened; Maeo 2021) or
//   lying and standing (hip straight);
// - hip thrusts: two legs or one;
// - vertical pulls: a pulldown (any grip: a wide and a neutral pulldown in
//   one session read as the same exercise twice, R33), a pull-up or a
//   chin-up;
// - curls: preacher, standing or cable;
// - abduction: seated (hip bent) or standing (hip straight), which load the
//   side of the hip in different positions as a seated and a lying leg curl
//   do the hamstrings; with one abduction a session, glute med could not
//   reach its minimum in bikini's 3-day week (R33, measured);
// Any other pattern is one movement whatever the name (a cable and a machine
// crunch, a rope and a bar pushdown, a pec deck and a dumbbell rear fly, a
// barbell and a dumbbell Romanian deadlift: two hinges in a session load the
// lower back twice, R26).
const BY_NAME = (name) => name;
const ONE_LEG = /single-leg|single leg|one-leg|one leg|b-stance/i;
const VARIANTS = Object.freeze({
  lateral: (name) => (/leaning/i.test(name) ? 'leaning' : /cable/i.test(name) ? 'cable' : /machine/i.test(name) ? 'machine'
    : /plate/i.test(name) ? 'plate' : /band/i.test(name) ? 'band' : 'dumbbell'),
  row_supported: (name) => (/cable/i.test(name) && !/single|one-arm/i.test(name) ? 'cable'
    : /t-bar/i.test(name) ? 't_bar' : /^dumbbell row$|single-arm|one-arm|single arm/i.test(name) ? 'one_arm'
      : /inverted/i.test(name) ? 'inverted' : 'chest_supported'),
  fly: BY_NAME,
  squat_machine: BY_NAME,
  lunge: BY_NAME,
  calf: (name) => (/seated/i.test(name) ? 'bent_knee' : 'straight_knee'),
  leg_curl: (name) => (/seated/i.test(name) ? 'hip_bent' : 'hip_straight'),
  hip_thrust: (name) => (ONE_LEG.test(name) ? 'one_leg' : 'two_legs'),
  vpull: (name) => (/chin-up|underhand|supinated/i.test(name) ? 'chin_up' : /pull-up|pullup/i.test(name) ? 'pull_up' : 'pulldown'),
  curl: (name) => (/preacher/i.test(name) ? 'preacher' : /cable/i.test(name) ? 'cable' : 'standing'),
  abduction: (name) => (/machine/i.test(name) ? 'seated' : 'standing'),
});

/**
 * The movement an exercise gives a session (R24): two exercises with the
 * same variant are the same movement twice.
 * @param {string} pattern  a rulebook pattern key
 * @param {string} name     the exercise name
 * @returns {string}
 */
export function variantOf(pattern, name) {
  const f = Object.prototype.hasOwnProperty.call(VARIANTS, pattern) ? VARIANTS[pattern] : null;
  return f ? `${pattern}:${f(String(name || ''))}` : String(pattern);
}

const GYM_KITS = new Set(['full_gym', 'machines_cables']);
// R38: a library name that is another name's machine under a second name; it
// is never offered beside its original (a seated calf raise one day and a
// "seated machine calf raise" the next read as two exercises).
const TWINS = Object.freeze({ 'Seated Machine Calf Raise': 'Seated Calf Raise' });
// Unloaded stand-ins, offered only where their pattern has no loaded choice in
// the kit (coach audit: a full-gym bikini week took clamshells because a
// fresh name won over the loaded cable abduction).
const UNLOADED = new Set(['Clamshell (Side-Lying)', 'Band Standing Hip Abduction']);
const NEEDS_BAR = /^hanging /i;
// R41 (coach audit 3): the dumbbell pullover is the straight-arm lat movement
// for kits without a cable; where the kit has a cable one, a gym's second
// back day takes it instead.
const NO_CABLE_ONLY = new Set(['Straight-Arm Dumbbell Pullover']);

const SUPPLEMENT_SOURCE = 'Added by the rulebook so this muscle can be trained with your equipment (register D222, R16)';
const HEAVY_CATEGORIES = new Set(['barbell', 'landmine']);
const MACHINE_CATEGORIES = new Set(['machine_selectorised', 'machine_plate_loaded']);

// The catalogue's kind rule (poolGenerator.deriveParamKey), rule for rule.
function kindOf(row) {
  const category = row.equipmentCategory ?? row.equipment_category;
  const ci = row.compoundIsolation ?? row.compound_isolation;
  if (ci === 'isolation') return 'isolation';
  if (HEAVY_CATEGORIES.has(category)) return 'heavy_compound';
  if (MACHINE_CATEGORIES.has(category)) return 'machine';
  return 'mod_compound';
}

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

const hasLoadPrescription = (row) => {
  const type = row.exerciseType ?? row.exercise_type ?? 'weight_reps';
  return type === 'weight_reps' || type === 'weighted_bodyweight';
};
const isCustomRow = (row) => row.isCustom === true || row.isCustom === 1 || row.is_custom === true || row.is_custom === 1;

// One row per name: a built-in row beats a custom row, then the lower id.
function indexLibrary(library) {
  const byName = new Map();
  for (const row of Array.isArray(library) ? library : []) {
    if (!row || typeof row.name !== 'string') continue;
    const held = byName.get(row.name);
    if (!held) { byName.set(row.name, row); continue; }
    const a = isCustomRow(row);
    const b = isCustomRow(held);
    if (a !== b) { if (!a) byName.set(row.name, row); continue; }
    if (String(row.id ?? '') < String(held.id ?? '')) byName.set(row.name, row);
  }
  return byName;
}

/** The rulebook pattern of a catalogue name filling a role, or null. */
export function patternForName(muscle, roleId, name) {
  return NAME_PATTERN[name] ?? ROLE_PATTERN[`${muscle}.${roleId}`] ?? null;
}

/**
 * @typedef {object} PatternChoice
 * @property {string} name
 * @property {string|null} exerciseId
 * @property {string} pattern       a rulebook pattern key
 * @property {string} muscle        the rulebook muscle the pattern trains
 * @property {'heavy_compound'|'mod_compound'|'machine'|'isolation'} kind
 * @property {string[]} extraJoints joint tags the name adds to its pattern's
 * @property {string} reason        one plain sentence a person reads beside the name
 * @property {string} grade
 * @property {string} source
 * @property {'catalogue'|'thin_kit'|'supplement'} from
 * @property {boolean} logged       the person has logged it
 */

/**
 * Every choice the person's kit carries, per rulebook pattern, in
 * preference order: the person's own logged exercise first, then the
 * catalogue's role order, then the kit's stand-ins, then the supplements.
 *
 * @param {object} args
 * @param {Array<object>} args.library
 * @param {string} [args.profile]  full_gym when omitted
 * @param {Iterable<string>} [args.loggedExerciseNames]
 * @returns {{ byPattern: Object<string, PatternChoice[]>, untrainable: string[], solePatternMuscles: string[] }}
 */
export function structureChoices({ library, profile, loggedExerciseNames } = {}) {
  const kit = profile == null || profile === '' ? 'full_gym' : String(profile);
  const logged = new Set(loggedExerciseNames ? [...loggedExerciseNames] : []);
  const rows = indexLibrary(library);
  const thin = THIN_KIT[kit] ?? {};
  const byPattern = {};
  const seen = new Set();

  // A hanging raise needs a bar to hang from: a gym has one, and so does a
  // kit whose pulls include the pull-up. Dumbbells at home do not (the user
  // audit of the rendered plans, D222).
  const pullUp = rows.get('Pull-Up');
  const hasBar = GYM_KITS.has(kit) || (!!pullUp && profilesOf(pullUp).includes(kit));
  const offer = (name, pattern, meta) => {
    if (!pattern || !PATTERNS[pattern] || seen.has(`${pattern}|${name}`)) return;
    if (!hasBar && NEEDS_BAR.test(name)) return;
    const row = rows.get(name);
    if (!row || !hasLoadPrescription(row) || !profilesOf(row).includes(kit)) return;
    seen.add(`${pattern}|${name}`);
    (byPattern[pattern] ||= []).push({
      name,
      exerciseId: row.id ?? null,
      pattern,
      muscle: PATTERNS[pattern].muscle,
      kind: kindOf(row),
      extraJoints: [...(NAME_EXTRA_JOINTS[name] || [])],
      reason: meta.reason,
      grade: meta.grade,
      source: meta.source,
      from: meta.from,
      logged: logged.has(name),
    });
  };

  for (const [muscle, roles] of Object.entries(CATALOGUE)) {
    for (const r of roles) {
      if (r.credited) continue;
      for (const name of r.names) {
        offer(name, patternForName(muscle, r.id, name), {
          reason: r.reasonByName?.[name] ?? r.reason, grade: r.grade, source: r.source, from: 'catalogue',
        });
      }
      for (const name of thin[muscle]?.[r.id] || []) {
        offer(name, patternForName(muscle, r.id, name), {
          reason: 'Chosen because it suits your equipment.', grade: 'D', source: 'A stand-in for this kit, not from a trial', from: 'thin_kit',
        });
      }
    }
  }
  for (const [pattern, list] of Object.entries(SUPPLEMENTS)) {
    for (const s of list) offer(s.name, pattern, { reason: s.reason, grade: s.grade, source: SUPPLEMENT_SOURCE, from: 'supplement' });
  }

  // The person's own logged exercise first within each pattern; otherwise
  // the order above, which is stable. A twin goes where its original is
  // offered (R38), unless the person logs the twin and not the original.
  for (const [p, list] of Object.entries(byPattern)) {
    const names = new Set(list.map((c) => c.name));
    const loaded = list.some((c) => !UNLOADED.has(c.name));
    const cable = list.some((c) => /cable/i.test(c.name));
    byPattern[p] = list.filter((c) => !(TWINS[c.name] && names.has(TWINS[c.name]) && !(c.logged && !list.find((o) => o.name === TWINS[c.name]).logged)))
      .filter((c) => !(loaded && UNLOADED.has(c.name) && !c.logged))
      .filter((c) => !(cable && NO_CABLE_ONLY.has(c.name) && !c.logged));
    byPattern[p].sort((a, b) => Number(b.logged) - Number(a.logged));
  }

  const patternsByMuscle = {};
  for (const [key, p] of Object.entries(PATTERNS)) (patternsByMuscle[p.muscle] ||= []).push(key);
  const untrainable = [];
  const solePatternMuscles = [];
  for (const [muscle, keys] of Object.entries(patternsByMuscle)) {
    const available = keys.filter((k) => (byPattern[k] || []).length > 0);
    if (available.length === 0) untrainable.push(muscle);
    if (available.length === 1 && kit !== 'full_gym') solePatternMuscles.push(muscle);
  }
  return { byPattern, untrainable, solePatternMuscles };
}
