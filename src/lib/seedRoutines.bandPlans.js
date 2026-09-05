/**
 * seedRoutines.bandPlans.js — the two band-only library plans (F-16
 * REVISED point 2, docs/final-certification-2026-09-05/07-FINDINGS.md;
 * evidence A2 and the F-16 investigation appendix in
 * docs/final-certification-2026-09-05/04-TRAINING-STYLES.md).
 *
 * WHY THIS FILE EXISTS. `planEquipmentAllows` hard-filters the library
 * quiz on `equipment:band` (src/lib/onboarding/freeStarter.js:92) and the
 * "Bands" library chip matches the same tag
 * (src/screens/PlanLibraryScreen.js:196), but no plan in seedRoutines.js
 * carried it: answering "Bands" always landed on "No exact match found"
 * and the chip always showed "No plans found" (A2). The band style pool
 * (src/lib/exercise/stylePools.js STYLE_POOLS.band) was dead code for the
 * same reason: nothing tagged `style:band` (A14). These two plans close
 * both, and the F-16 investigation ruled the library, not the generator,
 * is the honest route for bands.
 *
 * SHAPE. Each entry is exactly a seedRoutines.js LIBRARY_PLANS entry
 * (name, description, tags, difficulty, workouts[{ name, exercises[] }])
 * and is consumed by seedRoutinesIfNeeded's byName lookup, so every
 * `name` below must match a canonical corpus row character for character.
 * Pure data: no imports, no I/O, so a test can read it without pulling in
 * AsyncStorage or the database.
 *
 * POOL DISCIPLINE (EL-11). Both plans carry `style:band`, which restricts
 * their swaps and their "Adjust plan" regeneration to STYLE_POOLS.band.
 * Every exercise used below is therefore inside that pool, which is
 * derived from the corpus as the STAPLE/COMMON band rows
 * (09-STYLE-PLANS.md section 1). That pool is 22 rows and is thin in
 * places: one back row, one quad row, one hamstring row, and no lateral
 * delt row at all, which is why the same squat, hinge and row recur
 * across the week. Staying inside the pool is deliberate: a plan row
 * outside its own pool cannot be reached again by the swap sheet.
 *
 * PROGRESSION (EL-10, adapted for bands, and checked against the code).
 * There is no band-grade concept anywhere in the logger. A set is logged
 * with `parseFloat(weight) || 0` (ActiveWorkoutScreen), the increment
 * resolver has one equipment special case and it is kettlebell only
 * (src/lib/livePrescription.js:176-179), and a band row's incrementKg is
 * the ordinary 2.5 kg compound / 1.25 kg isolation default
 * (src/lib/exerciseCorpus/index.js:154-158). What IS true, and what both
 * descriptions say, is that a top set logged with no weight never
 * receives a load instruction: the advance branch is gated on `top.W > 0`
 * (livePrescription.js:296, FR-C4-4) and falls through to
 * MATCH_LOAD_ADD_REP (:314-316). So the honest instruction is: log reps,
 * leave the weight blank, and change band grade by hand.
 */

/**
 * Two band-only library plans, in LIBRARY_PLANS entry shape. Spread into
 * seedRoutines.js's LIBRARY_PLANS; not registered here.
 * @type {ReadonlyArray<object>}
 */
