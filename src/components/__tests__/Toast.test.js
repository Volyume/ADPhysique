/**
 * Regression for the founder QA bug (2026-06-16): a delete "Undo" toast
 * stayed on screen until tapped instead of auto-dismissing.
 *
 * Root cause: dismiss() only cleared the toast inside the out-animation's
 * completion callback. With useNativeDriver, that callback can fail to fire
 * when the animation is interrupted (e.g. a tab navigation), leaving the
 * dismissed toast pinned until the user taps it.
 *
 * This test simulates the callback never firing (Animated.parallel().start
 * swallows its callback) and asserts the toast still clears after its window.
 */
import { useEffect } from 'react';
import { Animated } from 'react-native';
import { create, act } from 'react-test-renderer';

import { ToastProvider, useToast } from '../Toast';

function Trigger({ message, opts }) {
  const { show } = useToast();
  useEffect(() => { show(message, opts); }, [message, opts, show]);
  return null;
}

function text(tree) {
  return JSON.stringify(tree.toJSON());
}

describe('Toast auto-dismiss (QA repro)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  test('an undo toast disappears after its window even if the animation callback never fires', () => {
    // Simulate the real-world failure: the out-animation's completion callback
    // is never invoked (interrupted native animation).
    jest.spyOn(Animated, 'parallel').mockImplementation(() => ({ start: () => {} }));

    let tree;
    act(() => {
      tree = create(
        <ToastProvider>
          <Trigger message="Olive oil deleted." opts={{ variant: 'undo', action: { label: 'Undo', onPress: () => {} } }} />
        </ToastProvider>,
      );
    });
    act(() => { jest.advanceTimersByTime(50); });
    expect(text(tree)).toContain('Olive oil deleted');

    // Past the 8s undo window + the dismissal fallback.
    act(() => { jest.advanceTimersByTime(9000); });
    expect(text(tree)).not.toContain('Olive oil deleted');
  });
});
