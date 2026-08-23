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
 *
 * The rule those maths run under is the founder's, given 2026-08-23:
 * "Today's sets should be in comparison", and "if I PR again a second
 * time beating the first PR, it does not pop up". The bar is the best
 * set on record INCLUDING today's, and it moves during the session.
 */
import { detectPR } from '../algorithms';

const EX = { id: 'ex1', loadSemantics: 'total' };
const set = (weight, actualReps, id) => ({ id, weight, actualReps, setType: 'working' });
const types = (prs) => prs.map((p) => p.type).sort();

describe('the bar is your best on record, today included (founder ruling 2026-08-23)', () => {
  // Last session's best, plus whatever today has already put on the board.
  // Beat the running best and it is a record; beat the new one later and
  // that is a record too.
  const priorSession = [set(90, 8, 'old')];

  test('set one beats last session and counts', () => {
    expect(types(detectPR(set(90, 10, 's1'), priorSession, EX, 'kg')))
      .toEqual(['1rm_estimate', 'most_reps_at_weight']);
  });

  test('the reported case: set two beats set one, and pops', () => {
    // The founder's words: "if I PR again a second time beating the first
    // PR, it does not pop up". With today's sets in the comparison, 90x11
    // is measured against today's 90x10 and wins.
    const runningBest = [...priorSession, set(90, 10, 's1')];
    expect(types(detectPR(set(90, 11, 's2'), runningBest, EX, 'kg')))
      .toEqual(['1rm_estimate', 'most_reps_at_weight']);
  });

  test('and again on the set after that', () => {
    const runningBest = [...priorSession, set(90, 10, 's1'), set(90, 11, 's2')];
    expect(detectPR(set(90, 12, 's3'), runningBest, EX, 'kg').length).toBeGreaterThan(0);
  });

  test('a set that beats last session but NOT today is quiet, because it is not the best', () => {
    // 90x9 clears last session's 90x8 and falls short of today's 90x10.
    // It is not a new best, so it says nothing. This is the half of the
    // rule that keeps a good day from turning into a stream of toasts.
    const runningBest = [...priorSession, set(90, 10, 's1')];
    expect(detectPR(set(90, 9, 's2'), runningBest, EX, 'kg')).toEqual([]);
  });

  test('a first exposure: set one has nothing to beat, later sets DO', () => {
    // The founder's session, on an exercise with no previous session at
    // all: 80x15, 80x15, then 100x15. The 100 is a record against what
    // Volyume has on record, and must be celebrated as one. Before this
    // ruling the whole session was treated as baseline and stayed silent.
    expect(detectPR(set(80, 15, 's1'), [], EX, 'kg').length).toBeGreaterThan(0); // guarded by prHistory.length in the screen
    const afterSetOne = [set(80, 15, 's1')];
    expect(detectPR(set(80, 15, 's2'), afterSetOne, EX, 'kg')).toEqual([]);
    const afterSetTwo = [...afterSetOne, set(80, 15, 's2')];
    expect(types(detectPR(set(100, 15, 's3'), afterSetTwo, EX, 'kg')))
      .toEqual(['1rm_estimate', 'heaviest_weight']);
  });

  test('a set that beats nothing earns nothing', () => {
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
    // history, not the possibly-empty state - and that history is past
    // sessions PLUS today's earlier working sets for this exercise
    // (founder ruling 2026-08-23).
    expect(SRC).toMatch(/const prHistory = \[\s*\n\s*\.\.\.priorSets\.filter\(isWorkingSetRow\),\s*\n\s*\.\.\.sessionSetsRef\.current\.filter\(s => s\.exerciseId === exercise\.id && isWorkingSetRow\(s\)\),/);
    expect(SRC).toMatch(/detectPR\(setData, prHistory, exercise, units\)/);
    // The first-exposure gate that silenced every set after the opening
    // one on a new exercise is gone, and must not come back.
    expect(SRC).not.toMatch(/hadPriorExposure/);
  });

  test('when the history cannot be read, it claims neither a record nor a first lift', () => {
    // The false "your starting point" on a veteran's set is the worse half
    // of this bug, so silence is the required behaviour.
    expect(SRC).toMatch(/prHistory\.length > 0 && !priorUnknown/);
    expect(SRC).toMatch(/!priorUnknown && prHistory\.length === 0/);
  });
});
