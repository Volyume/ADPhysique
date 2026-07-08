/**
 * CancelReasonSheet tests (COMP-025-A).
 *
 * Verifies the anti-dark-pattern contract: the store handoff is never gated
 * on answering, the reason enum is emitted only on handoff (not on "keep"),
 * free text appears for exactly two reasons and routes to user_feedback, and
 * "keep" emits nothing.
 *
 * Reduce-motion is forced via the store mock so BottomSheet mounts/unmounts
 * synchronously.
 */
import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});

const mockTrack = jest.fn(() => ({ catch: () => {} }));
const mockSubmitFeedback = jest.fn(() => ({ catch: () => {} }));
jest.mock('../../lib/telemetry', () => ({ track: (...a) => mockTrack(...a) }));
jest.mock('../../lib/feedback', () => ({ submitFeedback: (...a) => mockSubmitFeedback(...a) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));
const mockSetStatedReturn = jest.fn();
jest.mock('../../lib/payments/winbackState', () => ({ setStatedReturn: (...a) => mockSetStatedReturn(...a) }));

import CancelReasonSheet from '../CancelReasonSheet';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'CancelReasonSheet.js'), 'utf8');

function pressByLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  act(() => node.props.onPress());
}

function render(props = {}) {
  let tree;
  act(() => {
    tree = create(
      <CancelReasonSheet
        visible
        onClose={props.onClose || (() => {})}
        onStoreHandoff={props.onStoreHandoff || (() => {})}
        storeLabel={props.storeLabel || 'Google Play'}
        userId="u1"
        surface="pre_store_handoff"
      />,
    );
  });
  return tree;
}

beforeEach(() => {
  mockTrack.mockClear();
  mockSubmitFeedback.mockClear();
  mockSetStatedReturn.mockClear();
});

describe('CancelReasonSheet', () => {
  test('shows the question and all five reasons', () => {
    const tree = render();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Before you go");
    expect(json).toContain('It costs too much');
    expect(json).toContain("I wasn't using it enough");
    expect(json).toContain("It's missing something I need");
    expect(json).toContain("I'm switching to another app");
    expect(json).toContain("I'm taking a break from training");
  });

  test('store handoff is enabled and fires even with no reason selected (exit never gated)', () => {
    const onStoreHandoff = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onStoreHandoff, onClose });
    pressByLabel(tree, 'Continue to Google Play');
    expect(onStoreHandoff).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('store handoff label is supplied by the platform-specific parent', () => {
    const tree = render({ storeLabel: 'the App Store' });
    expect(JSON.stringify(tree.toJSON())).toContain('Continue to the App Store');
  });

  test('pause hint is store-neutral copy', () => {
    expect(SOURCE).toContain('Your subscription settings may also let you pause instead of cancel.');
    expect(SOURCE).not.toContain('Google Play also lets you pause your subscription instead');
  });

  test('selecting a reason then continuing emits cancel_reason_captured with the enum + surface', () => {
    const onStoreHandoff = jest.fn();
    const tree = render({ onStoreHandoff });
    pressByLabel(tree, 'It costs too much');
    pressByLabel(tree, 'Continue to Google Play');
    expect(mockTrack).toHaveBeenCalledWith('u1', 'cancel_reason_captured', {
      reason: 'price',
      surface: 'pre_store_handoff',
    });
    expect(onStoreHandoff).toHaveBeenCalledTimes(1);
  });

  test('"Keep my subscription" closes without telemetry or handoff', () => {
    const onStoreHandoff = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onStoreHandoff, onClose });
    pressByLabel(tree, 'It costs too much');
    pressByLabel(tree, 'Keep my subscription');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStoreHandoff).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('free text appears only for missing_feature / switching, not for price', () => {
    const tree = render();
    // No free-text field before any selection.
    expect(JSON.stringify(tree.toJSON())).not.toContain('What was missing?');
    pressByLabel(tree, 'It costs too much');
    expect(JSON.stringify(tree.toJSON())).not.toContain('What was missing?');
    pressByLabel(tree, "It's missing something I need");
    expect(JSON.stringify(tree.toJSON())).toContain('What was missing?');
    pressByLabel(tree, "I'm switching to another app");
    expect(JSON.stringify(tree.toJSON())).toContain('Which one?');
  });

  test('temporary_break reveals the break-window chips, and the choice is stored locally', () => {
    const tree = render();
    expect(JSON.stringify(tree.toJSON())).not.toContain("When do you think you'll be back?");
    pressByLabel(tree, "I'm taking a break from training");
    expect(JSON.stringify(tree.toJSON())).toContain("When do you think you'll be back?");
    pressByLabel(tree, '2-3 months');
    pressByLabel(tree, 'Continue to Google Play');
    expect(mockSetStatedReturn).toHaveBeenCalledWith('two_three_months');
    // The window is local-only — never in the telemetry payload.
    expect(mockTrack).toHaveBeenCalledWith('u1', 'cancel_reason_captured', {
      reason: 'temporary_break', surface: 'pre_store_handoff',
    });
  });

  test('switching away from temporary_break clears the break window', () => {
    const tree = render();
    pressByLabel(tree, "I'm taking a break from training");
    pressByLabel(tree, 'In a month');
    pressByLabel(tree, 'It costs too much'); // change of mind
    pressByLabel(tree, 'Continue to Google Play');
    expect(mockSetStatedReturn).not.toHaveBeenCalled();
  });

  test('free text routes to user_feedback (never telemetry payload)', () => {
    const tree = render();
    pressByLabel(tree, "It's missing something I need");
    const input = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'What was missing?' && typeof n.props.onChangeText === 'function',
    )[0];
    act(() => input.props.onChangeText('Apple Watch app'));
    pressByLabel(tree, 'Continue to Google Play');
    expect(mockSubmitFeedback).toHaveBeenCalledWith({
      trigger: 'cancel_reason',
      sentiment: 'missing_feature',
      message: 'Apple Watch app',
      userId: 'u1',
    });
    // The enum event carries no free text.
    expect(mockTrack).toHaveBeenCalledWith('u1', 'cancel_reason_captured', {
      reason: 'missing_feature',
      surface: 'pre_store_handoff',
    });
  });
});
