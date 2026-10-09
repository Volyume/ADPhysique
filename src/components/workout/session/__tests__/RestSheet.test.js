/**
 * RestSheet (workout logger rebuild, lane B2, 12-BUILD-SPEC sections 1.7 and 3).
 *
 * Pins the full rest view the toolbar's Rest tool opens:
 *   - it READS the store the way the pinned strip does (restTimerActive,
 *     restTimerRemaining, restTimerDuration) and CALLS the strip's own
 *     actions: addRestTime through the strip's clampRestDelta floor, and
 *     stopRestTimer for Skip. It never ticks and never starts a rest;
 *   - the layout the spec names: "Rest" overline, the time at display, "of
 *     m:ss" at label, the next set line at h2 and the last session line at
 *     label from props, then -15, +15 and Skip as 48 dp targets, then a
 *     house primary "Back to the workout" that only closes the sheet (it read
 *     "Start next set" until D220 addendum 29, audit C21: it did not do that);
 *   - with no rest running it shows "No rest running" and the Start button
 *     only;
 *   - the strip's accessibility labels, word for word, and no live region;
 *   - hold-to-repeat matches the strip (200 ms) and cannot outlive a held
 *     finger when the rest ends or the sheet unmounts;
 *   - a closed sheet does not subscribe to the per-second field.
 *
 * The store is mocked with plain fields and jest.fn actions, so a press is
 * proven to reach the real action names. Reduce motion is forced so the
 * BottomSheet mounts synchronously.
 */
import { create, act } from 'react-test-renderer';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors, fontSize, type } from '../../../../styles/theme';

let mockRemaining = 102;
let mockRemainingReads = 0;
const mockState = {
  restTimerActive: true,
  get restTimerRemaining() {
    mockRemainingReads += 1;
    return mockRemaining;
  },
  restTimerDuration: 120,
  addRestTime: jest.fn(),
  stopRestTimer: jest.fn(),
  accessibility: { reduceMotion: true },
};
jest.mock('../../../../store/useAppStore', () => {
  const useAppStore = (selector) => selector(mockState);
  useAppStore.getState = () => mockState;
  return { __esModule: true, default: useAppStore };
});
jest.mock('../../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import * as haptics from '../../../../lib/haptics';
import RestSheet from '../RestSheet';

const NEXT = 'Set 3 of 3 · 70 kg × 6 to 10';
const LAST = 'Last time 72.5 kg × 8';

const hostText = (node) => node.children.map((c) => (typeof c === 'string' ? c : hostText(c))).join('');
const hosts = (tree, kind) => tree.root.findAll((n) => n.type === kind);
const allText = (tree) => hosts(tree, 'Text').map(hostText);
const byTestId = (tree, id) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props.testID === id,
)[0];
// Deep flatten: PressableCard nests its caller's style array inside its own.
const flatten = (style) => (Array.isArray(style)
  ? style.reduce((acc, part) => ({ ...acc, ...flatten(part) }), {})
  : (style || {}));
const flat = (node) => flatten(node.props.style);
const textNode = (tree, text) => hosts(tree, 'Text').find((n) => hostText(n) === text);

function render(props = {}) {
  let tree;
  act(() => {
    tree = create(<RestSheet visible onClose={jest.fn()} nextLabel={NEXT} lastLabel={LAST} {...props} />);
  });
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.restTimerActive = true;
  mockRemaining = 102;
  mockRemainingReads = 0;
  mockState.restTimerDuration = 120;
});

afterEach(() => {
  jest.useRealTimers();
});

// D104-2 (Campaign 27 phase 2c, 2026-10-09): useTheme steps the display
// sizes down below 390 dp and the jest React Native mock reports a narrow
// window. This suite pins the readout against the static type table, so it
// runs at a wide window; the bucket is pinned in styles/__tests__/narrowBucket.
const RNForWidth = require('react-native');
let windowSpy;
beforeAll(() => {
  windowSpy = jest.spyOn(RNForWidth, 'useWindowDimensions').mockReturnValue({ width: 393, height: 852, scale: 3, fontScale: 1 });
});
afterAll(() => { windowSpy.mockRestore(); });

