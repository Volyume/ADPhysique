/**
 * BottomSheet
 *
 * One sheet chrome for the app: scrim backdrop, slide-up panel, drag
 * handle, tap-outside + hardware-back dismiss, reduce-motion aware, and
 * accessibilityViewIsModal. Extracted from the hand-rolled sheets the audit
 * found duplicated 6 times (QuickAdd, FoodDetail, MacroBreakdown,
 * Feedback, WhatsNew, PeekMenu) so backdrop darkness and slide timing stop
 * drifting.
 *
 * Controlled by `visible` + `onClose`. The exit animation runs before
 * onClose fires, so callers just flip their visibility state. Children are
 * the sheet body; the chrome supplies the panel, handle, and padding.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Modal, Animated, Easing, Pressable, View, StyleSheet, Platform, Keyboard,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAppStore from '../store/useAppStore';
import { colors, spacing, radius, motion } from '../styles/theme';

const OPEN_MS = motion.sheet;
const CLOSE_MS = motion.state;
const BACKDROP_OPEN_MS = motion.state;
const BACKDROP_CLOSE_MS = motion.state; // was 160; retime approved 2026-07-02 (03b)
const OFFSCREEN = 700;

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
  // Extra style merged onto the sheet panel.
  sheetStyle,
  contentContainerStyle,
  accessibilityLabel,
}) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // The sheet is a Modal anchored to the PHYSICAL screen bottom, it
  // overlays the tab band, so nothing absorbs the system inset for it.
  // Every consumer gets this for free (edge-to-edge sweep, 2026-07-03).
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : OFFSCREEN)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  // Keep the Modal mounted through the exit animation: mirror `visible`
  // into local state that only flips off after the slide-out completes.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(reduceMotion ? 0 : OFFSCREEN);
      backdrop.setValue(reduceMotion ? 1 : 0);
      if (!reduceMotion) {
        Animated.parallel([
          Animated.timing(backdrop, { toValue: 1, duration: BACKDROP_OPEN_MS, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: OPEN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      }
    } else if (mounted) {
      // Animate out, then unmount.
      if (reduceMotion) {
        setMounted(false);
      } else {
        Animated.parallel([
          Animated.timing(backdrop, { toValue: 0, duration: BACKDROP_CLOSE_MS, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: OFFSCREEN, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]).start(() => setMounted(false));
      }
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function requestClose() {
    Keyboard.dismiss();
    onClose?.();
  }

  if (!mounted) return null;

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : children;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>
      <KeyboardAvoidingView
        style={styles.anchor}
        pointerEvents="box-none"
        behavior={keyboardAvoiding && Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(spacing.xxl + spacing.md, insets.bottom + spacing.lg) },
            sheetStyle,
            { transform: [{ translateY }] },
          ]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
        >
          {showHandle ? <View style={styles.handle} /> : null}
          {body}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  anchor: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.md,
    gap: spacing.md,
    maxHeight: '92%',
  },
  scroll: { alignSelf: 'stretch', flexShrink: 1 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.sm },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.hair,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
});
