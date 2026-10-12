/**
 * offseasonAllan.js -- the authored library plan "Mens Physique Off Season -
 * Allan" (register D227 and its addenda; build spec
 * docs/audit/offseason-allan-2026-10-12/01-SPEC.md sections A1 to A6, B1, B2,
 * C1 and F1; the founder's document, verbatim, is
 * docs/audit/offseason-allan-2026-10-12/00-FOUNDER-PLAN.md).
 *
 * PURE DATA. No imports, no I/O, so a test, the seed and the serve path can
 * all read it without pulling in the database. The plan is written once here
 * and every reader derives from it (./authored.js), so the sets the library
 * shows, the facts the coach reads and the sets the logger serves cannot
 * drift apart.
 *
 * WHAT IS HERE
 *   name, description, tags, difficulty   the LIBRARY_PLANS entry fields (A1, A4)
 *   phases                                the per-phase effort (A6): RIR ranges
 *                                         for compound and isolation work, and
 *                                         the block week's RIR (the compound
 *                                         range's lower bound)
 *   blocks                                the phase of every week of block 1 and
 *                                         of every later block (B1, B2)
 *   ceilings                              the weekly and per-session ceilings
 *                                         check-ins work inside (D2, for lane B)
 *   sessionCaps                           the plan's per-session caps in the
 *                                         app's muscle keys (C1)
 *   optional                              the Growth-only machine shoulder press
 *                                         trial (A3): data only, never served
 *   sessions[].exercises[]                every slot, in session order (A2):
 *     key        stable slot key ('d1.lat_pulldown'), the same on every copy
 *     name       the library row's canonical corpus name
 *     muscle     the muscle the founder's tables count the slot under
 *                ('lats' and 'upper_back' are both the app's 'back')
 *     kind       'compound' or 'isolation' (the document's own split, A6)
 *     repsMin, repsMax, rest   the document's range; rest is each range's
 *                midpoint rounded to 15 s (the spec's worked examples)
 *     sets       { health, ramp1, ramp2, growth, reduction }: the A5 table,
 *                exact. Health is the ramp's reference only (D227 addendum:
 *                the plan starts at Ramp 1)
 *     cap        the most sets this exercise is ever served (C1): the
 *                founder's Growth number, laterals up to 7
 *     subs       the document's listed substitutions, as corpus names (A3,
 *                F1): the ONLY exercises that may stand in for this slot
 *     perArm     sets are counted per arm (the document's "per arm")
 *     notes      the cue in plain British English (A4)
 *
 * PERSONAL ITEMS (D227 point 4, spec A4) are deliberately absent: the
 * shoulder history as a diagnosis, physio, doctor and bloods, show dates and
 * anything about enhanced use. The general shoulder-safe rules stay in the
 * description.
 */

const WARM_UP = 'Warm up with 2 light sets of cable external rotation and 1 to 2 very light sets of this exercise. These warm-ups are not working sets.';
const PARTIALS = 'In Growth weeks, the final set may finish with a few partial reps in the stretched position.';
const CABLE_LATERAL = 'Cable at hand height, the handle crossing in front of or behind your body, whichever is pain-free. Raise in the scapular plane, about 30 degrees forward of straight out to the side, to about shoulder height. Lead with the elbow and keep the thumb neutral or slightly up. Take 2 to 3 seconds to lower.';

export const OFFSEASON_ALLAN_NAME = 'Mens Physique Off Season - Allan';

