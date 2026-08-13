/**
 * canonicality.js — Campaign 16 job 2: which exercises the AUTOMATIC plan
 * generator is allowed to reach for, and in what order of preference.
 *
 * THE PROBLEM THIS SOLVES
 *
 * An exercise can be perfectly eligible on paper - right muscle, right
 * equipment, right compound/isolation tag - and still be a poor default
 * for a generated bodybuilding plan. Before this layer, a 4-day
 * intermediate full-gym plan generated JM Press, Nordic Curl, Good Morning
 * and Cable Pull-Through: every one a real exercise, not one of them what
 * a good coach writes down for someone they have never met.
 *
 * The library is not the problem and is not being cut. A large library is
 * exactly what manual search and substitution need. What was missing is
 * the distinction between "this exercise exists and is valid" and "this
 * exercise is a sensible thing to hand someone automatically".
 *
 * THE TIERS
 *
 *   STAPLE      a standard bodybuilding movement, safe as a default
 *   COMMON      a widely recognised normal alternative
 *   SPECIALIST  useful when a specific region, equipment or user context
 *               justifies it - needs a programming reason
 *   NICHE       valid, but should rarely appear automatically
 *   NEVER_AUTO  searchable and manually selectable, never auto-generated
 *
 * FOUNDER RULING (C16): staples first, common as filler. Auto-generation
 * draws overwhelmingly from STAPLE, uses COMMON when a slot needs variety
 * or a family is thin, and only reaches SPECIALIST when a programming
 * reason demands it.
 *
 * HOW A TIER IS DECIDED
 *
 * Real-world bodybuilding prevalence, standard programming practice,
 * anatomical usefulness, equipment practicality, technical complexity, and
 * whether the movement is normally used as a PRIMARY hypertrophy lift.
 * Not alphabetical order, not a scraped ranking, not an EMG table. This is
 * versioned product metadata and it is meant to be argued with: it is one
 * file, one list per muscle, and correcting an entry is a one-line change.
 *
 * THE DEFAULT IS DELIBERATE. An exercise not named here resolves to
 * SPECIALIST, not STAPLE. A new library entry therefore needs a
 * programming reason before it can be generated, and can never
 * out-rank a staple by accident. Forgetting to classify something fails
 * toward the recognisable plan.
 *
 * CONTESTED entries are listed at the bottom, held at the SAFER tier until
 * the founder rules on each one specifically. They are not silently
 * decided here.
 */

export const AUTO_TIER = Object.freeze({
  STAPLE: 'staple',
  COMMON: 'common',
  SPECIALIST: 'specialist',
  NICHE: 'niche',
  NEVER_AUTO: 'never_auto',
});

/** Preference order for selection. Lower sorts first. */
export const TIER_RANK = Object.freeze({
  [AUTO_TIER.STAPLE]: 0,
  [AUTO_TIER.COMMON]: 1,
  [AUTO_TIER.SPECIALIST]: 2,
  [AUTO_TIER.NICHE]: 3,
  [AUTO_TIER.NEVER_AUTO]: 99,
});

