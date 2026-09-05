/**
 * Source-level regression guard — F-17 (circuit editing and preview) plus
 * the two circuit LABEL surfaces F-13 (c) names outside the live screen.
 *
 * Authority: `docs/final-certification-2026-09-05/07-FINDINGS.md` F-17
 * (P2) and F-13 (c); evidence A5, A9 and A10 in `04-TRAINING-STYLES.md`.
 *
 * The defects this stops coming back:
 *  - A9: the routine edit sheet wrote `recommendedSets` and `restSeconds`
 *    from a sheet labelled "Sets". On a circuit that let one station's
 *    rounds diverge from its siblings' (EL-9 keeps them equal, with nothing
 *    enforcing it) and accepted a per-station rest that is inert, while the
 *    rest that DOES apply between rounds could not be edited at all;
 *  - A10: the plan preview rendered every day as "{n} exercises", so the
 *    only signal a plan ran circuits was its free-text description;
 *  - A5: the logged rows said "set 3" where the athlete means round 3, and
 *    the builder spoke a circuit station's rounds as "sets" and offered it
 *    for superset pairing.
 *
 * These screens are impractical to mount (SQLite, capability lane, swap
 * sheet), so this is a byte-level check against the source, matching the
 * convention of RoutineDetailScreen.circuitChip.guard.test.js and its
 * siblings.
 */
import fs from 'fs';
import path from 'path';

const read = (...parts) => fs.readFileSync(path.join(__dirname, ...parts), 'utf8');

const ROUTINE_DETAIL = read('..', 'RoutineDetailScreen.js');
const PLAN_DETAIL = read('..', 'PlanDetailScreen.js');
const MANUAL_BUILDER = read('..', 'ManualBuilderScreen.js');
const LOGGED_SET_ROW = read('..', '..', 'components', 'workout', 'LoggedSetRow.js');

describe('F-17 (g): a circuit station is edited as a circuit', () => {
  test('the sheet knows it is editing a circuit from the stored group kind', () => {
    expect(ROUTINE_DETAIL).toContain(
      "const editingIsCircuit = editingExercise?.routineExercise?.groupKind === 'circuit';",
    );
  });

  test('the rounds field is labelled "Rounds" on a circuit and "Sets" everywhere else', () => {
    expect(ROUTINE_DETAIL).toContain("label={editingIsCircuit ? 'Rounds' : 'Sets'}");
  });

  test('rounds and round rest are written to EVERY station of the circuit (EL-9 equal rounds)', () => {
    const fn = ROUTINE_DETAIL.match(/async function saveEdit\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(fn).toBeTruthy();
    expect(fn).toContain('for (const member of editingCircuitMembers) {');
    expect(fn).toContain('await updateRoutineExercise(member.id, {\n          recommendedSets: sets,\n          roundRestSeconds: roundRest,\n        });');
  });

  test('the members are the stations sharing this circuit\'s group id, in routine order', () => {
    expect(ROUTINE_DETAIL).toContain('const editingCircuitMembers = editingIsCircuit');
    expect(ROUTINE_DETAIL).toContain('&& re.supersetGroupId === editingExercise.routineExercise.supersetGroupId)');
  });

  test('the inert per-station rest field is hidden on a circuit, replaced by rest between rounds', () => {
    expect(ROUTINE_DETAIL).toContain("label=\"Rest between rounds (s)\"");
    expect(ROUTINE_DETAIL).toContain('value={editRoundRest}');
    // The ordinary Rest field only renders on the non-circuit side of the fork.
    const sheet = ROUTINE_DETAIL.slice(ROUTINE_DETAIL.indexOf('{editingIsCircuit ? ('));
    expect(sheet.indexOf('label="Rest between rounds (s)"'))
      .toBeLessThan(sheet.indexOf('label="Rest (s)"'));
  });

  test('the circuit save path never writes the inert per-station rest', () => {
    const fn = ROUTINE_DETAIL.match(/async function saveEdit\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    const circuitBranch = fn.slice(fn.indexOf('if (editingIsCircuit) {', fn.indexOf('const roundRest')), fn.indexOf('} else {'));
    expect(circuitBranch).not.toContain('restSeconds:');
  });

  test('the sheet says plainly that rounds and round rest belong to the whole circuit', () => {
    expect(ROUTINE_DETAIL).toContain(
      'Rounds and rest between rounds apply to the whole circuit. There is no rest between stations.',
    );
  });
});

describe('F-17 (h): the plan preview names the circuit before anyone commits', () => {
  test('the preview reads the day\'s own rows through the shared pure summariser', () => {
    expect(PLAN_DETAIL).toContain(
      "import { summariseCircuitGroups, formatCircuitPreviewLine } from '../lib/circuitRound';",
    );
    expect(PLAN_DETAIL).toContain('setCircuitGroups(circuits);');
  });

  test('both day-row renderers (reordering and ordinary) carry the circuit line', () => {
    const lines = PLAN_DETAIL.match(/\{formatCircuitPreviewLine\(group\)\}/g) || [];
    expect(lines.length).toBe(2);
  });

  test('a day with no circuit is unchanged: it still reads "N exercises"', () => {
    const counts = PLAN_DETAIL.match(/exercise\{exerciseCounts\[routine\.id\] !== 1 \? 's' : ''\}/g) || [];
    expect(counts.length).toBe(2);
  });
});

describe('F-13 (c): rounds language on the logged rows and in the builder', () => {
  test('a logged circuit set is edited as a ROUND, in the a11y label and the editor title', () => {
    expect(LOGGED_SET_ROW).toContain(
      "const isCircuitSet = evidenceClass === 'circuit' || evidenceClass === 'circuit_ballistic';",
    );
    expect(LOGGED_SET_ROW).toContain("const unitWord = isCircuitSet ? 'round' : 'set';");
    const labels = LOGGED_SET_ROW.match(/`Edit \$\{unitWord\} \$\{progressNum\}`/g) || [];
    expect(labels.length).toBe(2);
  });

  test('the truthful " - Circuit" suffix stays, with the round named beside it', () => {
    expect(LOGGED_SET_ROW).toContain("evidenceClass === 'circuit' ? ' - Circuit'");
    expect(LOGGED_SET_ROW).toContain('` - Round ${progressNum}${evidenceLabel}`');
  });

  test('a warm-up is still a warm-up, never a round', () => {
    expect(LOGGED_SET_ROW).toContain("isWarmup ? 'Edit warm-up set'");
  });

  test('the builder speaks a circuit station\'s rounds and drops the superset-pairing hint', () => {
    expect(MANUAL_BUILDER).toContain(
      "`${ex.name}, ${ex.sets} round${ex.sets === 1 ? '' : 's'}`",
    );
    expect(MANUAL_BUILDER).toContain("? 'Hold to remove'");
    expect(MANUAL_BUILDER).toContain(": 'Tap to select for a superset, hold to remove'");
  });
});
