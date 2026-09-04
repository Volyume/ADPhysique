/**
 * T2 (world-class-audit-2026-07-03/05-cohesion.md #4) wiring guards: the
 * unseen-coach-change badge on the Coach tab.
 *
 * UPDATED under Item 6 (D141, founder order 2026-09-04): the badge used to
 * be a bare mirror of showCoachBanner, so it expired on the SAME 7-day
 * window as the Home banner and cleared on the banner's own dismiss X --
 * neither of those means the review was actually read. It is now driven by
 * a durable, per-user "last viewed" marker
 * (src/lib/home/unseenCoachChange.js) with no time expiry; see
 * src/screens/__tests__/CoachHomeUnseenMarker.item6.guard.test.js for the
 * fuller Item 6 wiring guard and src/lib/home/__tests__/unseenCoachChange.test.js
 * for the pure-resolver unit tests.
 *
 * The badge's own render logic is behaviourally tested against the real
 * component in components/__tests__/miniBarTabBar.test.js. These are scoped
 * source guards, in the checkinCoachAudit/navigationTargets style, for the
 * screen-side wiring points a component test cannot see (per the repo
 * convention, screen load effects are exercised on device, not jest-mounted):
 *  - HomeScreen derives the store flag from resolveHasUnseenCoachChange, not
 *    from its own showCoachBanner condition, so the badge no longer expires
 *    on the Home banner's freshness window or dismiss control;
 *  - CoachOutputScreen still writes the SAME per-week AsyncStorage flag the
 *    Home banner's dismiss control uses (that flag is now scoped to the
 *    banner's own text only), and additionally writes the durable viewed
 *    marker, the moment a real review (hasEnoughData) is shown, not the
 *    insufficient-data baseline view.
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

describe('Item 6: HomeScreen derives the badge from the durable marker, not showCoachBanner', () => {
  test('showCoachBanner itself is untouched (still the Home banner display condition)', () => {
    const site = HOME.indexOf('const showCoachBanner =');
    expect(site).toBeGreaterThan(-1);
    const window = HOME.slice(site, site + 400);
    expect(window).toMatch(/coachBannerDismissed/);
    expect(window).toMatch(/7 \* 86400000/);
  });

  test('the store-flag effect calls resolveHasUnseenCoachChange, not a bare showCoachBanner mirror', () => {
    expect(HOME).toMatch(/setHasUnseenCoachChange\(resolveHasUnseenCoachChange\(\{/);
    expect(HOME).not.toMatch(/setHasUnseenCoachChange\(showCoachBanner\)/);
  });
});

describe('T2: CoachOutputScreen clears the SAME dismissal flag on a real review', () => {
  test('gated on hasEnoughData, not the insufficient-data hold', () => {
    const site = COACH.indexOf('setOutput(persistedResult);');
    expect(site).toBeGreaterThan(-1);
    const window = COACH.slice(site, site + 1900);
    expect(window).toMatch(/if \(result\.hasEnoughData\) \{/);
    expect(window).toMatch(/@volyume_coach_banner_dismissed_\$\{weekStart\}/);
    expect(window).toMatch(/setHasUnseenCoachChange\(false\)/);
  });

  test('also writes the durable per-user "last viewed" marker (Item 6, D141)', () => {
    const site = COACH.indexOf('setOutput(persistedResult);');
    expect(site).toBeGreaterThan(-1);
    const window = COACH.slice(site, site + 1900);
    expect(window).toMatch(
      /AsyncStorage\.setItem\(\s*COACH_OUTPUT_VIEWED_KEY_FOR\(user\.id\),\s*JSON\.stringify\(\{ weekStart \}\),\s*\)/,
    );
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
