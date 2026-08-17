// Campaign 24 §4.1 (GLOBAL-COHERENCE-DECISIONS.md): the "Start weight"
// TextField's placeholder was a hard-coded "kg" literal -- this screen never
// read the units store at all, unlike every other screen the audit's §4.1
// "fixed" list names (units === 'lbs' ? 'lbs' : 'kg', a real store read with
// 'kg' as the correct default, not a bypass). A user on the lbs setting saw
// a "kg" placeholder on this one input. Source-guard, matching this file's
// existing convention (RoutineDetailScreen.saveEditToast.guard.test.js).
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

describe('RoutineDetailScreen "Start weight" placeholder follows the units store', () => {
  test('no longer a hard-coded "kg" literal', () => {
    expect(ROUTINE_DETAIL).not.toMatch(/placeholder="kg"/);
  });

  test('reads units from the store and derives the placeholder from it', () => {
    expect(ROUTINE_DETAIL).toMatch(/units:\s*s\.units/);
    expect(ROUTINE_DETAIL).toMatch(/placeholder=\{units === 'lbs' \? 'lbs' : 'kg'\}/);
  });
});
