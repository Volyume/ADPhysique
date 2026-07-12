/**
 * BottomSheet
 *
 * One sheet chrome for the app: scrim backdrop, slide-up panel, drag
 * handle, tap-outside + hardware-back dismiss, reduce-motion aware, and
 * a screen-reader-modal panel. Extracted from the hand-rolled sheets the
 * audit found duplicated 6 times (QuickAdd, FoodDetail, MacroBreakdown,
 * Feedback, WhatsNew, PeekMenu) so backdrop darkness and slide timing stop
 * drifting.
 *
 * D24 item 2 (design/UX leveling slate, 2026-07-10): now a thin wrapper over
 * @gorhom/bottom-sheet's BottomSheetModal instead of a hand-rolled RN
 * `Modal` + `Animated`. The public contract below (props, semantics) is
 * UNCHANGED from the pre-D24 component on purpose — every one of the 17
 * consumer files needs zero changes. What changes under the hood: real
 * gesture-driven swipe-to-dismiss, dynamic content sizing (no more manual
 * window-height maths beyond the outer cap), and a native-feeling backdrop.
 *
 * Controlled by `visible` + `onClose`, same as before: callers just flip
 * their own boolean, this component drives the library's imperative
 * present()/dismiss() from that prop. Two dismissal paths keep their
 * PRE-EXISTING synchronous timing (onClose fires at the moment of the tap,
 * before any close animation, exactly like the old Modal's onRequestClose):
 * backdrop tap and the Android hardware back button are both wired to call
 * `onClose` directly here, not through the library's animate-then-callback
 * onDismiss. The one genuinely NEW dismissal path — swiping the sheet down —
 * has no old synchronous contract to preserve (it did not exist before), so
 * it fires `onClose` via the library's onDismiss, after the close animation,
 * which is the normal/expected timing for a gesture dismiss.
 *
 * `dismissingFromPropRef` exists purely to stop that same onDismiss firing a
 * SECOND time when `visible` flips to false because the consumer already
 * called `onClose` themselves (the overwhelming majority of closes: a
 * "Done"/"Keep"/"Got it" button inside the sheet body calls the consumer's
 * own onClose directly, this component never sees that call, it only sees
 * `visible` become false afterwards and animates the panel out).
 *
 * D36c (TalkBack sheet isolation, 2026-07-10): the limitation noted above
 * (@gorhom/bottom-sheet's portal render skips Android's automatic
 * background-window isolation a raw RN Modal gives for free) is now fixed
 * app-wide. This component reports its own visible/mounted state to the
 * shared module-level open-sheet counter in `../lib/sheetA11yIsolation`;
 * RootNavigator wraps the app's screen container with that counter (via
 * `useAnySheetOpen`) and hides it from TalkBack/VoiceOver while any sheet is
 * open, restoring it the moment the count returns to zero. See
 * sheetA11yIsolation.js's header for the full design (why a module-level
 * counter, why not a boolean, why the wrapper never hides the sheet itself).
 */

import { useCallback, useEffect, useMemo, useRef, createContext } from 'react';

