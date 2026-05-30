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

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  style,
}) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  const dec = () => onChange?.(clamp(value - step));
  const inc = () => onChange?.(clamp(value + step));
  const atMin = value <= min;
  const atMax = value >= max;
  const display = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ''}`;

  return (
    <View style={[styles.row, style]}>
      <PressableCard
        onPress={dec}
        disabled={atMin}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        style={[styles.btn, atMin && styles.btnDisabled]}
      >
        <Ionicons name="remove" size={20} color={atMin ? colors.textDisabled : colors.textPrimary} />
      </PressableCard>
      <Text style={styles.value} accessibilityLabel={`${label} ${display}`}>{display}</Text>
      <PressableCard
        onPress={inc}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        style={[styles.btn, atMax && styles.btnDisabled]}
      >
        <Ionicons name="add" size={20} color={atMax ? colors.textDisabled : colors.textPrimary} />
      </PressableCard>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  btnDisabled: { opacity: 0.5 },
  value: {
    minWidth: 56,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
