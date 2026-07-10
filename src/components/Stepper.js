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
import { colors, fontWeight, spacing, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';

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
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const clamp = (n) => Math.max(min, Math.min(max, n));
  const dec = () => onChange?.(clamp(value - step));
  const inc = () => onChange?.(clamp(value + step));
  const atMin = value <= min;
  const atMax = value >= max;
  const display = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ''}`;
  const SIZES = buildSizes(t.fontSize);
  const sizeStyle = SIZES[size] || SIZES.md;
  const isCompact = size === 'compact';

  return (
    <View style={[styles.row, { gap: sizeStyle.gap }, isCompact && [styles.rowCompact, live.rowCompact], style]}>
      <PressableCard
        onPress={dec}
        disabled={atMin}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel || `Decrease ${label}`}
        accessibilityState={{ disabled: atMin }}
        style={[styles.btn, live.btn, isCompact && styles.btnCompact, atMin && styles.btnDisabled]}
      >
        <Ionicons
          name="remove"
          size={sizeStyle.icon}
          color={atMin ? t.colors.textDisabled : t.colors.textPrimary}
        />
      </PressableCard>
      <Text
        style={[
          styles.value,
          live.value,
          {
            minWidth: sizeStyle.valueMinWidth,
            fontSize: sizeStyle.fontSize,
          },
        ]}
        accessibilityLabel={valueLabel || `${label} ${display}`}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
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
        style={[styles.btn, live.btn, isCompact && styles.btnCompact, atMax && styles.btnDisabled]}
      >
        <Ionicons
          name="add"
          size={sizeStyle.icon}
          color={atMax ? t.colors.textDisabled : t.colors.textPrimary}
        />
      </PressableCard>
    </View>
  );
}

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): SIZES was
// a module-scope const baking fontSize.* at import time (class 2, CP-10 plan
// section 1.4) -- frozen until an app restart, so Larger text would not
// resize an already-mounted Stepper. Same fix as Button.js/TextField.js's
// own buildSizes: built per-render from the live theme's fontSize table
// inside the component, above. No frozen twin kept: this map was
// file-private and untested.
function buildSizes(fs) {
  return {
    md: { icon: 20, valueMinWidth: 56, fontSize: fs.lg, gap: spacing.md },
    compact: { icon: 16, valueMinWidth: 32, fontSize: fs.sm, gap: 0 },
  };
}

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

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles. btnCompact/
// btnDisabled/row have no colour tokens, so there is nothing to unfreeze for
// them.
function buildLiveStyles(t) {
  return {
    rowCompact: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    btn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    value: { color: t.colors.textPrimary },
  };
}
