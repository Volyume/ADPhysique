/**
 * BottomSheet — gesture-dismiss poison + settle-open zombie (founder device
 * walk, build 2698, R2-15/R2-16).
 *
 * Two distinct failures, one shared root: BottomSheet.js's prop->imperative
 * sync used to assume it was the only party ever closing the modal.
 *
 * 1. POISON ("the set-type menu slides a centimetre then never opens
 *    again"): after a GESTURE dismiss the library has already unmounted the
 *    modal and told us via onDismiss -> onClose. When the consumer then
 *    flips `visible` false, the old effect called dismiss() AGAIN on the
 *    unmounted modal. gorhom v5's dismiss() (BottomSheetModal.tsx) falls
 *    through in that state and strands statusRef at DISMISSING with no
 *    animation left to resolve it; the next present() mounts into the
 *    poisoned status and jams. The mock below mirrors that machine: a
 *    dismiss() while not presented poisons the modal and present() then
 *    refuses.
 *
 * 2. ZOMBIE ("the intent sheet re-appeared over the live workout and taps
 *    did nothing"): a dismiss() fired while the present animation is still
 *    running can LOSE the race - the mount spring supersedes the forceClose
 *    and the sheet settles fully open while the consumer's `visible` is
 *    already false. Nothing inside the sheet can recover it (the consumer's
 *    state is already closed). BottomSheet now listens to onChange: settling
 *    at an OPEN index while `visible` is false re-asserts the dismiss. The
 *    mock models the lost race by dropping one dismiss() on request.
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
  const BottomSheetBackdrop = passthrough('BottomSheetBackdrop');

  function BottomSheetModalProvider({ children }) {
    return React.createElement(React.Fragment, null, children);
  }

  const state = {
    poisoned: false,
    dropNextDismiss: false,
    dismissCalls: 0,
    latestOnDismiss: { current: null },
    latestOnChange: { current: null },
    latestSetPresented: { current: null },
    presentedRef: { current: false },
  };

  const BottomSheetModal = React.forwardRef(function BottomSheetModal(props, ref) {
    const { children, onDismiss, onChange } = props;
    const [presented, setPresented] = React.useState(false);
    state.presentedRef.current = presented;
    state.latestOnDismiss.current = onDismiss;
    state.latestOnChange.current = onChange;
    state.latestSetPresented.current = setPresented;

    React.useImperativeHandle(ref, () => ({
      // Mirrors v5: presenting into a poisoned (stranded-DISMISSING) status
      // machine jams instead of opening.
      present: () => { if (!state.poisoned) setPresented(true); },
      dismiss: () => {
        state.dismissCalls += 1;
        if (state.dropNextDismiss) { state.dropNextDismiss = false; return; }
        if (state.presentedRef.current) {
          setPresented(false);
          state.latestOnDismiss.current?.();
        } else {
          // dismiss() on a non-presented modal: v5 strands statusRef at
          // DISMISSING - every later present() is dead.
          state.poisoned = true;
        }
      },
      close: () => setPresented(false),
      minimize: () => {}, restore: () => {}, expand: () => {}, collapse: () => {},
      snapToIndex: () => {}, snapToPosition: () => {}, forceClose: () => {},
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
    BottomSheetBackdrop,
    useBottomSheetModal: () => ({ dismiss: () => {}, dismissAll: () => {} }),
    // Library-initiated close (pan gesture): the modal unmounts itself and
    // THEN reports onDismiss - our component is second to know.
    __gestureDismiss: () => {
      state.latestSetPresented.current?.(false);
      state.latestOnDismiss.current?.();
    },
    // The sheet's animation settles at an open index (the lost-race zombie).
    __settleOpen: () => { state.latestOnChange.current?.(0); },
    __mockState: state,
  };
});

const { useState } = require('react');
const { Text } = require('react-native');
const { create, act } = require('react-test-renderer');
const { __gestureDismiss, __settleOpen, __mockState } = require('@gorhom/bottom-sheet');

const storeState = { accessibility: { reduceMotion: true } };
jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector(storeState);
  return { __esModule: true, default: fn };
});

const BottomSheet = require('../BottomSheet').default;

function Host({ initiallyVisible = true }) {
  const [visible, setVisible] = useState(initiallyVisible);
  return (
    <>
      <BottomSheet visible={visible} onClose={() => setVisible(false)}>
        <Text>Sheet body</Text>
      </BottomSheet>
      <Text testID="open-trigger" onPress={() => setVisible(true)}>open</Text>
      <Text testID="close-trigger" onPress={() => setVisible(false)}>close</Text>
    </>
  );
}

beforeEach(() => {
  __mockState.poisoned = false;
  __mockState.dropNextDismiss = false;
  __mockState.dismissCalls = 0;
});

describe('BottomSheet — gesture-dismiss must not poison the next open (R2-16)', () => {
  test('swipe-close then reopen: no redundant dismiss(), and the sheet opens again', () => {
    let tree;
    act(() => { tree = create(<Host />); });
    expect(JSON.stringify(tree.toJSON())).toContain('Sheet body');

    // User swipes the sheet down: the library closes itself and reports it.
    act(() => { __gestureDismiss(); });
    // onClose flipped the consumer's `visible` false; the component must NOT
    // have followed up with a dismiss() on the already-unmounted modal.
    expect(__mockState.dismissCalls).toBe(0);
    expect(__mockState.poisoned).toBe(false);
    expect(JSON.stringify(tree.toJSON())).not.toContain('Sheet body');

    // Reopen: with no poison, present() works and the sheet is back.
    const open = tree.root.findByProps({ testID: 'open-trigger' });
    act(() => { open.props.onPress(); });
    expect(JSON.stringify(tree.toJSON())).toContain('Sheet body');
  });
});

describe('BottomSheet — a dismiss that loses the present race is re-asserted (R2-15)', () => {
  test('sheet settling open while visible is false dismisses again instead of lingering', () => {
    let tree;
    act(() => { tree = create(<Host />); });
    expect(JSON.stringify(tree.toJSON())).toContain('Sheet body');

    // The consumer closes while the present animation is running, and the
    // library drops that dismiss (mount spring wins the race).
    __mockState.dropNextDismiss = true;
    const close = tree.root.findByProps({ testID: 'close-trigger' });
    act(() => { close.props.onPress(); });
    // The lost race: sheet is still fully presented on screen.
    expect(JSON.stringify(tree.toJSON())).toContain('Sheet body');

    // The animation settles at an open index; the component notices the
    // consumer wants it closed and dismisses again - this one is honoured.
    act(() => { __settleOpen(); });
    expect(JSON.stringify(tree.toJSON())).not.toContain('Sheet body');
    expect(__mockState.poisoned).toBe(false);
  });
});
