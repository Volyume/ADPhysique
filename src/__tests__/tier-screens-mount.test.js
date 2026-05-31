/**
 * Mount-safety smoke tests for the Move #5 tier screens:
 *   CascadeGateScreen, SubscriptionScreen, TierComparisonStrip.
 *
 * Asserts each can be imported and instantiated via React's renderer
 * without throwing. Deeper interaction tests live alongside the
 * cascade logic in payments.cascade.test.js; this file just guards
 * against import-time / render-time regressions.
 */

import React from 'react';
import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.2.0',
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...p }) => React.createElement('SafeAreaView', p, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../lib/payments/cascade', () => ({
  startCascade: jest.fn(async () => ({ ok: true })),
  payAt: jest.fn(async () => ({ ok: true })),
  skipToFree: jest.fn(async () => ({ ok: true })),
  skipToPro: jest.fn(async () => ({ ok: true })),
  stageOf: () => 'complete_trial',
  canStillTrial: () => true,
  daysRemaining: () => 7,
}));

jest.mock('../lib/payments/playBilling', () => ({
  purchasePackage: jest.fn(async () => ({ transactionId: 'txn_test', sku: 'pro_monthly_open_beta' })),
}));

jest.mock('../lib/payments/restore', () => ({
  restorePurchases: jest.fn(async () => ({ ok: true, tier: null, alreadyCurrent: false })),
}));

jest.mock('../lib/engineTelemetry', () => ({
  track: jest.fn(async () => null),
}));

jest.mock('../lib/errorLog', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('../store/useAppStore', () => {
  const fn = (selector) => selector({
    userProfile: {
      trialState: 'complete_trial_active',
      lockedInPriceTier: 'open_beta',
      completeTrialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  fn.getState = () => ({
    userProfile: {
      trialState: 'complete_trial_active',
      lockedInPriceTier: 'open_beta',
    },
  });
  return { __esModule: true, default: fn };
});

const noopNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  replace: jest.fn(),
};

async function mount(Component, props = {}) {
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Component, props));
  });
  return renderer;
}

describe('TierComparisonStrip', () => {
  test('renders with default props', async () => {
    const Strip = require('../components/TierComparisonStrip').default;
    const r = await mount(Strip);
    expect(r.toJSON()).toBeTruthy();
  });

  test('renders with founders pricing window', async () => {
    const Strip = require('../components/TierComparisonStrip').default;
    const r = await mount(Strip, { pricingWindow: 'founders', highlighted: 'pro' });
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('CascadeGateScreen mount', () => {
  test('day21 variant (2-tier gate) renders without throwing', async () => {
    const Screen = require('../screens/CascadeGateScreen').default;
    const r = await mount(Screen, {
      navigation: noopNav,
      route: { params: { variant: 'day21', pricingWindow: 'open_beta' } },
    });
    expect(r.toJSON()).toBeTruthy();
  });

  test('legacy day14 variant still renders (mapped to day21 surface)', async () => {
    const Screen = require('../screens/CascadeGateScreen').default;
    const r = await mount(Screen, {
      navigation: noopNav,
      route: { params: { variant: 'day14', pricingWindow: 'founders' } },
    });
    expect(r.toJSON()).toBeTruthy();
  });

  test('payment_failure variant renders without throwing', async () => {
    const Screen = require('../screens/CascadeGateScreen').default;
    const r = await mount(Screen, {
      navigation: noopNav,
      route: { params: { variant: 'payment_failure' } },
    });
    expect(r.toJSON()).toBeTruthy();
  });

  test('unknown variant renders the error fallback without throwing', async () => {
    const Screen = require('../screens/CascadeGateScreen').default;
    const r = await mount(Screen, {
      navigation: noopNav,
      route: { params: { variant: 'made_up' } },
    });
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('SubscriptionScreen mount', () => {
  test('renders for a complete_trial_active user', async () => {
    const Screen = require('../screens/SubscriptionScreen').default;
    const r = await mount(Screen, { navigation: noopNav });
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('DifferentialBadge mount', () => {
  test('shown=false renders nothing', async () => {
    const Badge = require('../components/DifferentialBadge').default;
    const r = await mount(Badge, {
      differential: { shown: false },
    });
    expect(r.toJSON()).toBeNull();
  });

  test('try_pro_14d CTA renders the trial-mode label', async () => {
    const Badge = require('../components/DifferentialBadge').default;
    const r = await mount(Badge, {
      differential: {
        shown: true,
        trigger: 'deload',
        with_food_data_message: "We're holding a deload this week. With food data, we'd know if your fuel is the cause. Pro shows you, free for 14 days.",
        paywall_cta: 'try_pro_14d',
      },
      pricingWindow: 'open_beta',
      onTapCta: jest.fn(),
    });
    expect(r.toJSON()).toBeTruthy();
  });

  test('buy_pro CTA uses the buy-mode label', async () => {
    const Badge = require('../components/DifferentialBadge').default;
    const r = await mount(Badge, {
      differential: {
        shown: true,
        trigger: 'block_summary',
        with_food_data_message: "Your training block ended. With food data, we'd show how fuel shaped your results.",
        paywall_cta: 'buy_pro',
      },
      pricingPriceText: '£3.99/month',
      onTapCta: jest.fn(),
    });
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('PaywallScreen mount', () => {
  test('try_pro_14d variant renders without throwing', async () => {
    const Screen = require('../screens/PaywallScreen').default;
    const r = await mount(Screen, {
      navigation: noopNav,
      route: { params: { trigger: 'deload', ctaMode: 'try_pro_14d', pricingWindow: 'open_beta' } },
    });
    expect(r.toJSON()).toBeTruthy();
  });

  test('buy_pro variant renders without throwing', async () => {
    const Screen = require('../screens/PaywallScreen').default;
    const r = await mount(Screen, {
      navigation: noopNav,
      route: { params: { trigger: 'stalled_lift', ctaMode: 'buy_pro', pricingWindow: 'standard' } },
    });
    expect(r.toJSON()).toBeTruthy();
  });

  test('missing params renders the default variant safely', async () => {
    const Screen = require('../screens/PaywallScreen').default;
    const r = await mount(Screen, { navigation: noopNav, route: {} });
    expect(r.toJSON()).toBeTruthy();
  });
});
