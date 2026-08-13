/**
 * campaign16.noAutoSupersets.test.js — Campaign 16 job 4.
 *
 * FOUNDER RULING: Volyume auto-generated plans do not contain supersets.
 *
 * Why, in the founder's terms: Volyume cannot know real gym station
 * proximity or what is actually free at that moment, so a technically
 * valid pair can be practically ridiculous. The old matcher was careful -
 * it protected the opener, refused heavy-rest members, capped pairs per
 * session, excluded beginners - and none of that could help, because the
 * missing information is not in the plan.
 *
 * What this suite pins:
 *
 *   Generation produces no supersetGroupId, across every profile the old
 *   matcher used to fire for.
 *
 *   The MANUAL feature is untouched. classifySupersetPair is still live
 *   and still classifies, because ManualBuilderScreen asks it whether a
 *   pair the user is building themselves is practical, and ActiveWorkout
 *   still runs supersets and giant sets.
 *
 *   The time estimate is truthful without the pairs. This was the risk
 *   the ruling flagged - a session budget quietly propped up by superset
 *   savings would blow out once the pairs went. It does not, and this
 *   suite proves the reason rather than asserting the outcome: the
 *   estimator never read supersetGroupId, so it was always costing
 *   straight sets. The trim ran on the same honest numbers.
 */

const fs = require('fs');
const path = require('path');
const { generatePlan, classifySupersetPair, estimateWorkoutMinutes } = require('../planEngine');
const { LIBRARY, inputs, planExercises } = require('./campaign16.helpers');

const ENGINE_SRC = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');

const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });
const pairIds = p => planExercises(p).map(e => e.supersetGroupId).filter(Boolean);

// Every profile the old matcher was allowed to fire for: the volume/pump
// goals, plus the short-session case that used to bypass the goal gate
// entirely because "the time saving outweighs the strength trade".
const PROFILES = [
  { label: 'general, 60 min', over: {} },
  { label: 'general_hypertrophy, 60 min', over: { goal: 'general_hypertrophy' } },
  { label: "men's physique, 5 days", over: { goal: 'mens_physique', daysPerWeek: 5 } },
  { label: 'classic physique, 5 days', over: { goal: 'classic_physique', daysPerWeek: 5 } },
  { label: 'bikini, 4 days', over: { goal: 'bikini' } },
  { label: 'wellness, 4 days', over: { goal: 'wellness' } },
  { label: 'figure, 4 days', over: { goal: 'figure' } },
  { label: "women's physique, 5 days", over: { goal: 'womens_physique', daysPerWeek: 5 } },
  { label: 'SHORT session, 40 min', over: { sessionLengthMinutes: 40 } },
  { label: 'SHORT session, 30 min', over: { sessionLengthMinutes: 30 } },
  { label: 'advanced, 6 days', over: { experience: 'advanced', daysPerWeek: 6 } },
];

