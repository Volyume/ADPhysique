import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, hitSlop } from '../styles/theme';
import useTheme from '../hooks/useTheme';

function CloseButton({ onClose, style, iconColor }) {
  return (
    <TouchableOpacity
      style={style}
      onPress={onClose}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel="Close"
    >
      <Ionicons name="close" size={24} color={iconColor} />
    </TouchableOpacity>
  );
}

export default function ModalHeader({ title, onClose, closePosition = 'right', rightAccessory = null }) {
  // CP-10 stage 1: live theme instead of the static colors/type imports —
  // one of the three sanctioned screen chrome shapes (docs/rules/
  // styling.md), so this covers modal chrome for every screen at once.
  const t = useTheme();
  const closeButton = <CloseButton onClose={onClose} style={styles.side} iconColor={t.colors.textPrimary} />;
  const rightSlot = rightAccessory ? <View style={styles.side}>{rightAccessory}</View> : <View style={styles.side} />;

  return (
    <View style={[styles.header, { borderBottomColor: t.colors.borderSubtle }]}>
      {closePosition === 'left' ? closeButton : <View style={styles.side} />}
      <Text maxFontSizeMultiplier={1.3} style={[styles.title, { ...t.type.title, color: t.colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
      {closePosition === 'left' ? rightSlot : closeButton}
    </View>
  );
}

// Layout-only (theme-invariant): border colour / text colour / type role now
// come from the live theme per-render above (CP-10 stage 1) so ModalHeader
// follows a theme flip with no restart.
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
});
