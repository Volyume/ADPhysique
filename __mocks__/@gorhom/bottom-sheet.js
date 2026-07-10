// Manual mock for @gorhom/bottom-sheet (D24 item 2: adopted behind
// src/components/BottomSheet.js). The real library is a gesture-handler +
// Reanimated portal; none of that matters to our unit tests, which only
// assert the wrapper's contract (present/dismiss, onDismiss firing, props
// passed through to the content). Rendered as plain host elements, no
// animation, mirroring the project's reduce-motion-in-tests convention (see
// __mocks__/react-native-reanimated.js) — every present()/dismiss() call
// here is synchronous.
//
// Mapped in via package.json jest.moduleNameMapper rather than an
// automatic node_modules-relative __mocks__ folder, matching every other
// manual mock in this directory.

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
const BottomSheetHandle = passthrough('BottomSheetHandle');

// Renders as a plain pressable-shaped host node carrying whatever onPress /
// accessibility props BottomSheet.js supplies (it wires its own onPress —
// see the "Close" accessibilityLabel convention carried over from the old
// hand-rolled component — so the mock does not need to simulate the real
// library's pressBehavior/close() plumbing).
const BottomSheetBackdrop = passthrough('BottomSheetBackdrop');

function BottomSheetModalProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

const BottomSheetModal = React.forwardRef(function BottomSheetModal(props, ref) {
  const { children, onDismiss } = props;
  const [presented, setPresented] = React.useState(false);
  const presentedRef = React.useRef(false);
  presentedRef.current = presented;

  React.useImperativeHandle(ref, () => ({
    present: () => setPresented(true),
    dismiss: () => {
      // Real library semantics: dismiss() only fires onDismiss when it
      // actually transitions an open sheet to closed — calling it again on
      // an already-closed sheet is a silent no-op. BottomSheet.js's
      // "self-initiated" suppression relies on this being exactly-once.
      if (presentedRef.current) {
        setPresented(false);
        onDismiss?.();
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
        setPresented(false);
        onDismiss?.();
      }
    },
  }), [onDismiss]);

  if (!presented) return null;

  return React.createElement(
    'BottomSheetModal',
    props,
    props.backdropComponent ? props.backdropComponent({}) : null,
    typeof children === 'function' ? children({}) : children,
  );
});
BottomSheetModal.displayName = 'BottomSheetModal';

module.exports = {
  __esModule: true,
  default: BottomSheetModal,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetHandle,
  BottomSheetBackdrop,
  useBottomSheetModal: () => ({ dismiss: () => {}, dismissAll: () => {} }),
};
