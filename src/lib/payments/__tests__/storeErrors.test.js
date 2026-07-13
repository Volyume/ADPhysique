/**
 * Pins the store-unavailability classification the paywall catch blocks use
 * (ProUpgradeScreen, CascadeGateScreen). Google's billing client produces
 * these at runtime on any unlicensed (sideloaded) install and during store
 * outages; they must classify as "store unavailable" (breadcrumb-level, calm
 * toast) while genuinely actionable failures stay loud.
 */
import { isStoreUnavailableError } from '../storeErrors';

describe('isStoreUnavailableError', () => {
  test.each([
    'SKU not found',
    'Error: SKU not found',
    'Item is unavailable',
    'ITEM_UNAVAILABLE',
    'Billing service unavailable on device',
    'BILLING_UNAVAILABLE',
    'The service is unavailable',
    'No Play offer for pro_monthly (product not found or no base plan configured)',
  ])('classifies "%s" as store-unavailable', (msg) => {
    expect(isStoreUnavailableError(new Error(msg))).toBe(true);
  });

  test.each([
    'Payment declined',
    'E_DEVELOPER_ERROR: invalid arguments',
    'Purchase timed out waiting for listener',
    'You already own this item',
    'Network request failed',
  ])('keeps "%s" loud (not store-unavailable)', (msg) => {
    expect(isStoreUnavailableError(new Error(msg))).toBe(false);
  });

  test('tolerates non-Error inputs', () => {
    expect(isStoreUnavailableError('sku not found')).toBe(true);
    expect(isStoreUnavailableError(null)).toBe(false);
    expect(isStoreUnavailableError(undefined)).toBe(false);
  });
});
