/**
 * CC33 D112 R6 (injury/disability audit W4, 2026-08-28) - closes audit
 * T2-33/T1-19: the capability lane must never borrow the preference
 * lane's "set aside" ("{name} is set aside" - RoutineDetailScreen.js).
 * Source-level guard (fs.readFileSync + regex), matching the existing
 * convention for these components (see ExercisePickerModal.a11y.test.js):
 * no light render harness covers describeCapabilityConflict's branches or
 * ExerciseConflictSheet's footnote.
 */
const fs = require('fs');
const path = require('path');

const PICKER = fs.readFileSync(path.join(__dirname, '..', 'ExercisePickerModal.js'), 'utf8');
const CONFLICT_SHEET = fs.readFileSync(path.join(__dirname, '..', 'ExerciseConflictSheet.js'), 'utf8');

describe('T2-33/T1-08: ExercisePickerModal describeCapabilityConflict never says "set aside"', () => {
  const site = PICKER.indexOf('function describeCapabilityConflict(');
  const body = PICKER.slice(site, PICKER.indexOf('\n}', site));

  test('the function exists and this test is reading its real body', () => {
    expect(site).toBeGreaterThan(-1);
    expect(body).toMatch(/CAPABILITY_BLOCK\.CLINICIAN/);
  });

  test('no branch of the capability-lane description uses "set aside"', () => {
    // Strip // line comments first: the fix's own explanatory comment
    // names the retired phrase for context, which must not fail this
    // guard - only the actual returned strings matter here.
    const codeOnly = body.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
    expect(codeOnly).not.toMatch(/set aside/);
  });

  test('the exercise-kind fallback caption names how you train, not a preference', () => {
    expect(body).toContain("return 'You keep this movement out under How you train.';");
  });

  test('the demand-axis branch names how you train', () => {
    expect(body).toContain(
      "`Involves ${demandLabel(first.ruleValue).toLowerCase()}, which you keep out under how you train`",
    );
  });

  test('the family branch names how you train', () => {
    expect(body).toContain(
      "if (first?.ruleKind === 'family') return `Involves ${familyLabel(first.ruleValue)}, which you keep out under how you train`;",
    );
  });
});

describe('T1-19: ExerciseConflictSheet footnote is capability-lane vocabulary', () => {
  test('the footnote no longer says "stays set aside" and instead cross-references How you train', () => {
    expect(CONFLICT_SHEET).not.toMatch(/stays set aside/);
    expect(CONFLICT_SHEET).toContain(
      'Keeping one here does not change what Volyume suggests elsewhere. It stays out of suggestions until you allow it again under How you train.',
    );
  });

  test('the footnote still renders only in the non-blocked (plan) mode, unchanged gating', () => {
    // The footnote's own gate ({!blocked ? ( ... a bare Text, no &&) is
    // distinct from the two earlier per-row !blocked branches (the
    // clinician override button and "Keep it in this plan"), so this
    // must be the LAST occurrence in the file.
    const site = CONFLICT_SHEET.lastIndexOf('{!blocked ? (');
    expect(site).toBeGreaterThan(-1);
    const block = CONFLICT_SHEET.slice(site, CONFLICT_SHEET.indexOf(') : null}', site));
    expect(block).toMatch(/It stays out of suggestions until you allow it again under How you train\./);
  });
});

describe('R8-4 (round 8): the sided reason states only true mechanical facts under the union', () => {
  const site = PICKER.indexOf('function describeCapabilityConflict(');
  const body = PICKER.slice(site, PICKER.indexOf('\n}', site));

  test('"cannot be done a side at a time" is said ONLY of movements that cannot', () => {
    // Under the round-7 union a sided definite conflict on a
    // one-side-loadable movement is reachable (both sides restricted,
    // or a sided rule beside an unsided one). The old single sentence
    // then stated a wrong mechanical fact and named only one of the
    // user's two rules.
    expect(body).toContain("const oneSideLoadable = exercise?.unilateralLoadable === true || exercise?.unilateralLoadable === 1;");
    expect(body).toContain('if (!oneSideLoadable) {');
    expect(body).toContain('does not work, and this one cannot be done a side at a time');
  });

  test('both sides restricted names both facts, without inventing a side', () => {
    expect(body).toContain("r.laterality && r.laterality !== first.laterality");
    expect(body).toContain('does not work on either side');
    // The unsided-rule-covers-the-axis case falls to the unsided
    // wording rather than a side-specific claim.
    expect(body).toContain('which you keep out under how you train');
  });
});
