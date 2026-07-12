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

  test('entry source is threaded at every ProUpgrade navigation call site', () => {
    const sites = [
      ['components/ProGate.js', 3],
      ['screens/BodyMetricsScreen.js', 1],
      ['screens/SettingsAccountScreen.js', 1],
      ['screens/HomeScreen.js', 3],
      ['screens/DiaryScreen.js', 1],
      ['screens/YouScreen.js', 1],
    ];
    for (const [rel, count] of sites) {
      const src = read(rel);
      const bare = src.match(/navigate\('ProUpgrade'\)/g) ?? [];
      expect({ file: rel, bareCalls: bare.length }).toEqual({ file: rel, bareCalls: 0 });
      const sourced = src.match(/navigate\('ProUpgrade', \{ source: /g) ?? [];
      expect({ file: rel, sourced: sourced.length }).toEqual({ file: rel, sourced: count });
    }
  });
});
