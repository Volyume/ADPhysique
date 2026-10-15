/**
 * D228 item 2, phase two: every surface that used to compose calm, the open
 * ED flag and a failed read inline now derives the verdict from
 * src/lib/safetyState.js. Written to FAIL if an inline composition returns
 * anywhere in these files, or a migrated file stops calling the helper.
 * (The photo surfaces keep usePhotoSuppression, whose reader now derives
 * through the same law; DiaryScreen's bank gate and GoalChangeSummary are
 * flag-only by design and are not listed here.)
 *
 * Tier c (D228 item 2, founder 2026-10-15) adds the screens that read the
 * state through the HOOK (src/hooks/useSafetyState.js) to decide what they
 * print: Food Insights, the weekly check-in, the athlete profile and lift
 * progress, beside the coach screen's week rows. The "figures" arm (an open
 * flag, a failed read or the unknown state, never calm alone) is composed in
 * ONE place too: withholdsWeightFigures, in the helper.
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
  // Tier c: these read the one state through the hook.
  'screens/FoodInsightsScreen.js',
  'screens/WeeklyCheckInScreen.js',
  'screens/AthleteProfileScreen.js',
  'screens/LiftProgressScreen.js',
  'lib/coachReport.js',
  'lib/blockLedgerRunner.js',
  'lib/recovery/load.js',
];

// The screens whose weight figures are withheld under the figures arm; each
// must take the verdict from the helper, never from a local OR.
const FIGURE_SURFACES = [
  'screens/CoachOutputScreen.js',
  'screens/WeeklyCheckInScreen.js',
  'screens/AthleteProfileScreen.js',
  'screens/LiftProgressScreen.js',
];

const INLINE = [
  /isCalm\([a-zA-Z]+\) \|\| [a-zA-Z]+ === 'read_failed'/,
  /=== 'read_failed' \|\| isCalm\(/,
  /!!edFlag \|\| wellbeing === 'read_failed'/,
  // the tier c figures arm, composed by hand instead of withholdsWeightFigures
  /edFlagOpen\s*\|\|\s*(?:\w+\.)?readFailed/,
  /!\w+\.known\b/,
];

describe('the safety reads compose in one place (D228 item 2)', () => {
  test.each(MIGRATED)('%s derives through safetyState and holds no inline OR', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/(deriveSafetyState|readSafetyState|useSafetyState)\(/);
    for (const re of INLINE) expect(src).not.toMatch(re);
  });

  test.each(FIGURE_SURFACES)('%s takes the figures verdict from withholdsWeightFigures', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/import \{[^}]*\bwithholdsWeightFigures\b[^}]*\} from '\.\.\/lib\/safetyState';/);
    expect(src).toMatch(/withholdsWeightFigures\(safety\)/);
  });

  test('the helper itself fails closed and is the only place the OR lives', () => {
    const helper = read('lib/safetyState.js');
    expect(helper).toMatch(/suppressed: calm \|\| edFlagOpen \|\| readFailed,/);
    expect(helper).toMatch(/if \(!userId\) return SAFETY_STATE_UNKNOWN;/);
    // the figures arm: an open flag, a failed read or the unknown state, never calm
    expect(helper).toMatch(/export function withholdsWeightFigures\(state\) \{\n  if \(!state\) return true;\n  return !!state\.edFlagOpen \|\| !!state\.readFailed \|\| !state\.known;\n\}/);
    expect(read('hooks/usePhotoSuppression.js')).toMatch(/deriveSafetyState\(\{ mode, edFlag \}\)\.suppressed/);
  });
});
