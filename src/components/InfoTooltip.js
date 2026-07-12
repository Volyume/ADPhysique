import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, AccessibilityInfo, findNodeHandle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import { colors, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

export default function InfoTooltip({ text, size = 14 }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const [visible, setVisible] = useState(false);
  // AX-01 (launch accessibility audit, 2026-07-12): refs for screen-reader
  // focus management. triggerRef holds the small info glyph so focus can
  // return to it on close; contentRef holds the explanation text so focus
  // moves INTO the dialog (and reads the explanation) on open.
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  // Best-effort SR focus move; guarded because findNodeHandle returns null
  // off a native host (e.g. under react-test-renderer) and both platforms
  // may no-op if a gesture already owns focus.
  const focusNode = useCallback((ref) => {
    try {
      const node = findNodeHandle(ref.current);
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    } catch (_) { /* best-effort, never throw into render */ }
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    // Restore focus to the trigger once the modal has torn down, so a screen
    // reader lands back where the user was instead of the top of the screen.
    setTimeout(() => focusNode(triggerRef), 50);
  }, [focusNode]);

  // On open, once the modal has mounted, pull screen-reader focus into the
  // dialog so the explanation is read rather than left behind the backdrop.
  useEffect(() => {
    if (!visible) return undefined;
    const id = setTimeout(() => focusNode(contentRef), 50);
    return () => clearTimeout(id);
  }, [visible, focusNode]);

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        onPress={() => setVisible(true)}
        // U-F-2/U-F-5 (M1): reach the ≥44px WCAG/iOS target via hitSlop so the
        // touch region grows invisibly (no layout reflow) around the small glyph.
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel="More information"
      >
        <Ionicons name="information-circle-outline" size={size} color={t.colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={close}>
        {/* AX-01: the backdrop and the dialog are SIBLINGS inside this plain
            (non-accessible) layout container, never parent/child. An accessible
            parent wrapping the card would group/suppress its descendants on
            iOS VoiceOver, exposing only a single "Close, button" node and
            hiding the explanation. Keeping them siblings, plus
            accessibilityViewIsModal on the dialog, leaves the explanation and
            the Close control as independently reachable nodes. Mirrors the
            proven AppAlert.js semantics. */}
        <View style={styles.overlay}>
          <TouchableOpacity
            style={[styles.backdrop, live.backdrop]}
            activeOpacity={1}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close explanation"
          />
          <View style={[styles.box, live.box]} accessibilityViewIsModal>
            <TouchableOpacity
              onPress={close}
              style={styles.close}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={t.colors.textMuted} />
            </TouchableOpacity>
            <Text ref={contentRef} style={[styles.text, live.text]}>{text}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { justifyContent: 'center', alignItems: 'center' },
  // Non-interactive layout container: centres the dialog and hosts the
  // backdrop + dialog as siblings. Carries no scrim tint or accessibility
  // props itself (the backdrop below owns the tint and the dismiss control),
  // so it never becomes a grouping accessibility node.
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  // Full-screen dismiss control, a sibling BEHIND the dialog (earlier in the
  // tree = rendered under it). Tapping anywhere outside the card dismisses,
  // exactly as before; tapping the card itself is a no-op (the card is not a
  // responder and does not fall through to this backdrop).
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 320,
  },
  // Real, visible 44x44 Close control inside the dialog (in addition to the
  // backdrop tap). Negative margins pull it into the card's top-right corner
  // so it hugs the corner without enlarging the card, while the touch target
  // stays a full 44x44 (plus hitSlop).
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
    marginBottom: spacing.xs,
  },
  text: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    backdrop: { backgroundColor: t.colors.scrim },
    box: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    text: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
