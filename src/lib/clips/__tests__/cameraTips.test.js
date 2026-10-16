/**
 * cameraTips (D229 addendum 12): the camera's setup line per exercise.
 *
 * Pinned, each written to fail:
 *   - the classification is deterministic and reads the name first, then
 *     the equipment, then the movement pattern, then falls to the general
 *     line: a table of real library names against the key each must get;
 *   - a Smith machine lift is the lift, not "a machine";
 *   - a push with no named form gets the general line, never a guess;
 *   - every sentence is camera advice in plain British English: at most 25
 *     words, one sentence, no exclamation mark, no em dash, no technical
 *     word, no form or load advice, no appearance word, no "AI";
 *   - the general line is the camera's own setupHint, one source.
 */
import { CAMERA_TIPS, CAMERA_TIP_KEYS, cameraTipKeyFor, cameraTipFor } from '../cameraTips';
import { CLIP_STRINGS } from '../rules';

const CASES = [
  // [name, movementPattern, equipment, expected key]
  ['Back Squat', 'squat', 'barbell', 'squat'],
  ['Front Squat', 'squat', 'barbell', 'squat'],
  ['Goblet Squat', 'squat', 'dumbbell', 'squat'],
  // A hack squat has no side plates in the way, so it films as a squat
  // (05-CAMERA-ANGLES-RESEARCH.md 2.1), even though it is a machine.
  ['Hack Squat', 'squat', 'machine', 'squat'],
  ['Smith Machine Squat', 'squat', 'machine', 'squat'],
  ['Leg Press', 'squat', 'machine', 'machine'],
  ['Conventional Deadlift', 'hinge', 'barbell', 'hinge'],
  ['Sumo Deadlift', 'hinge', 'barbell', 'hinge'],
  ['Romanian Deadlift', 'hinge', 'barbell', 'hinge'],
  ['Dumbbell RDL', 'hinge', 'dumbbell', 'hinge'],
  ['Good Morning', 'hinge', 'barbell', 'hinge'],
  ['Barbell Hip Thrust', 'hinge', 'barbell', 'hip_thrust'],
  ['Glute Bridge', 'hinge', 'bodyweight', 'hip_thrust'],
  ['Bench Press', 'push', 'barbell', 'bench'],
  ['Incline Dumbbell Press', 'push', 'dumbbell', 'bench'],
  ['Dumbbell Fly', 'isolation', 'dumbbell', 'bench'],
  ['Chest Press Machine', 'push', 'machine', 'machine'],
  ['Pec Deck', 'isolation', 'machine', 'machine'],
  ['Push-Up', 'push', 'bodyweight', 'push_up'],
  ['Press Ups', 'push', 'bodyweight', 'push_up'],
  ['Overhead Press', 'push', 'barbell', 'overhead'],
  ['Seated Dumbbell Shoulder Press', 'push', 'dumbbell', 'overhead'],
  ['Push Press', 'power', 'barbell', 'overhead'],
  ['Pull-Up', 'pull', 'bodyweight', 'vertical_pull'],
  ['Chin Up', 'pull', 'bodyweight', 'vertical_pull'],
  ['Lat Pulldown', 'pull', 'cable', 'vertical_pull'],
  ['Barbell Row', 'pull', 'barbell', 'row'],
  ['Seated Cable Row', 'pull', 'cable', 'row'],
  ['Single-Arm Dumbbell Row', 'pull', 'dumbbell', 'row'],
  ['Walking Lunge', 'lunge', 'dumbbell', 'lunge'],
  ['Bulgarian Split Squat', 'lunge', 'dumbbell', 'lunge'],
  ['Step-Up', 'lunge', 'dumbbell', 'lunge'],
  ['Leg Extension', 'isolation', 'machine', 'machine'],
  ['Lying Leg Curl', 'isolation', 'machine', 'machine'],
  ['Barbell Curl', 'isolation', 'barbell', 'arms'],
  ['Triceps Pushdown', 'isolation', 'cable', 'arms'],
  ['Skull Crusher', 'isolation', 'barbell', 'arms'],
  ['Dips', 'push', 'bodyweight', 'arms'],
  ['Lateral Raise', 'isolation', 'dumbbell', 'raise'],
  ['Rear Delt Raise', 'isolation', 'dumbbell', 'raise'],
  ['Power Clean', 'power', 'barbell', 'olympic'],
  ['Snatch', 'power', 'barbell', 'olympic'],
  ['Kettlebell Swing', 'hinge', 'kettlebell', 'swing'],
  ['Farmer Carry', 'carry', 'dumbbell', 'general'],
  ['Plank', 'core', 'bodyweight', 'general'],
  ['Landmine Press', 'push', 'barbell', 'general'],
  // Nothing but a pattern.
  ['', 'squat', '', 'squat'],
  ['', 'hinge', '', 'hinge'],
  ['', 'lunge', '', 'lunge'],
  ['', 'pull', '', 'row'],
  ['', 'power', '', 'olympic'],
  ['', 'push', '', 'general'],
  ['', 'isolation', '', 'general'],
  // Nothing but equipment.
  ['', '', 'machine', 'machine'],
  ['', '', 'selectorised', 'machine'],
  ['', '', 'barbell', 'general'],
];

describe('cameraTipKeyFor: the name first, then the equipment, then the pattern', () => {
  test.each(CASES)('%s (%s, %s) -> %s', (name, movementPattern, equipment, key) => {
    expect(cameraTipKeyFor({ name, movementPattern, equipment })).toBe(key);
  });

  test('deterministic, and tolerant of nothing at all', () => {
    expect(cameraTipKeyFor()).toBe('general');
    expect(cameraTipKeyFor({})).toBe('general');
    expect(cameraTipKeyFor({ name: null, movementPattern: 7, equipment: undefined })).toBe('general');
    expect(cameraTipKeyFor({ name: 'Deadlift' })).toBe(cameraTipKeyFor({ name: 'Deadlift' }));
  });
});

describe('cameraTipFor: one sentence of camera advice, in plain words', () => {
  test('every key has a sentence and every sentence belongs to a key', () => {
    expect(Object.keys(CAMERA_TIPS).sort()).toEqual([...CAMERA_TIP_KEYS].sort());
    expect(cameraTipFor({ name: 'Deadlift' })).toBe(CAMERA_TIPS.hinge);
    expect(cameraTipFor()).toBe(CAMERA_TIPS.general);
    expect(cameraTipFor(null)).toBe(CAMERA_TIPS.general);
  });

  test('the general line is the camera\'s setupHint: one source', () => {
    expect(CLIP_STRINGS.setupHint).toBe(CAMERA_TIPS.general);
  });

  test.each(Object.entries(CAMERA_TIPS))('%s reads as one plain British sentence about the camera', (_key, line) => {
    expect(line.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
    expect(line).toMatch(/^[A-Z][^.!?]*\.$/); // one sentence, a full stop
    expect(line).not.toMatch(/[—–!]/); // no em dash, no en dash, no exclamation
    expect(line).not.toMatch(/\bAI\b/);
    // The research's "do not say" list (05-CAMERA-ANGLES-RESEARCH.md s8).
    expect(line).not.toMatch(/depth|form|rounding|heaviest|max|PR\b|flatter|lean|physique|tripod|buy|exposure|backlight|HDR|focal|degree|landscape|metre|feet\b.*\baway/i);
    expect(line).toMatch(/phone|film/i);
  });
});
