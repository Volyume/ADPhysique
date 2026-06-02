import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllExercises, insertExercise, insertExerciseWithId, updateExerciseMetadata } from './database';
import { deriveExerciseMetadata } from './exerciseMetadata';

const SEEDED_KEY = '@volyume_exercises_seeded_v7';
// Bumped when the derived metadata changes so the backfill re-runs once.
const METADATA_BACKFILL_KEY = '@volyume_exercise_metadata_backfilled_v1';
// Bumped when exercises are added to RAW so the top-up scans for the new
// canonical IDs once on installs that already seeded an earlier list.
const LIBRARY_VERSION_KEY = '@volyume_exercise_library_topped_up_v2';

// ─── Deterministic canonical exercise IDs ────────────────────────────────
//
// Canonical exercises ship in every install. Originally their IDs were
// random UUIDs minted by uid() inside insertExercise, which meant the
// SAME exercise on two devices ended up with two different IDs.
// That broke cross-device sync as soon as a routine pushed its
// routine_exercises rows: the new device's pull saw the exercise_id
// from the old device's random seed, found no local match, and the
// INNER JOIN that powers ActiveWorkoutScreen returned zero rows even
// though the routine card showed the correct exercise count.
//
// canonicalExerciseId() hashes the exercise NAME into a UUID-shaped
// string so every device produces the same canonical ID for the same
// canonical name. New routine_exercises pushed from this build land
// in the cloud with IDs the next device's seed will produce
// independently, and the JOIN resolves naturally.
//
// Custom exercises are unaffected, they keep their random uid() and
// already round-trip via syncCustomExercises.
//
// The hash is a 128-bit MurmurHash-style mixer split across four
// lanes seeded with distinct primes so a one-character change in the
// name avalanches across the whole output. Pure JS, no crypto
// dependency.
export function canonicalExerciseId(name) {
  const s = String(name || '').toLowerCase().trim();
  // Four 32-bit lanes mixed with name bytes. Lane seeds are
  // distinct large primes chosen so even single-byte inputs (we
  // don't expect any but it's polite) produce well-distributed
  // outputs.
  let a = 0xdeadbeef, b = 0x41c6ce57, c = 0x1b873593, d = 0xcc9e2d51;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    a = Math.imul(a ^ ch, 2654435761);
    b = Math.imul(b ^ ch, 1597334677);
    c = Math.imul(c ^ ch, 2246822507);
    d = Math.imul(d ^ ch, 3266489909);
  }
  // Final avalanche so the high bits depend on every input byte.
  a = Math.imul(a ^ (a >>> 16), 2246822507);
  a ^= Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507);
  b ^= Math.imul(c ^ (c >>> 13), 3266489909);
  c = Math.imul(c ^ (c >>> 16), 2246822507);
  c ^= Math.imul(d ^ (d >>> 13), 3266489909);
  d = Math.imul(d ^ (d >>> 16), 2246822507);
  d ^= Math.imul(a ^ (a >>> 13), 3266489909);
  const h = (x) => (x >>> 0).toString(16).padStart(8, '0');
  // 32 hex chars total. Format as UUID v4: 8-4-4-4-12 with the
  // version (4) and variant (8/9/a/b) nibbles set per RFC 4122 so
  // anywhere that strictly validates a UUID still accepts it.
  const full = h(a) + h(b) + h(c) + h(d);
  const seg1 = full.substring(0, 8);
  const seg2 = full.substring(8, 12);
  const seg3 = '4' + full.substring(13, 16);
  const variantNibble = ((parseInt(full[16], 16) & 0x3) | 0x8).toString(16);
  const seg4 = variantNibble + full.substring(17, 20);
  const seg5 = full.substring(20, 32);
  return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5}`;
}

// Anatomical subregion tags, used by planEngine v2 to enforce balanced muscle coverage.
// Muscles not listed here (e.g. biceps, forearms) do not have enforced subregion requirements.
const SUBREGION_MAP = {
  // Back, vertical pull vs horizontal row
  'Lat Pulldown (Wide Grip)':        'vertical_pull',
  'Lat Pulldown (Close Grip)':       'vertical_pull',
  'Lat Pulldown (Neutral Grip)':     'vertical_pull',
  'Pull-Up':                         'vertical_pull',
  'Weighted Pull-Up':                'vertical_pull',
  'Chin-Up':                         'vertical_pull',
  'Neutral Grip Pull-Up':            'vertical_pull',
  'Assisted Pull-Up':                'vertical_pull',
  'Single-Arm Lat Pulldown':         'vertical_pull',
  'Cable Lat Pullover':              'vertical_pull',
  'Cable Straight-Arm Pulldown':     'vertical_pull',
  'Barbell Row (Bent Over)':         'horizontal_row',
  'Dumbbell Row':                    'horizontal_row',
  'T-Bar Row':                       'horizontal_row',
  'Seated Cable Row':                'horizontal_row',
  'Machine Row (Chest Supported)':   'horizontal_row',
  'Landmine Row':                    'horizontal_row',
  'Pendlay Row':                     'horizontal_row',
  'Inverted Row':                    'horizontal_row',
  'Cable High Row':                  'horizontal_row',
  'Single-Arm Cable Row':            'horizontal_row',
  'Meadows Row':                     'horizontal_row',
  'Kroc Row':                        'horizontal_row',
  'Seal Row':                        'horizontal_row',
  'Chest-Supported Row (Dumbbell)':  'horizontal_row',
  'Chest-Supported Row (Barbell)':   'horizontal_row',
  'Seated Machine Row (Wide)':       'horizontal_row',
  'Chest-Supported T-Bar Row':       'horizontal_row',
  'Helms Row':                       'horizontal_row',
  'Barbell Row (Supinated)':         'horizontal_row',
  'Conventional Deadlift':           'lower_lat',
  'Sumo Deadlift':                   'lower_lat',
  'Rack Pull':                       'lower_lat',
  'Trap Bar Deadlift':               'lower_lat',
  'Snatch Grip Deadlift':            'lower_lat',
  'Deficit Deadlift':                'lower_lat',
  'Romanian Deadlift (Barbell)':     'lower_lat',
  'Hyperextension (Back Extension)': 'lower_lat',
  'Reverse Hyperextension':          'lower_lat',
  'Romanian Deadlift (Single-Leg)':  'lower_lat',
  'Stiff-Leg Deadlift (Dumbbell)':   'lower_lat',
  'Back Extension (Weighted)':       'lower_lat',

  // Back, additional rows
  'Cable Row (Wide Grip)':           'horizontal_row',
  'Single-Arm Dumbbell Row (Supported)': 'horizontal_row',
  'Machine Row (Hammer Strength)':   'horizontal_row',
  'TRX Row':                         'horizontal_row',

  // Chest, incline vs flat vs decline
  'Barbell Bench Press':             'flat',
  'Dumbbell Bench Press':            'flat',
  'Machine Chest Press':             'flat',
  'Cable Fly (Neutral)':             'flat',
  'Cable Crossover (High to Low)':   'flat',
  'Dumbbell Fly':                    'flat',
  'Pec Deck (Machine Fly)':          'flat',
  'Smith Machine Bench Press':       'flat',
  'Cable Fly (Chest Height)':        'flat',
  'Svend Press':                     'flat',
  'Wide-Grip Push-Up':               'flat',
  'Push-Up':                         'flat',
  'Ring Push-Up':                    'flat',
  'Incline Barbell Bench Press':     'incline',
  'Incline Dumbbell Press':          'incline',
  'Incline Dumbbell Fly':            'incline',
  'Incline Machine Press':           'incline',
  'Cable Fly (Low to High)':         'incline',
  'Landmine Press':                  'incline',
  'Incline Smith Machine Press':     'incline',
  'Incline Cable Fly':               'incline',
  'Low Cable Fly':                   'incline',
  'High Cable Fly':                  'flat',
  'Decline Barbell Bench Press':     'decline',
  'Decline Dumbbell Press':          'decline',
  'Weighted Dips (Chest)':           'decline',
  'Decline Dumbbell Fly':            'decline',
  'Decline Push-Up':                 'decline',
  'Decline Machine Press':           'decline',
  'Reverse-Grip Bench Press':        'flat',
  'Dumbbell Squeeze Press':          'flat',
  'Cable Fly (Low to High) (Alt)':   'incline',

  // Delts, overhead press (front) vs lateral raise (side) vs face pull / fly (rear)
  'Barbell Overhead Press':          'overhead_press',
  'Dumbbell Shoulder Press':         'overhead_press',
  'Arnold Press':                    'overhead_press',
  'Machine Shoulder Press':          'overhead_press',
  'Seated Dumbbell Press':           'overhead_press',
  'Z-Press':                         'overhead_press',
  'Push Press':                      'overhead_press',
  'Viking Press':                    'overhead_press',
  'Plate-Loaded Shoulder Press':     'overhead_press',
  'Kettlebell Clean and Press':      'overhead_press',
  'Kneeling Dumbbell Press':         'overhead_press',
  'Single-Arm Dumbbell Press':       'overhead_press',
  'Half-Kneeling Shoulder Press':    'overhead_press',
  'Dumbbell Lateral Raise':          'lateral_raise',
  'Cable Lateral Raise':             'lateral_raise',
  'Machine Lateral Raise':           'lateral_raise',
  'Leaning Cable Lateral Raise':     'lateral_raise',
  'Plate Lateral Raise':             'lateral_raise',
  'Leaning Lateral Raise':           'lateral_raise',
  'Landmine Lateral Raise':          'lateral_raise',
  'Seated Lateral Raise':            'lateral_raise',
  'Upright Row':                     'lateral_raise',
  'Dumbbell Rear Delt Fly':          'horiz_abduction',
  'Cable Rear Delt Fly':             'horiz_abduction',
  'Machine Rear Delt Fly':           'horiz_abduction',
  'Reverse Pec Deck':                'horiz_abduction',
  'Cable Y-Raise (Prone)':           'horiz_abduction',
  'Dumbbell Side-Lying Rear Delt':   'horiz_abduction',
  'W-Raise':                         'horiz_abduction',
  'YTW':                             'horiz_abduction',
  'Cable Face Pull':                 'face_pull',
  'Face Pull':                       'face_pull',
  'Face Pull (Rope)':                'face_pull',
  'Lying Rear Delt Row':             'horiz_abduction',
  'Prone Incline Y-Raise':           'horiz_abduction',
  'Prone Incline T-Raise':           'horiz_abduction',
  'Seated Rear Delt Machine':        'horiz_abduction',
  'Bent-Over Cable Rear Delt Fly':   'horiz_abduction',
  'Cable Face Pull (Rope)':          'face_pull',

  // Hamstrings, hip extension vs knee flexion
  'Romanian Deadlift':               'hip_extension',
  'Stiff-Leg Deadlift':              'hip_extension',
  'Good Morning':                    'hip_extension',
  'Single-Leg Romanian Deadlift':    'hip_extension',
  'Single-Leg Romanian Deadlift (DB)': 'hip_extension',
  'B-Stance Romanian Deadlift':      'hip_extension',
  'Dumbbell Single-Leg RDL':         'hip_extension',
  'Cable Stiff-Leg Deadlift':        'hip_extension',
  'Nordic Hamstring Curl':           'knee_flexion',
  'Prone Leg Curl':                  'knee_flexion',
  'Nordic Curl':                     'knee_flexion',
  'Lying Leg Curl':                  'knee_flexion',
  'Seated Leg Curl':                 'knee_flexion',
  'Standing Leg Curl':               'knee_flexion',
  'Swiss Ball Leg Curl':             'knee_flexion',
  'Glute Ham Raise':                 'knee_flexion',
  'Leg Curl (Cable)':                'knee_flexion',

  // Triceps, overhead (long head) vs pushdown
  'EZ Bar Skull Crusher':            'overhead',
  'Dumbbell Skull Crusher':          'overhead',
  'Decline Skull Crusher':           'overhead',
  'Cable Overhead Tricep Extension': 'overhead',
  'Close-Grip Floor Press':          'pushdown',
  'Reverse Grip Cable Pushdown':     'pushdown',
  'Overhead Dumbbell Extension':     'overhead',
  'Dumbbell Overhead Tricep Extension': 'overhead',
  'Overhead Cable Tricep Extension': 'overhead',
  'JM Press':                        'pushdown',
  'Board Press':                     'pushdown',
  'Tricep Pushdown (Bar)':           'pushdown',
  'Tricep Pushdown (Rope)':          'pushdown',
  'Cable Pushdown (Straight Bar)':   'pushdown',
  'Rope Pushdown':                   'pushdown',
  'Machine Tricep Extension':        'pushdown',
  'Close-Grip Bench Press':          'pushdown',
  'Bench Dip':                       'pushdown',
  'Diamond Push-Up':                 'pushdown',
  'Single Arm Cable Extension':      'pushdown',
  'Tate Press':                      'pushdown',
  'Tricep Kickback':                 'pushdown',
  'Weighted Dips (Triceps)':         'pushdown',
  'Lying Tricep Extension':          'overhead',

  // Calves, gastrocnemius vs soleus
  'Standing Calf Raise (Machine)':   'gastro',
  'Standing Calf Raise (Barbell)':   'gastro',
  'Leg Press Calf Raise':            'gastro',
  'Smith Machine Calf Raise':        'gastro',
  'Donkey Calf Raise':               'gastro',
  'Dumbbell Calf Raise (Standing)':  'gastro',
  'Single-Leg Calf Raise (Bodyweight)': 'gastro',
  'Calf Raise on Steps':             'gastro',
  'Seated Calf Raise':               'soleus',
  'Seated Machine Calf Raise':       'soleus',
  'Seated Dumbbell Calf Raise':      'soleus',

  // Calves, additional gastro entries
  'Single-Leg Calf Raise (Dumbbell)':  'gastro',
  'Calf Raise on Leg Press Sled':      'gastro',
  'Standing Calf Raise (Bodyweight)':  'gastro',
  'Jump Rope':                         'gastro',

  // Abs, flexion vs anti-extension vs rotation
  'Cable Crunch':                    'flexion',
  'Decline Crunch':                  'flexion',
  'Machine Crunch':                  'flexion',
  'Hanging Knee Raise':              'flexion',
  'Hanging Leg Raise':               'flexion',
  'Reverse Crunch':                  'flexion',
  'Crunch':                          'flexion',
  'Bicycle Crunch':                  'flexion',
  'Leg Raise':                       'flexion',
  'Sit-Up':                          'flexion',
  'V-Up':                            'flexion',
  'Leg Raise (Flat Bench)':          'flexion',
  'Dragon Flag':                     'anti_extension',
  'Ab Rollout':                      'anti_extension',
  'Ab Wheel Rollout':                'anti_extension',
  'Plank':                           'anti_extension',
  'Dead Bug':                        'anti_extension',
  'Pallof Press':                    'anti_extension',
  'Side Plank':                      'anti_extension',
  'Hollow Body Hold':                'anti_extension',
  'Stir the Pot':                    'anti_extension',
  'Russian Twist':                   'rotation',
  'Cable Woodchop':                  'rotation',
  'Landmine Twist':                  'rotation',
  'Landmine Rotation':               'rotation',

  // Plate-loaded / machine additions (phase 7 step 5), tagged into the
  // existing per-muscle subregion vocab so selection can reason about
  // coverage the same way it does for the rest of the library.
  'Plate-Loaded Incline Press':      'incline',
  'Plate-Loaded Chest Press':        'flat',
  'Plate-Loaded Decline Press':      'decline',
  'Iso-Lateral Chest Press':         'flat',
  'Plate-Loaded Lat Pulldown':       'vertical_pull',
  'Iso-Lateral Front Pulldown':      'vertical_pull',
  'Plate-Loaded Row':                'horizontal_row',
  'Plate-Loaded High Row':           'horizontal_row',
  'Plate-Loaded Low Row':            'horizontal_row',
  'Plate-Loaded Rear Delt':          'horiz_abduction',
  // Triceps long-head fix: overhead bias (Maeo). These satisfy the
  // existing triceps `overhead` subregion requirement.
  'Overhead Cable Rope Extension':   'overhead',
  'Plate-Loaded Overhead Extension': 'overhead',
  'Triceps Extension Machine':       'pushdown',
  'Seated Dip Machine':              'pushdown',
  'Assisted Dip Machine':            'pushdown',
  'Lateral Raise Machine':           'lateral_raise',
  'Ab Crunch Machine':               'flexion',
  // Glutes, Contreras split-by-type (rebuild spec phase 3): activator (peak
  // contraction / short position), stretcher (loaded lengthened), pumper
  // (abduction / kickback, medius + metabolite). Lets a high-volume glute
  // program spread across fatigue profiles instead of repeating hip thrusts.
  'Barbell Hip Thrust':              'activator',
  'Dumbbell Hip Thrust':             'activator',
  'Smith Machine Hip Thrust':        'activator',
  'Machine Hip Thrust':              'activator',
  'Single Leg Hip Thrust':           'activator',
  'Plate-Loaded Hip Thrust':         'activator',
  'Kickstand Hip Thrust':            'activator',
  'Glute Bridge':                    'activator',
  'Frog Pump':                       'activator',
  '45-Degree Hip Extension':         'activator',
  'Reverse Hyperextension (Glute)':  'activator',
  'Cable Pull-Through (Glute)':      'activator',
  'Cable Pull-Through':              'activator',
  'Hip Extension (Cable)':           'activator',
  'Glute Squeeze Hold':              'activator',
  'Romanian Deadlift (Glute)':       'stretcher',
  'Sumo Deadlift (Glute Focus)':     'stretcher',
  'Sumo Deadlift (Wide Stance)':     'stretcher',
  'Sumo Squat (Glute Focus)':        'stretcher',
  'Walking Lunge (Glute Focus)':     'stretcher',
  'Curtsy Lunge (Glute Focus)':      'stretcher',
  'Reverse Lunge (Glute Focus)':     'stretcher',
  'Step-Up (Glute Focus)':           'stretcher',
  'Nordic Glute Curl':               'stretcher',
  'Cable Kickback':                  'pumper',
  'Donkey Kick':                     'pumper',
  'Cable Donkey Kickback':           'pumper',
  'Donkey Kickback (Machine)':       'pumper',
  'Glute Kickback Machine':          'pumper',
  'Abduction Machine':               'pumper',
  'Cable Hip Abduction':             'pumper',
  'Monster Walk':                    'pumper',
  // Quads, sweep vs mass (rebuild spec phase 3). Sweep = knee-forward,
  // narrow/low-foot, front-loaded, hack/sissy (rectus + outer sweep, the
  // Classic/Wellness judging trait). Untagged squat patterns default to the
  // mass tag (vasti). Lets the sweep-judged divisions bias their quad pool.
  'Hack Squat Machine':              'sweep',
  'Barbell Front Squat':             'sweep',
  'Front Squat (Dumbbell)':          'sweep',
  'Sissy Squat':                     'sweep',
  'Cyclist Squat':                   'sweep',
  'Spanish Squat':                   'sweep',
  'Heel-Elevated Squat':             'sweep',
  'Leg Extension':                   'sweep',
  'Terminal Knee Extension':         'sweep',
  'Pendulum Squat':                  'sweep',
  'Leg Press (Narrow Stance)':       'sweep',
};

// [name, primaryMuscle, secondaryMuscles, equipment, movementPattern, isCompound, minReps, maxReps, fatigueCost, sfr]
// fatigueCost: 1-10 (10 = very high systemic fatigue, e.g. deadlift)
// sfr: stimulus-to-fatigue ratio 1-10 (10 = excellent stimulus with low fatigue)
const RAW = [
  // ─── CHEST ───────────────────────────────────────────────────────────────────
  ['Barbell Bench Press',           'chest', ['triceps', 'front_delts'],   'barbell',      'push',      true,  4, 8,   4, 3],
  ['Incline Barbell Bench Press',   'chest', ['triceps', 'front_delts'],   'barbell',      'push',      true,  5, 10,  4, 3],
  ['Decline Barbell Bench Press',   'chest', ['triceps'],                  'barbell',      'push',      true,  6, 10,  3, 3],
  ['Dumbbell Bench Press',          'chest', ['triceps', 'front_delts'],   'dumbbell',     'push',      true,  6, 12,  3, 4],
  ['Incline Dumbbell Press',        'chest', ['triceps', 'front_delts'],   'dumbbell',     'push',      true,  8, 15,  3, 4],
  ['Decline Dumbbell Press',        'chest', ['triceps'],                  'dumbbell',     'push',      true,  8, 15,  3, 4],
  ['Cable Fly (Low to High)',       'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['Cable Crossover (High to Low)', 'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['Dumbbell Fly',                  'chest', [],                           'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Incline Dumbbell Fly',          'chest', [],                           'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Decline Dumbbell Fly',          'chest', [],                           'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Pec Deck (Machine Fly)',        'chest', [],                           'machine',      'isolation', false, 12, 20, 2, 5],
  ['Machine Chest Press',           'chest', ['triceps', 'front_delts'],   'machine',      'push',      true,  8, 15,  3, 4],
  ['Incline Machine Press',         'chest', ['triceps', 'front_delts'],   'machine',      'push',      true,  8, 15,  3, 4],
  ['Decline Machine Press',         'chest', ['triceps'],                  'machine',      'push',      true,  8, 15,  3, 4],
  ['Weighted Dips (Chest)',         'chest', ['triceps', 'front_delts'],   'bodyweight',   'push',      true,  6, 15,  4, 3],
  ['Push-Up',                       'chest', ['triceps', 'front_delts'],   'bodyweight',   'push',      true,  10, 20, 2, 3],
  ['Wide-Grip Push-Up',             'chest', ['triceps', 'front_delts'],   'bodyweight',   'push',      true,  10, 20, 2, 3],
  ['Decline Push-Up',               'chest', ['triceps', 'front_delts'],   'bodyweight',   'push',      true,  10, 20, 2, 3],
  ['Ring Push-Up',                  'chest', ['triceps', 'front_delts'],   'bodyweight',   'push',      true,  8, 15,  3, 4],
  ['Landmine Press',                'chest', ['front_delts'],              'barbell',      'push',      true,  8, 15,  3, 4],
  ['Smith Machine Bench Press',     'chest', ['triceps', 'front_delts'],   'smith_machine','push',      true,  6, 12,  3, 3],
  ['Incline Smith Machine Press',   'chest', ['triceps', 'front_delts'],   'smith_machine','push',      true,  8, 15,  3, 4],
  ['Cable Fly (Neutral)',           'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['Cable Fly (Chest Height)',      'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['High Cable Fly',                'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['Low Cable Fly',                 'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['Incline Cable Fly',             'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['Svend Press',                   'chest', [],                           'barbell',      'isolation', false, 15, 25, 2, 4],
  ['Dumbbell Pullover',             'chest', ['back'],                     'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Hammer Strength Chest Press',   'chest', ['triceps', 'front_delts'],   'machine',      'push',      true,  8, 15,  3, 4],
  ['Reverse-Grip Bench Press',      'chest', ['triceps', 'front_delts'],   'barbell',      'push',      true,  6, 12,  3, 4],
  ['Dumbbell Squeeze Press',        'chest', ['triceps'],                  'dumbbell',     'push',      true,  8, 15,  2, 4],
  ['Cable Fly (High to Low)',       'chest', [],                           'cable',        'isolation', false, 12, 20, 2, 5],
  ['Dumbbell Pullover (Chest)',     'chest', ['back'],                     'dumbbell',     'isolation', false, 10, 15, 2, 4],

  // ─── BACK ────────────────────────────────────────────────────────────────────
  ['Barbell Row (Bent Over)',       'back', ['biceps', 'rear_delts'],      'barbell',      'pull',      true,  5, 10,  4, 3],
  ['Barbell Row (Supinated)',       'back', ['biceps'],                    'barbell',      'pull',      true,  6, 10,  4, 4],
  ['Dumbbell Row',                  'back', ['biceps'],                    'dumbbell',     'pull',      true,  8, 15,  3, 4],
  ['T-Bar Row',                     'back', ['biceps'],                    'barbell',      'pull',      true,  6, 12,  4, 3],
  ['Chest-Supported T-Bar Row',     'back', ['biceps'],                    'barbell',      'pull',      true,  8, 15,  3, 5],
  ['Seated Cable Row',              'back', ['biceps'],                    'cable',        'pull',      true,  10, 15, 3, 4],
  ['Lat Pulldown (Wide Grip)',      'back', ['biceps'],                    'cable',        'pull',      true,  8, 15,  3, 4],
  ['Lat Pulldown (Close Grip)',     'back', ['biceps'],                    'cable',        'pull',      true,  8, 15,  3, 4],
  ['Lat Pulldown (Neutral Grip)',   'back', ['biceps'],                    'cable',        'pull',      true,  8, 15,  3, 4],
  ['Pull-Up',                       'back', ['biceps'],                    'bodyweight',   'pull',      true,  5, 15,  3, 4],
  ['Weighted Pull-Up',              'back', ['biceps'],                    'bodyweight',   'pull',      true,  4, 10,  4, 4],
  ['Chin-Up',                       'back', ['biceps'],                    'bodyweight',   'pull',      true,  5, 15,  3, 4],
  ['Neutral Grip Pull-Up',          'back', ['biceps'],                    'bodyweight',   'pull',      true,  5, 15,  3, 4],
  ['Assisted Pull-Up',              'back', ['biceps'],                    'machine',      'pull',      true,  8, 15,  3, 4],
  ['Machine Row (Chest Supported)', 'back', ['biceps'],                    'machine',      'pull',      true,  10, 15, 3, 4],
  ['Cable Straight-Arm Pulldown',   'back', [],                            'cable',        'pull',      false, 12, 20, 2, 5],
  ['Landmine Row',                  'back', ['biceps'],                    'barbell',      'pull',      true,  8, 15,  3, 4],
  ['Conventional Deadlift',         'back', ['quads', 'glutes', 'hamstrings'], 'barbell', 'hinge',     true,  3, 8,   5, 3],
  ['Sumo Deadlift',                 'back', ['quads', 'glutes', 'hamstrings'], 'barbell', 'hinge',     true,  3, 8,   5, 3],
  ['Rack Pull',                     'back', ['glutes'],                    'barbell',      'hinge',     true,  3, 8,   4, 3],
  ['Snatch Grip Deadlift',          'back', ['glutes', 'hamstrings'],      'barbell',      'hinge',     true,  3, 6,   5, 3],
  ['Deficit Deadlift',              'back', ['quads', 'glutes', 'hamstrings'], 'barbell', 'hinge',     true,  3, 6,   5, 3],
  ['Cable High Row',                'back', ['biceps'],                    'cable',        'pull',      true,  10, 15, 2, 4],
  ['Single-Arm Cable Row',          'back', ['biceps'],                    'cable',        'pull',      true,  10, 15, 3, 4],
  ['Trap Bar Deadlift',             'back', ['quads', 'glutes', 'hamstrings'], 'barbell', 'hinge',     true,  4, 8,   5, 4],
  ['Pendlay Row',                   'back', ['biceps'],                    'barbell',      'pull',      true,  5, 8,   4, 4],
  ['Inverted Row',                  'back', ['biceps'],                    'bodyweight',   'pull',      true,  8, 15,  2, 4],
  ['Cable Lat Pullover',            'back', [],                            'cable',        'pull',      false, 12, 20, 2, 5],
  ['Single-Arm Lat Pulldown',       'back', ['biceps'],                    'cable',        'pull',      true,  10, 15, 3, 4],
  ['Meadows Row',                   'back', ['biceps'],                    'barbell',      'pull',      true,  8, 15,  3, 4],
  ['Kroc Row',                      'back', ['biceps'],                    'dumbbell',     'pull',      true,  15, 25, 3, 4],
  ['Seal Row',                      'back', ['biceps'],                    'barbell',      'pull',      true,  6, 12,  3, 5],
  ['Chest-Supported Row (Dumbbell)','back', ['biceps'],                    'dumbbell',     'pull',      true,  8, 15,  3, 5],
  ['Seated Machine Row (Wide)',      'back', ['biceps'],                   'machine',      'pull',      true,  10, 15, 3, 4],
  ['Face Pull (Rope)',              'back', ['rear_delts', 'traps'],       'cable',        'pull',      false, 15, 25, 2, 5],
  ['Helms Row',                     'back', ['biceps'],                    'dumbbell',     'pull',      true,  8, 15,  3, 5],
  ['Hyperextension (Back Extension)','back',['glutes', 'hamstrings'],      'machine',      'hinge',     true,  10, 20, 2, 4],
  ['Good Morning (Barbell)',        'hamstrings', ['glutes', 'back'],      'barbell',      'hinge',     true,  8, 15,  4, 3],
  ['Reverse Hyperextension',        'back', ['glutes', 'hamstrings'],      'machine',      'hinge',     true,  12, 20, 2, 5],
  ['Chest-Supported Row (Barbell)', 'back', ['biceps'],                    'barbell',      'pull',      true,  6, 12,  3, 5],
  ['Cable Row (Wide Grip)',         'back', ['biceps', 'rear_delts'],      'cable',        'pull',      true,  10, 15, 3, 4],
  ['Machine Row (Hammer Strength)', 'back', ['biceps'],                    'machine',      'pull',      true,  10, 15, 3, 4],
  ['TRX Row',                       'back', ['biceps'],                    'bodyweight',   'pull',      true,  10, 20, 2, 4],
  ['Back Extension (Weighted)',     'back', ['glutes', 'hamstrings'],      'machine',      'hinge',     true,  12, 20, 2, 4],

  // ─── SHOULDERS (split by delt head) ─────────────────────────────────────────
  // Front delts
  ['Barbell Overhead Press',        'front_delts', ['triceps', 'side_delts'], 'barbell',   'push',      true,  5, 10,  4, 3],
  ['Dumbbell Shoulder Press',       'front_delts', ['triceps', 'side_delts'], 'dumbbell',  'push',      true,  8, 15,  3, 4],
  ['Arnold Press',                  'front_delts', ['triceps', 'side_delts'], 'dumbbell',  'push',      true,  8, 12,  3, 4],
  ['Seated Dumbbell Press',         'front_delts', ['triceps', 'side_delts'], 'dumbbell',  'push',      true,  8, 15,  3, 4],
  ['Z-Press',                       'front_delts', ['triceps', 'side_delts'], 'barbell',   'push',      true,  5, 10,  3, 3],
  ['Push Press',                    'front_delts', ['triceps', 'side_delts'], 'barbell',   'push',      true,  3, 8,   4, 3],
  ['Dumbbell Front Raise',          'front_delts', [],                    'dumbbell',     'isolation', false, 12, 20, 2, 3],
  ['Cable Front Raise',             'front_delts', [],                    'cable',        'isolation', false, 12, 20, 2, 3],

  // Side delts
  ['Dumbbell Lateral Raise',        'side_delts', [],                     'dumbbell',     'isolation', false, 15, 25, 2, 5],
  ['Cable Lateral Raise',           'side_delts', [],                     'cable',        'isolation', false, 15, 25, 2, 5],
  ['Machine Lateral Raise',         'side_delts', [],                     'machine',      'isolation', false, 15, 25, 2, 5],
  ['Leaning Lateral Raise',         'side_delts', [],                     'dumbbell',     'isolation', false, 15, 25, 2, 5],
  ['Landmine Lateral Raise',        'side_delts', [],                     'barbell',      'isolation', false, 12, 20, 2, 4],
  ['Seated Lateral Raise',          'side_delts', [],                     'dumbbell',     'isolation', false, 15, 25, 2, 5],
  ['Upright Row',                   'side_delts', ['biceps', 'traps'],    'barbell',      'pull',      false, 10, 15, 3, 3],
  ['Machine Shoulder Press',        'side_delts', ['triceps', 'front_delts'], 'machine',  'push',      true,  8, 15,  3, 4],
  ['Viking Press',                  'side_delts', ['triceps', 'front_delts'], 'machine',  'push',      true,  8, 15,  3, 4],
  ['Leaning Cable Lateral Raise',   'side_delts', [],                     'cable',        'isolation', false, 15, 25, 2, 5],
  ['Plate Lateral Raise',           'side_delts', [],                     'barbell',      'isolation', false, 15, 25, 2, 4],
  ['Cable Upright Row',             'side_delts', ['biceps', 'traps'],    'cable',        'pull',      false, 10, 15, 2, 3],
  ['Dumbbell Y-Raise',              'side_delts', ['rear_delts', 'traps'],'dumbbell',     'isolation', false, 12, 20, 1, 4],

  // Rear delts
  ['Dumbbell Rear Delt Fly',        'rear_delts', ['back'],               'dumbbell',     'isolation', false, 15, 25, 2, 5],
  ['Cable Rear Delt Fly',           'rear_delts', ['back'],               'cable',        'isolation', false, 15, 25, 2, 5],
  ['Machine Rear Delt Fly',         'rear_delts', ['back'],               'machine',      'isolation', false, 15, 25, 2, 5],
  ['Reverse Pec Deck',              'rear_delts', ['back'],               'machine',      'isolation', false, 15, 25, 2, 5],
  ['Cable Y-Raise (Prone)',         'rear_delts', ['back'],               'cable',        'pull',      false, 12, 20, 2, 5],
  ['Face Pull',                     'rear_delts', ['back', 'traps'],      'cable',        'pull',      false, 15, 25, 2, 5],
  ['Dumbbell Side-Lying Rear Delt', 'rear_delts', [],                     'dumbbell',     'isolation', false, 15, 25, 1, 5],
  ['W-Raise',                       'rear_delts', ['back', 'traps'],      'dumbbell',     'isolation', false, 12, 20, 1, 5],
  ['YTW',                           'rear_delts', ['back', 'traps'],      'dumbbell',     'isolation', false, 12, 20, 1, 5],
  ['Lying Rear Delt Row',           'rear_delts', ['back'],               'dumbbell',     'pull',      false, 15, 25, 2, 5],
  ['Cable Face Pull',               'rear_delts', ['back', 'traps'],      'cable',        'pull',      false, 15, 25, 2, 5],
  ['Cable Face Pull (Rope)',        'rear_delts', ['back', 'traps'],      'cable',        'pull',      false, 15, 25, 2, 5],
  ['Bent-Over Cable Rear Delt Fly', 'rear_delts', ['back'],               'cable',        'isolation', false, 15, 25, 2, 5],
  ['Prone Incline Y-Raise',         'rear_delts', ['back', 'traps'],      'dumbbell',     'isolation', false, 12, 20, 1, 5],
  ['Prone Incline T-Raise',         'rear_delts', ['back', 'traps'],      'dumbbell',     'isolation', false, 12, 20, 1, 5],
  ['Seated Rear Delt Machine',      'rear_delts', ['back'],               'machine',      'isolation', false, 15, 25, 2, 5],

  // ─── BICEPS ──────────────────────────────────────────────────────────────────
  ['Barbell Curl',                  'biceps', [],                         'barbell',      'isolation', false, 8, 12,  2, 4],
  ['EZ Bar Curl',                   'biceps', [],                         'ez_bar',       'isolation', false, 8, 12,  2, 4],
  ['Dumbbell Curl',                 'biceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Hammer Curl',                   'biceps', ['forearms'],               'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Incline Dumbbell Curl',         'biceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 5],
  ['Preacher Curl (Barbell)',       'biceps', [],                         'barbell',      'isolation', false, 8, 12,  2, 4],
  ['Preacher Curl (Dumbbell)',      'biceps', [],                         'dumbbell',     'isolation', false, 8, 12,  2, 4],
  ['Preacher Curl (EZ Bar)',        'biceps', [],                         'ez_bar',       'isolation', false, 8, 12,  2, 4],
  ['Cable Curl',                    'biceps', [],                         'cable',        'isolation', false, 10, 15, 2, 4],
  ['Cable Hammer Curl (Rope)',      'biceps', ['forearms'],               'cable',        'isolation', false, 10, 15, 2, 4],
  ['Machine Curl',                  'biceps', [],                         'machine',      'isolation', false, 10, 15, 2, 4],
  ['Concentration Curl',            'biceps', [],                         'dumbbell',     'isolation', false, 12, 15, 2, 5],
  ['Zottman Curl',                  'biceps', ['forearms'],               'dumbbell',     'isolation', false, 8, 12,  2, 4],
  ['Spider Curl',                   'biceps', [],                         'barbell',      'isolation', false, 8, 12,  2, 5],
  ['Cross-Body Hammer Curl',        'biceps', ['forearms'],               'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Prone Incline Curl',            'biceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 5],
  ['Reverse Curl',                  'biceps', ['forearms'],               'barbell',      'isolation', false, 10, 15, 2, 3],
  ['Cable Reverse Curl',            'biceps', ['forearms'],               'cable',        'isolation', false, 12, 20, 2, 3],
  ['EZ Bar Preacher Curl',          'biceps', [],                         'ez_bar',       'isolation', false, 8, 12,  2, 5],
  ['Cable Rope Hammer Curl',        'biceps', ['forearms'],               'cable',        'isolation', false, 10, 15, 2, 4],
  ['Bayesian Curl',                 'biceps', [],                         'cable',        'isolation', false, 10, 15, 2, 5],
  ['Waiter Curl',                   'biceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['TRX Curl',                      'biceps', [],                         'bodyweight',   'isolation', false, 10, 20, 2, 4],

  // ─── TRICEPS ─────────────────────────────────────────────────────────────────
  ['Close-Grip Bench Press',        'triceps', ['chest', 'front_delts'],  'barbell',      'push',      true,  6, 12,  3, 3],
  ['EZ Bar Skull Crusher',          'triceps', [],                         'ez_bar',       'isolation', false, 8, 15,  2, 4],
  ['Dumbbell Skull Crusher',        'triceps', [],                         'dumbbell',     'isolation', false, 8, 15,  2, 4],
  ['Decline Skull Crusher',         'triceps', [],                         'barbell',      'isolation', false, 8, 15,  2, 4],
  ['Tricep Pushdown (Rope)',        'triceps', [],                         'cable',        'isolation', false, 12, 20, 2, 4],
  ['Tricep Pushdown (Bar)',         'triceps', [],                         'cable',        'isolation', false, 10, 20, 2, 4],
  ['Cable Pushdown (Straight Bar)', 'triceps', [],                         'cable',        'isolation', false, 10, 20, 2, 4],
  ['Rope Pushdown',                 'triceps', [],                         'cable',        'isolation', false, 12, 20, 2, 4],
  ['Overhead Cable Tricep Extension','triceps',[],                         'cable',        'isolation', false, 12, 20, 2, 5],
  ['Dumbbell Overhead Tricep Extension','triceps',[],                      'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Overhead Dumbbell Extension',   'triceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Weighted Dips (Triceps)',       'triceps', ['chest', 'front_delts'],  'bodyweight',   'push',      true,  8, 15,  4, 3],
  ['Bench Dip',                     'triceps', ['chest', 'front_delts'],  'bodyweight',   'push',      true,  10, 20, 2, 3],
  ['Tricep Kickback',               'triceps', [],                         'dumbbell',     'isolation', false, 12, 20, 2, 3],
  ['Diamond Push-Up',               'triceps', ['chest'],                 'bodyweight',   'push',      true,  10, 20, 2, 3],
  ['JM Press',                      'triceps', ['chest'],                 'barbell',      'push',      true,  8, 12,  3, 4],
  ['Tate Press',                    'triceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Lying Tricep Extension',        'triceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Machine Tricep Extension',      'triceps', [],                         'machine',      'isolation', false, 12, 20, 2, 4],
  ['Single Arm Cable Extension',    'triceps', [],                         'cable',        'isolation', false, 12, 20, 2, 4],
  ['Board Press',                   'triceps', ['chest'],                 'barbell',      'push',      true,  5, 8,   3, 3],
  ['Close-Grip Floor Press',        'triceps', ['chest'],                 'barbell',      'push',      true,  6, 12,  3, 4],
  ['Reverse Grip Cable Pushdown',   'triceps', [],                        'cable',        'isolation', false, 12, 20, 2, 4],
  ['Tricep Dip (Parallel Bars)',    'triceps', ['chest', 'front_delts'],  'bodyweight',   'push',      true,  8, 15,  3, 3],
  ['Cable Overhead Tricep Extension','triceps',[],                        'cable',        'isolation', false, 12, 20, 2, 5],

  // ─── QUADS ───────────────────────────────────────────────────────────────────
  ['Barbell Back Squat',            'quads', ['glutes', 'hamstrings'],    'barbell',      'squat',     true,  5, 10,  5, 3],
  ['Barbell Front Squat',           'quads', ['glutes'],                  'barbell',      'squat',     true,  5, 10,  4, 3],
  ['Hack Squat Machine',            'quads', ['glutes'],                  'machine',      'squat',     true,  8, 15,  4, 4],
  ['Leg Press',                     'quads', ['glutes', 'hamstrings'],    'machine',      'squat',     true,  8, 20,  4, 4],
  ['Bulgarian Split Squat',         'quads', ['glutes'],                  'dumbbell',     'squat',     true,  8, 15,  4, 4],
  ['Leg Extension',                 'quads', [],                          'machine',      'isolation', false, 12, 25, 2, 5],
  ['Sissy Squat',                   'quads', [],                          'bodyweight',   'isolation', false, 10, 20, 3, 4],
  ['Goblet Squat',                  'quads', ['glutes'],                  'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Dumbbell Lunge',                'quads', ['glutes'],                  'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Walking Lunge',                 'quads', ['glutes', 'hamstrings'],    'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Barbell Lunge',                 'quads', ['glutes'],                  'barbell',      'squat',     true,  8, 15,  4, 3],
  ['Step-Up (Dumbbell)',            'quads', ['glutes'],                  'dumbbell',     'squat',     true,  10, 15, 3, 4],
  ['Step-Up (Barbell)',             'quads', ['glutes'],                  'barbell',      'squat',     true,  8, 12,  4, 3],
  ['Wall Sit',                      'quads', [],                          'bodyweight',   'isolation', false, 30, 90, 2, 3],
  ['Cyclist Squat',                 'quads', ['glutes'],                  'barbell',      'squat',     true,  8, 15,  4, 4],
  ['Smith Machine Squat',           'quads', ['glutes'],                  'smith_machine','squat',     true,  8, 15,  4, 4],
  ['Box Squat',                     'quads', ['glutes', 'hamstrings'],    'barbell',      'squat',     true,  5, 10,  4, 3],
  ['Pause Squat',                   'quads', ['glutes'],                  'barbell',      'squat',     true,  5, 8,   4, 3],
  ['Heel-Elevated Squat',           'quads', ['glutes'],                  'barbell',      'squat',     true,  8, 15,  4, 4],
  ['Single Leg Press',              'quads', ['glutes'],                  'machine',      'squat',     true,  10, 20, 3, 4],
  ['Pendulum Squat',                'quads', ['glutes'],                  'machine',      'squat',     true,  8, 15,  4, 4],
  ['Spanish Squat',                 'quads', [],                          'bodyweight',   'isolation', false, 10, 20, 3, 4],
  ['Leg Press (Narrow Stance)',     'quads', ['glutes'],                  'machine',      'squat',     true,  8, 20,  4, 4],
  ['Sumo Squat',                    'quads', ['glutes', 'hamstrings'],    'barbell',      'squat',     true,  8, 15,  4, 3],
  ['Safety Bar Squat',              'quads', ['glutes', 'hamstrings'],    'barbell',      'squat',     true,  5, 10,  4, 4],
  ['Front Squat (Dumbbell)',        'quads', ['glutes'],                  'dumbbell',     'squat',     true,  8, 15,  3, 4],
  ['Split Squat',                   'quads', ['glutes'],                  'barbell',      'squat',     true,  8, 15,  3, 4],
  ['Reverse Lunge',                 'quads', ['glutes'],                  'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Curtsy Lunge',                  'quads', ['glutes'],                  'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Leg Press (High Foot)',         'quads', ['glutes', 'hamstrings'],    'machine',      'squat',     true,  8, 20,  4, 4],
  ['Cycling (Stationary)',          'quads', ['calves', 'glutes'],        'machine',      'squat',     true,  60, 120, 2, 5],
  ['Terminal Knee Extension',       'quads', [],                          'bodyweight',   'isolation', false, 15, 25, 1, 4],

  // ─── HAMSTRINGS ──────────────────────────────────────────────────────────────
  ['Romanian Deadlift',             'hamstrings', ['glutes', 'back'],     'barbell',      'hinge',     true,  6, 12,  4, 4],
  ['Romanian Deadlift (Barbell)',   'hamstrings', ['glutes', 'back'],     'barbell',      'hinge',     true,  6, 12,  4, 4],
  ['Romanian Deadlift (Dumbbell)',  'hamstrings', ['glutes'],             'dumbbell',     'hinge',     true,  8, 15,  3, 4],
  ['Stiff-Leg Deadlift',           'hamstrings', ['back', 'glutes'],     'barbell',      'hinge',     true,  6, 12,  4, 4],
  ['Nordic Curl',                   'hamstrings', [],                     'bodyweight',   'isolation', false, 3, 10,  3, 5],
  ['Nordic Hamstring Curl',         'hamstrings', [],                     'bodyweight',   'isolation', false, 3, 10,  3, 5],
  ['Lying Leg Curl',                'hamstrings', [],                     'machine',      'isolation', false, 10, 15, 2, 5],
  ['Seated Leg Curl',               'hamstrings', [],                     'machine',      'isolation', false, 10, 15, 2, 5],
  ['Standing Leg Curl',             'hamstrings', [],                     'machine',      'isolation', false, 10, 15, 2, 5],
  ['Leg Curl (Cable)',              'hamstrings', [],                     'cable',        'isolation', false, 10, 15, 2, 4],
  ['Good Morning',                  'hamstrings', ['back', 'glutes'],     'barbell',      'hinge',     true,  8, 15,  4, 3],
  ['Glute Ham Raise',               'hamstrings', ['glutes'],             'machine',      'isolation', false, 5, 12,  3, 5],
  ['Single-Leg Romanian Deadlift',  'hamstrings', ['glutes'],             'dumbbell',     'hinge',     true,  8, 12,  3, 4],
  ['Single-Leg Romanian Deadlift (DB)', 'hamstrings', ['glutes'],        'dumbbell',     'hinge',     true,  8, 12,  3, 4],
  ['B-Stance Romanian Deadlift',    'hamstrings', ['glutes'],             'barbell',      'hinge',     true,  8, 12,  3, 4],
  ['Swiss Ball Leg Curl',           'hamstrings', ['glutes'],             'bodyweight',   'isolation', false, 10, 20, 2, 5],
  ['Cable Pull-Through',            'glutes', ['hamstrings'],            'cable',        'hinge',     true,  12, 20, 2, 5],
  ['Kettlebell Swing',              'hamstrings', ['glutes', 'back'],     'kettlebell',   'hinge',     true,  10, 20, 3, 4],
  ['Deadlift (Conventional)',       'hamstrings', ['back', 'glutes', 'quads'], 'barbell', 'hinge',    true,  3, 8,   5, 3],
  ['Deadlift (Sumo)',               'hamstrings', ['back', 'glutes', 'quads'], 'barbell', 'hinge',    true,  3, 8,   5, 3],
  ['Trap Bar Deadlift (Hamstring)', 'hamstrings', ['back', 'glutes'],     'barbell',      'hinge',     true,  4, 8,   5, 4],
  ['Prone Leg Curl',                'hamstrings', [],                     'machine',      'isolation', false, 10, 15, 2, 5],
  ['Dumbbell Single-Leg RDL',       'hamstrings', ['glutes'],             'dumbbell',     'hinge',     true,  8, 15,  3, 4],

  // ─── GLUTES ──────────────────────────────────────────────────────────────────
  ['Barbell Hip Thrust',            'glutes', ['hamstrings', 'quads'],    'barbell',      'hinge',     true,  8, 15,  3, 5],
  ['Dumbbell Hip Thrust',           'glutes', ['hamstrings'],             'dumbbell',     'hinge',     true,  10, 20, 3, 5],
  ['Smith Machine Hip Thrust',      'glutes', ['hamstrings'],             'smith_machine','hinge',     true,  10, 20, 3, 5],
  ['Machine Hip Thrust',            'glutes', ['hamstrings'],             'machine',      'hinge',     true,  10, 20, 2, 5],
  ['Glute Bridge',                  'glutes', ['hamstrings'],             'bodyweight',   'hinge',     true,  12, 20, 2, 4],
  ['Single Leg Hip Thrust',         'glutes', ['hamstrings'],             'bodyweight',   'hinge',     true,  10, 20, 2, 5],
  ['Frog Pump',                     'glutes', [],                         'bodyweight',   'isolation', false, 15, 30, 1, 4],
  ['Cable Kickback',                'glutes', [],                         'cable',        'isolation', false, 15, 25, 2, 5],
  ['Donkey Kick',                   'glutes', [],                         'bodyweight',   'isolation', false, 15, 25, 1, 4],
  ['Abduction Machine',             'glutes', [],                         'machine',      'isolation', false, 15, 25, 2, 4],
  ['Cable Hip Abduction',           'glutes', [],                         'cable',        'isolation', false, 15, 25, 2, 4],
  ['Step-Up (Glute Focus)',         'glutes', ['quads'],                  'dumbbell',     'squat',     true,  10, 15, 3, 4],
  ['Sumo Squat (Glute Focus)',      'glutes', ['hamstrings'],             'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Nordic Glute Curl',             'glutes', ['hamstrings'],             'bodyweight',   'isolation', false, 5, 12,  3, 5],
  ['45-Degree Hip Extension',       'glutes', ['hamstrings', 'back'],     'machine',      'hinge',     true,  12, 20, 2, 4],
  ['Reverse Hyperextension (Glute)','glutes', ['hamstrings'],             'machine',      'hinge',     true,  12, 20, 2, 5],
  ['Sumo Deadlift (Glute Focus)',   'glutes', ['hamstrings', 'quads'],    'barbell',      'hinge',     true,  5, 10,  5, 3],
  ['Sumo Deadlift (Wide Stance)',   'glutes', ['hamstrings', 'quads'],    'barbell',      'hinge',     true,  4, 8,   5, 3],
  ['Cable Donkey Kickback',         'glutes', [],                         'cable',        'isolation', false, 15, 25, 2, 5],
  ['Donkey Kickback (Machine)',     'glutes', [],                         'machine',      'isolation', false, 15, 25, 2, 5],
  ['Walking Lunge (Glute Focus)',   'glutes', ['quads', 'hamstrings'],    'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Curtsy Lunge (Glute Focus)',    'glutes', ['quads'],                  'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Kickstand Hip Thrust',          'glutes', ['hamstrings'],             'barbell',      'hinge',     true,  10, 20, 3, 5],
  ['Cable Pull-Through (Glute)',    'glutes', ['hamstrings'],             'cable',        'hinge',     true,  12, 20, 2, 5],
  ['Romanian Deadlift (Glute)',     'glutes', ['hamstrings', 'back'],     'barbell',      'hinge',     true,  6, 12,  4, 4],

  // ─── CALVES ──────────────────────────────────────────────────────────────────
  ['Standing Calf Raise (Machine)', 'calves', [],                         'machine',      'isolation', false, 10, 20, 2, 4],
  ['Standing Calf Raise (Barbell)', 'calves', [],                         'barbell',      'isolation', false, 10, 20, 2, 4],
  ['Seated Calf Raise',             'calves', [],                         'machine',      'isolation', false, 15, 25, 2, 4],
  ['Seated Machine Calf Raise',     'calves', [],                         'machine',      'isolation', false, 15, 25, 2, 4],
  ['Seated Dumbbell Calf Raise',    'calves', [],                         'dumbbell',     'isolation', false, 15, 25, 2, 4],
  ['Leg Press Calf Raise',          'calves', [],                         'machine',      'isolation', false, 15, 25, 2, 4],
  ['Donkey Calf Raise',             'calves', [],                         'bodyweight',   'isolation', false, 15, 25, 2, 4],
  ['Single-Leg Calf Raise (Bodyweight)','calves',[],                      'bodyweight',   'isolation', false, 15, 25, 2, 4],
  ['Dumbbell Calf Raise (Standing)','calves', [],                         'dumbbell',     'isolation', false, 12, 20, 2, 4],
  ['Smith Machine Calf Raise',      'calves', [],                         'smith_machine','isolation', false, 10, 20, 2, 4],
  ['Calf Raise on Steps',           'calves', [],                         'bodyweight',   'isolation', false, 15, 25, 1, 4],
  ['Box Jump',                      'calves', ['quads', 'glutes'],        'bodyweight',   'plyometric',true,  5, 10,  3, 4],
  ['Single-Leg Calf Raise (Dumbbell)','calves',[],                        'dumbbell',     'isolation', false, 15, 25, 2, 4],
  ['Calf Raise on Leg Press Sled',  'calves', [],                         'machine',      'isolation', false, 15, 25, 2, 4],
  ['Standing Calf Raise (Bodyweight)','calves',[],                        'bodyweight',   'isolation', false, 20, 30, 1, 3],
  ['Tibialis Raise (Wall)',         'tibialis', [],                        'bodyweight',   'isolation', false, 15, 25, 1, 5],
  ['Tibialis Raise (Slant Board)',  'tibialis', [],                        'bodyweight',   'isolation', false, 15, 25, 1, 5],
  ['Toe Walk',                      'tibialis', ['calves'],                'bodyweight',   'isolation', false, 20, 40, 1, 4],

  // ─── ABS / CORE ──────────────────────────────────────────────────────────────
  ['Cable Crunch',                  'abs', [],                            'cable',        'isolation', false, 15, 25, 2, 5],
  ['Hanging Leg Raise',             'abs', [],                            'bodyweight',   'isolation', false, 10, 20, 2, 5],
  ['Plank',                         'abs', [],                            'bodyweight',   'isolation', false, 20, 60, 2, 4],
  ['Side Plank',                    'abs', [],                            'bodyweight',   'isolation', false, 20, 60, 1, 4],
  ['Ab Rollout',                    'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  2, 5],
  ['Ab Wheel Rollout',              'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  2, 5],
  ['Decline Crunch',                'abs', [],                            'bodyweight',   'isolation', false, 15, 25, 2, 4],
  ['Russian Twist',                 'abs', [],                            'bodyweight',   'isolation', false, 20, 30, 2, 4],
  ['Pallof Press',                  'abs', [],                            'cable',        'isolation', false, 10, 15, 2, 5],
  ['Landmine Twist',                'abs', [],                            'barbell',      'isolation', false, 10, 15, 2, 4],
  ['Landmine Rotation',             'abs', [],                            'barbell',      'isolation', false, 10, 15, 2, 4],
  ['Bicycle Crunch',                'abs', [],                            'bodyweight',   'isolation', false, 20, 30, 1, 4],
  ['Crunch',                        'abs', [],                            'bodyweight',   'isolation', false, 15, 30, 1, 3],
  ['Reverse Crunch',                'abs', [],                            'bodyweight',   'isolation', false, 15, 25, 1, 4],
  ['Leg Raise',                     'abs', [],                            'bodyweight',   'isolation', false, 15, 25, 1, 4],
  ['Leg Raise (Flat Bench)',        'abs', [],                            'bodyweight',   'isolation', false, 15, 25, 1, 4],
  ['Dragon Flag',                   'abs', [],                            'bodyweight',   'isolation', false, 5, 10,  3, 5],
  ['V-Up',                          'abs', [],                            'bodyweight',   'isolation', false, 10, 20, 2, 4],
  ['Sit-Up',                        'abs', [],                            'bodyweight',   'isolation', false, 15, 30, 1, 3],
  ['Cable Woodchop',                'abs', [],                            'cable',        'isolation', false, 10, 15, 2, 4],
  ['Machine Crunch',                'abs', [],                            'machine',      'isolation', false, 15, 25, 2, 4],
  ['Dead Bug',                      'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  2, 5],
  ['Hollow Body Hold',              'abs', [],                            'bodyweight',   'isolation', false, 10, 30, 2, 4],
  ['Stir the Pot',                  'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  2, 5],
  ['Hanging Knee Raise',            'abs', [],                            'bodyweight',   'isolation', false, 10, 20, 2, 4],
  ['Cable Woodchop (High to Low)',  'abs', [],                            'cable',        'isolation', false, 10, 15, 2, 4],
  ['Cable Woodchop (Low to High)',  'abs', [],                            'cable',        'isolation', false, 10, 15, 2, 4],
  ['Ab Wheel (Kneeling)',           'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  2, 5],
  ['Weighted Sit-Up',               'abs', [],                            'barbell',      'isolation', false, 10, 20, 2, 3],
  ['Toe-to-Bar',                    'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  3, 5],
  ['L-Sit Hold',                    'abs', ['triceps'],                   'bodyweight',   'isolation', false, 5, 20,  2, 5],
  ['Suitcase Carry',                'abs', ['traps', 'forearms'],         'dumbbell',     'carry',     true,  20, 40, 2, 5],
  ['Pallof Press (Kneeling)',       'abs', [],                            'cable',        'isolation', false, 10, 15, 2, 5],
  ['Copenhagen Plank',              'abs', ['glutes'],                    'bodyweight',   'isolation', false, 10, 30, 2, 5],

  // ─── TRAPS ───────────────────────────────────────────────────────────────────
  ['Barbell Shrug',                 'traps', [],                          'barbell',      'isolation', false, 12, 20, 2, 4],
  ['Dumbbell Shrug',                'traps', [],                          'dumbbell',     'isolation', false, 12, 20, 2, 4],
  ['Cable Shrug',                   'traps', [],                          'cable',        'isolation', false, 12, 20, 2, 4],
  ['Smith Machine Shrug',           'traps', [],                          'smith_machine','isolation', false, 12, 20, 2, 4],
  ['Hex Bar Shrug',                 'traps', [],                          'barbell',      'isolation', false, 12, 20, 3, 4],
  ['Behind-the-Back Barbell Shrug', 'traps', [],                          'barbell',      'isolation', false, 12, 20, 2, 4],
  ["Farmer's Walk",                 'traps', ['forearms', 'abs'],         'dumbbell',     'carry',     true,  20, 40, 3, 4],
  ['Power Clean',                   'traps', ['quads', 'glutes', 'back'], 'barbell',      'power',     true,  3, 5,   5, 3],
  ['Rack Pull (Traps)',             'traps', ['back'],                    'barbell',      'hinge',     true,  5, 10,  4, 3],
  ['Face Pull (Traps)',             'traps', ['rear_delts'],              'cable',        'pull',      false, 15, 25, 2, 4],
  ['Incline Shrug',                 'traps', [],                          'dumbbell',     'isolation', false, 12, 20, 2, 4],
  ['Snatch Grip Shrug',             'traps', [],                          'barbell',      'isolation', false, 10, 15, 3, 3],
  ['Keg Carry',                     'traps', ['forearms', 'abs'],         'dumbbell',     'carry',     true,  20, 40, 3, 4],

  // ─── FOREARMS ────────────────────────────────────────────────────────────────
  ['Barbell Wrist Curl',            'forearms', [],                       'barbell',      'isolation', false, 15, 25, 2, 3],
  ['Reverse Wrist Curl',            'forearms', [],                       'barbell',      'isolation', false, 15, 25, 2, 3],
  ['Dumbbell Wrist Curl',           'forearms', [],                       'dumbbell',     'isolation', false, 15, 25, 1, 3],
  ['Plate Pinch',                   'forearms', [],                       'barbell',      'isolation', false, 30, 60, 2, 3],
  ['Dead Hang',                     'forearms', ['back'],                 'bodyweight',   'isolation', false, 20, 60, 2, 4],
  ['Thick Bar Curl',                'forearms', ['biceps'],               'barbell',      'isolation', false, 8, 12,  2, 3],
  ['Cable Reverse Curl (Forearms)', 'forearms', ['biceps'],               'cable',        'isolation', false, 12, 20, 2, 3],
  ['Farmer Walk (Forearms)',        'forearms', ['traps'],                'dumbbell',     'carry',     true,  20, 40, 3, 4],
  ['Towel Pull-Up',                 'forearms', ['back', 'biceps'],       'bodyweight',   'pull',      true,  5, 10,  3, 4],
  ['Fat Grip Curl',                 'forearms', ['biceps'],               'barbell',      'isolation', false, 8, 12,  2, 4],
  ['Hand Gripper',                  'forearms', [],                       'machine',      'isolation', false, 15, 30, 1, 3],
  ['Rice Bucket',                   'forearms', [],                       'bodyweight',   'isolation', false, 60, 120, 1, 3],
  ['Pinch Grip Carry',              'forearms', ['traps'],                'barbell',      'carry',     true,  20, 40, 2, 4],
  ['Cable Wrist Curl',              'forearms', [],                       'cable',        'isolation', false, 15, 25, 1, 3],
  ['Cable Reverse Wrist Curl',      'forearms', [],                       'cable',        'isolation', false, 15, 25, 1, 3],

  // ─── NECK ────────────────────────────────────────────────────────────────────
  ['Neck Flexion (Machine)',        'neck', [],                           'machine',      'isolation', false, 15, 25, 1, 4],
  ['Neck Extension (Machine)',      'neck', [],                           'machine',      'isolation', false, 15, 25, 1, 4],
  ['Neck Lateral Flexion',          'neck', [],                           'bodyweight',   'isolation', false, 15, 25, 1, 3],
  ['Neck Curl',                     'neck', [],                           'bodyweight',   'isolation', false, 15, 25, 1, 3],
  ['Neck Bridge',                   'neck', ['traps'],                   'bodyweight',   'isolation', false, 15, 30, 2, 3],
  ['Plate Neck Curl',               'neck', [],                           'barbell',      'isolation', false, 15, 25, 1, 4],
  ['Plate Neck Extension',          'neck', ['traps'],                    'barbell',      'isolation', false, 15, 25, 1, 4],
  ['Neck Harness Flexion',          'neck', [],                           'machine',      'isolation', false, 15, 25, 1, 4],
  ['Neck Harness Extension',        'neck', ['traps'],                    'machine',      'isolation', false, 15, 25, 1, 4],
  ['Manual Resistance Neck Flexion','neck', [],                           'bodyweight',   'isolation', false, 10, 20, 1, 4],
  ['Manual Resistance Neck Extension','neck', ['traps'],                  'bodyweight',   'isolation', false, 10, 20, 1, 4],
  ['Neck Rotation (Resistance)',    'neck', [],                           'bodyweight',   'isolation', false, 10, 20, 1, 3],

  // ─── CARDIO / CONDITIONING ───────────────────────────────────────────────────
  ['Sled Push',                     'quads', ['glutes', 'calves'],        'machine',      'squat',     true,  20, 40, 4, 5],
  ['Sled Pull',                     'hamstrings', ['glutes'],             'machine',      'hinge',     true,  20, 40, 3, 5],
  ['Prowler Drag',                  'hamstrings', ['glutes', 'quads'],    'machine',      'hinge',     true,  20, 40, 4, 5],
  ['Battle Ropes',                  'front_delts', ['side_delts', 'abs'], 'machine',      'carry',     true,  20, 40, 3, 4],
  ['Assault Bike',                  'quads', ['calves', 'glutes'],        'machine',      'squat',     true,  10, 30, 3, 5],
  ['Tyre Flip',                     'back', ['glutes', 'quads'],          'machine',      'hinge',     true,  5, 10,  5, 3],
  ['Kettlebell Snatch',              'back', ['glutes', 'hamstrings'],     'kettlebell',   'hinge',     true,  5, 10,  4, 4],
  ['Kettlebell Clean and Press',    'front_delts', ['glutes', 'traps'],   'kettlebell',   'push',      true,  5, 10,  4, 4],
  ['Jump Squat',                    'quads', ['glutes', 'calves'],        'bodyweight',   'squat',     true,  5, 10,  3, 4],
  ['Broad Jump',                    'quads', ['glutes', 'calves'],        'bodyweight',   'squat',     true,  5, 8,   3, 4],
  ['Depth Jump',                    'quads', ['calves', 'glutes'],        'bodyweight',   'plyometric',true,  4, 8,   3, 4],
  ['Stair Running',                 'quads', ['glutes', 'calves'],        'bodyweight',   'squat',     true,  30, 60, 3, 5],

  // ─── ADDITIONAL COMPOUND MOVEMENTS ──────────────────────────────────────────
  ['Clean Pull',                    'traps', ['back', 'glutes', 'quads'], 'barbell',      'hinge',     true,  3, 6,   4, 3],
  ['Barbell Good Morning',          'hamstrings', ['back', 'glutes'],     'barbell',      'hinge',     true,  8, 15,  4, 3],
  ['Zercher Squat',                 'quads', ['glutes', 'back'],          'barbell',      'squat',     true,  5, 10,  4, 3],
  ['Anderson Squat',                'quads', ['glutes'],                  'barbell',      'squat',     true,  3, 8,   4, 3],
  ['Pin Squat',                     'quads', ['glutes'],                  'barbell',      'squat',     true,  3, 8,   4, 3],
  ['Hatfield Squat',                'quads', ['glutes', 'hamstrings'],    'barbell',      'squat',     true,  6, 12,  4, 4],
  ['Cambered Bar Squat',            'quads', ['glutes', 'back'],          'barbell',      'squat',     true,  5, 10,  4, 3],
  ['SSB Squat',                     'quads', ['glutes'],                  'barbell',      'squat',     true,  5, 10,  4, 4],
  ['Jefferson Curl',                'hamstrings', ['back'],               'dumbbell',     'hinge',     false, 8, 15,  3, 4],
  ['Stiff-Leg Deadlift (Dumbbell)', 'hamstrings', ['back', 'glutes'],     'dumbbell',     'hinge',     true,  8, 15,  3, 4],

  // ─── EXTRA ISOLATION ─────────────────────────────────────────────────────────
  ['Serratus Punch',                'abs', ['front_delts'],               'cable',        'isolation', false, 12, 20, 1, 4],
  ['Kneeling Cable Crunch',         'abs', [],                            'cable',        'isolation', false, 15, 25, 2, 5],
  ['Exercise Ball Crunch',          'abs', [],                            'bodyweight',   'isolation', false, 15, 25, 1, 3],
  ['Mountain Climber',              'abs', ['quads', 'front_delts'],      'bodyweight',   'isolation', false, 20, 40, 2, 4],
  ['Plank Row',                     'abs', ['back', 'biceps'],            'dumbbell',     'isolation', false, 8, 15,  2, 5],
  ['Bear Crawl',                    'abs', ['front_delts', 'quads'],      'bodyweight',   'isolation', false, 10, 30, 2, 4],
  ['Kneeling Ab Rollout',           'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  2, 5],
  ['Dumbbell Side Bend',            'abs', [],                            'dumbbell',     'isolation', false, 15, 25, 1, 3],
  ['Cable Side Bend',               'abs', [],                            'cable',        'isolation', false, 15, 25, 1, 3],
  ['Windmill',                      'abs', ['glutes', 'side_delts'],      'dumbbell',     'isolation', false, 8, 12,  2, 4],
  ['Turkish Get-Up',                'abs', ['glutes', 'front_delts'],     'kettlebell',   'isolation', false, 3, 6,   3, 5],

  // ─── ADDITIONAL CHEST ────────────────────────────────────────────────────────
  ['Close-Grip Push-Up',            'chest', ['triceps'],                 'bodyweight',   'push',      true,  10, 20, 2, 3],
  ['Archer Push-Up',                'chest', ['triceps', 'front_delts'],  'bodyweight',   'push',      true,  8, 15,  2, 4],
  ['Single-Arm Push-Up',            'chest', ['triceps'],                 'bodyweight',   'push',      true,  4, 10,  3, 5],
  ['Cable Chest Press (Standing)',  'chest', ['triceps', 'front_delts'],  'cable',        'push',      true,  10, 15, 2, 4],
  ['Smith Machine Incline Press',   'chest', ['triceps', 'front_delts'],  'smith_machine','push',      true,  8, 15,  3, 4],
  ['Guillotine Press',              'chest', ['triceps', 'front_delts'],  'barbell',      'push',      true,  6, 10,  4, 3],

  // ─── ADDITIONAL BACK ─────────────────────────────────────────────────────────
  ['Barbell Upright Row (Wide)',    'back', ['traps', 'rear_delts'],      'barbell',      'pull',      false, 10, 15, 3, 3],
  ['Cable Face Pull (Upper Back)',  'back', ['rear_delts', 'traps'],      'cable',        'pull',      false, 15, 25, 2, 5],
  ['Smith Machine Row',             'back', ['biceps'],                   'smith_machine','pull',      true,  8, 15,  3, 4],
  ['Half-Kneeling Cable Row',       'back', ['biceps'],                   'cable',        'pull',      true,  10, 15, 2, 4],
  ['V-Bar Pulldown',                'back', ['biceps'],                   'cable',        'pull',      true,  10, 15, 3, 4],
  ['Wide-Grip Cable Row',           'back', ['rear_delts'],               'cable',        'pull',      true,  10, 15, 3, 4],

  // ─── ADDITIONAL SHOULDERS ────────────────────────────────────────────────────
  ['Barbell Front Raise',           'front_delts', [],                    'barbell',      'isolation', false, 10, 15, 2, 3],
  ['Plate Front Raise',             'front_delts', [],                    'barbell',      'isolation', false, 12, 20, 2, 3],
  ['Kneeling Dumbbell Press',       'front_delts', ['triceps', 'side_delts'], 'dumbbell', 'push',     true,  8, 15,  3, 4],
  ['Single-Arm Dumbbell Press',     'front_delts', ['triceps', 'side_delts'], 'dumbbell', 'push',     true,  8, 15,  3, 4],
  ['Half-Kneeling Shoulder Press',  'front_delts', ['triceps', 'abs'],    'dumbbell',     'push',      true,  8, 15,  3, 4],

  // ─── ADDITIONAL BICEPS ───────────────────────────────────────────────────────
  ['Chin-Up (Supinated)',           'biceps', ['back'],                   'bodyweight',   'pull',      true,  5, 15,  3, 4],
  ['Seated Dumbbell Curl',          'biceps', [],                         'dumbbell',     'isolation', false, 10, 15, 2, 4],
  ['Lying Cable Curl',              'biceps', [],                         'cable',        'isolation', false, 10, 15, 2, 5],
  ['High Cable Curl',               'biceps', [],                         'cable',        'isolation', false, 10, 15, 2, 5],
  ['Barbell Drag Curl',             'biceps', [],                         'barbell',      'isolation', false, 8, 12,  2, 4],

  // ─── ADDITIONAL TRICEPS ──────────────────────────────────────────────────────
  ['Smith Machine Close-Grip Press','triceps', ['chest'],                 'smith_machine','push',      true,  8, 15,  3, 3],
  ['Dip Machine',                   'triceps', ['chest', 'front_delts'],  'machine',      'push',      true,  10, 20, 2, 3],
  ['Cable Kickback (Triceps)',       'triceps', [],                        'cable',        'isolation', false, 12, 20, 2, 4],
  ['Barbell Skull Crusher',         'triceps', [],                        'barbell',      'isolation', false, 8, 15,  2, 4],

  // ─── ADDITIONAL QUADS ────────────────────────────────────────────────────────
  ['Jefferson Squat',               'quads', ['glutes', 'hamstrings'],    'barbell',      'squat',     true,  5, 10,  4, 3],
  ['Kneeling Squat',                'quads', ['glutes'],                  'barbell',      'squat',     true,  8, 15,  3, 4],
  ['Skater Squat',                  'quads', ['glutes'],                  'bodyweight',   'squat',     true,  6, 12,  3, 5],
  ['Step-Up (Weighted)',            'quads', ['glutes'],                  'dumbbell',     'squat',     true,  10, 15, 3, 4],
  ['Landmine Squat',                'quads', ['glutes'],                  'barbell',      'squat',     true,  8, 15,  3, 4],

  // ─── ADDITIONAL HAMSTRINGS ───────────────────────────────────────────────────
  ['Hip Extension (Cable)',         'glutes', ['hamstrings'],            'cable',        'hinge',     true,  12, 20, 2, 4],
  ['Stiff-Leg Deadlift (Single-Leg)','hamstrings', ['glutes'],            'dumbbell',     'hinge',     true,  8, 15,  3, 4],

  // ─── ADDITIONAL GLUTES ───────────────────────────────────────────────────────
  ['Glute Squeeze Hold',            'glutes', [],                         'bodyweight',   'isolation', false, 5, 30,  1, 3],
  ['Reverse Lunge (Glute Focus)',   'glutes', ['quads'],                  'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Monster Walk',                  'glutes', [],                         'bodyweight',   'isolation', false, 15, 30, 1, 4],

  // ─── ADDITIONAL CALVES ───────────────────────────────────────────────────────
  ['Agility Ladder Drills',         'calves', ['quads'],                  'bodyweight',   'plyometric',true,  20, 40, 2, 4],
  ['Rope Jump',                     'calves', ['quads', 'glutes'],        'bodyweight',   'plyometric',true,  30, 60, 2, 4],
  ['Heel Walk',                     'tibialis', [],                       'bodyweight',   'isolation', false, 20, 40, 1, 4],
  ['Seated Tibialis Raise',         'tibialis', [],                       'machine',      'isolation', false, 15, 25, 1, 5],

  // ─── ADDITIONAL TRAPS ────────────────────────────────────────────────────────
  ['Trap Bar Shrug',                'traps', [],                          'barbell',      'isolation', false, 12, 20, 3, 4],
  ['Cable Upright Row (Traps)',     'traps', ['side_delts', 'biceps'],    'cable',        'pull',      false, 10, 15, 2, 3],

  // ─── ADDITIONAL FOREARMS ─────────────────────────────────────────────────────
  ['Dumbbell Pronation/Supination', 'forearms', [],                       'dumbbell',     'isolation', false, 15, 25, 1, 3],
  ['Gripper Walks',                 'forearms', ['traps'],                'dumbbell',     'carry',     true,  20, 40, 2, 4],

  // ─── ADDITIONAL NECK ─────────────────────────────────────────────────────────

  // ─── ADDITIONAL CORE ─────────────────────────────────────────────────────────
  ['Landmine Press (Abs)',          'abs', ['front_delts'],               'barbell',      'core',      false, 10, 15, 2, 4],
  ['Half-Kneeling Pallof Press',    'abs', [],                            'cable',        'isolation', false, 10, 15, 2, 5],
  ['Tall-Kneeling Pallof Press',    'abs', [],                            'cable',        'isolation', false, 10, 15, 2, 5],
  ['GHD Sit-Up',                    'abs', ['hamstrings', 'glutes'],      'machine',      'isolation', false, 10, 20, 3, 4],
  ['Incline Board Sit-Up',          'abs', [],                            'bodyweight',   'isolation', false, 10, 20, 2, 3],
  ['Hanging Oblique Raise',         'abs', [],                            'bodyweight',   'isolation', false, 8, 15,  2, 4],
  ['Seated Twist (Plate)',          'abs', [],                            'barbell',      'isolation', false, 15, 25, 1, 3],

  // ─── ADDUCTORS (inner thigh) ───────────────────────────────────────────────
  // New distinct muscle (docs/audit/volyume-exercise-audit-2026-05-30). These
  // are the exercises that make it programmable, the machine entry is the
  // backbone of the machine-only pathway.
  ['Hip Adduction Machine',         'adductors', [],                       'machine',      'isolation', false, 12, 20, 2, 5],
  ['Cable Hip Adduction',           'adductors', [],                       'cable',        'isolation', false, 12, 20, 2, 4],
  ['Copenhagen Adduction',          'adductors', ['abs'],                  'bodyweight',   'isolation', false, 8, 15,  3, 4],
  ['Cossack Squat',                 'adductors', ['quads', 'glutes'],      'bodyweight',   'squat',     true,  8, 15,  3, 4],
  ['Sumo Squat (Adductor Focus)',   'adductors', ['glutes', 'quads'],      'dumbbell',     'squat',     true,  10, 20, 3, 4],
  ['Side-Lying Adduction',          'adductors', [],                       'bodyweight',   'isolation', false, 15, 25, 1, 4],
  ['Lateral Lunge',                 'adductors', ['quads', 'glutes'],      'dumbbell',     'lunge',     true,  10, 15, 3, 4],

  // ─── PLATE-LOADED / ISO-LATERAL MACHINES ───────────────────────────────────
  // The Hammer-Strength backbone of commercial gyms (05 library build). The
  // deriver tags these machine_plate_loaded by name. Subregions match the
  // existing per-muscle taxonomy so selection can reason about coverage.
  ['Plate-Loaded Incline Press',    'chest', ['triceps', 'front_delts'],   'machine',      'push',      true,  8, 15,  3, 4],
  ['Plate-Loaded Chest Press',      'chest', ['triceps', 'front_delts'],   'machine',      'push',      true,  8, 15,  3, 4],
  ['Plate-Loaded Decline Press',    'chest', ['triceps'],                  'machine',      'push',      true,  8, 15,  3, 4],
  ['Iso-Lateral Chest Press',       'chest', ['triceps', 'front_delts'],   'machine',      'push',      true,  8, 15,  3, 4],
  ['Plate-Loaded Lat Pulldown',     'back', ['biceps'],                    'machine',      'pull',      true,  8, 15,  3, 4],
  ['Iso-Lateral Front Pulldown',    'back', ['biceps'],                    'machine',      'pull',      true,  8, 15,  3, 4],
  ['Plate-Loaded Row',              'back', ['biceps', 'rear_delts'],      'machine',      'pull',      true,  8, 15,  3, 4],
  ['Plate-Loaded High Row',         'back', ['biceps', 'rear_delts'],      'machine',      'pull',      true,  8, 15,  3, 4],
  ['Plate-Loaded Low Row',          'back', ['biceps'],                    'machine',      'pull',      true,  10, 15, 3, 4],
  ['Plate-Loaded Shoulder Press',   'side_delts', ['front_delts', 'triceps'], 'machine',   'push',      true,  8, 15,  3, 4],
  ['Plate-Loaded Rear Delt',        'rear_delts', ['back'],                'machine',      'isolation', false, 12, 20, 2, 5],
  ['Plate-Loaded Preacher Curl',    'biceps', [],                          'machine',      'isolation', false, 10, 15, 2, 5],
  ['Plate-Loaded Hip Thrust',       'glutes', ['hamstrings'],              'machine',      'hinge',     true,  8, 15,  3, 5],

  // ─── TRICEPS LONG HEAD (highest-yield subregion fix, 05/02b) ────────────────
  // Overhead extensions grew the triceps long head far more than pushdowns
  // (Maeo). The library was thin here, these close the gap.
  ['Overhead Cable Rope Extension', 'triceps', [],                         'cable',        'isolation', false, 10, 20, 2, 5],
  ['Plate-Loaded Overhead Extension','triceps', [],                        'machine',      'isolation', false, 10, 15, 2, 5],
  ['Seated Dip Machine',            'triceps', ['chest'],                  'machine',      'push',      true,  8, 15,  2, 5],

  // ─── MACHINE-ONLY COVERAGE FILL (05) ───────────────────────────────────────
  // Single tagged entries so every machine in the commercial-gym inventory
  // maps to a library exercise, completing the machine-only pathway.
  ['Lateral Raise Machine',         'side_delts', [],                      'machine',      'isolation', false, 12, 20, 2, 5],
  ['Preacher Curl Machine',         'biceps', [],                          'machine',      'isolation', false, 10, 15, 2, 5],
  ['Triceps Extension Machine',     'triceps', [],                         'machine',      'isolation', false, 10, 15, 2, 5],
  ['Glute Kickback Machine',        'glutes', ['hamstrings'],              'machine',      'isolation', false, 12, 20, 2, 5],
  ['Ab Crunch Machine',             'abs', [],                             'machine',      'isolation', false, 12, 20, 2, 5],
  ['Assisted Dip Machine',          'triceps', ['chest', 'front_delts'],   'machine',      'push',      true,  8, 15,  2, 4],
];

// Build the full insert payload for one RAW row: the base fields the seed
// has always written, plus the derived metadata. Pure; shared by the seed
// and the top-up so a row inserted by either path is identical.
function rowToExercise(row) {
  const [name, primaryMuscle, secondaryMuscles, equipment, movementPattern, isCompound, min, max, fatigue, sfr] = row;
  const base = {
    name,
    primaryMuscle,
    secondaryMuscles,
    equipment,
    movementPattern,
    compoundIsolation: isCompound ? 'compound' : 'isolation',
    defaultRepMin: min,
    defaultRepMax: max,
    fatigueCost: fatigue,
    stimulusToFatigueRatio: sfr,
    subregion: SUBREGION_MAP[name] ?? null,
    isCustom: false,
  };
  return { ...base, ...deriveExerciseMetadata(base) };
}

export async function seedExercisesIfNeeded() {
  try {
    const seeded = await AsyncStorage.getItem(SEEDED_KEY);
    if (seeded === 'true') return;

    const existing = await getAllExercises();
    if (existing.length > 0) {
      await AsyncStorage.setItem(SEEDED_KEY, 'true');
      return;
    }

    for (const row of RAW) {
      // Deterministic ID derived from the canonical name. Same name on
      // any device produces the same UUID, so a routine pushed from
      // device A with exercise_id = canonicalExerciseId('Bench Press')
      // resolves on device B's fresh seed without any name lookup.
      await insertExerciseWithId(canonicalExerciseId(row[0]), rowToExercise(row));
    }

    await AsyncStorage.setItem(SEEDED_KEY, 'true');
    // A fresh seed already carries the metadata and the full list, so mark
    // both follow-up passes done to skip the redundant work.
    await AsyncStorage.setItem(METADATA_BACKFILL_KEY, 'true');
    await AsyncStorage.setItem(LIBRARY_VERSION_KEY, 'true');
    console.log(`[Seed] Inserted ${RAW.length} exercises`);
  } catch (err) {
    console.error('[Seed] seedExercisesIfNeeded failed:', err);
  }
}

// Idempotent top-up for installs that seeded an earlier, shorter library and
// would otherwise never receive exercises added to RAW later (the seed
// early-returns when any rows exist). Inserts any RAW row whose canonical ID
// is not already present, fully populated with derived metadata. Safe to
// re-run: insertExerciseWithId is INSERT OR IGNORE, and a version flag skips
// the scan once the current list is in. Custom exercises are untouched.
export async function topUpNewExercisesIfNeeded() {
  try {
    const done = await AsyncStorage.getItem(LIBRARY_VERSION_KEY);
    if (done === 'true') return;

    const existing = await getAllExercises();
    const haveIds = new Set(existing.map(e => e.id));
    let added = 0;
    for (const row of RAW) {
      const id = canonicalExerciseId(row[0]);
      if (haveIds.has(id)) continue;
      await insertExerciseWithId(id, rowToExercise(row));
      added++;
    }

    await AsyncStorage.setItem(LIBRARY_VERSION_KEY, 'true');
    if (added > 0) console.log(`[Seed] Topped up ${added} new exercises`);
  } catch (err) {
    console.error('[Seed] topUpNewExercisesIfNeeded failed:', err);
  }
}

// One-time backfill for installs whose canonical exercises were seeded
// before the metadata columns existed (phase 7 step 1 added the columns;
// the seed early-returns when rows already exist, so those rows have null
// metadata). Derives and writes the columns in place. Idempotent and safe
// to re-run: it only touches rows whose equipment_category is still null,
// and a guard flag skips the pass entirely once done.
//
// Canonical exercises only (is_custom = 0). Custom exercises keep null
// metadata; selection falls back to their coarse equipment string.
export async function backfillExerciseMetadataIfNeeded() {
  try {
    const done = await AsyncStorage.getItem(METADATA_BACKFILL_KEY);
    if (done === 'true') return;

    const all = await getAllExercises();
    let updated = 0;
    for (const ex of all) {
      if (ex.isCustom === 1 || ex.isCustom === true) continue;
      if (ex.equipmentCategory) continue; // already populated
      await updateExerciseMetadata(ex.id, deriveExerciseMetadata(ex));
      updated++;
    }

    await AsyncStorage.setItem(METADATA_BACKFILL_KEY, 'true');
    if (updated > 0) console.log(`[Seed] Backfilled metadata on ${updated} exercises`);
  } catch (err) {
    console.error('[Seed] backfillExerciseMetadataIfNeeded failed:', err);
  }
}
