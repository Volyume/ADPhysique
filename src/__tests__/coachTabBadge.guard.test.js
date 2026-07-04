/**
 * T2 (world-class-audit-2026-07-03/05-cohesion.md #4) wiring guards: the
 * unseen-coach-change badge on the Coach tab.
 *
 * The badge's own render logic is behaviourally tested against the real
 * component in components/__tests__/miniBarTabBar.test.js. These are scoped
 * source guards, in the checkinCoachAudit/navigationTargets style, for the
 * two screen-side wiring points a component test cannot see (per the repo
 * convention, screen load effects are exercised on device, not jest-mounted):
 *  - HomeScreen mirrors its OWN showCoachBanner condition into the store, so
 *    the badge can never claim something the Home banner itself would not;
 *  - CoachOutputScreen writes the SAME per-week AsyncStorage flag the Home
 *    banner's dismiss control already uses (no second persistence scheme),
 *    and clears the store flag directly, the moment a real review
 *    (hasEnoughData) is shown, not the insufficient-data baseline view.
 * Each fails if its wiring is reverted.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const HOME = read('../screens/HomeScreen.js');
const COACH = read('../screens/CoachOutputScreen.js');
const STORE = read('../store/useAppStore.js');

describe('T2: the store carries a single hasUnseenCoachChange flag', () => {
  test('defaults false and exposes a setter, no separate scheme', () => {
    expect(STORE).toMatch(/hasUnseenCoachChange: false,/);
    expect(STORE).toMatch(/setHasUnseenCoachChange: \(value\) => set\(\{ hasUnseenCoachChange: !!value \}\)/);
  });
});

describe('T2: HomeScreen mirrors showCoachBanner, not a second condition', () => {
  test('the mirror effect runs directly off showCoachBanner itself', () => {
    const site = HOME.indexOf('const showCoachBanner =');
    expect(site).toBeGreaterThan(-1);
    const window = HOME.slice(site, site + 1000);
    expect(window).toMatch(/setHasUnseenCoachChange\(showCoachBanner\)/);
    expect(window).toMatch(/\}, \[showCoachBanner\]\);/);
  });
});

describe('T2: CoachOutputScreen clears the SAME dismissal flag on a real review', () => {
  test('gated on hasEnoughData, not the insufficient-data hold', () => {
    const site = COACH.indexOf('setOutput(result);');
    expect(site).toBeGreaterThan(-1);
    const window = COACH.slice(site, site + 1000);
    expect(window).toMatch(/if \(result\.hasEnoughData\) \{/);
    expect(window).toMatch(/@volyume_coach_banner_dismissed_\$\{weekStart\}/);
    expect(window).toMatch(/setHasUnseenCoachChange\(false\)/);
  });

  test('the AsyncStorage write is best-effort, matching the banner-loader convention', () => {
    const marker = "AsyncStorage.setItem(`@volyume_coach_banner_dismissed_${weekStart}`, 'true')";
    const site = COACH.indexOf(marker);
    expect(site).toBeGreaterThan(-1);
    expect(COACH.slice(site, site + marker.length + 30)).toMatch(/\.catch\(\(\) => \{\}\);/);
  });

  test('reuses the exact per-week key format the Home banner dismiss control writes', () => {
    // Both must key the dismissal to the SAME weekStart-scoped AsyncStorage
    // name; a drift here would leave the badge and the Home banner disagreeing
    // about what "seen" means.
    expect(HOME).toMatch(/@volyume_coach_banner_dismissed_\$\{[^}]+\}/);
    expect(COACH).toMatch(/@volyume_coach_banner_dismissed_\$\{weekStart\}/);
  });
});
