/**
 * confirmPurchase routes to the right store's Edge Function by platform, with
 * the body shape that verifier expects. Android and iOS are independent paths:
 *   - Android → play-billing-rtdn { purchaseToken, subscriptionId }
 *   - iOS     → app-store-verify  { jws, productId }
 */
const { Platform } = require('react-native');

const mockInvoke = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('../../supabase', () => ({
  getSupabaseClient: () => ({ functions: { invoke: (...a) => mockInvoke(...a) } }),
}));
jest.mock('../../../store/useAppStore', () => ({
  default: { getState: () => ({ user: { id: 'u1' }, refreshTierFromCloud: mockRefresh }) },
}));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const { confirmPurchase } = require('../cascade');

describe('confirmPurchase platform routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
  });

  afterAll(() => { Platform.OS = 'android'; });

  test('Android: calls play-billing-rtdn with the Play token + subscriptionId', async () => {
    Platform.OS = 'android';
    const res = await confirmPurchase({ purchaseToken: 'play-tok', subscriptionId: 'pro_monthly' });
    expect(res.ok).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('play-billing-rtdn', {
      body: { purchaseToken: 'play-tok', subscriptionId: 'pro_monthly' },
    });
  });

  test('iOS: calls app-store-verify with the StoreKit JWS + productId', async () => {
    Platform.OS = 'ios';
    const res = await confirmPurchase({ purchaseToken: 'jws-tok', subscriptionId: 'pro_annual' });
    expect(res.ok).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('app-store-verify', {
      body: { jws: 'jws-tok', productId: 'pro_annual' },
    });
  });

  test('missing token short-circuits before any invoke (both platforms)', async () => {
    Platform.OS = 'ios';
    const res = await confirmPurchase({});
    expect(res.ok).toBe(false);
    expect(res.error).toBe('missing_purchase_token');
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
