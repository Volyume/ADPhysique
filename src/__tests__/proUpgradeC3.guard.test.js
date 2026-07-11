/**
 * C3 / D71 (2026-07-11): the duplicate-paywall consolidation. PaywallScreen
 * was an orphaned second upgrade surface (zero navigation call sites) carrying
 * two capabilities the live ProUpgradeScreen lacked: a Play-review social-proof
 * excerpt card and an inline restore affordance. Per D71 (option B) both were
 * ported onto ProUpgradeScreen first, then PaywallScreen, its ProfileStack
 * registration and its lazy import were deleted.
 *
 * These source guards pin that consolidation so it cannot silently regress:
 *   - the excerpt card renders from pickPaywallExcerpt (paywallExcerpts.js);
 *   - the restore affordance routes ONLY through the shared restore module
 *     (lib/payments/restore), never an inline IAP call, mirroring the ProGate
 *     restore pattern;
 *   - 'restore' is emitted through the existing trackCta helper (no new event
 *     name; paywall_tapped_cta already carries cta strings);
 *   - PaywallScreen is gone: no source file, no route registration, no lazy
 *     import anywhere in the navigator.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const SCREEN = read('screens/ProUpgradeScreen.js');
const NAV = read('navigation/RootNavigator.js');

describe('C3: ProUpgrade absorbs PaywallScreen, orphan deleted', () => {
  test('the Play-review excerpt card renders from pickPaywallExcerpt', () => {
    expect(SCREEN).toMatch(/import \{ pickPaywallExcerpt \} from '\.\/paywallExcerpts';/);
    expect(SCREEN).toMatch(/const excerpt = pickPaywallExcerpt\(\);/);
    // The card is conditional on a curated excerpt existing (ships dark until
    // the honesty bar in paywallExcerpts.js is met) and shows quote + meta.
    expect(SCREEN).toMatch(/\{excerpt \?/);
    expect(SCREEN).toMatch(/styles\.reviewQuote/);
    expect(SCREEN).toMatch(/styles\.reviewMeta/);
  });

  test('restore routes through the shared restore module, never an inline IAP call', () => {
    expect(SCREEN).toMatch(/import \{ restorePurchases \} from '\.\.\/lib\/payments\/restore';/);
    expect(SCREEN).toMatch(/const result = await restorePurchases\(\);/);
    // The screen must not reach into the native IAP bridge for restore: that
    // lives behind the shared restore module (which itself calls playBilling).
    expect(SCREEN).not.toMatch(/playBilling\.restorePurchases/);
    // Calm, tier-blind outcomes mirroring ProGate/PaywallScreen semantics.
    expect(SCREEN).toContain('We could not find an active subscription for this store account.');
  });

  test("'restore' is emitted through the existing trackCta helper (no new event name)", () => {
    expect(SCREEN).toMatch(/trackCta\('restore'\)/);
    // No new telemetry event name is introduced for restore.
    expect(SCREEN).not.toMatch(/'restore_tapped'|'restore_purchases_tapped'/);
  });

  test('PaywallScreen no longer exists: no file, no registration, no lazy import', () => {
    const file = path.resolve(__dirname, '..', 'screens/PaywallScreen.js');
    expect(fs.existsSync(file)).toBe(false);
    expect(NAV).not.toMatch(/require\('\.\.\/screens\/PaywallScreen'\)/);
    expect(NAV).not.toMatch(/name="Paywall"/);
    expect(NAV).not.toMatch(/component=\{PaywallScreen\}/);
  });
});
