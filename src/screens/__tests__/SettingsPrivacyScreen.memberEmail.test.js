/**
 * The Settings > Privacy switch "News by email" (founder decision
 * 2026-10-17: members are subscribed unless they turn it off).
 *
 * Pins: it starts ON (never off by default); it shows the last known value
 * when the read falls back; turning it off or on calls the lib with the
 * person's id; it carries the switch role and a label; it is not gated by
 * calm mode or an ED flag (turning emails off is always allowed); and it sits
 * after the App lock row so the existing switch order is untouched.
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
  getLockEnabled: jest.fn(() => Promise.resolve(false)),
  setLockEnabled: jest.fn(),
  getBiometricAvailability: jest.fn(() => Promise.resolve({ available: false })),
}));
jest.mock('../../lib/memberEmail/subscription', () => ({
  getSubscribed: jest.fn(),
  setSubscribed: jest.fn(() => Promise.resolve({ ok: true, queued: false })),
}));
jest.mock('../../lib/memberEmail/topics', () => ({
  TOPIC_WEEKLY_SUMMARY: 'weekly_summary',
  getTopic: jest.fn(),
  setTopic: jest.fn(() => Promise.resolve({ ok: true, queued: false })),
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
    useSettingsStyles: () => ({}),
  };
});

import fs from 'fs';
import path from 'path';
import useAppStore from '../../store/useAppStore';
import { getSubscribed, setSubscribed } from '../../lib/memberEmail/subscription';
import { getTopic, setTopic } from '../../lib/memberEmail/topics';
import SettingsPrivacyScreen from '../SettingsPrivacyScreen';

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}
function switches(tree) {
  return tree.root.findAll((n) => typeof n.props.onValueChange === 'function' && typeof n.type !== 'string');
}
function emailSwitch(tree) { return switches(tree)[3]; }
function weeklySwitch(tree) { return switches(tree)[4]; }
function texts(tree) {
  return tree.root.findAllByType('Text').map((n) => (Array.isArray(n.children) ? n.children.join('') : n.children));
}

async function render() {
  let tree;
  await act(async () => { tree = create(<SettingsPrivacyScreen navigation={{ navigate: jest.fn() }} />); });
  await flush();
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => selector({
    user: { id: 'u1' }, healthConsent: true, privacy: { analyticsOptOut: false }, setAnalyticsOptOut: jest.fn(),
  }));
  getSubscribed.mockResolvedValue({ subscribed: true, source: 'cloud' });
  getTopic.mockResolvedValue({ on: true, source: 'cloud' });
});

describe('News by email switch', () => {
  test('is ON by default, labelled, with the agreed line', async () => {
    const tree = await render();
    const sw = emailSwitch(tree);
    expect(sw.props.value).toBe(true);
    expect(sw.props.accessibilityRole).toBe('switch');
    expect(sw.props.accessibilityLabel).toBe('News by email');
    expect(sw.props.accessibilityState).toEqual({ checked: true });
    expect(texts(tree)).toContain('News by email');
    expect(texts(tree)).toContain('New features, short surveys and your weekly summary. You can turn this off at any time, here or from any email.');
  });

  test('is ON before the read resolves, so a slow read never shows a false off', async () => {
    getSubscribed.mockReturnValue(new Promise(() => {}));
    const tree = await render();
    expect(emailSwitch(tree).props.value).toBe(true);
  });

  test('shows off when the person turned it off (last known value)', async () => {
    getSubscribed.mockResolvedValue({ subscribed: false, source: 'mirror' });
    const tree = await render();
    expect(emailSwitch(tree).props.value).toBe(false);
    expect(getSubscribed).toHaveBeenCalledWith('u1');
  });

  test('turning it off calls the lib with the person id and false', async () => {
    const tree = await render();
    await act(async () => { emailSwitch(tree).props.onValueChange(false); });
    await flush();
    expect(setSubscribed).toHaveBeenCalledWith('u1', false);
    expect(emailSwitch(tree).props.value).toBe(false);
  });

  test('turning it back on calls the lib with true', async () => {
    getSubscribed.mockResolvedValue({ subscribed: false, source: 'cloud' });
    const tree = await render();
    await act(async () => { emailSwitch(tree).props.onValueChange(true); });
    await flush();
    expect(setSubscribed).toHaveBeenLastCalledWith('u1', true);
  });

  test('the news switch is the fourth and the weekly summary switch the fifth', async () => {
    const tree = await render();
    expect(switches(tree)).toHaveLength(5);
  });

  test('the screen and lib never read calm mode or an ED flag: turning emails off is never gated', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', 'SettingsPrivacyScreen.js'), 'utf8');
    const lib = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'memberEmail', 'subscription.js'), 'utf8');
    for (const src of [screen, lib]) {
      expect(src).not.toMatch(/getWellbeingMode|isCalm\(|getOpenEdPatternFlag|readSafetyState|useSafetyState/);
    }
  });
});

describe('Weekly summary email switch', () => {
  test('is ON by default, labelled, with the agreed line', async () => {
    const tree = await render();
    const sw = weeklySwitch(tree);
    expect(sw.props.value).toBe(true);
    expect(sw.props.disabled).toBe(false);
    expect(sw.props.accessibilityLabel).toBe('Weekly summary email');
    expect(texts(tree)).toContain('A short Monday email with how many sessions you trained last week. Never weights, food or body details.');
    expect(getTopic).toHaveBeenCalledWith('u1', 'weekly_summary');
  });

  test('turning it off writes the topic with the person id', async () => {
    const tree = await render();
    await act(async () => { weeklySwitch(tree).props.onValueChange(false); });
    await flush();
    expect(setTopic).toHaveBeenCalledWith('u1', 'weekly_summary', false);
    expect(weeklySwitch(tree).props.value).toBe(false);
  });

  test('shows off when the stored choice is off', async () => {
    getTopic.mockResolvedValue({ on: false, source: 'mirror' });
    const tree = await render();
    expect(weeklySwitch(tree).props.value).toBe(false);
  });

  test('with the main switch off it shows off and disabled, even if the topic is on', async () => {
    getSubscribed.mockResolvedValue({ subscribed: false, source: 'cloud' });
    const tree = await render();
    expect(weeklySwitch(tree).props.value).toBe(false);
    expect(weeklySwitch(tree).props.disabled).toBe(true);
    expect(weeklySwitch(tree).props.accessibilityState).toEqual({ checked: false, disabled: true });
  });
});