// ─── STAPLE ──────────────────────────────────────────────────────────────
// The movements a competent coach writes down without hesitating. Every
// one is available in an ordinary commercial gym, teachable in one
// session, and normally used as a primary hypertrophy lift for its muscle.
const STAPLE = [
  // Chest: flat and incline pressing in each implement, plus the two
  // machine fly patterns everybody has access to.
  'Barbell Bench Press', 'Incline Barbell Bench Press',
  'Dumbbell Bench Press', 'Incline Dumbbell Press',
  'Machine Chest Press', 'Incline Machine Press',
  'Pec Deck (Machine Fly)', 'Cable Crossover (High to Low)',

  // Back: a vertical pull and a horizontal row in each common form, plus
  // the one shoulder-extension movement everyone recognises.
  'Lat Pulldown (Wide Grip)', 'Lat Pulldown (Neutral Grip)',
  'Lat Pulldown (Close Grip)', 'Pull-Up', 'Chin-Up',
  'Seated Cable Row', 'Chest-Supported Row (Dumbbell)',
  'Machine Row (Chest Supported)', 'Barbell Row (Bent Over)',
  'Dumbbell Row', 'T-Bar Row', 'Chest-Supported T-Bar Row',
  'Cable Straight-Arm Pulldown',

  // Side delts: the three raises that exist in every gym.
  'Dumbbell Lateral Raise', 'Cable Lateral Raise', 'Machine Lateral Raise',

  // Rear delts: the reverse fly patterns, machine first.
  'Reverse Pec Deck', 'Cable Rear Delt Fly', 'Dumbbell Rear Delt Fly',
  'Face Pull',

  // Front delts: overhead pressing.
  'Barbell Overhead Press', 'Dumbbell Shoulder Press',
  'Seated Dumbbell Press', 'Machine Shoulder Press',

  // Quads: the squat patterns and the extension.
  'Barbell Back Squat', 'Hack Squat Machine', 'Leg Press',
  'Bulgarian Split Squat', 'Leg Extension',

  // Hamstrings: one hinge, two curls.
  'Romanian Deadlift', 'Romanian Deadlift (Barbell)',
  'Romanian Deadlift (Dumbbell)', 'Seated Leg Curl', 'Lying Leg Curl',

  // Glutes: the thrust family.
  'Barbell Hip Thrust', 'Machine Hip Thrust',

  // Calves: straight-knee and bent-knee.
  'Standing Calf Raise (Machine)', 'Seated Calf Raise',
  'Seated Machine Calf Raise', 'Leg Press Calf Raise',

  // Biceps: the curls that need no explanation.
  'Barbell Curl', 'EZ Bar Curl', 'Dumbbell Curl', 'Hammer Curl',
  'Incline Dumbbell Curl', 'Cable Curl', 'Preacher Curl (EZ Bar)',

  // Triceps: pushdown, overhead, and the standard extension.
  'Tricep Pushdown (Rope)', 'Tricep Pushdown (Bar)',
  'Cable Pushdown (Straight Bar)', 'Rope Pushdown',
  'Overhead Cable Tricep Extension', 'EZ Bar Skull Crusher',
  'Close-Grip Bench Press',

  // Abs: loaded flexion and hanging raises.
  'Cable Crunch', 'Hanging Leg Raise', 'Hanging Knee Raise',

  // Traps.
  'Barbell Shrug', 'Dumbbell Shrug',
];

