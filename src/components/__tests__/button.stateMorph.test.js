/**
 * Button state morph (audit 03b §3.3b, Wave 6 M4) — behaviour tests for the
 * committing-moment morph idle → loading → success.
 *
 * What this suite pins and why:
 *  - the SUCCESS beat is the single owner of the commit haptic: exactly one
 *    Impact.Medium on entering success, never on loading or idle, and never
 *    twice for one entry. Call sites must NOT fire their own commit() when
 *    they adopt `state` (WeeklyCheckIn's manual call was removed for this) —
 *    a second owner would double-buzz every committing moment in the app;
 *  - onSettled fires exactly once, after SUCCESS_HOLD_MS, and NEVER fires if
 *    the button unmounts first (a caller navigating away mid-beat must not
 *    receive a stale callback into torn-down state);
 *  - the morph phases keep the disabled/busy contract: loading and success
 *    both block the press, so a double-tap during the beat cannot re-run an
 *    apply handler that no longer has data to apply (the NU-3 bug class);
 *  - the width lock: once the idle content has measured, the non-idle phases
 *    carry minWidth/minHeight so the button never shrinks under the finger;
 *  - reduce-motion renders the phase content in a plain host View (instant
 *    swap, no entering/exiting builders) — fit rule 0.
 */
import { Text, ActivityIndicator } from 'react-native';
import { create, act } from 'react-test-renderer';
import * as Haptics from 'expo-haptics';

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as the mount suites do (screen-mount.test.js).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import Button, { SUCCESS_HOLD_MS } from '../Button';
import useAppStore from '../../store/useAppStore';

const commitCalls = () =>
  Haptics.impactAsync.mock.calls.filter(([style]) => style === 'medium').length;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  act(() => useAppStore.setState({ accessibility: {} }));
});

