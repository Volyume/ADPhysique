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

  // Phase 2B (founder ruling, physical-device screenshots): routine
  // estimated-max copy is removed from EVERY schema, weight_reps included -
  // the old control test inverted. The stronger absence law supersedes the
  // per-schema gating this suite originally attacked: no schema can show a
  // bogus estimate when none shows one at all. Record detection lives on
  // through the recordLine/PR system, pinned elsewhere.
  test('control inverted: a weight_reps set no longer shows routine Est. max either', () => {
    let tree;
    act(() => {
      tree = create(
        <SetEntry value={{ weight: 100, reps: 5, isGhost: false }}
                  onChange={() => {}} exerciseType="weight_reps" />,
      );
    });
    expect(textContains(tree, 'Est. max')).toBe(false);
  });
});