// ─── COMMON ──────────────────────────────────────────────────────────────
// Recognisable, normal alternatives. Used as filler when a slot needs
// variety, an equipment profile rules a staple out, or a movement family
// still needs covering.
const COMMON = [
  // Chest
  'Decline Barbell Bench Press', 'Decline Dumbbell Press', 'Dumbbell Fly',
  'Incline Dumbbell Fly', 'Weighted Dips (Chest)', 'Push-Up',
  'Smith Machine Bench Press', 'Incline Smith Machine Press',
  'Hammer Strength Chest Press', 'Plate-Loaded Chest Press',
  'Plate-Loaded Incline Press', 'Iso-Lateral Chest Press',
  'Cable Fly (Low to High)', 'Cable Fly (High to Low)', 'Cable Fly (Neutral)',
  'Cable Fly (Chest Height)', 'High Cable Fly', 'Low Cable Fly',
  'Incline Cable Fly', 'Cable Chest Press (Standing)',
  'Smith Machine Incline Press', 'Machine Chest Fly (Single-Arm)',
  'Chest Press Machine (Single-Arm)', 'Landmine Press', 'Decline Machine Press',
  'Wide-Grip Push-Up', 'Decline Push-Up', 'Incline Cable Chest Press',

  // Back
  'Weighted Pull-Up', 'Neutral Grip Pull-Up', 'Assisted Pull-Up',
  'Wide-Grip Pull-Up', 'Cable High Row', 'Single-Arm Cable Row',
  'Seated Machine Row (Wide)', 'Machine Row (Hammer Strength)',
  'Plate-Loaded Row', 'Plate-Loaded Lat Pulldown', 'Plate-Loaded High Row',
  'Plate-Loaded Low Row', 'V-Bar Pulldown', 'Cable Row (Wide Grip)',
  'Wide-Grip Cable Row', 'Landmine Row', 'Pendlay Row', 'Seal Row',
  'Inverted Row', 'Cable Lat Pullover', 'Single-Arm Lat Pulldown',
  'Iso-Lateral Front Pulldown', 'Smith Machine Row',
  'Chest-Supported Row (Barbell)', 'Cable Face Pull (Upper Back)',
  'Face Pull (Rope)', 'Hyperextension (Back Extension)',
  'Back Extension (Weighted)',

  // Side delts
  'Leaning Cable Lateral Raise', 'Seated Lateral Raise',
  'Lateral Raise Machine', 'Single-Arm Cable Lateral Raise',
  'Leaning Lateral Raise',

  // Rear delts
  'Machine Rear Delt Fly', 'Cable Face Pull', 'Cable Face Pull (Rope)',
  'Seated Rear Delt Machine', 'Plate-Loaded Rear Delt', 'Band Pull-Apart',
  'Bent-Over Cable Rear Delt Fly', 'Prone Reverse Fly',
  'Single-Arm Cable Rear Delt Fly', 'Reverse Cable Crossover',

  // Front delts
  'Arnold Press', 'Plate-Loaded Shoulder Press',
  'Machine Shoulder Press (Front Delt Focus)', 'Dumbbell Front Raise',
  'Cable Front Raise', 'Single-Arm Dumbbell Press',

  // Quads
  'Barbell Front Squat', 'Smith Machine Squat', 'Goblet Squat',
  'Walking Lunge', 'Dumbbell Lunge', 'Barbell Lunge', 'Reverse Lunge',
  'Split Squat', 'Step-Up (Dumbbell)', 'Single Leg Press',
  'Pendulum Squat', 'Belt Squat', 'Leg Press (Narrow Stance)',
  'Leg Press (High Foot)', 'Safety Bar Squat', 'SSB Squat',
  'Heel-Elevated Squat', 'Hatfield Squat', 'Sissy Squat Machine',

  // Hamstrings
  'Stiff-Leg Deadlift', 'Standing Leg Curl', 'Leg Curl (Cable)',
  'Prone Leg Curl', 'Single-Leg Romanian Deadlift',
  'Single-Leg Romanian Deadlift (DB)', 'B-Stance Romanian Deadlift',
  'Stiff-Leg Deadlift (Dumbbell)', 'Glute-Ham Raise Machine',
  'Dumbbell Single-Leg RDL', 'Landmine Romanian Deadlift',

  // Glutes
  'Dumbbell Hip Thrust', 'Smith Machine Hip Thrust',
  'Plate-Loaded Hip Thrust', 'Glute Bridge', 'Single Leg Hip Thrust',
  'Cable Kickback', 'Abduction Machine', 'Cable Hip Abduction',
  '45-Degree Hip Extension', 'Glute Kickback Machine',
  'Cable Donkey Kickback', 'Donkey Kickback (Machine)',
  'B-Stance Hip Thrust', 'Kickstand Hip Thrust',
  'Step-Up (Glute Focus)', 'Reverse Lunge (Glute Focus)',
  'Walking Lunge (Glute Focus)', 'Sumo Squat (Glute Focus)',

  // Calves
  'Standing Calf Raise (Barbell)', 'Smith Machine Calf Raise',
  'Seated Dumbbell Calf Raise', 'Dumbbell Calf Raise (Standing)',
  'Donkey Calf Raise', 'Donkey Calf Raise (Machine)',
  'Calf Raise on Leg Press Sled', 'Seated Calf Raise (Barbell)',
  'Single-Leg Calf Raise (Dumbbell)',

  // Biceps
  'Preacher Curl (Barbell)', 'Preacher Curl (Dumbbell)',
  'EZ Bar Preacher Curl', 'Preacher Curl Machine',
  'Plate-Loaded Preacher Curl', 'Machine Curl', 'Cable Hammer Curl (Rope)',
  'Cable Rope Hammer Curl', 'Concentration Curl', 'Spider Curl',
  'Seated Dumbbell Curl', 'Cross-Body Hammer Curl', 'Reverse Curl',
  'Incline Hammer Curl', 'Bayesian Curl', 'High Cable Curl',
  'Cable Concentration Curl',

  // Triceps
  'Dumbbell Skull Crusher', 'Barbell Skull Crusher',
  'Dumbbell Overhead Tricep Extension', 'Overhead Dumbbell Extension',
  'Cable Overhead Tricep Extension', 'Overhead Cable Rope Extension',
  'Plate-Loaded Overhead Extension', 'Machine Tricep Extension',
  'Triceps Extension Machine', 'Weighted Dips (Triceps)',
  'Tricep Dip (Parallel Bars)', 'Dip Machine', 'Seated Dip Machine',
  'Assisted Dip Machine', 'Single Arm Cable Extension',
  'Reverse Grip Cable Pushdown', 'Lying Tricep Extension',
  'Smith Machine Close-Grip Press', 'Bench Dip', 'Diamond Push-Up',
  'Single-Arm Overhead Cable Extension', 'Cross-Body Cable Tricep Extension',

  // Abs
  'Machine Crunch', 'Ab Crunch Machine', 'Decline Crunch', 'Crunch',
  'Reverse Crunch', 'Leg Raise', 'Leg Raise (Flat Bench)', 'Weighted Sit-Up',
  'Kneeling Cable Crunch', 'Ab Wheel Rollout', 'Ab Rollout',
  'Ab Wheel (Kneeling)', 'Kneeling Ab Rollout', 'Plank', 'Side Plank',
  'Pallof Press', 'Cable Woodchop', 'Cable Woodchop (High to Low)',
  'Cable Woodchop (Low to High)', 'Hanging Oblique Raise', 'Toe-to-Bar',
  'Incline Board Sit-Up', 'Exercise Ball Crunch', 'Bicycle Crunch', 'Sit-Up',
  'V-Up', 'Weighted Plank (Plate on Back)',

  // Traps
  'Cable Shrug', 'Smith Machine Shrug', 'Trap Bar Shrug', 'Hex Bar Shrug',
  'Incline Shrug', 'Single-Arm Dumbbell Shrug', 'Face Pull (Traps)',
];

