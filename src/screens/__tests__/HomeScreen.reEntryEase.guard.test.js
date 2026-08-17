/**
 * C18 re-entry amendment (Task 1) — HomeScreen wiring.
 *
 * Two defects closed:
 *   1. The athlete's "I haven't trained" answer (reEntryOutcome.easeReturn)
 *      was computed and then thrown away beyond a toast - never persisted,
 *      never applied to the actual next session.
 *   2. maybeAskReEntry read `lastSession?.startedAt` from React state written
 *      by the PARALLEL loadWeekStats loader in the same loadData()
 *      Promise.all batch. Promise.all gives no ordering guarantee between
 *      concurrently dispatched loaders, so this could see a stale (or null)
 *      value instead of what THIS load actually found.
 *
 * A full render test of HomeScreen (82-screen app, ~15 parallel loaders) is
 * prohibitively heavy for this narrow a check; this is a source guard, the
 * established convention here for screen-level fixes not easily unit-tested
 * without a full DB (see HomeScreen.weekBoundaryConsistency.guard.test.js).
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n {2}(async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('C18 re-entry: the stale-state race is closed, not delayed', () => {
  test('loadNextWorkout fetches its own last-completed-workout evidence, not the lastSession state var', () => {
    const body = fnBody(HOME, 'async function loadNextWorkout()');
    expect(body).toMatch(/getAllWorkouts\(user\.id\)/);
    expect(body).toMatch(/maybeAskReEntry\(position, lastCompletedAtMs\)/);
    // The old race: reading the OTHER loader's React state instead of a
    // fresh, self-contained read.
    expect(body).not.toMatch(/lastSession\?\.startedAt/);
  });

  test('the fix is a real extra read, not an arbitrary delay (no setTimeout/sleep introduced)', () => {
    const body = fnBody(HOME, 'async function loadNextWorkout()');
    expect(body).not.toMatch(/setTimeout|sleep\(/);
  });

  test('maybeAskReEntry takes the last-workout timestamp as a parameter instead of reading component state', () => {
    const body = fnBody(HOME, 'async function maybeAskReEntry(position, lastWorkoutAtMs)');
    expect(body).toMatch(/lastWorkoutAtMs: lastWorkoutAtMs \?\? null/);
    expect(body).not.toMatch(/lastSession/);
  });
});

describe('C18 re-entry: the "I haven\'t trained" answer becomes an actionable, bound decision', () => {
  test('reEntryEaseState is imported for persist + retire', () => {
    expect(HOME).toMatch(/import \{\s*setPendingReEntryEase, clearPendingReEntryEaseIfMatches,\s*\} from '\.\.\/lib\/reEntryEaseState';/);
  });

  // RE-PINNED (Campaign 22 Phase 2 Stage 1, HOME-TODAY-UX-SPEC.md §13 rank 6):
  // the re-entry question's ENTRY moved off an auto-firing appAlert onto the
  // Today line (arbiter rank 6) — `maybeAskReEntry` now only DETECTS the due
  // state and stores the bound session facts (boundWeekId/boundRoutineId) on
  // a ref for the tap handler to use; `handleReEntryPress` is the function
  // that actually opens the prompt, binds the answer and persists it. The
  // bind/persist logic itself, and every value it reads/writes, is otherwise
  // byte-identical to before — only which function contains it changed, per
  // the build brief's "the existing sheet/flow unchanged on tap".
  test('the due state is detected once and bound to the exact outstanding required session', () => {
    const body = fnBody(HOME, 'async function maybeAskReEntry(position, lastWorkoutAtMs)');
    expect(body).toMatch(/boundWeekId: position\?\.activeWeekId/);
    expect(body).toMatch(/boundRoutineId: position\?\.nextSession\?\.routineId/);
  });

  test('answering on tap persists the bound easeReturn decision exactly as before', () => {
    const body = fnBody(HOME, 'function handleReEntryPress()');
    expect(body).toMatch(/if \(outcome\.easeReturn && boundWeekId && boundRoutineId\)/);
    expect(body).toMatch(/setPendingReEntryEase\(user\.id, \{ mesocycleWeekId: boundWeekId, routineId: boundRoutineId \}\)/);
  });

  test('skipping the bound session (which never starts a workout) also retires a matching pending decision', () => {
    const body = fnBody(HOME, 'async function handleSkipThisWorkout()');
    expect(body).toMatch(/clearPendingReEntryEaseIfMatches\(user\.id, \{/);
    expect(body).toMatch(/mesocycleWeekId: position\.activeWeekId,\s*routineId: session\.routineId,/);
  });
});
