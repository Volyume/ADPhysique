/**
 * D141 item 3 - EmptyState's `busy` prop (the "Start with a plan" preflight
 * announcing it is working). EmptyState's primary CTA is the shared Button
 * primitive (see EmptyState.js's own docblock, "D1 sweep (f)"), which
 * already owns one loading/disabled treatment app-wide (ActivityIndicator
 * in theme colours, disabled press, accessibilityState busy+disabled) --
 * this pins that `busy` reuses that existing treatment via Button's
 * `loading` prop rather than a second hand-rolled spinner, and that the
 * secondary action stays untouched while busy (ruling: "Browse plans"
 * never conflicts with an in-flight "Start with a plan" preview).
 *
 * Renders the real Button/PressableCard tree (same approach as
 * button.stateMorph.test.js) rather than a stub, so this is a genuine
 * render assertion, not a source guard.
 */
import { ActivityIndicator } from 'react-native';
import { create, act } from 'react-test-renderer';

// expo-haptics can't construct its native EventEmitter in the bare test env
// (same mock as button.stateMorph.test.js) -- Button's primary variant fires
// a selection haptic on press, which this suite doesn't itself assert on.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import EmptyState from '../EmptyState';

describe('EmptyState busy', () => {
  test('idle: no spinner, primary action enabled', () => {
    const onAction = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <EmptyState
          icon="barbell-outline"
          title="No active plan yet"
          text="Start with a plan."
          actionLabel="Start with a plan"
          onAction={onAction}
          secondaryLabel="Browse plans"
          onSecondary={() => {}}
        />,
      );
    });

    expect(tree.root.findAllByType(ActivityIndicator).length).toBe(0);
    const primary = tree.root.findByProps({ accessibilityLabel: 'Start with a plan' });
    expect(primary.props.accessibilityState.disabled).toBe(false);
    expect(primary.props.accessibilityState.busy).toBe(false);
    // The label is still drawn in the idle phase.
    expect(JSON.stringify(tree.toJSON())).toContain('Start with a plan');
  });

  test('busy: primary action disabled, shows an inline ActivityIndicator, keeps its accessible label', () => {
    const onAction = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <EmptyState
          icon="barbell-outline"
          title="No active plan yet"
          text="Start with a plan."
          actionLabel="Start with a plan"
          onAction={onAction}
          busy
          secondaryLabel="Browse plans"
          onSecondary={() => {}}
        />,
      );
    });

    // One ActivityIndicator for the busy primary action, drawn in the
    // button's own foreground colour (theme tokens, not a hard-coded one).
    const indicators = tree.root.findAllByType(ActivityIndicator);
    expect(indicators.length).toBe(1);
    expect(typeof indicators[0].props.color).toBe('string');
    expect(indicators[0].props.color.length).toBeGreaterThan(0);

    // The visible label is replaced by the spinner in this phase, but the
    // accessible name (screen-reader announcement) stays the action label --
    // Button always derives accessibilityLabel from `title`, phase-independent.
    const primary = tree.root.findByProps({ accessibilityLabel: 'Start with a plan' });
    expect(primary.props.accessibilityState.disabled).toBe(true);
    expect(primary.props.accessibilityState.busy).toBe(true);
  });

  test('busy: the secondary action stays enabled', () => {
    const onSecondary = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <EmptyState
          icon="barbell-outline"
          title="No active plan yet"
          text="Start with a plan."
          actionLabel="Start with a plan"
          onAction={() => {}}
          busy
          secondaryLabel="Browse plans"
          onSecondary={onSecondary}
        />,
      );
    });

    const secondary = tree.root.findByProps({ accessibilityLabel: 'Browse plans' });
    expect(secondary.props.accessibilityState.disabled).toBe(false);
    expect(secondary.props.accessibilityState.busy).toBe(false);
    act(() => { secondary.props.onPress(); });
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});
