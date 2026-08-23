/**
 * WorkoutOutline auto-collapse (founder device order 2026-08-22).
 *
 * What this suite pins and why: the outline is a navigator you glance at,
 * so once opened it puts itself away after five quiet seconds rather than
 * sitting over the workspace while you lift. Three things have to hold or
 * the behaviour is worse than not having it: it must actually close; it
 * must NOT close while the list is being read or scrolled; and a pending
 * close must never fire into an unmounted screen. A timed close also
 * strands a screen-reader user mid-list, so it is suppressed there.
 *
 * Behavioural, driven through the real component with fake timers - a
 * source guard would pass on a timer that is armed and never cleared.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../../lib/haptics', () => ({ selection: () => {} }));

// The RN test double carries no AccessibilityInfo, so it is supplied the
// same way Toast.test.js supplies it for the identical detection.
const ReactNative = require('react-native');
const mockAccessibilityInfo = {
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};
ReactNative.AccessibilityInfo = mockAccessibilityInfo;

const WorkoutOutline = require('../WorkoutOutline').default;

const ITEMS = [
  { key: 'a', name: 'Iso-Lateral Front Pulldown', done: 1, total: 4 },
  { key: 'b', name: 'Chest-Supported Row (Barbell)', done: 0, total: 3 },
  { key: 'c', name: 'Landmine Row', done: 0, total: 3 },
];

const strip = (tree) => tree.root.findAll(
  (n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.startsWith('Workout outline'),
)[0];
const isExpanded = (tree) => !!strip(tree).props.accessibilityState?.expanded;
// findAll matches the composite AND its host element, so count distinct
// exercises rather than matched nodes.
const rowCount = (tree) => new Set(tree.root.findAll(
  (n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.includes('sets done')
    && !n.props.accessibilityLabel.startsWith('Workout outline'),
).map((n) => n.props.accessibilityLabel)).size;

// Track ONLY this component's countdown. jest.getTimerCount() also counts
// React's own scheduling, so it cannot answer "did the outline leak a
// timer"; watching the 5000ms handle can.
let liveAutoTimers;
let realSetTimeout;
let realClearTimeout;
beforeEach(() => {
  jest.useFakeTimers();
  liveAutoTimers = new Set();
  realSetTimeout = global.setTimeout;
  realClearTimeout = global.clearTimeout;
  global.setTimeout = (fn, ms, ...rest) => {
    const id = realSetTimeout((...a) => { liveAutoTimers.delete(id); return fn(...a); }, ms, ...rest);
    if (ms === 5000) liveAutoTimers.add(id);
    return id;
  };
  global.clearTimeout = (id) => { liveAutoTimers.delete(id); return realClearTimeout(id); };
  mockAccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(false);
  mockAccessibilityInfo.addEventListener.mockReturnValue({ remove: jest.fn() });
});
afterEach(() => {
  global.setTimeout = realSetTimeout;
  global.clearTimeout = realClearTimeout;
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

const mount = async () => {
  let tree;
  await act(async () => { tree = create(<WorkoutOutline items={ITEMS} currentIndex={0} />); });
  return tree;
};
const open = async (tree) => {
  await act(async () => { strip(tree).props.onPress(); });
};

describe('the outline puts itself away', () => {
  test('it opens on tap and closes on its own after five quiet seconds', async () => {
    const tree = await mount();
    expect(isExpanded(tree)).toBe(false);
    await open(tree);
    expect(isExpanded(tree)).toBe(true);
    expect(rowCount(tree)).toBe(ITEMS.length);

    // Still open a moment before the deadline: it is five seconds, not four.
    await act(async () => { jest.advanceTimersByTime(4900); });
    expect(isExpanded(tree)).toBe(true);

    await act(async () => { jest.advanceTimersByTime(200); });
    expect(isExpanded(tree)).toBe(false);
    expect(rowCount(tree)).toBe(0);
  });

  test('reading the list defers the close: touching it puts the five seconds back', async () => {
    const tree = await mount();
    await open(tree);
    const list = tree.root.findAll((n) => typeof n.props?.onTouchStart === 'function')[0];

    await act(async () => { jest.advanceTimersByTime(4000); });
    await act(async () => { list.props.onTouchStart(); });
    // 4s more would have closed the original countdown; the restarted one holds.
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect(isExpanded(tree)).toBe(true);

    await act(async () => { jest.advanceTimersByTime(1100); });
    expect(isExpanded(tree)).toBe(false);
  });

  test('a settling fling also defers it', async () => {
    const tree = await mount();
    await open(tree);
    const list = tree.root.findAll((n) => typeof n.props?.onMomentumScrollEnd === 'function')[0];
    await act(async () => { jest.advanceTimersByTime(4000); });
    await act(async () => { list.props.onMomentumScrollEnd(); });
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect(isExpanded(tree)).toBe(true);
  });

  test('closing it by hand cancels the countdown rather than leaving it armed', async () => {
    const tree = await mount();
    await open(tree);
    await act(async () => { strip(tree).props.onPress(); }); // collapse by hand
    expect(isExpanded(tree)).toBe(false);
    // The countdown was cleared, not just ignored.
    expect(liveAutoTimers.size).toBe(0);
    await act(async () => { jest.advanceTimersByTime(6000); });
    expect(isExpanded(tree)).toBe(false);
  });

  test('a pending close never fires into an unmounted screen', async () => {
    const tree = await mount();
    await open(tree);
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(liveAutoTimers.size).toBe(1); // armed while open
    await act(async () => { tree.unmount(); });
    expect(liveAutoTimers.size).toBe(0); // and cleared by unmount
    // Would throw an update-on-unmounted warning if the timer had survived.
    await act(async () => { jest.advanceTimersByTime(6000); });
  });
});

describe('a screen reader is never timed out of the list', () => {
  test('with a screen reader on, the outline stays open', async () => {
    mockAccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(true);
    const tree = await mount();
    await open(tree);
    expect(isExpanded(tree)).toBe(true);
    await act(async () => { jest.advanceTimersByTime(20000); });
    expect(isExpanded(tree)).toBe(true);
  });
});
