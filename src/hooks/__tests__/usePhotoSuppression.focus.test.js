/**
 * usePhotoSuppression.focus.test.js
 *
 * S7-5 (progress-tab audit second pass, 2026-09-25): the shared calm-or-ED
 * suppression hook read its two inputs once per userId. The photos screen
 * is a plain stack screen that stays mounted across navigation, so a user
 * who opened it, switched calm mode on (or had an ED flag raised) elsewhere
 * and came back kept the old, unsuppressed verdict: comparison, trend and
 * share stayed reachable until a remount. Pins, with the REAL hook mounted
 * and only its I/O mocked:
 *
 *  1. the initial read still fails closed (suppressed until confirmed);
 *  2. a focus of the enclosing screen re-reads BOTH inputs, so calm mode
 *     switched on while away suppresses on return, and so does an ED flag
 *     raised while away;
 *  3. a re-read that confirms a normal state lifts suppression again;
 *  4. without a navigation context (a test double, or a consumer outside a
 *     screen) the hook still works and simply has nothing to listen to.
 */
import { useEffect } from 'react';
import { create, act } from 'react-test-renderer';

// The mocked module carries a real React context so the hook's
// useContext(NavigationContext) reads whatever the test provides below.
jest.mock('@react-navigation/native', () => ({
  NavigationContext: jest.requireActual('react').createContext(null),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => 'unspecified'), setItem: jest.fn(async () => {}) },
}));
jest.mock('../../lib/database', () => ({ getOpenEdPatternFlag: jest.fn(async () => null) }));
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: (sel) => sel({ user: { id: 'u1' } }) }));

import { NavigationContext } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOpenEdPatternFlag } from '../../lib/database';
import usePhotoSuppression from '../usePhotoSuppression';

let latest = null;
function Probe() {
  const suppressed = usePhotoSuppression('u1');
  useEffect(() => { latest = suppressed; });
  return null;
}

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

function fakeNavigation() {
  const handlers = {};
  return {
    handlers,
    addListener: jest.fn((event, cb) => { handlers[event] = cb; return () => { delete handlers[event]; }; }),
  };
}

async function mountWith(navigation) {
  latest = null;
  await act(async () => {
    create(
      navigation
        ? <NavigationContext.Provider value={navigation}><Probe /></NavigationContext.Provider>
        : <Probe />,
    );
  });
  await flush();
}

describe('S7-5: usePhotoSuppression re-reads on focus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('unspecified');
    getOpenEdPatternFlag.mockResolvedValue(null);
  });

  test('starts suppressed, lifts once both reads confirm a normal state, and subscribes to focus', async () => {
    const nav = fakeNavigation();
    let firstRender = null;
    function FirstRenderProbe() {
      const s = usePhotoSuppression('u1');
      if (firstRender === null) firstRender = s;
      return null;
    }
    await act(async () => {
      create(<NavigationContext.Provider value={nav}><FirstRenderProbe /></NavigationContext.Provider>);
    });
    expect(firstRender).toBe(true);
    await mountWith(nav);
    expect(latest).toBe(false);
    expect(nav.addListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });

  test('calm mode switched on while away suppresses on the next focus', async () => {
    const nav = fakeNavigation();
    await mountWith(nav);
    expect(latest).toBe(false);
    AsyncStorage.getItem.mockResolvedValue('calm');
    await act(async () => { nav.handlers.focus(); });
    await flush();
    expect(latest).toBe(true);
    expect(getOpenEdPatternFlag).toHaveBeenCalledTimes(2);
  });

  test('an ED flag raised while away suppresses on the next focus', async () => {
    const nav = fakeNavigation();
    await mountWith(nav);
    expect(latest).toBe(false);
    getOpenEdPatternFlag.mockResolvedValue({ id: 'flag-1' });
    await act(async () => { nav.handlers.focus(); });
    await flush();
    expect(latest).toBe(true);
  });

  test('a focus re-read that confirms a normal state lifts suppression again', async () => {
    AsyncStorage.getItem.mockResolvedValue('calm');
    const nav = fakeNavigation();
    await mountWith(nav);
    expect(latest).toBe(true);
    AsyncStorage.getItem.mockResolvedValue('unspecified');
    await act(async () => { nav.handlers.focus(); });
    await flush();
    expect(latest).toBe(false);
  });

  test('without a navigation context the hook still resolves and has nothing to listen to', async () => {
    await mountWith(null);
    expect(latest).toBe(false);
  });
});
