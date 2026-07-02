import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, type } from '../styles/theme';

export default function InfoTooltip({ text, size = 14 }) {
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
        <Ionicons name="information-circle-outline" size={size} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.box} pointerEvents="box-none" accessible accessibilityRole="text">
            <Text style={styles.text}>{text}</Text>
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
