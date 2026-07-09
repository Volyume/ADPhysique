/**
 * CP-7 (design-usability audit 2026-07-09,
 * docs/design-usability-audit-2026-07-09/coverage-06-competitive-hps.md) --
 * the opt-in "App lock (Face ID / fingerprint)" toggle on Settings > Privacy.
 * Pins the one rule the task is built around: a user must never be able to
 * enable a lock they cannot satisfy. The switch is disabled (never silently
 * hidden without explanation) whenever a LIVE hardware/enrolment check comes
 * back unavailable, and turning it on re-checks live immediately before
 * writing the pref -- a stale "available" read from an earlier focus must
 * never be trusted for the write itself.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../hooks/useAccountActions', () => () => ({ withdrawing: false, handleWithdrawConsent: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));
jest.mock('../../lib/food/writeback', () => ({
  getConsent: jest.fn(() => Promise.resolve(false)),
  setConsent: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/biometricLock', () => ({
  getLockEnabled: jest.fn(),
  setLockEnabled: jest.fn(),
  getBiometricAvailability: jest.fn(),
}));
jest.mock('../../components/SettingsPrimitives', () => {
  const { View, Text } = require('react-native');
  return {
    SettingsPage: ({ title, children }) => (<View><Text>{title}</Text>{children}</View>),
    SettingRow: ({ label, sub, rightElement }) => (
      <View>
        <Text>{label}</Text>
        {sub ? <Text>{sub}</Text> : null}
        {rightElement || null}
      </View>
    ),
    SectionHeader: ({ title }) => <Text>{title}</Text>,
    settingsStyles: { section: {} },
  };
});

import useAppStore from '../../store/useAppStore';
import {
  getLockEnabled, setLockEnabled, getBiometricAvailability,
} from '../../lib/biometricLock';
import SettingsPrivacyScreen from '../SettingsPrivacyScreen';

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function findAppLockSwitch(tree) {
  // The passthrough RN mock renders each Switch as BOTH a composite
  // (forwardRef) node and its underlying host node, so a plain onValueChange
  // filter double-counts every switch; restrict to the composite node
  // (type is the component, not a host-element string) to get exactly one
  // entry per logical switch. Row order is: Open Food Facts share, Share
  // usage data, then the App lock row -- take the third.
  return tree.root.findAll(
    (n) => typeof n.props.onValueChange === 'function' && typeof n.type !== 'string',
  )[2];
}

describe('SettingsPrivacyScreen "App lock" toggle (CP-7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.mockImplementation((selector) => selector({
      healthConsent: true, privacy: { analyticsOptOut: false }, setAnalyticsOptOut: jest.fn(),
    }));
    getLockEnabled.mockResolvedValue(false);
  });

  test('no biometric enrolled: the switch is disabled with a calm explanation, and stays off', async () => {
    getBiometricAvailability.mockResolvedValue({ hasHardware: true, isEnrolled: false, available: false });
    let tree;
    await act(async () => { tree = create(<SettingsPrivacyScreen navigation={{ navigate: jest.fn() }} />); });
    await flush();

    const sw = findAppLockSwitch(tree);
    expect(sw.props.value).toBe(false);
    expect(sw.props.disabled).toBe(true);
    const texts = tree.root.findAllByType('Text').map((n) => (Array.isArray(n.children) ? n.children.join('') : n.children));
    expect(texts.some((t) => /set up face id, fingerprint or a passcode/i.test(t || ''))).toBe(true);
  });

  test('no hardware at all: the switch is disabled the same way', async () => {
    getBiometricAvailability.mockResolvedValue({ hasHardware: false, isEnrolled: false, available: false });
    let tree;
    await act(async () => { tree = create(<SettingsPrivacyScreen navigation={{ navigate: jest.fn() }} />); });
    await flush();

    expect(findAppLockSwitch(tree).props.disabled).toBe(true);
  });

  test('biometric available: the switch is enabled and can be turned on', async () => {
    getBiometricAvailability.mockResolvedValue({ hasHardware: true, isEnrolled: true, available: true });
    setLockEnabled.mockResolvedValue(true);
    let tree;
    await act(async () => { tree = create(<SettingsPrivacyScreen navigation={{ navigate: jest.fn() }} />); });
    await flush();

    const sw = findAppLockSwitch(tree);
    expect(sw.props.disabled).toBe(false);
    await act(async () => { sw.props.onValueChange(true); });
    await flush();

    expect(setLockEnabled).toHaveBeenCalledWith(true);
  });

  test('turning on re-checks availability live and refuses to persist if it just became unavailable', async () => {
    // Available at focus time...
    getBiometricAvailability.mockResolvedValueOnce({ hasHardware: true, isEnrolled: true, available: true });
    let tree;
    await act(async () => { tree = create(<SettingsPrivacyScreen navigation={{ navigate: jest.fn() }} />); });
    await flush();
    const sw = findAppLockSwitch(tree);
    expect(sw.props.disabled).toBe(false);

    // ...but the re-check performed at the moment of the toggle finds the
    // last biometric was just removed in device settings.
    getBiometricAvailability.mockResolvedValueOnce({ hasHardware: true, isEnrolled: false, available: false });
    await act(async () => { sw.props.onValueChange(true); });
    await flush();

    expect(getBiometricAvailability).toHaveBeenCalledTimes(2);
    expect(setLockEnabled).not.toHaveBeenCalled();
  });

  test('already on: the switch stays interactive to turn OFF even if availability later drops', async () => {
    getLockEnabled.mockResolvedValue(true);
    getBiometricAvailability.mockResolvedValue({ hasHardware: false, isEnrolled: false, available: false });
    setLockEnabled.mockResolvedValue(true);
    let tree;
    await act(async () => { tree = create(<SettingsPrivacyScreen navigation={{ navigate: jest.fn() }} />); });
    await flush();

    const sw = findAppLockSwitch(tree);
    expect(sw.props.value).toBe(true);
    expect(sw.props.disabled).toBe(false); // can still turn off
    await act(async () => { sw.props.onValueChange(false); });
    await flush();
    expect(setLockEnabled).toHaveBeenCalledWith(false);
  });
});
