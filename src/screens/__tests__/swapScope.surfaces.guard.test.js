/**
 * swapScope.surfaces.guard.test.js -- D219 lane A4 (design 4.12, founder R10:
 * "When people swap in a workout can they get an option to swap as a one off or
 * permanent. Also when doing swaps the new exercise should have the same sets
 * and reps ideally so we don't misplace load").
 *
 * Source-level guards (the convention of both screens, which are too large and
 * too native to mount here; screen-mount.test.js mounts them with stubs). What
 * they pin and why, each failing on the code before this lane:
 *
 *  - EVERY SWAP SURFACE. The surfaces that change an exercise in a slot are
 *    listed, each with what it does about scope. A screen or component that
 *    writes a swap and is not on the list fails by name, so a new swap surface
 *    cannot ship without a decision about the choice.
 *      ActiveWorkoutScreen   the logger's swap sheet and its full-library route:
 *                            asks "Just this session" (default) or "From now on"
 *      RoutineDetailScreen   the plan's routine screen: asks the same (default
 *                            "From now on"); a one-off reaches the workout started
 *                            from there; re-linking a broken row is always permanent
 *      PlanLibraryScreen     install-time repair of a copied plan: no session
 *                            exists, so it is a plan edit by nature (exempt)
 *    Not surfaces: the logger's "I can't do this" route (it already asked "just
 *    for today, or from now on"), the capability plan rewrite and serve-time
 *    substitution (system-made, in lib), and the exercise detail "substitutes"
 *    list (display only).
 *  - THE ONE-OFF NEVER WRITES THE PLAN. Neither screen can reach the plan-level
 *    write except through applyExerciseSwap with the scope the person chose, and
 *    the routine screen's one-off branch returns before it.
 *  - SETS AND REPS CARRY. The logger no longer takes the new exercise's own rep
 *    band, carries the old exercise's served week onto it, and lets rest follow.
 *  - THE NOTE. Both sheets say what moves when the new exercise trains another
 *    primary muscle, before it is confirmed, and the plan swap says so after.
 */
const fs = require('fs');
const path = require('path');

const SCREENS = path.join(__dirname, '..');
const COMPONENTS = path.join(__dirname, '..', '..', 'components');
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const ACTIVE = read(SCREENS, 'ActiveWorkoutScreen.js');
const ROUTINE = read(SCREENS, 'RoutineDetailScreen.js');

// The text of a function from its signature to the first closing brace at the same indent.
const fnWindow = (src, signature, indent = '  ') => {
  const start = src.indexOf(signature);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf(`\n${indent}}\n`, start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end + 3 + indent.length);
};

