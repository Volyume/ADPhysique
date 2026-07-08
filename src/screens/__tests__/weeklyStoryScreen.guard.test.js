/**
 * Audit §15 item 1 (connected weekly story surface): source guards for the
 * screen wiring. A full jest render would need to mock SQLite, AsyncStorage,
 * the store and the wellbeing/ED-flag reads all at once, so — in this repo's
 * established style (see diaryTargetsChangedChip.guard.test.js,
 * checkinCoachAudit.guard.test.js) — these are source guards that fail if
 * the wiring drifts; the load effect itself is exercised on device.
 *
 * Pins:
 *  - the screen composes the SAME already-existing reads named in the
 *    blueprint (no new data source, no new engine);
 *  - it fails CLOSED on the ED/wellbeing safety read, same contract as
 *    CoachHeldHistoryScreen / CoachOutputScreen;
 *  - it is registered Pro-gated (withProGuard) in RootNavigator, exactly
 *    like CoachOutput/WeeklyCheckIn;
 *  - it has exactly one calm entry point, from the Coach tab's existing
 *    "This week" section, and does not touch navigateCrossTab/NAV-5.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const SCREEN = read('../WeeklyStoryScreen.js');
const NAVIGATOR = read('../../navigation/RootNavigator.js');
const YOU_SCREEN = read('../YouScreen.js');

describe('Audit §15#1: WeeklyStoryScreen wiring', () => {
  test('composes training, eating, body and decision from the existing reads named in the blueprint', () => {
    expect(SCREEN).toMatch(/import \{[\s\S]{0,300}getWeeklySessionStats[\s\S]{0,300}\} from '\.\.\/lib\/database'/);
    expect(SCREEN).toContain('getWeeklyPRCount');
    expect(SCREEN).toContain('getNutritionTargets');
    expect(SCREEN).toContain('getLatestCoachOutput');
    expect(SCREEN).toMatch(/import \{ getRecentIntakeSummary \} from '\.\.\/lib\/food\/db'/);
  });

  test('delegates the narrative composition to the pure buildWeeklyStory, not an inline builder', () => {
    expect(SCREEN).toMatch(/import \{ buildWeeklyStory \} from '\.\.\/lib\/weeklyStory'/);
    expect(SCREEN).toMatch(/buildWeeklyStory\(\{/);
  });

  test('reads the same week window as CoachOutputScreen (localWeekStartMs), no invented date maths', () => {
    expect(SCREEN).toMatch(/import \{ localWeekStartMs \} from '\.\.\/lib\/dayKey'/);
    expect(SCREEN).toContain('const weekStart = localWeekStartMs();');
  });

  test('fails CLOSED on the ED-pattern flag and wellbeing read, same contract as CoachHeldHistoryScreen', () => {
    expect(SCREEN).toMatch(/getOpenEdPatternFlag\(user\.id\)\.catch\(\(\) => 'read_failed'\)/);
    expect(SCREEN).toMatch(/AsyncStorage\.getItem\(WELLBEING_KEY\)\.then\(\(v\) => v \|\| 'unspecified'\)\.catch\(\(\) => 'read_failed'\)/);
    expect(SCREEN).toMatch(/const suppress = !!edFlag \|\| wellbeing === 'read_failed' \|\| isCalm\(wellbeing\);/);
    // The catch-all error path must also suppress rather than risk a number
    // rendering over an undetected open flag.
    expect(SCREEN).toMatch(/buildWeeklyStory\(\{ weekLabel: weekRangeLabel\(weekStart\), suppress: true \}\)/);
  });

  test('uses BackHeader (the pushed-screen standard), not a hand-rolled header', () => {
    expect(SCREEN).toMatch(/import BackHeader from '\.\.\/components\/BackHeader'/);
    expect(SCREEN).toMatch(/<BackHeader title="Your week" \/>/);
  });

  test('no em dash in the screen\'s user-facing copy (house style)', () => {
    // Scope to the JSX render body (past the JSDoc header), where the actual
    // user-facing strings live, so prose in the doc comment above (which may
    // legitimately use an em dash) isn't mistaken for shipped copy.
    const renderStart = SCREEN.indexOf('export default function WeeklyStoryScreen');
    expect(renderStart).toBeGreaterThan(-1);
    const renderBody = SCREEN.slice(renderStart);
    const uiStrings = renderBody.match(/"[^"]*"|'[^']*'|`[^`]*`/g) || [];
    for (const s of uiStrings) {
      expect(s).not.toMatch(/—/);
    }
  });

  test('registered in RootNavigator Pro-gated, exactly like CoachOutput/WeeklyCheckIn', () => {
    expect(NAVIGATOR).toMatch(/const GatedWeeklyStory\s*=\s*lazyScreen\(\(\) => withProGuard\(require\('\.\.\/screens\/WeeklyStoryScreen'\)\.default, 'Your week'\)\);/);
    expect(NAVIGATOR).toMatch(/<Stack\.Screen name="WeeklyStory" component=\{GatedWeeklyStory\} options=\{\{ headerShown: false \}\} \/>/);
  });

  test('has exactly one entry point, from the Coach tab\'s existing "This week" section', () => {
    const matches = YOU_SCREEN.match(/navigate\('WeeklyStory'\)/g) || [];
    expect(matches).toHaveLength(1);
    // Sits in the same isPro "This week" block as the existing Coaching
    // decision row, not a new section or a navigateCrossTab call.
    const site = YOU_SCREEN.indexOf("label=\"Your week\"");
    expect(site).toBeGreaterThan(-1);
    const before = YOU_SCREEN.slice(0, site);
    expect(before.lastIndexOf('Coaching decision')).toBeGreaterThan(before.lastIndexOf('SectionLabel>This week<'));
  });

  test('the new entry point does not touch navigateCrossTab / cross-tab navigation', () => {
    const site = YOU_SCREEN.indexOf("label=\"Your week\"");
    const window = YOU_SCREEN.slice(site, site + 300);
    expect(window).not.toContain('navigateCrossTab');
    expect(window).toContain("navigation.navigate('WeeklyStory')");
  });
});