describe('RestSheet, a rest is running', () => {
  test('renders nothing while it is closed', () => {
    const tree = render({ visible: false });
    expect(tree.toJSON()).toBeNull();
  });

  test('is the house BottomSheet, labelled for the screen reader', () => {
    const tree = render();
    expect(tree.root.findByType(BottomSheetModal).props.accessibilityLabel).toBe('Rest timer');
  });

  test('shows the overline, the time, "of m:ss", the next set line and the last line', () => {
    const tree = render();
    const text = allText(tree);
    expect(text).toEqual(expect.arrayContaining(['Rest', '1:42', 'of 2:00', NEXT, LAST]));
    // D220 addendum 30 (audit D4): the steps read "15" beside a remove or add
    // glyph, the strip's grammar.
    expect(text.filter((x) => x === '15')).toHaveLength(2);
    expect(text).toContain('Skip');
    expect(text).toContain('Back to the workout');
  });

  test('type roles: overline, display time, label, h2 next line, label last line', () => {
    const tree = render();
    expect(flat(textNode(tree, 'Rest'))).toMatchObject({ ...type.overline, color: colors.textMuted });
    expect(flat(textNode(tree, '1:42'))).toMatchObject({ ...type.num('display'), color: colors.textPrimary });
    expect(flat(textNode(tree, 'of 2:00'))).toMatchObject({ ...type.label, color: colors.textSecondary });
    expect(flat(textNode(tree, NEXT))).toMatchObject({ ...type.num('h2'), color: colors.textPrimary });
    expect(flat(textNode(tree, LAST))).toMatchObject({ ...type.label, color: colors.textSecondary });
    // The spec names the sizes: display 40 and h2 24.
    expect(flat(textNode(tree, '1:42')).fontSize).toBe(fontSize.display);
    expect(flat(textNode(tree, NEXT)).fontSize).toBe(fontSize.xxl);
  });

  test('the time is tabular and takes the warning colour in the last ten seconds only', () => {
    expect(flat(textNode(render(), '1:42')).fontVariant).toContain('tabular-nums');
    mockRemaining = 11;
    expect(flat(textNode(render(), '0:11')).color).toBe(colors.textPrimary);
    mockRemaining = 10;
    expect(flat(textNode(render(), '0:10')).color).toBe(colors.warning);
  });

  test('the last three seconds show bare seconds, as the strip does', () => {
    mockRemaining = 3;
    expect(allText(render())).toContain('3');
    mockRemaining = 1;
    const tree = render();
    expect(allText(tree)).toContain('1');
    expect(allText(tree)).not.toContain('0:01');
  });

  test('the "of" figure is the rest duration the store holds, in m:ss', () => {
    mockState.restTimerDuration = 90;
    expect(allText(render())).toContain('of 1:30');
    mockState.restTimerDuration = 600;
    expect(allText(render())).toContain('of 10:00');
  });

  test('omits the next and last lines when the props are not given', () => {
    const tree = render({ nextLabel: undefined, lastLabel: undefined });
    expect(byTestId(tree, 'volyume-rest-sheet-next')).toBeUndefined();
    expect(byTestId(tree, 'volyume-rest-sheet-last')).toBeUndefined();
    const lastOnly = render({ nextLabel: undefined });
    expect(byTestId(lastOnly, 'volyume-rest-sheet-next')).toBeUndefined();
    expect(hostText(byTestId(lastOnly, 'volyume-rest-sheet-last'))).toBe(LAST);
  });

  test('the readout carries the strip label, word for word', () => {
    const cases = [
      [102, 'Rest timer, 1 minute 42 seconds remaining'],
      [61, 'Rest timer, 1 minute 1 second remaining'],
      [120, 'Rest timer, 2 minutes 0 seconds remaining'],
      [9, 'Rest timer, 0 minutes 9 seconds remaining'],
      [3, 'Rest, 3 seconds remaining'],
      [1, 'Rest, 1 second remaining'],
    ];
    for (const [remaining, label] of cases) {
      mockRemaining = remaining;
      const readout = byTestId(render(), 'volyume-rest-sheet-readout');
      expect(readout.props.accessible).toBe(true);
      expect(readout.props.accessibilityLabel).toBe(label);
    }
  });

  test('is not a live region, so TalkBack does not speak every second', () => {
    const tree = render();
    const live = tree.root.findAll((n) => n.props && n.props.accessibilityLiveRegion !== undefined);
    expect(live).toEqual([]);
  });

  test('the three controls use the strip labels, are buttons and are 48 dp targets', () => {
    const tree = render();
    const expected = [
      ['volyume-rest-sheet-remove', 'Remove 15 seconds'],
      ['volyume-rest-sheet-add', 'Add 15 seconds'],
      ['volyume-rest-sheet-skip', 'Skip rest timer'],
    ];
    for (const [id, label] of expected) {
      const node = byTestId(tree, id);
      expect(node.props.accessibilityLabel).toBe(label);
      expect(node.props.accessibilityRole).toBe('button');
      expect(flat(node).minHeight).toBeGreaterThanOrEqual(48);
    }
  });

  test('Back to the workout is a house primary Button and only closes the sheet', () => {
    const onClose = jest.fn();
    const tree = render({ onClose });
    const start = byTestId(tree, 'volyume-rest-sheet-start');
    expect(start.props.accessibilityLabel).toBe('Back to the workout');
    expect(start.props.accessibilityRole).toBe('button');
    act(() => start.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockState.stopRestTimer).not.toHaveBeenCalled();
    expect(mockState.addRestTime).not.toHaveBeenCalled();
  });
});

