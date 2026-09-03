/**
 * C2 (founder-accepted marketing sequence, 2026-07-11): the main upgrade
 * destination (ProUpgradeScreen) was the one unmeasured surface in the
 * conversion funnel. These source guards pin the instrumentation:
 *
 *  - impression with entry source (paywall_shown, surface 'pro_upgrade'),
 *    fired once per mount behind the PaywallScreen shownRef idiom;
 *  - billing-period choice, CTA taps (trial / buy / beta / create-account),
 *    dismisses and the native-sheet cancel, all through one helper on the
 *    allow-listed paywall_tapped_cta event;
 *  - restore result enrichment in playBilling: one
 *    restore_purchases_attempted per attempt, now carrying restored flag +
 *    entitlement count (or the error code), on BOTH store variants;
 *  - allow-list reuse: C2 adds NO new event names, so no server migration
 *    is needed and the LB-9 opt-out (enforced centrally in
 *    telemetry/transport.js) covers everything automatically;
 *  - entry sources are threaded at every navigate('ProUpgrade') call site.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const SCREEN = read('screens/ProUpgradeScreen.js');
const BILLING = read('lib/payments/playBilling.js');

describe('C2: ProUpgrade funnel telemetry', () => {
  test('impression fires once per mount with surface and entry source', () => {
    expect(SCREEN).toMatch(/const shownRef = useRef\(false\);/);
    expect(SCREEN).toMatch(/trackEvent\(user\.id, 'paywall_shown', \{\s*\n\s*surface: 'pro_upgrade',\s*\n\s*source: route\?\.params\?\.source \?\? 'unknown',/);
  });

  test('every tap routes through the one paywall_tapped_cta helper', () => {
    expect(SCREEN).toMatch(/function trackCta\(cta, extra = null\)/);
    expect(SCREEN).toMatch(/surface: 'pro_upgrade', cta, period,/);
    for (const cta of ['select_period', 'start_trial', 'buy_pro', 'activate_beta', 'create_account', 'dismiss', 'sheet_cancelled']) {
      expect(SCREEN).toContain(`'${cta}'`);
    }
  });

  test('the sheet-level events stay in playBilling, never duplicated on the screen', () => {
    // Comments may NAME the events (they document the split); what must
    // never appear is an emit call for them from the screen.
    expect(SCREEN).not.toMatch(/trackEvent\([^)]*'purchase_(initiated|completed|failed)'/);
    expect(SCREEN).not.toMatch(/trackCta\('purchase_/);
  });

  test('restore result is carried on both store variants, one event per attempt', () => {
    const hits = BILLING.match(/restore_purchases_attempted', \{\s*\n\s*restored: \(purchases\?\.length \?\? 0\) > 0,\s*\n\s*entitlement_count: purchases\?\.length \?\? 0,/g) ?? [];
    expect(hits.length).toBe(2);
    const errHits = BILLING.match(/restore_purchases_attempted', \{ error_code: e\?\.code \?\? 'unknown' \}/g) ?? [];
    expect(errHits.length).toBe(2);
    // The old empty-payload fire-before-fetch shape is gone.
    expect(BILLING).not.toMatch(/restore_purchases_attempted', \{\}\)/);
  });

  test('C2 adds no new event names (allow-list reuse, no server migration)', () => {
    const EVENTS = read('lib/telemetry/events.js');
    for (const name of ['pro_upgrade_viewed', 'pro_upgrade_tapped', 'upgrade_screen_shown']) {
      expect(EVENTS).not.toContain(name);
      expect(SCREEN).not.toContain(name);
    }
  });

  // D137 (fully-free product): every LIVE surface that used to navigate to
  // ProUpgrade had that call site removed with the Pro-gating/paywall UI
  // (BodyMetricsScreen, SettingsAccountScreen, HomeScreen, DiaryScreen,
  // YouScreen no longer reference ProUpgrade at all). ProGate.js itself
  // stays on disk DORMANT and unregistered (see proScreenGating.guard.test.js
  // and navigation.test.js's DORMANT_SURFACES exclusion) -- its own 3
  // entry-sourced call sites are untouched dead code, kept intact in case a
  // future deliberate monetisation decision revives the guard.
  test('no LIVE surface navigates to ProUpgrade any more', () => {
    const liveFiles = [
      'screens/BodyMetricsScreen.js',
      'screens/SettingsAccountScreen.js',
      'screens/HomeScreen.js',
      'screens/DiaryScreen.js',
      'screens/YouScreen.js',
    ];
    for (const rel of liveFiles) {
      const src = read(rel);
      expect({ file: rel, hasProUpgradeNav: /navigate\('ProUpgrade'/.test(src) }).toEqual({
        file: rel,
        hasProUpgradeNav: false,
      });
    }
  });

  test('the dormant ProGate.js still threads entry source on its own (unregistered) call sites', () => {
    const src = read('components/ProGate.js');
    const bare = src.match(/navigate\('ProUpgrade'\)/g) ?? [];
    expect(bare.length).toBe(0);
    const sourced = src.match(/navigate\('ProUpgrade', \{ source: /g) ?? [];
    expect(sourced.length).toBe(3);
  });
});
