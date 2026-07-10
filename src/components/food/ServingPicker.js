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
import { View, StyleSheet } from 'react-native';
import TextField from '../TextField';
import Chip from '../Chip';
import { colors, spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import * as haptics from '../../lib/haptics';

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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const list = units.length > 0 ? units : DEFAULT_UNITS;
  return (
    <View style={styles.row} accessibilityLabel="Serving size">
      <TextField
        containerStyle={styles.inputContainer}
        fieldStyle={[styles.inputField, live.inputField]}
        inputStyle={styles.input}
        value={String(quantity ?? '')}
        onChangeText={onChangeQuantity}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={t.colors.textMuted}
        accessibilityLabel="Quantity"
      />
      <View style={styles.units}>
        {list.map(u => {
          const active = u === unit;
          return (
            <Chip
              key={u}
              label={u}
              selected={active}
              onPress={() => { haptics.selection(); onChangeUnit(u); }}
              accessibilityRole="radio"
              accessibilityLabel={`Unit: ${u}`}
              style={styles.unit}
            />
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
  inputContainer: {
    flex: 1,
  },
  inputField: {
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  input: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  units: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unit: {
    paddingHorizontal: spacing.sm,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    inputField: { backgroundColor: t.colors.surface },
  };
}