export const OFFSEASON_ALLAN = Object.freeze({
  name: OFFSEASON_ALLAN_NAME,
  description: 'Four upper-biased sessions a week for men\'s physique, built from machines and cables only. Lats are trained in three sessions, side delts in all four, and legs get one complete session. Suggested days are Monday, Tuesday, Thursday and Saturday, resting on Wednesday, Friday and Sunday. The exercises stay the same throughout; only the sets and the effort change. The plan starts with two ramp weeks that add sets in a set order: lats and side delts first, then rear delts and upper back, then chest and arms, then legs. Then come the full Growth weeks, and each block ends with a reduction week at about half the sets. Shoulder-friendly rules apply to every session: no flat pressing, dips, upright rows, behind-the-neck work, deep fly stretches or heavy overhead pressing. Lateral raises are done in the scapular plane to about shoulder height, and every exercise is worked in a pain-free range. In Growth weeks, 2 sets of a machine shoulder press may be trialled at 2 or more reps in reserve, only if it is completely pain-free. Progress by adding reps until every set reaches the top of the range, then add the smallest load step and start again at the bottom.',
  tags: 'gender:men goal:mens_physique equipment:machines_cables authored',
  difficulty: 2,

  // A6: effort per phase. `weekRir` is the block week's RIR target
  // (mesocycles.rir_ladder, read by the recovery model): the compound range's
  // lower bound.
  phases: Object.freeze({
    health: Object.freeze({ compound: [2, 3], isolation: [1, 2], weekRir: 2 }),
    ramp1: Object.freeze({ compound: [2, 2], isolation: [1, 2], weekRir: 2 }),
    ramp2: Object.freeze({ compound: [2, 2], isolation: [1, 1], weekRir: 2 }),
    growth: Object.freeze({ compound: [1, 2], isolation: [0, 1], weekRir: 1 }),
    reduction: Object.freeze({ compound: [3, 3], isolation: [2, 3], weekRir: 3 }),
  }),

  // B1, B2: 8-week blocks. Block 1 is Ramp 1, Ramp 2, Growth x 5 (the first
  // being the document's Ramp 3) and the reduction week; every later block is
  // Growth x 7 and the reduction week.
  blocks: Object.freeze({
    first: Object.freeze(['ramp1', 'ramp2', 'growth', 'growth', 'growth', 'growth', 'growth', 'reduction']),
    later: Object.freeze(['growth', 'growth', 'growth', 'growth', 'growth', 'growth', 'growth', 'reduction']),
  }),

  // D2 (lane B reads these): the most direct sets a week, and in one session.
  ceilings: Object.freeze({
    weekly: Object.freeze({ lats: 20, side_delts: 22, quads: 7, hamstrings: 5 }),
    perSession: Object.freeze({ lats: 7, side_delts: 7 }),
  }),

  // C1: the plan's per-session caps in the app's muscle keys, replacing the
  // house caps (science.PER_SESSION, 8 direct and 11 counted) for these
  // muscles on this plan only.
  sessionCaps: Object.freeze({
    side_delts: Object.freeze({ direct: 7 }),
    back: Object.freeze({ direct: 10, fractional: 12 }),
    chest: Object.freeze({ direct: 10 }),
  }),

  // A3: the Growth-only trial. Never served by default.
  optional: Object.freeze([
    Object.freeze({
      key: 'opt.machine_shoulder_press',
      name: 'Machine Shoulder Press',
      muscle: 'front_delts',
      kind: 'compound',
      sets: 2,
      rirMin: 2,
      phase: 'growth',
      notes: 'Optional in Growth weeks only: 2 sets at 2 or more reps in reserve, only if it is completely pain-free.',
    }),
  ]),

  sessions: Object.freeze([
    Object.freeze({
      key: 'd1',
      name: 'Back Width A',
      exercises: Object.freeze([
        { key: 'd1.lat_pulldown', name: 'Plate-Loaded Lat Pulldown', muscle: 'lats', kind: 'compound', repsMin: 6, repsMax: 10, rest: 150,
          sets: { health: 3, ramp1: 4, ramp2: 4, growth: 4, reduction: 2 }, cap: 7,
          subs: ['Lat Pulldown (Wide Grip)', 'Lat Pulldown (Neutral Grip)'],
          notes: `${WARM_UP} Pronated grip about 1.5 times shoulder width, or wide handles. Thigh pad snug, chest tall, slight lean back. Pull the handles to your upper chest, never behind your head, and think elbows to back pockets. Let your arms rise at the top only as far as your shoulder is comfortable, then start each rep by drawing the shoulder blade down.` },
        { key: 'd1.single_arm_pulldown', name: 'Single-Arm Lat Pulldown', muscle: 'lats', kind: 'compound', repsMin: 10, repsMax: 15, rest: 90,
          sets: { health: 2, ramp1: 2, ramp2: 3, growth: 3, reduction: 2 }, cap: 7, perArm: true,
          subs: ['Iso-Lateral Front Pulldown'],
          notes: 'Sets are per arm. High pulley and a D-handle, kneeling or seated side-on. Let the working arm reach up and slightly across your body for a stretch, within a pain-free range. Drive the elbow down to your hip and keep your torso still.' },
        { key: 'd1.chest_supported_row', name: 'Machine Row (Chest Supported)', muscle: 'upper_back', kind: 'compound', repsMin: 8, repsMax: 12, rest: 120,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 3,
          subs: ['Seated Cable Row', 'Plate-Loaded T-Bar Row (Chest-Supported)'],
          notes: 'Neutral grip, elbows tucked about 30 degrees from your torso to bias the lats. Keep your chest on the pad. Pull your elbows towards your hips rather than straight back, and pause for 1 second at the end.' },
        { key: 'd1.cable_lateral', name: 'Single-Arm Cable Lateral Raise', muscle: 'side_delts', kind: 'isolation', repsMin: 12, repsMax: 20, rest: 75,
          sets: { health: 3, ramp1: 4, ramp2: 5, growth: 5, reduction: 3 }, cap: 7,
          subs: ['Machine Lateral Raise'],
          notes: `${CABLE_LATERAL} ${PARTIALS}` },
        { key: 'd1.reverse_pec_deck', name: 'Reverse Pec Deck', muscle: 'rear_delts', kind: 'isolation', repsMin: 12, repsMax: 20, rest: 75,
          sets: { health: 2, ramp1: 3, ramp2: 3, growth: 3, reduction: 2 }, cap: 3,
          subs: ['Reverse Cable Crossover'],
          notes: 'Neutral or overhand handles, set so you start with your hands in front of your chest. Sweep wide and stop when your arms are in line with your torso. Do not squeeze your shoulder blades hard together: this is rear delts, not traps.' },
        { key: 'd1.preacher_curl', name: 'Preacher Curl Machine', muscle: 'biceps', kind: 'isolation', repsMin: 8, repsMax: 12, rest: 90,
          sets: { health: 2, ramp1: 2, ramp2: 3, growth: 3, reduction: 2 }, cap: 3,
          subs: ['Cable Preacher Curl', 'Machine Curl'],
          notes: 'Use the full stretch at the bottom, but stop short of locking the elbow under load if it complains.' },
        { key: 'd1.kneeling_crunch', name: 'Kneeling Cable Crunch', muscle: 'abs', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 60,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 2 }, cap: 3,
          subs: ['Machine Crunch'],
          notes: 'Use a rope. Curl through your spine, ribs towards your pelvis, and keep your hips still.' },
      ]),
    }),
    Object.freeze({
      key: 'd2',
      name: 'Upper Chest & Arms',
      exercises: Object.freeze([
        { key: 'd2.incline_press', name: 'Incline Machine Press', muscle: 'chest', kind: 'compound', repsMin: 6, repsMax: 10, rest: 150,
          sets: { health: 3, ramp1: 3, ramp2: 4, growth: 4, reduction: 2 }, cap: 4,
          subs: ['Smith Machine Incline Press'],
          notes: `${WARM_UP} Back pad at about 30 degrees if it adjusts, with neutral or semi-neutral handles if the machine has them. Set your shoulder blades down and back first. Keep your elbows 45 to 60 degrees from your torso, not flared out. Lower until the handles are about level with your chest or your elbows are just behind your torso, whichever is pain-free. Never chase a deep stretch. Press up and slightly in. On the Smith machine, use a slightly narrower grip than on a bench and only if it is pain-free.` },
        { key: 'd2.converging_press', name: 'Converging Chest Press Machine', muscle: 'chest', kind: 'compound', repsMin: 8, repsMax: 12, rest: 120,
          sets: { health: 2, ramp1: 2, ramp2: 3, growth: 3, reduction: 2 }, cap: 3,
          subs: ['Plate-Loaded Incline Press', 'Seated Cable Chest Press'],
          notes: 'Set the seat low so the handles line up with the lower edge of your upper chest. Let the machine\'s arc bring your hands together, with the same depth rule as the incline press. Squeeze for 1 second with your hands together.' },
        { key: 'd2.low_to_high_fly', name: 'Cable Fly (Low to High)', muscle: 'chest', kind: 'isolation', repsMin: 12, repsMax: 15, rest: 90,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 3,
          subs: ['Incline Cable Fly'],
          notes: 'Pulleys at the lowest setting, standing in a staggered stance. Start with your hands roughly in line with your hips, never behind your torso. Sweep up and in to chin height, keeping a slight bend at the elbow.' },
        { key: 'd2.machine_lateral', name: 'Machine Lateral Raise', muscle: 'side_delts', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 75,
          sets: { health: 3, ramp1: 4, ramp2: 4, growth: 5, reduction: 2 }, cap: 7,
          subs: ['Single-Arm Cable Lateral Raise'],
          notes: `Pad on the outer forearm or upper arm. Line your shoulder up with the machine's pivot. If the machine forces your arm straight out to the side and that hurts, use the cable version instead. Stop at about shoulder height. ${PARTIALS}` },
        { key: 'd2.overhead_extension', name: 'Cable Overhead Tricep Extension', muscle: 'triceps', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 90,
          sets: { health: 2, ramp1: 2, ramp2: 3, growth: 3, reduction: 2 }, cap: 3,
          subs: ['Single-Arm Overhead Cable Extension', 'Cross-Body Cable Tricep Extension'],
          notes: 'Rope, facing away, pulley at chest height. Lean your torso forward so your upper arms sit only a little above shoulder height rather than fully overhead. Stretch the triceps, not the shoulder.' },
        { key: 'd2.pushdown', name: 'Tricep Pushdown (Rope)', muscle: 'triceps', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 75,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 2, reduction: 1 }, cap: 2,
          subs: ['Dip Machine', 'Machine Tricep Extension'],
          notes: 'Rope or straight bar. Pin your elbows to your sides and lock out fully. On the dip machine, stop at a shallow range with no deep shoulder stretch.' },
        { key: 'd2.machine_crunch', name: 'Machine Crunch', muscle: 'abs', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 60,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 3,
          subs: ['Kneeling Cable Crunch'],
          notes: 'Breathe out and curl your ribs down.' },
      ]),
    }),
    Object.freeze({
      key: 'd3',
      name: 'Legs, Delts & Lats',
      exercises: Object.freeze([
        { key: 'd3.seated_leg_curl', name: 'Seated Leg Curl', muscle: 'hamstrings', kind: 'isolation', repsMin: 8, repsMax: 12, rest: 105,
          sets: { health: 3, ramp1: 3, ramp2: 3, growth: 4, reduction: 2 }, cap: 4,
          subs: ['Lying Leg Curl'],
          notes: `Thigh pad tight. Sit your hips back and lean your torso forward a little for more stretch on the hamstrings. Control the return to near-full knee extension and pause briefly at full bend. Use the lying curl only if no seated curl is free. ${PARTIALS}` },
        { key: 'd3.hack_squat', name: 'Hack Squat Machine', muscle: 'quads', kind: 'compound', repsMin: 8, repsMax: 12, rest: 150,
          sets: { health: 2, ramp1: 2, ramp2: 3, growth: 3, reduction: 2 }, cap: 3,
          subs: ['Pendulum Squat', 'Belt Squat'],
          notes: 'Feet in the middle of the platform, shoulder width apart. Go as deep as your hips and knees allow without your pelvis tucking under. Push through the whole foot and stop just short of locking out.' },
        { key: 'd3.leg_extension', name: 'Leg Extension', muscle: 'quads', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 90,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 3,
          subs: ['Single-Leg Leg Extension'],
          notes: 'Set the seat so your knee lines up with the pivot, with a slight backward lean or a reclined back pad if it adjusts. Hold at the top for 1 second and control the lowering.' },
        { key: 'd3.standing_calf', name: 'Standing Calf Raise (Machine)', muscle: 'calves', kind: 'isolation', repsMin: 8, repsMax: 15, rest: 75,
          sets: { health: 3, ramp1: 3, ramp2: 3, growth: 4, reduction: 2 }, cap: 4,
          subs: ['Seated Calf Raise'],
          notes: `Pause for 1 to 2 seconds in the deepest stretch on every rep, then rise all the way onto your toes. The seated version loads the calves less, so the standing one is preferred. ${PARTIALS}` },
        { key: 'd3.cable_lateral', name: 'Single-Arm Cable Lateral Raise', muscle: 'side_delts', kind: 'isolation', repsMin: 12, repsMax: 20, rest: 75,
          sets: { health: 3, ramp1: 4, ramp2: 5, growth: 5, reduction: 3 }, cap: 7,
          subs: ['Machine Lateral Raise'],
          notes: `${CABLE_LATERAL} ${PARTIALS}` },
        { key: 'd3.straight_arm_pulldown', name: 'Cable Straight-Arm Pulldown', muscle: 'lats', kind: 'isolation', repsMin: 12, repsMax: 15, rest: 75,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 7,
          subs: ['Cable Lat Pullover', 'Machine Pullover'],
          notes: 'Rope or straight bar, pulley high, with a slight hip hinge. Start with your arms only as high as your shoulder is comfortable, never at the extreme overhead stretch. Sweep your hands to your thighs with your elbows nearly straight, feeling it in your lats rather than your triceps. On a pullover, start below any painful overhead range.' },
      ]),
    }),
    Object.freeze({
      key: 'd4',
      name: 'Back Width B & Arms',
      exercises: Object.freeze([
        { key: 'd4.v_bar_pulldown', name: 'V-Bar Pulldown', muscle: 'lats', kind: 'compound', repsMin: 8, repsMax: 12, rest: 150,
          sets: { health: 3, ramp1: 4, ramp2: 4, growth: 4, reduction: 2 }, cap: 7,
          subs: ['Neutral-Grip Machine Pulldown', 'Underhand Lat Pulldown'],
          notes: `${WARM_UP} Parallel handles or a V-bar. Lean back 10 to 20 degrees. Drive your elbows down and back to your ribs and pause at the bottom, then control the return to a full but pain-free stretch at the top.` },
        { key: 'd4.iso_lateral_pulldown', name: 'Iso-Lateral Front Pulldown', muscle: 'lats', kind: 'compound', repsMin: 10, repsMax: 12, rest: 105,
          sets: { health: 2, ramp1: 2, ramp2: 3, growth: 3, reduction: 2 }, cap: 7, perArm: true,
          subs: ['Single-Arm Lat Pulldown', 'Single-Arm High-Pulley Seated Cable Row'],
          notes: 'One arm at a time, and sets are per arm. Brace your free hand on the machine. Pull the elbow down in an arc towards your hip, and let the shoulder blade rise and rotate at the top for the stretch.' },
        { key: 'd4.wide_row', name: 'Wide-Grip Cable Row', muscle: 'upper_back', kind: 'compound', repsMin: 10, repsMax: 12, rest: 120,
          sets: { health: 2, ramp1: 3, ramp2: 3, growth: 3, reduction: 2 }, cap: 3,
          subs: ['Seated Machine Row (Wide)'],
          notes: 'Wide neutral or overhand handle, elbows 45 to 60 degrees out, for the upper back. Pull to your lower chest or upper stomach with your elbows wider than on Back Width A. Squeeze your shoulder blades together and keep your torso from rocking more than a little.' },
        { key: 'd4.machine_lateral', name: 'Machine Lateral Raise', muscle: 'side_delts', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 75,
          sets: { health: 3, ramp1: 4, ramp2: 4, growth: 5, reduction: 2 }, cap: 7,
          subs: ['Single-Arm Cable Lateral Raise'],
          notes: `Use the machine or the cable, whichever you did not use on the legs day. Raise in the scapular plane to about shoulder height, taking 2 to 3 seconds to lower. ${PARTIALS}` },
        { key: 'd4.reverse_crossover', name: 'Reverse Cable Crossover', muscle: 'rear_delts', kind: 'isolation', repsMin: 12, repsMax: 20, rest: 75,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 3,
          subs: ['Reverse Pec Deck'],
          notes: 'Pulleys at shoulder height, crossed over or one arm at a time, with your chest supported on an incline bench if you can. Sweep with nearly straight arms in the plane of your shoulder blades, and stop when your arms are in line with your torso.' },
        { key: 'd4.cable_curl', name: 'Cable Curl', muscle: 'biceps', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 75,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 3,
          subs: ['Machine Curl'],
          notes: 'Straight or EZ bar, facing the stack. Keep your elbows slightly in front of your torso, never pulled back behind it.' },
        { key: 'd4.cross_body_extension', name: 'Cross-Body Cable Tricep Extension', muscle: 'triceps', kind: 'isolation', repsMin: 10, repsMax: 15, rest: 75,
          sets: { health: 2, ramp1: 2, ramp2: 2, growth: 3, reduction: 1 }, cap: 3,
          subs: ['Machine Tricep Extension'],
          notes: 'Work in a pain-free range, keeping the shoulder comfortable throughout.' },
      ]),
    }),
  ]),
});
