/**
 * Stepper
 *
 * A numeric +/- control with one consistent look, extracted from the
 * SetEntry pattern so the other numeric inputs (set counts, reminder hours,
 * recipe servings) stop reinventing their own minus/plus buttons.
 *
 * Controlled: pass `value` (number) + `onChange(next)`. Clamps to
 * [min, max] and steps by `step`. The centre shows the value (and optional
 * `unit`); pass `formatValue` to override the display.
 */

import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from './PressableCard';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

export default function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit,
  formatValue,
  label = 'value',
  decreaseLabel,
  increaseLabel,
  valueLabel,
  size = 'md',
  hitSlop,
  style,
}) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  const dec = () => onChange?.(clamp(value - step));
  const inc = () => onChange?.(clamp(value + step));
  const atMin = value <= min;
  const atMax = value >= max;
  const display = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ''}`;
  const sizeStyle = SIZES[size] || SIZES.md;
  const isCompact = size === 'compact';

  return (
    <View style={[styles.row, { gap: sizeStyle.gap }, isCompact && styles.rowCompact, style]}>
      <PressableCard
        onPress={dec}
        disabled={atMin}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel || `Decrease ${label}`}
        accessibilityState={{ disabled: atMin }}
        style={[styles.btn, isCompact && styles.btnCompact, atMin && styles.btnDisabled]}
      >
        <Ionicons
          name="remove"
          size={sizeStyle.icon}
          color={atMin ? colors.textDisabled : colors.textPrimary}
        />
      </PressableCard>
      <Text
        style={[
          styles.value,
          {
            minWidth: sizeStyle.valueMinWidth,
            fontSize: sizeStyle.fontSize,
          },
        ]}
        accessibilityLabel={valueLabel || `${label} ${display}`}
      >
        {display}
      </Text>
      <PressableCard
        onPress={inc}
        disabled={atMax}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={increaseLabel || `Increase ${label}`}
        accessibilityState={{ disabled: atMax }}
        style={[styles.btn, isCompact && styles.btnCompact, atMax && styles.btnDisabled]}
      >
        <Ionicons
          name="add"
          size={sizeStyle.icon}
          color={atMax ? colors.textDisabled : colors.textPrimary}
        />
      </PressableCard>
    </View>
  );
}

const SIZES = {
  md: { icon: 20, valueMinWidth: 56, fontSize: fontSize.lg, gap: spacing.md },
  compact: { icon: 16, valueMinWidth: 32, fontSize: fontSize.sm, gap: 0 },
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowCompact: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: {
    width: 30,
    height: 34,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  btnDisabled: { opacity: 0.5 },
  value: {
    textAlign: 'center',
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