describe('success beat', () => {
  test('entering success fires exactly one commit haptic and shows the checkmark', () => {
    let tree;
    act(() => { tree = create(<Button title="Apply" state="loading" onPress={() => {}} />); });
    expect(commitCalls()).toBe(0);
    act(() => { tree.update(<Button title="Apply" state="success" onPress={() => {}} />); });
    expect(commitCalls()).toBe(1);
    // Checkmark icon present, no title text.
    expect(tree.root.findAllByProps({ name: 'checkmark' }).length).toBeGreaterThan(0);
    // Re-render in the same phase must not re-fire.
    act(() => { tree.update(<Button title="Apply" state="success" onPress={() => {}} />); });
    expect(commitCalls()).toBe(1);
  });

  test('mounting already in success fires NO haptic but still settles (M4 review: no phantom commit on remount)', () => {
    // A parent that keeps the success marker as its own state (CoachOutput
    // apply rows, the check-in submit) can remount a button straight into
    // success after a collapse/step change. That remount must not replay the
    // commit beat, but the onSettled timer must still run so a stranded marker
    // clears.
    const onSettled = jest.fn();
    act(() => {
      void create(<Button title="Apply" state="success" onSettled={onSettled} onPress={() => {}} />);
    });
    expect(commitCalls()).toBe(0);
    act(() => { jest.advanceTimersByTime(SUCCESS_HOLD_MS); });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  test('onSettled fires once after SUCCESS_HOLD_MS', () => {
    const onSettled = jest.fn();
    act(() => {
      void create(<Button title="Apply" state="success" onSettled={onSettled} onPress={() => {}} />);
    });
    act(() => { jest.advanceTimersByTime(SUCCESS_HOLD_MS - 1); });
    expect(onSettled).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onSettled).toHaveBeenCalledTimes(1);
    act(() => { jest.runOnlyPendingTimers(); });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  test('unmounting mid-beat cancels onSettled (no stale callback)', () => {
    const onSettled = jest.fn();
    let tree;
    act(() => {
      tree = create(<Button title="Apply" state="success" onSettled={onSettled} onPress={() => {}} />);
    });
    act(() => { tree.unmount(); });
    act(() => { jest.runAllTimers(); });
    expect(onSettled).not.toHaveBeenCalled();
  });

  test('leaving success before the hold cancels onSettled', () => {
    const onSettled = jest.fn();
    let tree;
    act(() => {
      tree = create(<Button title="Apply" state="success" onSettled={onSettled} onPress={() => {}} />);
    });
    act(() => { tree.update(<Button title="Apply" state="idle" onSettled={onSettled} onPress={() => {}} />); });
    act(() => { jest.runAllTimers(); });
    expect(onSettled).not.toHaveBeenCalled();
  });

  test('loading fires no haptic of any kind', () => {
    act(() => { void create(<Button title="Apply" state="loading" onPress={() => {}} />); });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});

describe('phase rendering and the disabled contract', () => {
  test('loading and success both disable the press', () => {
    for (const state of ['loading', 'success']) {
      let tree;
      act(() => { tree = create(<Button title="Apply" state={state} onPress={() => {}} />); });
      const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
      expect(pressable.props.disabled).toBe(true);
    }
  });

  test('state="loading" shows the spinner (parity with the legacy loading bool)', () => {
    let tree;
    act(() => { tree = create(<Button title="Apply" state="loading" onPress={() => {}} />); });
    expect(tree.root.findAllByType(ActivityIndicator).length).toBe(1);
    expect(tree.root.findAllByType(Text).length).toBe(0);
  });

  test('successLabel renders beside the checkmark', () => {
    let tree;
    act(() => { tree = create(<Button title="Apply" state="success" successLabel="Applied" onPress={() => {}} />); });
    expect(JSON.stringify(tree.toJSON())).toContain('Applied');
  });

  test('an unknown state value falls back to idle', () => {
    let tree;
    act(() => { tree = create(<Button title="Apply" state="held" onPress={() => {}} />); });
    expect(JSON.stringify(tree.toJSON())).toContain('Apply');
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(pressable.props.disabled).toBe(false);
  });

  test('the outline variant renders the quiet border treatment', () => {
    let tree;
    act(() => { tree = create(<Button title="Apply" variant="outline" onPress={() => {}} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    // Quiet secondary chrome: neutral surface + border, not amber link styling.
    const flat = JSON.stringify(pressable.props.style ?? tree.toJSON());
    expect(flat).toContain('#191917');
    expect(flat).toContain('#6E6E6E');
    expect(flat).not.toContain('transparent');
  });

  test('outline stays silent on press (only filled primary ticks, M1)', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<Button title="Apply" variant="outline" onPress={onPress} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    act(() => pressable.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});

describe('width lock', () => {
  test('the idle measurement carries into the loading phase as a min size', () => {
    let tree;
    act(() => { tree = create(<Button title="Apply changes" onPress={() => {}} />); });
    const measured = tree.root.findAll((n) => typeof n.props?.onLayout === 'function');
    expect(measured.length).toBeGreaterThan(0);
    act(() => {
      measured[0].props.onLayout({ nativeEvent: { layout: { width: 132, height: 24 } } });
    });
    act(() => { tree.update(<Button title="Apply changes" state="loading" onPress={() => {}} />); });
    const locked = tree.root.findAll((n) =>
      JSON.stringify(n.props?.style ?? null).includes('"minWidth":132'));
    expect(locked.length).toBeGreaterThan(0);
  });
});

describe('reduce motion (fit rule 0)', () => {
  test('phase content renders in a plain host View, not the Animated host', () => {
    act(() => useAppStore.setState({ accessibility: { reduceMotion: true } }));
    let tree;
    act(() => { tree = create(<Button title="Apply" state="loading" onPress={() => {}} />); });
    // R6 (2026-07-11): PressableCard collapsed its two-view structure into
    // a single animated pressable (see pressableCard.rowLayout.guard.test.js),
    // so it no longer contributes an Animated.View node of its own. The pin's
    // intent is unchanged: the MORPH adds no animated wrapper under reduce
    // motion, so there are now ZERO Animated.View ancestors above the spinner.
    const spinner = tree.root.findByType(ActivityIndicator);
    let node = spinner.parent;
    let animatedAncestors = 0;
    while (node) {
      if (node.type === 'Animated.View') animatedAncestors += 1;
      node = node.parent;
    }
    expect(animatedAncestors).toBe(0);
    // The morph still functions: success still settles (information is not
    // motion), only the cross-fade collapses.
    const onSettled = jest.fn();
    act(() => {
      tree.update(<Button title="Apply" state="success" onSettled={onSettled} onPress={() => {}} />);
    });
    act(() => { jest.advanceTimersByTime(SUCCESS_HOLD_MS); });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
