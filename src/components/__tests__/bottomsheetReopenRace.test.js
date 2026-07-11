/**
 * BottomSheet — fast close-then-reopen regression (founder device bug:
 * Meal Builder -> Preferences -> Dietary Needs would not reopen after being
 * closed once).
 *
 * Root cause: on a real device dismiss() drives an ANIMATED close that
 * completes some time after BottomSheet.js's effect returns (the shared
 * __mocks__/@gorhom/bottom-sheet.js mock used by every other BottomSheet
 * test is deliberately synchronous, so it cannot exercise this race -- see
 * that file's own header). If the consumer flips `visible` back to true
 * before that animation settles (tap to close, tap again to reopen, both
 * inside the close animation's duration), the effect in BottomSheet.js
 * already calls present() for the reopen, but the STALE dismiss from the
 * first close finishes some renders later and used to unconditionally
 * unmount, stomping the just-reopened sheet with no further onClose to
 * recover from (the consumer's `visible` is already true).
 *
 * This suite mocks @gorhom/bottom-sheet locally with a DEFERRED dismiss
 * (present()/dismiss() flip the mounted state immediately, matching every
 * other test's expectations about what's on screen, but onDismiss --
 * mirroring the real library's animation-completion callback -- only fires
 * when the test explicitly triggers it via `__triggerPendingDismiss`),
 * always reading the LATEST onDismiss prop at trigger time as the real
 * library does (BottomSheetModal.tsx recreates its internal `unmount`
 * callback whenever the `onDismiss` prop identity changes, and the
 * reanimated close-animation callback always resolves to the fresh
 * closure at the point the animation actually finishes).
 */
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');

  function passthrough(name) {
    const Comp = React.forwardRef(({ children, ...props }, ref) => (
      React.createElement(name, { ...props, ref }, children)
    ));
    Comp.displayName = name;
    return Comp;
  }

  const BottomSheetView = passthrough('BottomSheetView');
  const BottomSheetScrollView = passthrough('BottomSheetScrollView');
  const { TextInput: RNTextInput } = require('react-native');
  const BottomSheetTextInput = RNTextInput;
  const BottomSheetHandle = passthrough('BottomSheetHandle');
  const BottomSheetBackdrop = passthrough('BottomSheetBackdrop');

  function BottomSheetModalProvider({ children }) {
    return React.createElement(React.Fragment, null, children);
  }

  // Module-scope so the test file can trigger it from outside the tree.
  let latestOnDismissRef = { current: null };
  let latestSetPresentedRef = { current: null };
  let dismissPending = false;

  const BottomSheetModal = React.forwardRef(function BottomSheetModal(props, ref) {
    const { children, onDismiss } = props;
    const [presented, setPresented] = React.useState(false);
    const presentedRef = React.useRef(false);
    presentedRef.current = presented;

    // Mirrors the real library always resolving the freshest onDismiss
    // closure (and the setter that actually flips the sheet off-screen) at
    // the moment its close animation actually completes.
    latestOnDismissRef.current = onDismiss;
    latestSetPresentedRef.current = setPresented;

    React.useImperativeHandle(ref, () => ({
      present: () => setPresented(true),
      // Mirrors the REAL library: dismiss() starts the close ANIMATION but
      // does not itself unmount -- the real BottomSheetModal keeps
      // `mount: true` for the whole animation and only flips it false (and
      // fires onDismiss) when the animation actually finishes, via its own
      // internal `unmount()`. That later, unconditional flip -- not this
      // call -- is what the reopen race is about, so `presented` is left
      // untouched here; only a pending-completion flag is set.
      dismiss: () => {
        if (presentedRef.current) {
          dismissPending = true;
        }
      },
      close: () => setPresented(false),
      minimize: () => {},
      restore: () => {},
      expand: () => {},
      collapse: () => {},
      snapToIndex: () => {},
      snapToPosition: () => {},
      forceClose: () => {
        if (presentedRef.current) {
          dismissPending = true;
        }
      },
    }), []);

    if (!presented) return null;

    return React.createElement(
      'BottomSheetModal',
      props,
      props.backdropComponent ? props.backdropComponent({}) : null,
      typeof children === 'function' ? children({}) : children,
    );
  });
  BottomSheetModal.displayName = 'BottomSheetModal';

  return {
    __esModule: true,
    default: BottomSheetModal,
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetView,
    BottomSheetScrollView,
    BottomSheetTextInput,
    BottomSheetHandle,
    BottomSheetBackdrop,
    useBottomSheetModal: () => ({ dismiss: () => {}, dismissAll: () => {} }),
    // Test-only: simulates the close animation settling at an arbitrary
    // later point -- same order as the real library's own `unmount()`
    // (BottomSheetModal.tsx): flip the mounted state off UNCONDITIONALLY
    // first, then fire the (freshest) onDismiss. No-op if no dismiss() call
    // is outstanding.
    __triggerPendingDismiss: () => {
      if (!dismissPending) return;
      dismissPending = false;
      latestSetPresentedRef.current?.(false);
      latestOnDismissRef.current?.();
    },
  };
});

