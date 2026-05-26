/**
 * ServingPicker: quantity input with unit toggle.
 *
 * Spec: UI_FLOWS_LOCKED.md lines 18-28 (component list),
 *   line 144 ("Serving picker: numeric input + unit dropdown
 *   (g, oz, slice, cup, whatever the food provides)").
 *
 * Standalone component so FoodDetailSheet, AddCustomFoodScreen,
 * and any future surface (saved meals, recipes) share the same
 * input pattern.
 */
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';

const DEFAULT_UNITS = ['g', 'oz'];

/**
 * @param {Object} props
 * @param {number|string} props.quantity
 * @param {string} props.unit
 * @param {string[]} [props.units] - options to toggle through
 * @param {(q: string) => void} props.onChangeQuantity
 * @param {(u: string) => void} props.onChangeUnit
 */
export default function ServingPicker({
  quantity,
  unit,
  units = DEFAULT_UNITS,
  onChangeQuantity,
  onChangeUnit,
}) {
  const list = units.length > 0 ? units : DEFAULT_UNITS;
  return (
    <View style={styles.row} accessibilityLabel="Serving size">
      <TextInput
        style={styles.input}
        value={String(quantity ?? '')}
        onChangeText={onChangeQuantity}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Quantity"
      />
      <View style={styles.units}>
        {list.map(u => {
          const active = u === unit;
          return (
            <Pressable
              key={u}
              onPress={() => onChangeUnit(u)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Unit: ${u}`}
              hitSlop={6}
              style={[styles.unit, active && styles.unitActive]}
            >
              <Text style={[styles.unitText, active && styles.unitTextActive]}>{u}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontVariant: ['tabular-nums'],
  },
  units: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  unit: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm - 1,
  },
  unitActive: {
    backgroundColor: colors.primary,
  },
  unitText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  unitTextActive: {
    color: '#0D0D0D',
    fontWeight: fontWeight.bold,
  },
});
