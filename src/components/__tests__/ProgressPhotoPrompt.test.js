/**
 * ProgressPhotoPrompt (Photos LOOP-3, PHASE-2-WAVE3-DESIGN-SPEC D4) invariants.
 * Pins, against the REAL component, the fail-closed gating that makes this
 * ED-safety-adjacent surface safe:
 *   - it renders the calm invitation ONLY on a competence milestone when
 *     unsuppressed + Pro + not opted out;
 *   - usePhotoSuppression() true → NEVER renders (calm mode / open ED flag /
 *     any read failure all suppress);
 *   - a persisted opt-out ('photo_prompt_optout') → NEVER renders;
 *   - "Don't ask again" persists the opt-out flag, and it then holds;
 *   - the ≤1/day + never-twice-per-milestone frequency ceiling holds;
 *   - the copy is verbatim and carries none of the banned appearance/body
 *     vocabulary (it is a TRAINING moment, not the body).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));
jest.mock('../../lib/haptics', () => ({ press: jest.fn(), selection: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/telemetry', () => ({ track: jest.fn(async () => {}) }));
jest.mock('../../store/useAppStore', () => {
  const state = { user: { id: 'u1' } };
  const useAppStore = (sel) => (sel ? sel(state) : state);
  useAppStore.getState = () => state;
  return { __esModule: true, default: useAppStore };
});
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k, v) => { store[k] = v; }),
      removeItem: jest.fn(async (k) => { delete store[k]; }),
      __reset: () => { store = {}; },
      __raw: () => store,
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import { track } from '../../lib/telemetry';
import ProgressPhotoPrompt, { OPTOUT_KEY, SHOWN_KEY } from '../ProgressPhotoPrompt';

// The invitation is about a TRAINING moment only: none of the appearance/body
// vocabulary may ever appear on this surface.
const BANNED = /\b(before|after|transformation|leaner|bigger|smaller|weight|body|see how you.?ve changed)\b|%|—/i;

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
}

async function render(props = {}) {
  const merged = {
    milestoneId: 'milestone:sessions_50',
    tier: 'pro',
    onAddPhoto: jest.fn(),
    ...props,
  };
  let tree;
  await act(async () => { tree = create(<ProgressPhotoPrompt {...merged} />); });
  await flush();
  return { tree, props: merged };
}

function findByLabel(tree, label) {
  return tree.root.findAll((n) => typeof n.type === 'string'
    && n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

async function press(tree, label) {
  const node = findByLabel(tree, label);
  if (!node) throw new Error(`No pressable labelled "${label}"`);
  await act(async () => { node.props.onPress(); });
  await flush();
}

function isRendered(tree) {
  return !!findByLabel(tree, 'Add a photo');
}

beforeEach(() => {
  AsyncStorage.__reset();
  usePhotoSuppression.mockReturnValue(false);
  jest.clearAllMocks();
});

describe('ProgressPhotoPrompt, renders on a competence milestone', () => {
  test('renders when unsuppressed + Pro + not opted out + a milestone id', async () => {
    const { tree } = await render();
    expect(isRendered(tree)).toBe(true);
    const copy = flattenText(tree.toJSON());
    expect(copy).toContain('Mark the moment');
    expect(copy).toContain(
      "You've just hit a milestone. If you'd like, add a photo. Your own pace, always private to this phone.",
    );
    expect(copy).toContain('Add a photo');
    expect(copy).toContain('Not now');
    expect(copy).toContain("Don't ask again");
    // An impression fires the shown telemetry (feature key only).
    expect(track).toHaveBeenCalledWith('u1', 'photo_prompt_shown');
  });

  test('the copy carries no banned appearance/body vocabulary', async () => {
    const { tree } = await render();
    expect(flattenText(tree.toJSON())).not.toMatch(BANNED);
  });

  test('the primary action routes to the add flow and fires accepted telemetry', async () => {
    const { tree, props } = await render();
    await press(tree, 'Add a photo');
    expect(props.onAddPhoto).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('u1', 'photo_prompt_accepted');
  });
});

describe('ProgressPhotoPrompt, fail-closed gates', () => {
  test('does NOT render when usePhotoSuppression() is true', async () => {
    usePhotoSuppression.mockReturnValue(true);
    const { tree } = await render();
    expect(isRendered(tree)).toBe(false);
    expect(tree.toJSON()).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  test('does NOT render when not on the Pro tier', async () => {
    const { tree } = await render({ tier: 'free' });
    expect(isRendered(tree)).toBe(false);
  });

  test('does NOT render without a competence milestone id', async () => {
    const { tree } = await render({ milestoneId: null });
    expect(isRendered(tree)).toBe(false);
  });

  test('does NOT render when already opted out', async () => {
    await AsyncStorage.setItem(OPTOUT_KEY, '1');
    const { tree } = await render();
    expect(isRendered(tree)).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
});

describe('ProgressPhotoPrompt, opt-out persistence', () => {
  test('"Don\'t ask again" persists the opt-out flag and then never renders', async () => {
    const first = await render();
    expect(isRendered(first.tree)).toBe(true);
    await press(first.tree, "Don't ask again");
    // Flag persisted under the spec-mandated key.
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(OPTOUT_KEY, '1');
    expect(first.tree.toJSON()).toBeNull();
    // A fresh mount (even for a brand-new milestone) stays hidden.
    const second = await render({ milestoneId: 'milestone:sessions_100' });
    expect(isRendered(second.tree)).toBe(false);
  });
});

describe('ProgressPhotoPrompt, frequency ceiling', () => {
  test('never shows twice for the same milestone id', async () => {
    const first = await render();
    expect(isRendered(first.tree)).toBe(true);
    // Same milestone, fresh mount: the per-milestone dedupe suppresses it.
    const again = await render({ milestoneId: 'milestone:sessions_50' });
    expect(isRendered(again.tree)).toBe(false);
  });

  test('at most once per calendar day, even for a different milestone', async () => {
    const first = await render();
    expect(isRendered(first.tree)).toBe(true);
    // A different competence id the same day is held by the ≤1/day ceiling.
    const other = await render({ milestoneId: 'pb:workout-123' });
    expect(isRendered(other.tree)).toBe(false);
  });

  test('a fail-closed unreadable frequency state suppresses', async () => {
    // The opt-out reads clean (null → not opted out); the frequency state throws,
    // so readShownState fails closed to "already shown today" and suppresses.
    AsyncStorage.getItem.mockImplementation(async (k) => {
      if (k === SHOWN_KEY) throw new Error('read failed');
      return null;
    });
    const { tree } = await render();
    expect(isRendered(tree)).toBe(false);
  });
});