// Any TextField rendered inside a sheet must use gorhom's own
// BottomSheetTextInput (library requirement): a plain TextInput inside a
// dynamically-sized sheet fights the keyboard for focus on Android and the
// keyboard dismisses after every keystroke (founder-reported, 2026-07-10).
// TextField consumes this context to pick the right input primitive.
export const InsideBottomSheetContext = createContext(false);
import { BackHandler, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import {
  BottomSheetModal, BottomSheetView, BottomSheetScrollView, BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAppStore from '../store/useAppStore';
import { incrementOpenSheets, decrementOpenSheets } from '../lib/sheetA11yIsolation';
import { colors, spacing, radius, motion } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// Zero-duration spring config: the library accepts a WithSpringConfig or
// WithTimingConfig for every internal animation (mount, snap, forceClose).
// A near-zero duration collapses them all to instant, matching the old
// component's reduce-motion branch (synchronous mount/unmount, no tween).
const REDUCE_MOTION_CONFIG = { duration: 0 };

export default function BottomSheet({
  visible,
  onClose,
  children,
  // Set false to hide the grab handle (e.g. a menu that fills to the edge).
  showHandle = true,
  // Lift the panel above the keyboard for sheets with text inputs.
  keyboardAvoiding = false,
  // Long sheets opt into an internal scroll area instead of overflowing.
  scroll = false,
  // Extra style merged onto the sheet panel background.
  sheetStyle,
  contentContainerStyle,
  accessibilityLabel,
}) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const modalRef = useRef(null);

  // Same cap the old component used: min 360, else 92% of window height, so
  // a long sheet never runs edge-to-edge off the top of the screen.
  const maxDynamicContentSize = Math.max(360, Math.round((Number(windowHeight) || 760) * 0.92));
  const numericScrollMaxHeight = Math.max(280, maxDynamicContentSize - 96);
  const bottomPadding = Math.max(spacing.xxl + spacing.md, insets.bottom + spacing.lg);

  // Tracks the PREVIOUS `visible` value so present()/dismiss() are only
  // called on a genuine transition, never redundantly on first mount when
  // visible starts false (see the file header for why this matters — a
  // stale suppression flag would otherwise swallow a real later dismiss).
  const prevVisibleRef = useRef(visible);
  // Set just before this component itself calls dismiss() in reaction to
  // `visible` becoming false, so the resulting onDismiss knows the consumer
  // already knows the sheet is closing (see file header).
  const dismissingFromPropRef = useRef(false);
  // Whether THIS component believes the modal is currently presented (set on
  // present(), cleared when the library reports onDismiss). R2-16 (founder
  // device walk, build 2698): after a GESTURE dismiss the library has already
  // unmounted the modal and told us via onDismiss -> onClose; when the
  // consumer then flips `visible` false, the old code called dismiss() AGAIN
  // on the unmounted modal. gorhom v5's dismiss() falls through in that state
  // and strands its internal status at DISMISSING with no animation left to
  // resolve it - the NEXT present() mounts into that poisoned status and the
  // sheet jams a sliver above the bottom edge, then never opens again. Gate
  // the prop-driven dismiss() on actually being presented.
  const presentedRef = useRef(false);
  // Latest `visible` for callbacks the library may invoke with a stale
  // closure (onChange below).
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const was = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (visible) {
      presentedRef.current = true;
      modalRef.current?.present();
    } else if (was && presentedRef.current) {
      dismissingFromPropRef.current = true;
      modalRef.current?.dismiss();
    }
  }, [visible]);

  // D36c (TalkBack sheet isolation): mirrors this sheet's real open/closed
  // state into the shared module-level counter (../lib/sheetA11yIsolation),
  // kept as its OWN effect, independent from the present()/dismiss() sync
  // above, so a future change to either can never affect the other's
  // correctness. `countedRef` tracks whether THIS instance currently holds
  // an increment, so a fast reopen (visible true -> false -> true) can never
  // double-count, and the cleanup effect below can never leak a stale
  // increment on unmount-while-open.
  const countedRef = useRef(false);
  useEffect(() => {
    if (visible && !countedRef.current) {
      countedRef.current = true;
      incrementOpenSheets();
    } else if (!visible && countedRef.current) {
      countedRef.current = false;
      decrementOpenSheets();
    }
  }, [visible]);

  // Unmount-while-open: a plain cleanup-only effect (empty deps) so this
  // runs exactly once, on unmount, and reads `countedRef`'s value AT that
  // moment rather than depending on `visible` (which the effect above
  // already reacts to for every other transition).
  useEffect(() => () => {
    if (countedRef.current) {
      countedRef.current = false;
      decrementOpenSheets();
    }
  }, []);

  // The ONE path where the library, not the consumer, is first to know the
  // sheet closed: the user dragged it down. Every other close reaches here
  // with dismissingFromPropRef already set (see above) and is a no-op.
  //
  // Reopen-after-fast-close bug (founder device report): on a real device
  // dismiss() drives an animated close that finishes some time AFTER this
  // function returns, not synchronously (only the reduce-motion/test-mock
  // path is instant). If the consumer flips `visible` back to true before
  // that animation settles -- e.g. tap "Dietary needs" to close, then tap
  // it again to reopen, both well within the close animation's duration --
  // the effect above already called present() for the reopen, but the
  // ORIGINAL dismiss's animation is still in flight underneath it. When
  // that stale animation finally completes, the library calls this same
  // onDismiss and unconditionally unmounts, silently stomping the sheet
  // that was just reopened: the sheet then looks like it refuses to open
  // again, with no error and no further onClose firing (the current
  // `visible` is already true, so there is nothing left to flip it back).
  // Re-presenting here when that happens (`visible` is true again by the
  // time this stale dismiss resolves) closes that race without touching
  // the synchronous-close contract every other call site already relies on.
  const handleDismiss = useCallback(() => {
    presentedRef.current = false;
    if (dismissingFromPropRef.current) {
      dismissingFromPropRef.current = false;
      if (visible) {
        presentedRef.current = true;
        modalRef.current?.present();
      }
      return;
    }
    onClose?.();
  }, [onClose, visible]);

  // R2-15 (founder device walk, build 2698: the pre-workout intent sheet
  // re-appeared OVER the live session and would not respond to taps): a
  // dismiss() fired while the mount/present animation is still running can
  // LOSE that race - the mount spring supersedes the forceClose and the
  // sheet settles fully open while the consumer's `visible` is already
  // false. Taps inside it then no-op (the consumer's state is already
  // closed, so its onClose flips nothing) and only the pan gesture works.
  // onChange fires whenever the sheet settles at an index: settling OPEN
  // while the consumer wants it CLOSED means exactly that lost race, so
  // re-assert the consumer's state and dismiss again.
  const handleChange = useCallback((index) => {
    if (index >= 0 && !visibleRef.current && presentedRef.current) {
      dismissingFromPropRef.current = true;
      modalRef.current?.dismiss();
    }
  }, []);

  // Backdrop tap: call onClose directly, synchronously, the same instant as
  // the old Pressable's onPress — never wait for the library's own close
  // animation to complete first (that would delay any consumer side effect,
  // e.g. PostLapseSheet's one-time markLapseSheetShown, until after the
  // panel finishes sliding away).
  const handleBackdropPress = useCallback(() => { onClose?.(); }, [onClose]);

  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={1}
      pressBehavior="close"
      onPress={handleBackdropPress}
      accessibilityLabel="Close"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: t.colors.scrim }]}
    />
  ), [handleBackdropPress, t.colors.scrim]);

  // Android hardware back button: the old RN `Modal`'s onRequestClose hooked
  // into this automatically. BottomSheetModal is a JS portal, not a native
  // Modal, so it has no such hook — wire it explicitly, same synchronous
  // onClose-before-animation timing as the backdrop above.
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const animationConfigs = useMemo(
    () => (reduceMotion ? REDUCE_MOTION_CONFIG : motion.springs.settle),
    [reduceMotion],
  );

  // The handle's own container carries the top gap when it's shown (see
  // `styles.handleWrap`, applied via `handleStyle` below). When the handle is
  // hidden that container still renders (just empty — see NoHandle's own
  // comment) but drops its style along with the drawn bar, so the content
  // needs its OWN top gap here to avoid content sitting flush under the
  // sheet's rounded top edge.
  const topPadding = showHandle ? 0 : spacing.sm;

  const Body = scroll ? BottomSheetScrollView : BottomSheetView;
  const bodyProps = scroll
    ? {
      style: [styles.scroll, { maxHeight: numericScrollMaxHeight }],
      contentContainerStyle: [
        styles.scrollContent,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
        contentContainerStyle,
      ],
      showsVerticalScrollIndicator: true,
      nestedScrollEnabled: true,
      keyboardShouldPersistTaps: 'handled',
    }
    : {
      style: [styles.body, { paddingTop: topPadding, paddingBottom: bottomPadding }, contentContainerStyle],
    };

  return (
    <BottomSheetModal
      ref={modalRef}
      enableDynamicSizing
      maxDynamicContentSize={maxDynamicContentSize}
      enablePanDownToClose
      animateOnMount={!reduceMotion}
      animationConfigs={animationConfigs}
      onDismiss={handleDismiss}
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      handleComponent={showHandle ? undefined : NoHandle}
      handleIndicatorStyle={[styles.handleIndicator, live.handleIndicator]}
      handleStyle={styles.handleWrap}
      backgroundStyle={[styles.sheetBackground, live.sheetBackground, sheetStyle]}
      keyboardBehavior={keyboardAvoiding ? 'interactive' : 'extend'}
      android_keyboardInputMode={keyboardAvoiding ? 'adjustResize' : 'adjustPan'}
      accessibilityLabel={accessibilityLabel}
    >
      <Body {...bodyProps}>
        <InsideBottomSheetContext.Provider value>
          {children}
        </InsideBottomSheetContext.Provider>
      </Body>
    </BottomSheetModal>
  );
}

// A stable no-op so `showHandle={false}` hides the grab bar without handing
// the library a new function identity (and therefore a remount) every render.
// The library still renders the handle's layout container around whatever
// this returns (null, here), which is why `topPadding` above compensates on
// the content side rather than relying on `handleStyle` in this branch.
function NoHandle() { return null; }

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handleWrap: {
    paddingTop: spacing.sm,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: radius.hair,
    backgroundColor: colors.border,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  // Do not use flex: 1 here (see the pre-D24 note this replaces): the sheet
  // panel is content-sized, a flex child can collapse to a tiny strip on
  // Android. numericScrollMaxHeight gives long sheets a stable viewport.
  scroll: { alignSelf: 'stretch', flexShrink: 1 },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles -- the
// component calls `const t = useTheme(); const live = buildLiveStyles(t);`
// and appends `live.KEY` after `styles.KEY` in each style array. Only
// mirrors the colour-bearing sub-properties of the matching frozen style,
// at identical rest values; handleWrap/body/scroll/scrollContent have no
// colour tokens at all, so there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    sheetBackground: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    handleIndicator: { backgroundColor: t.colors.border },
  };
}
