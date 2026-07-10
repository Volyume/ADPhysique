import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
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
  return (
    <>
      <TouchableOpacity
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
      <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={[styles.overlay, live.overlay]}
          activeOpacity={1}
          onPress={() => setVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={[styles.box, live.box]} pointerEvents="box-none" accessible accessibilityRole="text">
            <Text maxFontSizeMultiplier={1.3} style={[styles.text, live.text]}>{text}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { justifyContent: 'center', alignItems: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 320,
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
    overlay: { backgroundColor: t.colors.scrim },
    box: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    text: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
