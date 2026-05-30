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

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Animated, Easing, Pressable, View, StyleSheet, Platform, Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import useAppStore from '../store/useAppStore';
import { colors, spacing, radius } from '../styles/theme';

const OPEN_MS = 260;
const CLOSE_MS = 200;
const BACKDROP_OPEN_MS = 200;
const BACKDROP_CLOSE_MS = 160;
const OFFSCREEN = 700;

export default function BottomSheet({
  visible,
  onClose,
  children,
  // Set false to hide the grab handle (e.g. a menu that fills to the edge).
  showHandle = true,
  // Lift the panel above the keyboard for sheets with text inputs.
  keyboardAvoiding = false,
  // Extra style merged onto the sheet panel.
  sheetStyle,
  accessibilityLabel,
}) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
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
          style={[styles.sheet, sheetStyle, { transform: [{ translateY }] }]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
        >
          {showHandle ? <View style={styles.handle} /> : null}
          {children}
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
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
});
