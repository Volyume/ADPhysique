import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type, hitSlop } from '../styles/theme';

function CloseButton({ onClose, style }) {
  return (
    <TouchableOpacity
      style={style}
      onPress={onClose}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel="Close"
    >
      <Ionicons name="close" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

export default function ModalHeader({ title, onClose, closePosition = 'right', rightAccessory = null }) {
  const closeButton = <CloseButton onClose={onClose} style={styles.side} />;
  const rightSlot = rightAccessory ? <View style={styles.side}>{rightAccessory}</View> : <View style={styles.side} />;

  return (
    <View style={styles.header}>
      {closePosition === 'left' ? closeButton : <View style={styles.side} />}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {closePosition === 'left' ? rightSlot : closeButton}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  side: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    ...type.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
});