describe('RestSheet, the controls reach the store actions', () => {
  test('Add 15 seconds calls addRestTime(15) with a selection haptic', () => {
    const tree = render();
    act(() => byTestId(tree, 'volyume-rest-sheet-add').props.onPress());
    expect(mockState.addRestTime).toHaveBeenCalledTimes(1);
    expect(mockState.addRestTime).toHaveBeenCalledWith(15);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
  });

  test('Remove 15 seconds calls addRestTime(-15) when there is room', () => {
    const tree = render();
    act(() => byTestId(tree, 'volyume-rest-sheet-remove').props.onPress());
    expect(mockState.addRestTime).toHaveBeenCalledTimes(1);
    expect(mockState.addRestTime).toHaveBeenCalledWith(-15);
  });

  test('Remove keeps the strip floor: never under five seconds, never a sign flip', () => {
    const tree = render();
    const remove = byTestId(tree, 'volyume-rest-sheet-remove');
    mockRemaining = 8;
    act(() => remove.props.onPress());
    expect(mockState.addRestTime).toHaveBeenLastCalledWith(-3);
    mockState.addRestTime.mockClear();
    mockRemaining = 5;
    act(() => remove.props.onPress());
    mockRemaining = 2;
    act(() => remove.props.onPress());
    expect(mockState.addRestTime).not.toHaveBeenCalled();
    // Adding is never clamped.
    const add = byTestId(tree, 'volyume-rest-sheet-add');
    act(() => add.props.onPress());
    expect(mockState.addRestTime).toHaveBeenCalledWith(15);
  });

  test('Skip rest timer calls stopRestTimer once and nothing else', () => {
    const tree = render();
    act(() => byTestId(tree, 'volyume-rest-sheet-skip').props.onPress());
    expect(mockState.stopRestTimer).toHaveBeenCalledTimes(1);
    expect(mockState.addRestTime).not.toHaveBeenCalled();
  });

  test('holding a control repeats it every 200 ms and stops on release', () => {
    jest.useFakeTimers();
    const tree = render();
    const add = byTestId(tree, 'volyume-rest-sheet-add');
    expect(add.props.delayLongPress).toBe(300);
    act(() => add.props.onLongPress());
    act(() => { jest.advanceTimersByTime(600); });
    expect(mockState.addRestTime).toHaveBeenCalledTimes(3);
    expect(mockState.addRestTime).toHaveBeenCalledWith(15);
    act(() => add.props.onPressOut());
    act(() => { jest.advanceTimersByTime(1000); });
    expect(mockState.addRestTime).toHaveBeenCalledTimes(3);
  });

  test('a hold stops when the sheet unmounts', () => {
    jest.useFakeTimers();
    const tree = render();
    act(() => byTestId(tree, 'volyume-rest-sheet-add').props.onLongPress());
    act(() => { jest.advanceTimersByTime(200); });
    expect(mockState.addRestTime).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
    act(() => { jest.advanceTimersByTime(1000); });
    expect(mockState.addRestTime).toHaveBeenCalledTimes(1);
  });

  test('a hold stops when the rest runs out under the finger', () => {
    jest.useFakeTimers();
    const sheet = () => <RestSheet visible onClose={jest.fn()} nextLabel={NEXT} lastLabel={LAST} />;
    let tree;
    act(() => { tree = create(sheet()); });
    act(() => byTestId(tree, 'volyume-rest-sheet-remove').props.onLongPress());
    act(() => { jest.advanceTimersByTime(200); });
    expect(mockState.addRestTime).toHaveBeenCalledTimes(1);
    mockState.restTimerActive = false;
    // A fresh element, so React re-renders the body against the changed store.
    act(() => tree.update(sheet()));
    act(() => { jest.advanceTimersByTime(1000); });
    expect(mockState.addRestTime).toHaveBeenCalledTimes(1);
  });
});