// ─── NICHE ───────────────────────────────────────────────────────────────
// Real exercises that a coach would rarely put in someone's first plan:
// awkward setups, fiddly single-limb variants, band substitutes for a
// movement the gym already has, and pre-exhaust curiosities.
const NICHE = [
  // Chest
  'Svend Press', 'Cable Iron Cross', 'Push-Up Plus', 'Archer Push-Up',
  'Single-Arm Push-Up', 'Deficit Push-Up', 'Ring Push-Up',
  'Reverse-Grip Bench Press', 'Dumbbell Squeeze Press',
  'Floor Press (Dumbbell)', 'Close-Grip Push-Up', 'Band Chest Press',
  'Incline Push-Up (Hands Elevated)', 'Landmine Chest Press (Single-Arm)',
  'Standing Cable Chest Press (Single-Arm)', 'Dumbbell Pullover (Chest)',

  // Back
  'Meadows Row', 'Kroc Row', 'Helms Row', 'Batwing Row', 'Renegade Row',
  'Half-Kneeling Cable Row', 'Cable Reverse-Grip Pulldown', 'TRX Row',
  'Band Row', 'Band Lat Pulldown', 'Band Assisted Pull-Up',
  'Single-Arm Landmine Row', 'Cable Rope Straight-Arm Pulldown (Single-Arm)',
  'Barbell Row (Supinated)', 'Reverse Hyperextension',

  // Delts
  'Landmine Lateral Raise', 'Plate Lateral Raise', 'Dumbbell Y-Raise',
  'Band Lateral Raise', 'Cable Y-Raise (Standing)', 'Egyptian Lateral Raise',
  'Cable Lateral Raise (Behind the Back)', 'W-Raise', 'YTW',
  'Cable Y-Raise (Prone)', 'Prone Incline Y-Raise', 'Prone Incline T-Raise',
  'Dumbbell Side-Lying Rear Delt', 'Lying Rear Delt Row', 'Machine Y-Raise',
  'Landmine Rear Delt Row', 'Band Face Pull', 'Z-Press', 'Bradford Press',
  'Cuban Press', 'Barbell Front Raise', 'Plate Front Raise',
  'Kneeling Dumbbell Press', 'Half-Kneeling Shoulder Press',
  'Band Shoulder Press', 'Landmine Front Raise',

  // Legs
  'Sissy Squat', 'Wall Sit', 'Cyclist Squat', 'Box Squat', 'Pause Squat',
  'Spanish Squat', 'Sumo Squat', 'Front Squat (Dumbbell)', 'Curtsy Lunge',
  'Terminal Knee Extension', 'Zercher Squat', 'Anderson Squat', 'Pin Squat',
  'Cambered Bar Squat', 'Jefferson Squat', 'Kneeling Squat', 'Skater Squat',
  'Landmine Squat', 'Band Squat', 'Reverse Nordic Curl',
  'Smith Machine Front Squat', 'Bodyweight Bulgarian Split Squat',
  'Wall Ball Squat', 'Cable Squat (Standing)', 'Step-Up (Weighted)',
  'Step-Up (Barbell)',
  'Swiss Ball Leg Curl', 'Jefferson Curl', 'Stiff-Leg Deadlift (Single-Leg)',
  'Band Good Morning', 'Band Pull-Through', 'Band Deadlift', 'Band Leg Curl',
  'Bodyweight Single-Leg RDL', 'Kettlebell Romanian Deadlift',
  'Slider Leg Curl (Bodyweight)',
  'Frog Pump', 'Weighted Frog Pump', 'Donkey Kick', 'Monster Walk',
  'Banded Lateral Walk', 'Band Hip Thrust', 'Glute Squeeze Hold',
  'Nordic Glute Curl', 'Curtsy Lunge (Glute Focus)',
  'Deficit Reverse Lunge (Glute Focus)',
  'Single-Leg Calf Raise (Bodyweight)', 'Calf Raise on Steps',
  'Standing Calf Raise (Bodyweight)', 'Seated Bodyweight Calf Raise',
  'Eccentric Calf Raise (Bodyweight)',

  // Arms
  'Zottman Curl', 'Waiter Curl', 'TRX Curl', 'Prone Incline Curl',
  'Lying Cable Curl', 'Barbell Drag Curl', 'EZ Bar Drag Curl',
  'Zottman Preacher Curl', 'Band Bicep Curl', 'Cable Reverse Curl',
  'Cable Overhead Bicep Curl', 'Chin-Up (Supinated)',
  'Tate Press', 'Board Press', 'Close-Grip Floor Press', 'Tricep Kickback',
  'Cable Kickback (Triceps)', 'Band Tricep Pushdown',
  'Band Overhead Tricep Extension', 'Dumbbell Floor Skull Crusher',
  'Bench Press (Close Grip, Dumbbell)', 'Landmine Tricep Extension',
  'Decline Skull Crusher',

  // Abs and traps
  'Dragon Flag', 'L-Sit Hold', 'Stir the Pot', 'Hollow Body Hold',
  'Dead Bug', 'Bear Crawl', 'Mountain Climber', 'Plank Row',
  'Copenhagen Plank', 'Serratus Punch', 'Windmill', 'Turkish Get-Up',
  'Landmine Press (Abs)', 'Russian Twist', 'Weighted Russian Twist (Medicine Ball)',
  'Seated Twist (Plate)', 'Dumbbell Side Bend', 'Cable Side Bend',
  'Suitcase Carry', 'Single-Arm Farmer Carry', 'Reverse Plank',
  'Oblique V-Up', 'Landmine Twist', 'Landmine Rotation',
  'Behind-the-Back Barbell Shrug', 'Snatch Grip Shrug', 'Keg Carry',
  'Kettlebell Shrug', 'Cable Behind-the-Back Shrug',
  'Cable Upright Row (Traps)', 'Rack Pull (Traps)',
];

