/**
 * PR detection: an unread history is not an empty history
 * (founder device report 2026-08-22, "PRs don't always show").
 *
 * What this suite pins and why. ActiveWorkoutScreen clears allTimeSets to
 * [] the instant the exercise changes, then refills it two awaited DB
 * reads later. A set logged inside that window was judged against an
 * empty list, which did two wrong things at once: it skipped the record
 * silently, and it took the first-lift branch, announcing a veteran's
 * working set as "logged as your starting point". The screen now reads
 * the history on demand when it has not landed, and claims nothing at
 * all if that read fails.
 *
 * The detection maths themselves are exercised here too, because the
 * report also said a second, better set in the same session sometimes
 * goes uncelebrated - so the same-session case is pinned directly
 * rather than assumed.
 */
import { detectPR } from '../algorithms';

const EX = { id: 'ex1', loadSemantics: 'total' };
const set = (weight, actualReps, id) => ({ id, weight, actualReps, setType: 'working' });
const types = (prs) => prs.map((p) => p.type).sort();

describe('every set is judged against your PREVIOUS sessions (founder ruling 2026-08-22)', () => {
  // The bar is last session's best. Today's earlier sets are deliberately
  // NOT part of it: set one is usually the strongest, so counting it
  // silenced the rest of the exercise on exactly the days worth
  // celebrating - the reported "the next PR didn't show".
  const priorSession = [set(90, 8, 'old')];

  test('set one beats the old best', () => {
    expect(types(detectPR(set(90, 10, 's1'), priorSession, EX, 'kg')))
      .toEqual(['1rm_estimate', 'most_reps_at_weight']);
  });

  test('the reported case: set two beats the old record but not set one, and still counts', () => {
    // 90x9 beats last session's 90x8 while falling short of today's 90x10.
    // Under the old rule this was silent. It is a record again.
    expect(types(detectPR(set(90, 9, 's2'), priorSession, EX, 'kg')))
      .toEqual(['1rm_estimate', 'most_reps_at_weight']);
  });

  test('several sets over the old record each count, which is the intent', () => {
    for (const reps of [9, 10, 11]) {
      expect(detectPR(set(90, reps, `s${reps}`), priorSession, EX, 'kg').length).toBeGreaterThan(0);
    }
  });

  test('a set that does NOT beat the old record still earns nothing', () => {
    expect(detectPR(set(90, 8, 's2'), priorSession, EX, 'kg')).toEqual([]);
    expect(detectPR(set(85, 8, 's3'), priorSession, EX, 'kg')).toEqual([]);
  });

  test('a heavier set earns the heaviest-weight record', () => {
    expect(types(detectPR(set(95, 8, 's2'), priorSession, EX, 'kg'))).toContain('heaviest_weight');
  });
});

describe('the screen must not treat an unread history as an empty one', () => {
  const SRC = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'screens', 'ActiveWorkoutScreen.js'), 'utf8',
  );

  test('it tracks whether the history has actually landed', () => {
    expect(SRC).toMatch(/historyLoadedRef\s*=\s*useRef\(false\)/);
    // Reset when the exercise changes, set when the read returns.
    expect(SRC).toMatch(/setAllTimeSets\(\[\]\);\s*\n\s*historyLoadedRef\.current = false;/);
    expect(SRC).toMatch(/setAllTimeSets\(allTime\);\s*\n\s*historyLoadedRef\.current = true;/);
  });

  test('it reads the history on demand rather than judging against nothing', () => {
    expect(SRC).toMatch(/if \(!historyLoadedRef\.current\) \{[\s\S]{0,220}getAllCompletedSetsForExercise\(exercise\.id, activeWorkout\.id\)/);
    // Both the record decision and the baseline decision use the resolved
    // history, not the possibly-empty state.
    expect(SRC).toMatch(/const hadPriorExposure = priorHistory\.length > 0/);
    expect(SRC).toMatch(/const priorHistory = priorSets\.filter\(isWorkingSetRow\)/);
    // Records are measured against previous sessions only.
    expect(SRC).toMatch(/detectPR\(setData, priorHistory, exercise, units\)/);
  });

  test('when the history cannot be read, it claims neither a record nor a first lift', () => {
    // The false "your starting point" on a veteran's set is the worse half
    // of this bug, so silence is the required behaviour.
    expect(SRC).toMatch(/hadPriorExposure && !priorUnknown/);
    expect(SRC).toMatch(/!hadPriorExposure && !priorUnknown && sessionHistory\.length === 0/);
  });
});
