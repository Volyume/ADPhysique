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

describe('a better set later in the same session is still a record', () => {
  const priorSession = [set(90, 8, 'old')];

  test('set one beats the old best, and set two beats set one', () => {
    const first = detectPR(set(90, 10, 's1'), priorSession, EX, 'kg');
    expect(types(first)).toEqual(['1rm_estimate', 'most_reps_at_weight']);

    // Set one is now part of the history the second set is judged against.
    const second = detectPR(set(90, 11, 's2'), [...priorSession, set(90, 10, 's1')], EX, 'kg');
    expect(types(second)).toEqual(['1rm_estimate', 'most_reps_at_weight']);
  });

  test('a heavier set two earns the heaviest-weight record', () => {
    const second = detectPR(set(95, 8, 's2'), [...priorSession, set(90, 10, 's1')], EX, 'kg');
    expect(types(second)).toContain('heaviest_weight');
  });

  test('matching set one is correctly NOT a record', () => {
    expect(detectPR(set(90, 10, 's2'), [...priorSession, set(90, 10, 's1')], EX, 'kg')).toEqual([]);
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
    expect(SRC).toMatch(/const hadPriorExposure = priorSets\.some\(isWorkingSetRow\)/);
    expect(SRC).toMatch(/\.\.\.priorSets\.filter\(isWorkingSetRow\)/);
  });

  test('when the history cannot be read, it claims neither a record nor a first lift', () => {
    // The false "your starting point" on a veteran's set is the worse half
    // of this bug, so silence is the required behaviour.
    expect(SRC).toMatch(/hadPriorExposure && !priorUnknown/);
    expect(SRC).toMatch(/!hadPriorExposure && !priorUnknown && prHistory\.length === 0/);
  });
});
