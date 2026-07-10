import { Pressable, View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  // Consent surface: style-token change only, no copy/logic touched.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const compact = size === 'sm';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        variant === 'card' && [styles.card, live.card],
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
        compact ? [styles.checkboxSm, live.checkboxSm] : [styles.checkboxMd, live.checkboxMd],
        checked && [styles.checkboxChecked, live.checkboxChecked],
      ]}>
        {checked ? (
          <Ionicons
            name="checkmark"
            size={compact ? 13 : 18}
            color={t.colors.onPrimary}
          />
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[
        styles.label,
        live.label,
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

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. row/rowSm/rowMd/pressed/disabled/checkbox/
// labelSm/labelMd have no colour tokens.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    checkboxSm: { borderColor: t.colors.borderLight, backgroundColor: t.colors.surface2 },
    checkboxMd: { borderColor: t.colors.border },
    checkboxChecked: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryFill },
    label: { color: t.colors.textPrimary },
  };
}
