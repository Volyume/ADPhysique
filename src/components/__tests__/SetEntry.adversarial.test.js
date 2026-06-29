/**
 * ADVERSARIAL probes for the exercise_type axis in SetEntry.
 *
 * The shipped SetEntry.exerciseType.test.js checks which FIELDS render per
 * schema but never checks that the estimated-1RM hint (a weight x reps
 * artefact) is suppressed for non-load schemas. For a DISTANCE set,
 * value.weight holds metres and value.reps holds seconds, so a leaked
 * calculate1RM call would print a nonsensical "Est. max" on a running set.
 */
import { create, act } from 'react-test-renderer';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import SetEntry from '../SetEntry';

function textContains(tree, substr) {
  return tree.root
    .findAll(node => typeof node.type === 'string' && node.type === 'Text')
    .some(node => {
      const kids = Array.isArray(node.props.children)
        ? node.props.children.join('')
        : String(node.props.children ?? '');
      return kids.includes(substr);
    });
}

describe('SetEntry — no bogus Est. max on non-load schemas', () => {
  test('a DISTANCE set (metres in weight, seconds in reps) shows NO Est. max', () => {
    let tree;
    act(() => {
      // 5000 m, 1200 s — would be calculate1RM(5000, 20-clamped) = a huge number.
      tree = create(
        <SetEntry value={{ weight: 5000, reps: 1200, isGhost: false }}
                  onChange={() => {}} exerciseType="distance" />,
      );
    });
    expect(textContains(tree, 'Est. max')).toBe(false);
  });

  test('a DURATION set (seconds in reps) shows NO Est. max', () => {
    let tree;
    act(() => {
      tree = create(
        <SetEntry value={{ weight: 0, reps: 600, isGhost: false }}
                  onChange={() => {}} exerciseType="duration" />,
      );
    });
    expect(textContains(tree, 'Est. max')).toBe(false);
  });

  test('a REPS_ONLY set with a stray weight value shows NO Est. max', () => {
    // reps_only hides the weight field, but if a stray weight survives in the
    // value object the Reps block still renders and the e1rm hint must stay off.
    let tree;
    act(() => {
      tree = create(
        <SetEntry value={{ weight: 80, reps: 12, isGhost: false }}
                  onChange={() => {}} exerciseType="reps_only" />,
      );
    });
    expect(textContains(tree, 'Est. max')).toBe(false);
  });

  test('control: a weight_reps set DOES show Est. max', () => {
    let tree;
    act(() => {
      tree = create(
        <SetEntry value={{ weight: 100, reps: 5, isGhost: false }}
                  onChange={() => {}} exerciseType="weight_reps" />,
      );
    });
    expect(textContains(tree, 'Est. max')).toBe(true);
  });
});