describe('every swap surface is listed, each with its answer about scope', () => {
  const WRITER = /\b(updateRoutineExerciseExercise|recordExerciseSwap|applyExerciseSwap)\(/;
  const ALLOWED = {
    'ActiveWorkoutScreen.js': 'asks (SegmentedControl on the swap sheet, applyExerciseSwap)',
    'RoutineDetailScreen.js': 'asks (SegmentedControl on the swap sheet, applyExerciseSwap)',
    'PlanLibraryScreen.js': 'exempt: install-time repair of a copied plan, no session exists',
  };

  test('no other screen or component writes a swap', () => {
    const offenders = [];
    for (const [dir, files] of [[SCREENS, fs.readdirSync(SCREENS)], [COMPONENTS, fs.readdirSync(COMPONENTS)]]) {
      for (const f of files) {
        if (!f.endsWith('.js') || ALLOWED[f]) continue;
        if (WRITER.test(read(dir, f))) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the two surfaces that ask import the one-off-safe path, not the plan write', () => {
    for (const src of [ACTIVE, ROUTINE]) {
      expect(src).toContain("import { applyExerciseSwap } from '../lib/exercise/swapApply';");
      expect(src).toContain("import SegmentedControl from '../components/SegmentedControl';");
      expect(src).toContain('SWAP_SCOPE_OPTIONS');
    }
    // The logger has no way to write the plan except through applyExerciseSwap.
    expect(ACTIVE).not.toMatch(/import \{[^}]*\b(updateRoutineExerciseExercise|recordExerciseSwap)\b[^}]*\} from '\.\.\/lib\/database'/);
  });
});

describe('ActiveWorkoutScreen: the swap sheet asks, the one-off leaves the plan alone', () => {
  const confirm = fnWindow(ACTIVE, 'function handleConfirmSwap(newExercise) {');
  const open = fnWindow(ACTIVE, 'async function handleOpenSwap(');
  const sheet = ACTIVE.match(/\{\/\* Exercise Swap Modal \*\/\}[\s\S]*?<\/Modal>/)?.[0] ?? '';

  test('the sheet carries the choice, and a fresh open starts at "Just this session"', () => {
    expect(sheet).toContain('<SegmentedControl');
    expect(sheet).toContain('options={SWAP_SCOPE_OPTIONS}');
    expect(sheet).toContain('swapScopeHint(swapScope');
    expect(ACTIVE).toContain('const [swapScope, setSwapScope] = useState(SWAP_SCOPE.SESSION);');
    expect(open).toContain('if (!relaxStyle) chooseSwapScope(SWAP_SCOPE.SESSION);');
  });

  test('the choice is offered only where there is a plan row to write, and never on the "I can\'t do this" route', () => {
    expect(open).toContain('const offerScope = !workAroundSwapRef.current && !!routineExercise?.id && !!activeWorkout?.routineId;');
    expect(sheet).toContain('{swapScopeOffered ? (');
  });

  test('handleConfirmSwap writes the plan only for an offered "From now on" on a slot with a routine row', () => {
    expect(confirm).toContain('const swapToPlan = swapScopeOfferedRef.current');
    expect(confirm).toContain('swapScopeRef.current === SWAP_SCOPE.PROGRAMME');
    expect(confirm).toContain('!!prevRoutineEx?.id');
    expect(confirm).toContain('scope: swapToPlan ? SWAP_SCOPE.PROGRAMME : SWAP_SCOPE.SESSION,');
    expect(confirm).toContain('routineExerciseId: swapToPlan ? prevRoutineEx.id : null,');
    expect(confirm).not.toContain('updateRoutineExerciseExercise');
  });

  test('a failed plan write is a calm toast and the swap stands for the session', () => {
    expect(confirm).toContain("logError('ActiveWorkoutScreen.swapIntoPlan'");
    expect(confirm).toContain("toast.show('Swapped for this session. Your plan could not be updated just now.', { variant: 'warning' });");
  });

  test('sets and reps carry: the helper no longer takes the new exercise\'s band, the served week moves with the slot, rest follows', () => {
    const helper = ACTIVE.match(/function rebuildRoutineExerciseFor\(newExercise, prevRoutineEx\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(helper).toContain('...prevRoutineEx,');
    expect(helper).toContain('startingWeight: null,');
    expect(helper).not.toMatch(/defaultRepMin|default_rep_min|defaultRepMax|default_rep_max|recommendedRepsMin|recommendedRepsMax/);
    expect(confirm).toContain('restAfterSwap({ oldExercise: exercise, newExercise, restSeconds: rebuiltRoutineEx.restSeconds })');
    expect(confirm).toContain('const servedHere = weeklyAllocation?.[exercise?.id];');
    expect(confirm).toContain('capped: planServedV2,');
    expect(confirm).toContain('[newExercise.id]: carriedSets');
  });

  test('another muscle: the note before it is confirmed, and the plan swap says what moved after', () => {
    expect(sheet).toContain('swapMuscleNote(muscleMove)');
    expect(sheet).toContain('swapScope === SWAP_SCOPE.PROGRAMME && swapScopeOffered');
    expect(confirm).toContain('swapMuscleDoneNote(res.muscleChange)');
  });

  test('the sheet\'s list re-renders when the choice changes, and the picker route keeps the choice', () => {
    expect(sheet).toContain('extraData={swapScope}');
    // The choice lives in refs for the closures that outlive a render (list cells, the picker).
    expect(ACTIVE).toContain('const swapScopeRef = useRef(SWAP_SCOPE.SESSION);');
    expect(fnWindow(ACTIVE, 'function handlePickerSelect(ex) {')).toContain('handleConfirmSwap(ex);');
  });
});

describe('RoutineDetailScreen: the plan\'s swap sheet asks, and a one-off reaches the workout started from here', () => {
  const confirm = fnWindow(ROUTINE, 'async function handleConfirmSwap(newExercise) {');
  const sheet = ROUTINE.slice(ROUTINE.indexOf('{/* Plan-level swap modal */}'), ROUTINE.indexOf('ListFooterComponent={', ROUTINE.indexOf('{/* Plan-level swap modal */}')));
  const start = fnWindow(ROUTINE, 'async function handleStartWorkout() {');

  test('the sheet carries the choice, a fresh open starts at "From now on", and a broken row is never offered one', () => {
    expect(sheet).toContain('<SegmentedControl');
    expect(sheet).toContain('options={SWAP_SCOPE_OPTIONS}');
    expect(sheet).toContain('{!swapState?.exercise?.unresolved ? (');
    expect(ROUTINE).toContain('const [swapScope, setSwapScope] = useState(SWAP_SCOPE.PROGRAMME);');
    expect(fnWindow(ROUTINE, 'async function handleOpenSwap(').includes('if (!relaxStyle) chooseSwapScope(SWAP_SCOPE.PROGRAMME);')).toBe(true);
  });

  test('the one-off branch returns before any plan write', () => {
    const oneOff = confirm.slice(confirm.indexOf('if (!toPlan) {'), confirm.indexOf('let res = null;'));
    expect(oneOff.length).toBeGreaterThan(0);
    expect(oneOff).toContain('setSessionSwaps(');
    expect(oneOff).toContain('return;');
    expect(oneOff).not.toMatch(/applyExerciseSwap|updateRoutineExerciseExercise|loadRoutine/);
    expect(confirm).toContain("const toPlan = !!swapState.exercise?.unresolved || swapScopeRef.current === SWAP_SCOPE.PROGRAMME;");
  });

  test('"From now on" writes the plan as a programme swap, tells the person calmly when it fails, and says what moved', () => {
    expect(confirm).toContain('scope: SWAP_SCOPE.PROGRAMME,');
    expect(confirm).toContain("toast.show('That swap did not save. Please try again.', { variant: 'error' });");
    expect(confirm).toContain('swapMuscleDoneNote(res.muscleChange)');
    expect(sheet).toContain('swapMuscleNote(muscleMove)');
  });

  test('the workout started from here uses the one-offs, logs them as session swaps, and lets them go', () => {
    expect(start).toContain('const sessionRows = applySessionSwaps(exercises, sessionSwaps);');
    expect(start).toContain('sessionRows.map(');
    expect(start).toContain('scope: SWAP_SCOPE.SESSION');
    expect(start).toContain('setSessionSwaps({});');
    expect(ROUTINE).toContain('for this session only. Your plan is unchanged.');
  });

  test('the sheet\'s note is truthful about rest and says nothing the choice contradicts', () => {
    expect(sheet).toContain('Choose a substitute. Sets and reps stay the same, and rest suits the new exercise unless you set it yourself.');
    expect(sheet).not.toContain('Your set, rep and rest targets stay the same.');
  });
});