// ─── NEVER_AUTO ──────────────────────────────────────────────────────────
// Searchable and manually selectable; never chosen by the generator.
// Three reasons only, each stated: it is not a hypertrophy movement, it
// carries a risk profile no automatic plan should assign unprompted, or it
// is a competition/skill lift rather than a bodybuilding exercise.
const NEVER_AUTO = [
  // Not hypertrophy work: rate-of-force, carries and conditioning. The
  // pool generator already screens most of these; naming them here means
  // the rule survives even if that screen changes.
  'Power Clean', 'Clean Pull', 'Kettlebell Snatch', 'Kettlebell Clean and Press',
  'Kettlebell Swing', 'Box Jump', 'Jump Squat', 'Broad Jump', 'Depth Jump',
  'Tyre Flip', 'Sled Push', 'Sled Pull', 'Prowler Drag', 'Battle Ropes',
  'Assault Bike', 'Cycling (Stationary)', 'Stair Running', 'Rope Jump',
  'Agility Ladder Drills', 'GHD Sit-Up',

  // Risk profile too high to assign to someone unprompted.
  'Guillotine Press',        // bar descending to the throat
  'Upright Row',             // narrow-grip internal rotation under load
  'Barbell Upright Row (Wide)',
  'Cable Upright Row',
  'Viking Press',            // specialist strongman apparatus
  'Push Press',              // leg-driven, not a hypertrophy press

  // Skill / competition lifts, not bodybuilding movements.
  'Snatch Grip Deadlift', 'Deficit Deadlift',
];