describe('RestSheet, no rest running', () => {
  beforeEach(() => {
    mockState.restTimerActive = false;
    mockRemaining = 0;
  });

  test('shows "No rest running" and the Start button only', () => {
    const tree = render();
    const text = allText(tree);
    expect(text).toContain('No rest running');
    expect(text).toContain('Back to the workout');
    // Nothing from the running state: no overline, time, controls or set lines.
    expect(text).not.toContain('Rest');
    expect(text).not.toContain('0:00');
    expect(text).not.toContain(NEXT);
    expect(text).not.toContain(LAST);
    expect(hosts(tree, 'TouchableOpacity')).toEqual([]);
    expect(byTestId(tree, 'volyume-rest-sheet-skip')).toBeUndefined();
    expect(byTestId(tree, 'volyume-rest-sheet-readout')).toBeUndefined();
  });

  test('the Start button closes the sheet', () => {
    const onClose = jest.fn();
    const tree = render({ onClose });
    act(() => byTestId(tree, 'volyume-rest-sheet-start').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('the sheet follows the store from running to idle without being remounted', () => {
    mockState.restTimerActive = true;
    mockRemaining = 4;
    const sheet = () => <RestSheet visible onClose={jest.fn()} nextLabel={NEXT} />;
    let tree;
    act(() => { tree = create(sheet()); });
    expect(allText(tree)).toContain('Skip');
    mockState.restTimerActive = false;
    mockRemaining = 0;
    act(() => tree.update(sheet()));
    expect(allText(tree)).toContain('No rest running');
    expect(allText(tree)).not.toContain('Skip');
  });
});

describe('RestSheet, a closed sheet is free', () => {
  test('does not read the per-second field until it is presented', () => {
    const element = <RestSheet visible={false} onClose={jest.fn()} nextLabel={NEXT} />;
    let tree;
    act(() => { tree = create(element); });
    expect(mockRemainingReads).toBe(0);
    act(() => tree.update(<RestSheet visible onClose={jest.fn()} nextLabel={NEXT} />));
    expect(mockRemainingReads).toBeGreaterThan(0);
  });
});
