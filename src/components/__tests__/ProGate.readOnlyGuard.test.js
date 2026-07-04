/**
 * withReadOnlyProGuard (E10 read-only lapse views, founder decision
 * 2026-07-02: "view yes, log no"). Pins the guard's four branches against the
 * REAL ProGate module:
 *   - a Pro user passes straight through, and the history read never runs
 *     (tier alone decides; no data check can delay or deny a paying user);
 *   - a free user WITH history sees the screen (which renders itself
 *     view-only from the store tier);
 *   - a free user WITHOUT history sees ProLocked, so the show-then-sell gate
 *     is unchanged for never-Pro users;
 *   - a THROWN history read fails CLOSED to ProLocked. A transient DB error
 *     must never soften the tier posture (CLAUDE.md free/Pro rule).
 * Also pins that nothing renders while the read is settling (no lock flash
 * for a user whose data is about to appear).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../AppAlert', () => ({ appAlert: jest.fn(), AppAlertHost: () => null }));
jest.mock('../../lib/payments/restore', () => ({ restorePurchases: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
// ProLocked renders the example-day teaser for the 'Food diary' label; its
// real module graph (meal assembler, food db) is irrelevant to the guard.
jest.mock('../food/TodaysPlateTeaser', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('Teaser') };
});

import useAppStore from '../../store/useAppStore';
import { withReadOnlyProGuard } from '../ProGate';

const Screen = () => null;

function setStore({ tier, userId = 'u1' }) {
  useAppStore.mockImplementation((sel) => sel({ tier, user: { id: userId } }));
}

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

// Every tree gets unmounted after its test. The guard arms a real 4s
// fail-closed timer that only clears on unmount; a mounted tree left behind
// fires it after the run ends, which Jest counts as a run failure (exit 1)
// under --runInBand even with every test passing — exactly what broke the
// release gate.
const trees = [];

afterEach(async () => {
  for (const t of trees) {
    try { await act(async () => { t.unmount(); }); } catch (_) { /* already gone */ }
  }
  trees.length = 0;
});

async function render(Guarded) {
  let tree;
  await act(async () => { tree = create(<Guarded />); });
  trees.push(tree);
  await flush();
  return tree;
}

const hasScreen = (tree) => tree.root.findAll((n) => n.type === Screen).length > 0;
const hasLock = (tree) => JSON.stringify(tree.toJSON() ?? '').includes('is part of Pro');

describe('withReadOnlyProGuard (E10 lapse views)', () => {
  test('pro tier renders the screen and never runs the history read', async () => {
    setStore({ tier: 'pro' });
    const hasHistory = jest.fn();
    const tree = await render(withReadOnlyProGuard(Screen, 'Food diary', hasHistory));
    expect(hasScreen(tree)).toBe(true);
    expect(hasHistory).not.toHaveBeenCalled();
  });

  test('free tier WITH history renders the screen (view-only inside)', async () => {
    setStore({ tier: 'free' });
    const hasHistory = jest.fn().mockResolvedValue(true);
    const tree = await render(withReadOnlyProGuard(Screen, 'Food diary', hasHistory));
    expect(hasHistory).toHaveBeenCalledWith('u1');
    expect(hasScreen(tree)).toBe(true);
    expect(hasLock(tree)).toBe(false);
  });

  test('free tier WITHOUT history keeps the ProLocked gate', async () => {
    setStore({ tier: 'free' });
    const tree = await render(withReadOnlyProGuard(Screen, 'Body metrics', jest.fn().mockResolvedValue(false)));
    expect(hasScreen(tree)).toBe(false);
    expect(hasLock(tree)).toBe(true);
  });

  test('a rejected history read fails CLOSED to ProLocked', async () => {
    setStore({ tier: 'free' });
    const tree = await render(withReadOnlyProGuard(Screen, 'Body metrics', jest.fn().mockRejectedValue(new Error('db locked'))));
    expect(hasScreen(tree)).toBe(false);
    expect(hasLock(tree)).toBe(true);
  });

  test('a THROWING (synchronous) history read also fails CLOSED', async () => {
    setStore({ tier: 'free' });
    const tree = await render(withReadOnlyProGuard(Screen, 'Body metrics', () => { throw new Error('boom'); }));
    expect(hasScreen(tree)).toBe(false);
    expect(hasLock(tree)).toBe(true);
  });

  test('while the read settles, neither the screen nor the lock renders', async () => {
    jest.useFakeTimers();
    try {
      setStore({ tier: 'free' });
      const never = () => new Promise(() => {});
      const Guarded = withReadOnlyProGuard(Screen, 'Food diary', never);
      let tree;
      await act(async () => { tree = create(<Guarded />); });
      trees.push(tree);
      expect(hasScreen(tree)).toBe(false);
      expect(hasLock(tree)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a HUNG read fails closed to the lock after the safety timeout (never a stuck blank)', async () => {
    jest.useFakeTimers();
    try {
      setStore({ tier: 'free' });
      const never = () => new Promise(() => {});
      const Guarded = withReadOnlyProGuard(Screen, 'Progress photos', never);
      let tree;
      await act(async () => { tree = create(<Guarded />); });
      trees.push(tree);
      await act(async () => { jest.advanceTimersByTime(4001); });
      expect(hasScreen(tree)).toBe(false);
      expect(hasLock(tree)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  test('null tier (signed out / undecided) is treated as free, never as pro', async () => {
    setStore({ tier: null, userId: null });
    const hasHistory = jest.fn().mockResolvedValue(false);
    const tree = await render(withReadOnlyProGuard(Screen, 'Food diary', hasHistory));
    expect(hasScreen(tree)).toBe(false);
    expect(hasLock(tree)).toBe(true);
  });
});
