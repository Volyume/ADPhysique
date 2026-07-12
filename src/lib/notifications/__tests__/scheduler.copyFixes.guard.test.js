/**
 * P-11 (Codex end-user-polish audit): two grammar defects in scheduler.js's
 * private copy pools.
 *
 *   1. eveningCopies()'s third rotation read "If you haven't weighed in yet
 *      today, whenever suits keeps your coaching on track." — a dangling,
 *      unparsable sentence. Rewritten to read naturally.
 *   2. checkinCopy()'s title, "How has your week gone{name}", was a question
 *      with no question mark, worse once the optional ", {name}" clause is
 *      appended (e.g. "How has your week gone, Sam"). A trailing "?" after
 *      the interpolation reads naturally both with and without a name.
 *
 * eveningCopies/checkinCopy are module-private (no export), and scheduler.js
 * pulls in the full expo-notifications/store/haptics stack, so this is a
 * source guard on the exact corrected strings rather than a render/behaviour
 * test — matching this file's own private-helper testing convention
 * elsewhere in this suite.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'scheduler.js'),
  'utf8',
);

describe('scheduler.js copy fixes (P-11)', () => {
  test('the evening weigh-in rotation no longer carries the broken sentence', () => {
    expect(SOURCE).not.toMatch(/whenever suits keeps your coaching on track/);
  });

  test('the evening weigh-in rotation carries the corrected sentence', () => {
    expect(SOURCE).toContain(
      "If you haven\\'t weighed in today, there\\'s still time whenever it suits you.",
    );
  });

  test('the weekly check-in title asks a real question (trailing "?", not none)', () => {
    expect(SOURCE).not.toMatch(/`How has your week gone\$\{name\}`/);
    expect(SOURCE).toMatch(/`How has your week gone\$\{name\}\?`/);
  });
});
