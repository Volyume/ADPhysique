/**
 * Item 11 (campaign 2026-07-10): Paywall/ProUpgrade already show
 * TierComparisonStrip; SubscriptionScreen showed only a bare "Upgrade"
 * button to a free/lapsed viewer. Pins:
 *   1. the strip renders for a free/lapsed (non-pro) viewer;
 *   2. the strip is absent for a pro viewer (who already has everything
 *      it's selling);
 *   3. a source-level guard that this billing-adjacent change added no new
 *      import from src/lib/payments/ (display-only bound: the screen must
 *      still route purchase/restore/entitlement logic through the exact
 *      same calls it already had).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../lib/payments/cascade', () => ({
  startCascade: jest.fn(async () => ({ ok: true })),
  payAt: jest.fn(async () => ({ ok: true })),
  skipToFree: jest.fn(async () => ({ ok: true })),
  skipToPro: jest.fn(async () => ({ ok: true })),
  stageOf: () => 'free',
  canStillTrial: () => true,
  daysRemaining: () => null,
}));

jest.mock('../../lib/payments/playBilling', () => ({
  ensureDisplayPrices: jest.fn(async () => ({})),
  getDisplayPrices: jest.fn(() => ({})),
}));

jest.mock('../../lib/payments/restore', () => ({
  restorePurchases: jest.fn(async () => ({ ok: true, tier: null, alreadyCurrent: false })),
}));

jest.mock('../../lib/errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));

import useAppStore from '../../store/useAppStore';
import SubscriptionScreen from '../SubscriptionScreen';

const nav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true, replace: jest.fn() };

function mount(store) {
  useAppStore.mockImplementation((selector) =>
    (typeof selector === 'function' ? selector(store) : store));
  let tree;
  act(() => { tree = create(<SubscriptionScreen navigation={nav} route={{}} />); });
  return JSON.stringify(tree.toJSON());
}

beforeEach(() => { jest.clearAllMocks(); });

describe('SubscriptionScreen -- tier comparison strip (item 11)', () => {
  test('shows the strip for a free viewer', () => {
    const txt = mount({
      userProfile: { trialState: 'free' },
      billingPeriod: 'monthly',
      tier: 'free',
      user: { id: 'u1' },
    });
    // TierComparisonStrip's own copy (Free/Pro columns, comparison rows).
    expect(txt).toContain('Workout logging');
    expect(txt).toContain('Division-specific plans');
  });

  test('shows the strip for a lapsed viewer (cascade_expired)', () => {
    const txt = mount({
      userProfile: { trialState: 'cascade_expired' },
      billingPeriod: 'monthly',
      tier: 'free',
      user: { id: 'u1' },
    });
    expect(txt).toContain('Workout logging');
  });

  test('omits the strip for a pro viewer', () => {
    const txt = mount({
      userProfile: { trialState: 'paid_pro' },
      billingPeriod: 'monthly',
      tier: 'pro',
      user: { id: 'u1' },
    });
    expect(txt).not.toContain('Workout logging');
    expect(txt).not.toContain('Division-specific plans');
  });
});

describe('SubscriptionScreen -- billing-adjacent bound (item 11)', () => {
  test('no new src/lib/payments/ import was added by the display-only strip change', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'SubscriptionScreen.js'),
      'utf8',
    );
    const paymentsImports = [...src.matchAll(/from '\.\.\/lib\/(payments\/[a-zA-Z0-9_/]+)'/g)]
      .map((m) => m[1]);
    // Pre-existing set only: cascade, restore, catalogue, usePlayPrices.
    expect(new Set(paymentsImports)).toEqual(new Set([
      'payments/cascade',
      'payments/restore',
      'payments/catalogue',
      'payments/usePlayPrices',
    ]));
  });
});
