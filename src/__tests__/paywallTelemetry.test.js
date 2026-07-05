import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...p }) => React.createElement('SafeAreaView', p, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../components/AppAlert', () => ({ appAlert: jest.fn(), AppAlertHost: () => null }));
jest.mock('../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../components/ModalHeader', () => {
  const React = require('react');
  return function ModalHeader({ title }) {
    return React.createElement('ModalHeader', { title });
  };
});
jest.mock('../components/food/TodaysPlateTeaser', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('TodaysPlateTeaser') };
});

jest.mock('../lib/payments/cascade', () => ({
  payAt: jest.fn(async () => ({ ok: true })),
  skipToFree: jest.fn(async () => ({ ok: true })),
  skipToPro: jest.fn(async () => ({ ok: true })),
  confirmPurchase: jest.fn(async () => ({ ok: true })),
}));

jest.mock('../lib/payments/playBilling', () => ({
  purchasePackage: jest.fn(async () => ({ transactionId: 'txn_test', purchaseToken: 'token_test' })),
  ensureDisplayPrices: jest.fn(async () => ({})),
  getDisplayPrices: jest.fn(() => ({})),
}));

jest.mock('../lib/payments/restore', () => ({
  restorePurchases: jest.fn(async () => ({ ok: true, tier: null })),
}));

jest.mock('../lib/errorLog', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('../lib/engineTelemetry', () => ({
  track: jest.fn(async () => null),
}));

jest.mock('../store/useAppStore', () => {
  const state = {
    tier: 'free',
    user: { id: 'user-telemetry' },
    userProfile: {
      trialState: 'complete_trial_active',
      lockedInPriceTier: 'open_beta',
    },
  };
  const fn = jest.fn((selector) => selector(state));
  fn.getState = () => state;
  fn.__setState = (next) => Object.assign(state, next);
  return { __esModule: true, default: fn };
});

import useAppStore from '../store/useAppStore';
import { track } from '../lib/engineTelemetry';
import PaywallScreen from '../screens/PaywallScreen';
import CascadeGateScreen from '../screens/CascadeGateScreen';
import { ProLocked } from '../components/ProGate';

const nav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  replace: jest.fn(),
};

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

async function mount(element) {
  let tree;
  await act(async () => {
    tree = create(element);
  });
  await flush();
  return tree;
}

beforeEach(() => {
  track.mockClear();
  nav.navigate.mockClear();
  nav.goBack.mockClear();
  useAppStore.__setState({ tier: 'free', user: { id: 'user-telemetry' } });
});

describe('paywall telemetry impressions', () => {
  test('PaywallScreen emits paywall_shown once per mount with trigger and pricing window', async () => {
    const route = { params: { trigger: 'deload', ctaMode: 'try_pro_14d', pricingWindow: 'founders' } };
    const tree = await mount(<PaywallScreen navigation={nav} route={route} />);

    expect(track).toHaveBeenCalledWith('user-telemetry', 'paywall_shown', {
      surface: 'paywall_screen',
      trigger: 'deload',
      user_pricing_window: 'founders',
    });

    track.mockClear();
    await act(async () => {
      tree.update(<PaywallScreen navigation={nav} route={route} />);
    });
    await flush();

    expect(track).not.toHaveBeenCalledWith(
      'user-telemetry',
      'paywall_shown',
      expect.any(Object)
    );
  });

  test('CascadeGateScreen emits paywall_shown once per mount with gate variant', async () => {
    const route = { params: { variant: 'day14', pricingWindow: 'open_beta' } };
    const tree = await mount(<CascadeGateScreen navigation={nav} route={route} />);

    expect(track).toHaveBeenCalledWith('user-telemetry', 'paywall_shown', {
      surface: 'cascade_gate',
      trigger: 'day14',
    });

    track.mockClear();
    await act(async () => {
      tree.update(<CascadeGateScreen navigation={nav} route={route} />);
    });
    await flush();

    expect(track).not.toHaveBeenCalledWith(
      'user-telemetry',
      'paywall_shown',
      expect.any(Object)
    );
  });

  test('ProLocked emits feature_locked_viewed once per locked feature render', async () => {
    const tree = await mount(<ProLocked feature="Progress photos and Physique Scan" />);

    expect(track).toHaveBeenCalledWith('user-telemetry', 'feature_locked_viewed', {
      feature: 'Progress photos and Physique Scan',
    });

    track.mockClear();
    await act(async () => {
      tree.update(<ProLocked feature="Progress photos and Physique Scan" />);
    });
    await flush();

    expect(track).not.toHaveBeenCalledWith(
      'user-telemetry',
      'feature_locked_viewed',
      expect.any(Object)
    );
  });
});
