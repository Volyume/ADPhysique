import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

export default function InfoTooltip({ text, size = 14 }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
