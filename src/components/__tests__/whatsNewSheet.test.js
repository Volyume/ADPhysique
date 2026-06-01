/**
 * WhatsNewSheet gating (A2-003: now mounted live in RootNavigator). Covers the
 * "shows once, never over auth screens" rules: no items -> nothing; no signed-in
 * user/tier -> nothing; unseen + signed in -> shows after the settle delay;
 * seen mark present -> nothing.
 */
import React from 'react';
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockStoreState;
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (selector) => selector(mockStoreState),
}));

import WhatsNewSheet from '../WhatsNewSheet';

const ITEMS = [{ icon: 'repeat-outline', headline: 'Frequents', body: 'Most-logged foods.' }];
const SEEN_KEY = '@volyume_seen_whats_new_2026_05_v2';

const signedIn = () => ({ tier: 'pro', user: { id: 'u1' }, accessibility: { reduceMotion: true } });

async function flush() {
  // Let the effect's awaited AsyncStorage.getItem settle.
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockStoreState = signedIn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('WhatsNewSheet gating', () => {
  test('renders nothing when there are no items', () => {
    let tree;
    act(() => { tree = create(<WhatsNewSheet items={[]} />); });
    expect(tree.toJSON()).toBeNull();
  });

  test('stays hidden with no signed-in user / tier', async () => {
    mockStoreState = { tier: null, user: null, accessibility: { reduceMotion: true } };
    jest.useFakeTimers();
    let tree;
    await act(async () => { tree = create(<WhatsNewSheet items={ITEMS} />); });
    await flush();
    act(() => { jest.advanceTimersByTime(1500); });
    expect(tree.toJSON()).toBeNull();
  });

  test('shows once when unseen and signed in', async () => {
    jest.useFakeTimers();
    let tree;
    await act(async () => { tree = create(<WhatsNewSheet items={ITEMS} />); });
    await flush();
    await act(async () => { jest.advanceTimersByTime(1300); });
    expect(JSON.stringify(tree.toJSON())).toContain('New in Volyume');
  });

  test('stays hidden when the seen mark is already set', async () => {
    await AsyncStorage.setItem(SEEN_KEY, '1');
    jest.useFakeTimers();
    let tree;
    await act(async () => { tree = create(<WhatsNewSheet items={ITEMS} />); });
    await flush();
    act(() => { jest.advanceTimersByTime(1500); });
    expect(tree.toJSON()).toBeNull();
  });
});