// ─── CONTESTED (held at the safer tier, awaiting a founder ruling) ────────
// Genuinely arguable calls. Each is currently classified at the more
// conservative of the two defensible tiers, so nothing surprising can
// reach a plan while the question is open. Moving one is a one-line edit
// to the list above plus a line here.
export const CONTESTED = Object.freeze([
  {
    name: 'Barbell Front Squat',
    heldAt: AUTO_TIER.COMMON,
    argument: 'A real bodybuilding quad lift for some coaches and a weightlifting accessory for others. Held at COMMON so it can still be chosen, but never ahead of a back squat, hack squat or leg press for someone with no history.',
  },
  {
    name: 'Nordic Curl',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'Excellent hamstring stimulus, but most intermediates cannot control the eccentric and few gyms have a way to anchor the feet. Held at SPECIALIST: reachable when knee-flexion work is required and nothing better is available, never a default.',
  },
  {
    name: 'Good Morning (Barbell)',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'A legitimate hinge with a spinal-load profile that needs coaching. It was being generated as a primary hamstring movement ahead of the RDL, which is the defect this campaign exists to fix.',
  },
  {
    name: 'Conventional Deadlift',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'Whether a heavy deadlift belongs in an automatic hypertrophy plan is a genuine coaching disagreement: high systemic fatigue for back-hypertrophy return. Held at SPECIALIST rather than banned, so it appears only when the programme actually calls for it.',
  },
  {
    name: 'Sumo Deadlift',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'Same argument as the conventional deadlift, with an additional stance-suitability question Volyume cannot answer for an unseen athlete.',
  },
  {
    name: 'Trap Bar Deadlift',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'The most defensible of the deadlift family for hypertrophy and the easiest to teach, but it still competes with the squat pattern for the same recovery. Held with its siblings for consistency.',
  },
  {
    name: 'Rack Pull',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'A partial-range back/trap movement. Useful when it is chosen on purpose, odd when it arrives automatically.',
  },
  {
    name: 'Cable Pull-Through',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'Mostly a hinge-teaching and glute-pump movement. It was being generated as a primary hip hinge, which overstates its role.',
  },
  {
    name: 'JM Press',
    heldAt: AUTO_TIER.NICHE,
    argument: 'A powerlifting-derived triceps press that most lifters have never performed. It was reaching generated plans as a primary triceps movement.',
  },
  {
    name: 'Glute Ham Raise',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'Excellent where the apparatus exists, absent from most commercial gyms, and hard for an intermediate to complete unassisted.',
  },
  {
    name: 'Dumbbell Pullover',
    heldAt: AUTO_TIER.SPECIALIST,
    argument: 'Its primary target is genuinely disputed between chest and lats, so it is held out of both default pools rather than assigned to the wrong one.',
  },
]);

const CONTESTED_TIERS = new Map(CONTESTED.map(c => [c.name, c.heldAt]));

// One lookup, built once. Later lists never silently override earlier ones:
// a name appearing twice is a curation mistake and the guard test says so.
function buildRegistry() {
  const map = new Map();
  const add = (names, tier) => { for (const n of names) map.set(n, tier); };
  add(STAPLE, AUTO_TIER.STAPLE);
  add(COMMON, AUTO_TIER.COMMON);
  add(NICHE, AUTO_TIER.NICHE);
  add(NEVER_AUTO, AUTO_TIER.NEVER_AUTO);
  // Contested entries win, because their whole purpose is to sit at the
  // safer tier until ruled on.
  for (const [name, tier] of CONTESTED_TIERS) map.set(name, tier);
  return map;
}

const REGISTRY = buildRegistry();

/** Exported for the curation guard test, not for selection. */
export const REGISTRY_LISTS = Object.freeze({ STAPLE, COMMON, NICHE, NEVER_AUTO });

/**
 * The auto-generation tier for an exercise NAME.
 *
 * Unlisted resolves to SPECIALIST on purpose: a new library entry needs a
 * programming reason before the generator reaches for it, and can never
 * out-rank a staple by default.
 */
export function autoTier(name) {
  if (!name) return AUTO_TIER.SPECIALIST;
  return REGISTRY.get(name) ?? AUTO_TIER.SPECIALIST;
}

/** May the generator ever select this exercise? */
export function isAutoEligible(name) {
  return autoTier(name) !== AUTO_TIER.NEVER_AUTO;
}

/** Sort key: staples first, then common, and so on. */
export function tierRank(name) {
  return TIER_RANK[autoTier(name)] ?? TIER_RANK[AUTO_TIER.SPECIALIST];
}