describe('C16-4 generation never creates a superset (20)', () => {
  test.each(PROFILES)('$label produces no supersetGroupId', ({ over }) => {
    expect(pairIds(plan(over))).toEqual([]);
  });

  test('the short-session case, which used to pair regardless of goal, is clean', () => {
    // This was the loudest source of generated pairs: any session at or
    // under 50 minutes got supersets whatever the goal.
    for (const minutes of [30, 35, 40, 45, 50]) {
      expect(pairIds(plan({ sessionLengthMinutes: minutes }))).toEqual([]);
    }
  });

  test('the automatic pairer is gone from the engine, not merely unused', () => {
    // A dead generator sitting beside a live one is how a future change
    // quietly turns it back on.
    expect(ENGINE_SRC).not.toMatch(/function assignSupersets/);
    expect(ENGINE_SRC).not.toMatch(/assignSupersets\(/);
    expect(ENGINE_SRC).not.toMatch(/SUPERSET_GOAL_ALLOWLIST/);
  });
});

describe('C16-4 the manual superset feature is untouched (21)', () => {
  test('classifySupersetPair is still exported and still classifies', () => {
    // ManualBuilderScreen calls this to tell a user whether the pair THEY
    // are building is practical. It must keep working.
    expect(typeof classifySupersetPair).toBe('function');
    const verdict = classifySupersetPair(
      { name: 'Dumbbell Lateral Raise', primaryMuscle: 'side_delts', equipmentCategory: 'dumbbell' },
      { name: 'Cable Rear Delt Fly', primaryMuscle: 'rear_delts', equipmentCategory: 'cable' },
    );
    expect(verdict).toHaveProperty('practical');
    expect(typeof verdict.practical).toBe('boolean');
  });

  test('the manual builder still consumes it', () => {
    const builder = fs.readFileSync(
      path.resolve(__dirname, '../../screens/ManualBuilderScreen.js'), 'utf8',
    );
    expect(builder).toMatch(/classifySupersetPair/);
  });

  test('the persistence field survives, so a user-made superset still saves', () => {
    // addExerciseToRoutine still takes supersetGroupId; generation simply
    // never supplies one.
    const database = fs.readFileSync(path.resolve(__dirname, '../database.js'), 'utf8');
    expect(database).toMatch(/superset_group_id/);
  });
});

describe('C16-4 the time estimate was always straight-set honest (22, 23)', () => {
  test('the estimator never read supersetGroupId, so nothing was propped up by pairs', () => {
    // The load-bearing proof for the ruling's time-budget concern: the
    // estimate did not get more honest, it always was.
    const start = ENGINE_SRC.indexOf('function estimateSessionMinutes');
    const body = ENGINE_SRC.slice(start, ENGINE_SRC.indexOf('\n}', start));
    expect(start).toBeGreaterThan(-1);
    expect(body).not.toMatch(/superset/i);
    // Full rest between every set, and one transition per exercise.
    expect(body).toMatch(/\(ex\.sets - 1\) \* ex\.restSec/);
    expect(body).toMatch(/\(exercises\.length - 1\) \* trans/);
  });

  test('the trim runs on those same honest numbers', () => {
    const start = ENGINE_SRC.indexOf('function trimToTimeBudget');
    const body = ENGINE_SRC.slice(start, start + 1500);
    expect(body).toMatch(/estimateSessionMinutes\(list, equipment\)/);
  });

  test('a short session still fits without pairs to hide behind (23)', () => {
    // The real question the ruling raised. Trimming happens before the
    // pairs ever existed, so a 40-minute request is still solved by
    // exercise count and set distribution, not by pretending.
    for (const minutes of [30, 40, 45]) {
      const p = plan({ sessionLengthMinutes: minutes });
      for (const w of p.workouts) {
        expect(w.exercises.length).toBeGreaterThan(0);
        // The engine's own stamped duration is what the user is shown.
        // Allow the documented overrun band: past that it self-declares.
        if (w.estimatedDurationMinutes > minutes + 15) {
          expect(w.durationNote).toBeTruthy();
        }
      }
    }
  });

  test('the stamped duration matches a straight-set recount of the same sets', () => {
    // Recomputed independently from the persisted sets/rest, so a plan
    // cannot claim a length its own prescription does not support.
    const p = plan({ sessionLengthMinutes: 60 });
    for (const w of p.workouts) {
      const recount = estimateWorkoutMinutes(w.exercises);
      // estimateWorkoutMinutes omits the per-exercise transition the
      // session estimate adds, so it is a floor, never an overstatement.
      expect(w.estimatedDurationMinutes).toBeGreaterThanOrEqual(recount);
    }
  });
});

describe('C16-4 Volyume-provided library plans hand over no supersets either', () => {
  test('no seeded plan pairs exercises or tells the user to', () => {
    // The founder ruling covers authored plans too: the product should not
    // hand someone a plan that needs two stations at once. The seeded
    // plans never carried a structural pairing, but two of them suggested
    // supersets in copy and one claimed a time saving from them.
    const seed = fs.readFileSync(path.resolve(__dirname, '../seedRoutines.js'), 'utf8');
    expect(seed).not.toMatch(/superset/i);
  });
});