export const BAND_LIBRARY_PLANS = [

  // ── Full Body: Bands (3 days, beginner to intermediate) ──────────────────
  {
    name: 'Full Body: Bands',
    description: 'A three day full body plan built entirely from resistance bands, for someone starting out or training at home with no weights. Every session covers a push, a pull, a squat or a hinge and core work, so the whole body is trained three times a week. Kit: a set of long bands in three or four grades (a light, a medium and a heavy at least), a door anchor or another sturdy fixed point, and one short loop band for the hip work. Bands have no kilogram value to log, so leave the weight blank and record your reps. Volyume then keeps you on the same band and asks for another rep instead of suggesting a heavier load. When you reach the top of the rep range on every set of a lift, move up to the next band grade and start that lift again at the bottom of the range.',
    tags: 'style:band equipment:band band home full_body gender:all goal:build_muscle days:3 beginner intermediate audience:beginner',
    difficulty: 0,
    workouts: [
      {
        name: 'Day A',
        exercises: [
          { name: 'Band Goblet Squat',                sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Stand on the middle of the band, both ends held at your chest. Sit down between your knees, chest tall.' },
          { name: 'Band Chest Press (Single-Arm)',    sets: 3, repsMin: 10, repsMax: 15, rest: 75, notes: 'Per side. Band anchored behind you at chest height, staggered stance. Press straight forward, then return slowly.' },
          { name: 'Band Row (Single-Arm)',            sets: 3, repsMin: 10, repsMax: 15, rest: 75, notes: 'Per side. Anchor at chest height, stand side on. Pull the elbow past your ribs, shoulder down and back.' },
          { name: 'Band Glute Bridge',                sets: 3, repsMin: 12, repsMax: 20, rest: 75, notes: 'Loop band around the thighs. Press the knees out against it as you drive the hips up, then squeeze at the top.' },
          { name: 'Band Tricep Kickback',             sets: 2, repsMin: 12, repsMax: 20, rest: 60, notes: 'Per side. Hinge forward, upper arm pinned to your ribs. Straighten the elbow only, then lower under control.' },
          { name: 'Band Pull-Apart',                  sets: 2, repsMin: 15, repsMax: 20, rest: 60, notes: 'Arms out in front at shoulder height. Draw your hands apart until the band touches your chest. Light band here.' },
          { name: 'Band Pallof Press',                sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Per side. Stand side on to the anchor. Press your hands away from your chest without letting the torso rotate.' },
        ],
      },
      {
        name: 'Day B',
        exercises: [
          { name: 'Band Romanian Deadlift (Bilateral)', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Stand on the band, an end in each hand. Push the hips back with soft knees, then drive them forward to stand.' },
          { name: 'Band Shoulder Press (Seated)',     sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Sit tall with the band under the seat. Press straight overhead, ribs down, then lower to shoulder height.' },
          { name: 'Band Row (Single-Arm)',            sets: 3, repsMin: 12, repsMax: 20, rest: 75, notes: 'Per side. Lighter band than Day A, higher reps. Same pull: elbow past the ribs, no shrugging.' },
          { name: 'Band Goblet Squat',                sets: 3, repsMin: 12, repsMax: 20, rest: 90, notes: 'Higher reps than Day A. Control the way down, do not let the band pull you into the bottom.' },
          { name: 'Band Standing Curl (Single-Arm)',  sets: 2, repsMin: 12, repsMax: 20, rest: 60, notes: 'Per side. Stand on the band with one foot. Elbow stays at your side, lower all the way each rep.' },
          { name: 'Band Tricep Kickback',             sets: 2, repsMin: 12, repsMax: 20, rest: 60, notes: 'Per side. Keep the upper arm still. All the movement comes from the elbow.' },
          { name: 'Band Woodchop (Low-to-High)',      sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Per side. Anchor low. Pull up and across towards the opposite shoulder, turning through the middle.' },
        ],
      },
      {
        name: 'Day C',
        exercises: [
          { name: 'Band Goblet Squat',                sets: 3, repsMin: 15, repsMax: 20, rest: 90, notes: 'The lightest squat day of the week. Steady tempo, full depth, no rushing the reps.' },
          { name: 'Band Chest Fly (Standing)',        sets: 3, repsMin: 12, repsMax: 20, rest: 75, notes: 'Anchored behind you at chest height, a slight bend in the elbows. Bring the hands together in a wide arc.' },
          { name: 'Band Row (Single-Arm)',            sets: 3, repsMin: 10, repsMax: 15, rest: 75, notes: 'Per side. Heaviest band you can row cleanly for ten. Stop the set if the shoulder starts to shrug.' },
          { name: 'Band Romanian Deadlift (Bilateral)', sets: 3, repsMin: 12, repsMax: 20, rest: 90, notes: 'Higher reps than Day B. Feel the stretch down the back of the legs, keep the back flat throughout.' },
          { name: 'Band Rear Delt Fly',               sets: 2, repsMin: 12, repsMax: 20, rest: 60, notes: 'Anchor in front of you at chest height. Pull the hands out and back, squeezing the shoulder blades.' },
          { name: 'Band Hammer Curl',                 sets: 2, repsMin: 12, repsMax: 20, rest: 60, notes: 'Stand on the band, palms facing in. Curl to the shoulders, then lower fully every rep.' },
          { name: 'Band Monster Walk',                sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Steps each way. Loop band around the thighs, quarter squat, small steps with the tension kept on.' },
        ],
      },
    ],
  },

  // ── Upper/Lower: Bands (4 days, intermediate) ────────────────────────────
  {
    name: 'Upper/Lower: Bands',
    description: 'A four day upper and lower split built entirely from resistance bands, for someone already training regularly who wants more work per muscle than a full body week allows. The two upper days cover pressing, rowing, shoulders and arms; the two lower days cover the squat, the hinge and the hips, with core work on both. Kit: a set of long bands in three or four grades, a door anchor or another sturdy fixed point, and one short loop band for the hip work. Bands have no kilogram value to log, so leave the weight blank and record your reps. Volyume then keeps you on the same band and asks for another rep instead of suggesting a heavier load. When you reach the top of the rep range on every set of a lift, move up to the next band grade and start that lift again at the bottom of the range.',
    tags: 'style:band equipment:band band home upper_lower gender:all goal:build_muscle days:4 intermediate',
    difficulty: 1,
    workouts: [
      {
        name: 'Day 1: Upper',
        exercises: [
          { name: 'Band Chest Press (Single-Arm)',    sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Per side. Anchored behind you at chest height. Press forward and slightly in, then return under control.' },
          { name: 'Band Row (Single-Arm)',            sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Per side. The main pull of the week. Elbow past the ribs, chest up, no twisting towards the anchor.' },
          { name: 'Band Shoulder Press (Seated)',     sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Band under the seat, an end in each hand. Press straight overhead without leaning back to help it up.' },
          { name: 'Band Chest Fly (Standing)',        sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Slight elbow bend held throughout. Wide arc in, squeeze, then let the hands travel back slowly.' },
          { name: 'Band Rear Delt Fly',               sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Anchor in front at chest height. Arms stay long, pull out and back rather than up.' },
          { name: 'Band Tricep Kickback',             sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Per side. Upper arm pinned to your ribs, elbow does all the work.' },
          { name: 'Band Standing Curl (Single-Arm)',  sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Per side. Stand on the band, elbow at your side. Lower all the way down before the next rep.' },
        ],
      },
      {
        name: 'Day 2: Lower',
        exercises: [
          { name: 'Band Goblet Squat',                sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'The main squat of the week. Both ends of the band at your chest, sit down between your knees.' },
          { name: 'Band Romanian Deadlift (Bilateral)', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Hips back, soft knees, flat back. Stand tall at the top rather than leaning behind you.' },
          { name: 'Band Glute Bridge',                sets: 3, repsMin: 12, repsMax: 20, rest: 75, notes: 'Loop band around the thighs. Press the knees out as you drive the hips up.' },
          { name: 'Band Standing Hip Abduction',      sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Per side. Band at the ankle, hold something for balance. Lift the leg out to the side, torso still.' },
          { name: 'Band Clamshell',                   sets: 2, repsMin: 15, repsMax: 20, rest: 60, notes: 'Per side. On your side, loop band around the thighs, feet together. Open the top knee without rolling back.' },
          { name: 'Band Woodchop (Low-to-High)',      sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Per side. Anchor low, pull up and across towards the opposite shoulder. Turn through the middle, not the arms.' },
        ],
      },
      {
        name: 'Day 3: Upper',
        exercises: [
          { name: 'Band Row (Single-Arm)',            sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Per side. Heavier band than Day 1 if you can hold the position. Stop the set if the back starts to round.' },
          { name: 'Band Shoulder Press (Seated)',     sets: 3, repsMin: 12, repsMax: 20, rest: 90, notes: 'Lighter band than Day 1, higher reps. Ribs down, no arching to get the last rep.' },
          { name: 'Band Chest Press (Single-Arm)',    sets: 3, repsMin: 12, repsMax: 20, rest: 90, notes: 'Per side. Higher reps than Day 1. Keep the ribcage still and press with the chest, not the shoulder.' },
          { name: 'Band Pull-Apart',                  sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Light band, arms out in front at shoulder height. Draw the hands apart until the band meets your chest.' },
          { name: 'Band Pull-Apart (Overhead)',       sets: 2, repsMin: 15, repsMax: 20, rest: 60, notes: 'Band held overhead, hands wider than the shoulders. Drive out and slightly down, then return slowly.' },
          { name: 'Band Hammer Curl',                 sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Stand on the band, palms facing in throughout. No swinging at the elbow.' },
          { name: 'Band Tricep Kickback',             sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Per side. Hinge forward with a flat back. The upper arm never moves.' },
        ],
      },
      {
        name: 'Day 4: Lower',
        exercises: [
          { name: 'Band Romanian Deadlift (Bilateral)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'The main hinge of the week. Push the hips back, long stretch down the hamstrings, then drive forward.' },
          { name: 'Band Goblet Squat',                sets: 3, repsMin: 12, repsMax: 20, rest: 90, notes: 'Lighter band than Day 2, higher reps. Sit down between your knees, chest tall.' },
          { name: 'Band Glute Kickback',              sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Per side. On all fours, band around one foot. Drive the leg back and up without arching the lower back.' },
          { name: 'Band Monster Walk',                sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Steps each way. Quarter squat, knees pressed out, small steps with the tension kept on the whole time.' },
          { name: 'Band Woodchop (High-to-Low)',      sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Per side. Anchor high, pull down and across towards the opposite hip. Turn through the middle.' },
          { name: 'Band Pallof Press',                sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Per side. Stand side on to the anchor. Press the hands away and resist the pull to rotate.' },
        ],
      },
    ],
  },
];

export default BAND_LIBRARY_PLANS;
