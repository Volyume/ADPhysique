/**
 * Chip
 *
 * A single selectable pill with one selected treatment (amber fill +
 * border), used for "pick one / pick some" choices. Replaces the per-screen
 * goal / phase / protein / day-hour chip styling the audit found drifting.
 *
 * Pass `selected` + `onPress`. `icon` is an optional leading Ionicons name.
 */

import { Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from './PressableCard';
import { colors, spacing, radius, type } from '../styles/theme';

export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  // 'button' for a plain toggle; pass 'radio' for single-select groups so
  // assistive tech announces the chosen-one-of-many semantics.
  accessibilityRole = 'button',
  accessibilityLabel,
  style,
  labelStyle,
  selectedLabelStyle,
  numberOfLines,
  testID,
}) {
  const accessibilityState = accessibilityRole === 'radio'
    ? { checked: selected, disabled }
    : { selected, disabled };

  return (
    <PressableCard
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={accessibilityState}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled, style]}
      testID={testID}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.primary : colors.textMuted}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={[styles.label, labelStyle, selected && styles.labelSelected, selected && selectedLabelStyle]}
        numberOfLines={numberOfLines}
      >
        {label}
      </Text>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  chipDisabled: { opacity: 0.5 },
  icon: { marginRight: spacing.xs },
  label: { ...type.label, color: colors.textSecondary },
  labelSelected: { color: colors.primary },
});