const { useState } = require('react');
const { Text } = require('react-native');
const { create, act } = require('react-test-renderer');
const { __triggerPendingDismiss } = require('@gorhom/bottom-sheet');

const storeState = { accessibility: { reduceMotion: true } };
jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector(storeState);
  return { __esModule: true, default: fn };
});

const BottomSheet = require('../BottomSheet').default;

describe('BottomSheet — fast close-then-reopen (stale animated dismiss race)', () => {
  test('reopening before the close animation settles survives the stale dismiss completing afterwards', () => {
    // Same shape as every real call site (e.g. MealPlanScreen's
    // dietarySheet): a boolean owned by the consumer, onClose flips it
    // false, a row/chip flips it true again -- ONE BottomSheet instance
    // throughout, matching how a real screen never remounts the sheet
    // between opens.
    function Host() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <BottomSheet visible={visible} onClose={() => setVisible(false)}>
            <Text>Dietary needs body</Text>
          </BottomSheet>
          <Text testID="reopen-trigger" onPress={() => setVisible(true)}>reopen</Text>
        </>
      );
    }

    let tree;
    act(() => { tree = create(<Host />); });
    expect(JSON.stringify(tree.toJSON())).toContain('Dietary needs body');

    // Close (backdrop tap, the same synchronous path a hardware-back or a
    // future Done button also takes): BottomSheet.js's effect calls
    // dismiss(). The mock's dismiss(), like the real library, only starts
    // the close animation -- content stays mounted until it actually
    // settles some time later.
    const backdrop = tree.root.findByProps({ accessibilityLabel: 'Close' });
    act(() => { backdrop.props.onPress(); });

    // Reopen BEFORE the stale dismiss's animation has settled -- the exact
    // founder scenario (tap Dietary needs again right after closing it).
    const reopenTrigger = tree.root.findByProps({ testID: 'reopen-trigger' });
    act(() => { reopenTrigger.props.onPress(); });
    expect(JSON.stringify(tree.toJSON())).toContain('Dietary needs body');

    // The FIRST close's animation now finally completes and fires its
    // (freshest) onDismiss -- mirroring the real library, this ALSO
    // unconditionally flips the sheet's own mounted state off first,
    // regardless of the reopen that happened in between. Pre-fix,
    // BottomSheet.js's handleDismiss just consumed the suppression flag and
    // did nothing further, leaving the sheet unmounted with no further
    // onClose to correct the consumer's now-stale "open" belief --
    // reproducing the reported "tap Dietary needs again and nothing
    // happens". Post-fix, it notices `visible` is still true and calls
    // present() again.
    act(() => { __triggerPendingDismiss(); });
    expect(JSON.stringify(tree.toJSON())).toContain('Dietary needs body');
  });
});
