import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type, hitSlop } from '../styles/theme';

export default function ModalHeader({ title, onClose }) {
  return (
    <View style={styles.header}>
      <View style={styles.side} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <TouchableOpacity
        style={styles.side}
        onPress={onClose}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  side: {
    width: 24,
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
