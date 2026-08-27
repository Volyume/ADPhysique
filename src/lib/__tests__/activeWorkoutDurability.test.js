/**
 * Active workout durability (adversarial audit 2026-08-26, findings 1 and 20A).
 *
 * TWO defects, both about a value that should never have been treated as
 * equivalent to a legitimate one.
 *
 * 1. ERROR IS NOT NOT-FOUND. restoreActiveWorkout validated its recovery
 *    snapshot against the database with `catch (_) { row = null; }`, so a
 *    THROWN read looked identical to "that workout no longer exists", and the
 *    very next branch deleted the snapshot. Permanent, silent loss of a session
 *    the user was in the middle of. And it runs during launch bootstrap, where
 *    the SQLCipher database may not be open yet, so a transient failure there is
 *    the expected kind rather than an exotic one.
 *
 * 2. Infinity survived as a logged weight. `data.weight || 0` accepted it,
 *    because Infinity is truthy, and turned NaN into a silent 0. Infinity is
 *    reachable from the ordinary decimal keypad: parseFloat('1' + 400 zeros) is
 *    Infinity. One poisoned weight makes session tonnage, weekly volume, e1RM,
 *    the coach's evidence and the chart geometry that reaches Skia all Infinity,
 *    and syncs it to cloud.
 */

const fs = require('fs');
const path = require('path');

const STORE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'store', 'useAppStore.js'), 'utf8',
);
const DB = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');

function restoreBody() {
  const start = STORE.indexOf('restoreActiveWorkout: async (userId) => {');
  expect(start).toBeGreaterThan(-1);
  return STORE.slice(start, start + 3200);
}

describe('a database read failure never deletes the recovery snapshot', () => {
  const body = restoreBody();

  test('the read failure is captured distinctly, not collapsed into null', () => {
    expect(body).toMatch(/let readFailed = false;/);
    expect(body).toMatch(/catch \(e\) \{\s*readFailed = true;/);
    // The old shape is the whole defect; make its return impossible to miss.
    // Comment lines are excluded: the fix note in the store quotes the old
    // shape deliberately, and failing on documentation would train the next
    // person to delete the explanation rather than keep the guard.
    const code = body.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/catch \(_\) \{ row = null; \}/);
  });

  test('an unreadable database returns without removing the snapshot', () => {
    const guard = body.indexOf('if (readFailed) {');
    const remove = body.indexOf('AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY)', guard);
    expect(guard).toBeGreaterThan(-1);
    // The readFailed branch must return BEFORE any removal is reached.
    const between = body.slice(guard, remove === -1 ? body.length : remove);
    expect(between).toMatch(/return false;/);
  });

  test('deletion still happens for a proven absence, so stale snapshots are cleaned', () => {
    // Fail-closed must not become never-clean-up.
    expect(body).toMatch(/if \(!row \|\| row\.isCompleted \|\| row\.is_completed\) \{[\s\S]*?removeItem\(ACTIVE_WORKOUT_KEY\)/);
  });

  test('the read failure is logged rather than swallowed', () => {
    expect(body).toMatch(/logError\('restoreActiveWorkout\.readFailed'/);
  });

  test('a malformed snapshot is still removed, but no longer silently', () => {
    // It can never be restored, so removal is right; but a truncated write here
    // is the only trace of a storage problem that also loses sessions.
    expect(body).toMatch(/logError\('restoreActiveWorkout\.snapshotMalformed'/);
  });

  test('why the distinction exists is recorded', () => {
    expect(body).toMatch(/ERROR IS NOT NOT-FOUND/);
  });
});

describe('an impossible weight cannot reach the database', () => {
  test('Infinity really is reachable from a numeric keypad', () => {
    // Not a hypothetical: this is what the decimal pad can produce.
    expect(parseFloat(`1${'0'.repeat(400)}`)).toBe(Infinity);
    // And the old guard accepted it, because Infinity is truthy.
    expect(Infinity || 0).toBe(Infinity);
    // While NaN silently became a real, wrong value.
    expect(NaN || 0).toBe(0);
  });

  test('the insert binds bounded values, not `|| 0`', () => {
    expect(DB).toMatch(/boundSetNumber\(data\.weight, \{ max: MAX_SET_WEIGHT, field: 'weight' \}\)/);
    expect(DB).toMatch(/boundSetNumber\(data\.actualReps, \{ max: MAX_SET_REPS, field: 'actualReps' \}\)/);
    expect(DB).not.toMatch(/\n\s+data\.weight \|\| 0,/);
  });

  test('the edit path is bounded too, not just the insert', () => {
    // A set can be corrected after logging; that route must not bypass it.
    expect(DB).toMatch(/key === 'weight'\) v = boundSetNumber\(/);
    expect(DB).toMatch(/key === 'actualReps'\) v = boundSetNumber\(/);
  });

  test('the bounds are generous enough not to police unusual lifts', () => {
    // A loaded leg press in pounds, a heavy machine stack, chains and bands:
    // all must pass untouched. The bound exists for impossible values only.
    const max = DB.match(/const MAX_SET_WEIGHT = (\d+);/);
    expect(max).not.toBeNull();
    expect(Number(max[1])).toBeGreaterThanOrEqual(2000);
  });

  test('a refusal is logged, so a real user hitting it is visible', () => {
    expect(DB).toMatch(/logWarn\('database\.boundSetNumber'/);
  });

  test('it never throws: a user mid-session must still be able to log', () => {
    const start = DB.indexOf('function boundSetNumber(');
    const body = DB.slice(start, DB.indexOf('\n}', start));
    expect(body).not.toMatch(/throw /);
  });
});
