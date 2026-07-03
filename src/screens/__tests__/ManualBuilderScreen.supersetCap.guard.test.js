/**
 * Guard: the plan builder must cap a superset at a PAIR.
 *
 * The live session (ActiveWorkoutScreen) alternates exactly two exercises that
 * share a supersetGroupId. If the builder authors a giant set of 3+ under one
 * supersetGroupId, the session silently pairs only two of them and mishandles
 * the rest mid-session. Until the session supports true giant sets, the builder
 * caps at two, enforced both when selecting rows (toggleSupersetSelect) and
 * when grouping them (handleGroupSuperset). Source-regex guard, matching the
 * convention of src/hooks/__tests__/useWeeklyStreak.guard.test.js.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ManualBuilderScreen.js'),
  'utf8',
);

describe('ManualBuilderScreen caps supersets at a pair', () => {
  test('selecting a third exercise for a superset is blocked', () => {
    expect(src).toMatch(/cur\.size\s*>=\s*2/);
  });

  test('grouping refuses more than two exercises', () => {
    expect(src).toMatch(/selected\.size\s*>\s*2/);
  });
});
