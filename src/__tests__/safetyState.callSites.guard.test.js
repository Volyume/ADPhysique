/**
 * D228 item 2, phase two: every surface that used to compose calm, the open
 * ED flag and a failed read inline now derives the verdict from
 * src/lib/safetyState.js. Written to FAIL if an inline composition returns
 * anywhere in these files, or a migrated file stops calling the helper.
 * (The photo surfaces keep usePhotoSuppression, whose reader now derives
 * through the same law; DiaryScreen's bank gate and GoalChangeSummary are
 * flag-only by design and are not listed here.)
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const MIGRATED = [
  'screens/CoachOutputScreen.js',
  'screens/HomeScreen.js',
  'screens/YouScreen.js',
  'screens/WeeklyStoryScreen.js',
  'screens/YearOfLiftsScreen.js',
  'screens/CoachHeldHistoryScreen.js',
  'lib/widgets/writer.js',
  'lib/energyChoiceEnforce.js',
];

const INLINE = [
  /isCalm\([a-zA-Z]+\) \|\| [a-zA-Z]+ === 'read_failed'/,
  /=== 'read_failed' \|\| isCalm\(/,
  /!!edFlag \|\| wellbeing === 'read_failed'/,
];

describe('the safety reads compose in one place (D228 item 2)', () => {
  test.each(MIGRATED)('%s derives through safetyState and holds no inline OR', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/(deriveSafetyState|readSafetyState)\(/);
    for (const re of INLINE) expect(src).not.toMatch(re);
  });

  test('the helper itself fails closed and is the only place the OR lives', () => {
    const helper = read('lib/safetyState.js');
    expect(helper).toMatch(/suppressed: calm \|\| edFlagOpen \|\| readFailed,/);
    expect(helper).toMatch(/if \(!userId\) return SAFETY_STATE_UNKNOWN;/);
    expect(read('hooks/usePhotoSuppression.js')).toMatch(/deriveSafetyState\(\{ mode, edFlag \}\)\.suppressed/);
  });
});
