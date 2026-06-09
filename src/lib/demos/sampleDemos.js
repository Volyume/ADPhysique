/**
 * sampleDemos — a small, bundled, fully-offline demonstration set for the
 * flagship barbell lifts, used to prove the demonstration experience end-to-end
 * before a premium animation library (e.g. MoveKit) is licensed.
 *
 * Provenance: the frames are start/end stills from the public-domain
 * free-exercise-db (Unlicense). They are animated in-app as a start↔end loop
 * (see DemoCard) — a clearly-labelled STAND-IN for the eventual 3D clip, not a
 * premium asset. When real media exists, the exercise row's `demo_url` takes
 * precedence and this map is ignored; nothing about the data shape changes.
 *
 * Keyed by canonical exercise NAME (exact match to seedExercises). British
 * English. Cues use the same { setup, execution, cues } shape as `form_cues`
 * so CoachingNotesPanel renders them identically to seeded structured cues.
 */

const SAMPLES = {
  'Barbell Bench Press': {
    frames: [require('../../../assets/demos/bench_0.jpg'), require('../../../assets/demos/bench_1.jpg')],
    formCues: {
      setup: ['Eyes under the bar, shoulder blades pinched and down', 'Slight arch, feet flat and driving into the floor'],
      execution: ['Lower the bar to the lower chest under control', 'Press up and slightly back to lockout'],
      cues: ['Elbows ~45–75° from the torso', 'Chest up', 'Wrists stacked over elbows'],
    },
    commonMistakes: ['Flaring the elbows to 90°', 'Bouncing the bar off the chest', 'Losing the upper-back tightness'],
  },
  'Barbell Back Squat': {
    frames: [require('../../../assets/demos/squat_0.jpg'), require('../../../assets/demos/squat_1.jpg')],
    formCues: {
      setup: ['Bar on the upper traps, hands tight', 'Feet shoulder-width, toes slightly out, brace hard'],
      execution: ['Sit down and back, knees tracking over toes', 'Drive up through mid-foot to standing'],
      cues: ['Chest up', 'Knees out', 'Even depth each rep'],
    },
    commonMistakes: ['Knees caving in', 'Heels lifting', 'Cutting depth short'],
  },
  'Conventional Deadlift': {
    frames: [require('../../../assets/demos/deadlift_0.jpg'), require('../../../assets/demos/deadlift_1.jpg')],
    formCues: {
      setup: ['Bar over mid-foot, shins close', 'Flat back, lats tight, take the slack out of the bar'],
      execution: ['Push the floor away and stand tall', 'Hips and shoulders rise together'],
      cues: ['Neutral spine', 'Bar stays against the legs', 'Lock out with glutes, not the lower back'],
    },
    commonMistakes: ['Rounding the lower back', 'Hips shooting up first', 'Bar drifting away from the shins'],
  },
  'Barbell Overhead Press': {
    frames: [require('../../../assets/demos/ohp_0.jpg'), require('../../../assets/demos/ohp_1.jpg')],
    formCues: {
      setup: ['Bar on the front delts, grip just outside the shoulders', 'Brace, squeeze glutes, ribs down'],
      execution: ['Press up, moving the head back then through', 'Lock out with the bar over the mid-foot'],
      cues: ['Tight core', 'Bar in a straight line', 'Full lockout overhead'],
    },
    commonMistakes: ['Leaning back excessively', 'Pressing the bar around the face', 'Soft, bent-elbow lockout'],
  },
  'Barbell Row (Bent Over)': {
    frames: [require('../../../assets/demos/row_0.jpg'), require('../../../assets/demos/row_1.jpg')],
    formCues: {
      setup: ['Hinge to ~45°, flat back, bar hanging under the shoulders'],
      execution: ['Row the bar to the lower chest / upper abs', 'Lower under control to full stretch'],
      cues: ['Pull with the elbows', 'Squeeze the shoulder blades', 'Keep the torso angle fixed'],
    },
    commonMistakes: ['Using momentum / standing up the torso', 'Rowing too high to the chest', 'Shrugging instead of rowing'],
  },
  'Face Pull': {
    frames: [require('../../../assets/demos/facepull_0.jpg'), require('../../../assets/demos/facepull_1.jpg')],
    formCues: {
      setup: ['Rope at face height, take a step back to tension'],
      execution: ['Pull the rope towards your forehead', 'Finish with hands beside the ears, elbows high and wide'],
      cues: ['Externally rotate', 'Lead with the elbows', 'Control over heavy load'],
    },
    commonMistakes: ['Going too heavy and turning it into a row', 'Elbows dropping', 'No external rotation at the end'],
  },
};

/** Returns the bundled sample demo for a canonical exercise name, or null. */
export function getSampleDemo(name) {
  if (!name) return null;
  return SAMPLES[name] || null;
}

/** Names that currently have a bundled sample demo (for thumbnails/affordances). */
export const SAMPLE_DEMO_NAMES = Object.keys(SAMPLES);
