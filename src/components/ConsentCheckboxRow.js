import { Pressable, View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type } from '../styles/theme';

export default function ConsentCheckboxRow({
  checked,
  onPress,
  label,
  accessibilityLabel = label,
  disabled = false,
  variant = 'inline',
  size = 'sm',
  style,
  labelStyle,
}) {
  const compact = size === 'sm';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        variant === 'card' && styles.card,
        compact ? styles.rowSm : styles.rowMd,
        style,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked, disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[
        styles.checkbox,
        compact ? styles.checkboxSm : styles.checkboxMd,
        checked && styles.checkboxChecked,
      ]}>
        {checked ? (
          <Ionicons
            name="checkmark"
            size={compact ? 13 : 18}
            color={colors.onPrimary}
          />
        ) : null}
      </View>
      <Text style={[
        styles.label,
        compact ? styles.labelSm : styles.labelMd,
        labelStyle,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSm: {
    gap: spacing.sm,
  },
  rowMd: {
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.55 },
  checkbox: {
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSm: {
    width: 22,
    height: 22,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface2,
  },
  checkboxMd: {
    width: 24,
    height: 24,
    borderColor: colors.border,
    marginTop: spacing.hair,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFill,
  },
  label: {
    flex: 1,
    color: colors.textPrimary,
  },
  labelSm: {
    ...type.label,
  },
  labelMd: {
    ...type.bodySm,
  },
});
