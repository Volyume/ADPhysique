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
 *
 * Optional extras (D230 R14, the diary's water row): `onDecreaseLongPress`
 * and `onIncreaseLongPress` give each button a hold action (a bigger step),
 * and `onValuePress` makes the centre value a control of its own (the water
 * row opens its target picker there), spoken as `valuePressLabel` and also
 * offered to a screen reader as the adjustable's activate action, since the
 * adjustable container hides its children from TalkBack. Absent (every
 * other caller), the control renders exactly as before.
 *
 * `centre` (D230 R8, the add sheet's amount): a node rendered in place of
 * the value, for a caller whose centre is a typed field. The row then stops
 * being one adjustable (an adjustable hides its children from a screen
 * reader, which would hide the field): the two buttons keep their own
 * labels and the field is reached as itself. Absent, nothing changes.
 */

import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from './PressableCard';
import { colors, fontWeight, spacing, radius, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { touchTarget } from '../styles/layout';

// AX-15: compact button is 30x34dp. 8dp uniform hit slop on every edge
// brings the effective touch target to 46x50dp (>= the 44x44 minimum in
// both axes) without growing the visible icon or value text. Matches the
// same value already used ad hoc by two call sites (BuildWorkoutScreen.js,
// ManualBuilderScreen's STEPPER_HIT_SLOP) -- promoted here as the default so
// every compact Stepper gets it, not only the ones that remembered to ask.
const COMPACT_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

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
  onDecreaseLongPress,
  onIncreaseLongPress,
  onValuePress,
  valuePressLabel,
  centre = null,
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
  // AX-15: the compact button is a deliberately small 30x34dp visible
  // affordance (keeps the whole control dense next to a settings row/value),
  // but that left its touch target below the 44x44 minimum with no hit slop
  // to make up the difference. Default hit slop on this size only; a
  // caller-supplied hitSlop still wins (see rowCompact's matching padding
  // below -- RN never lets hitSlop reach past the immediate parent's own
  // bounds, so the parent has to make room for it).
  const effectiveHitSlop = hitSlop ?? (isCompact ? COMPACT_HIT_SLOP : undefined);

  const handleAccessibilityAction = (event) => {
    if (event.nativeEvent.actionName === 'increment') {
      if (!atMax) inc();
    } else if (event.nativeEvent.actionName === 'decrement') {
      if (!atMin) dec();
    } else if (event.nativeEvent.actionName === 'activate' && onValuePress) {
      onValuePress();
    }
  };
  const accessibilityActions = onValuePress
    ? [{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: valuePressLabel }]
    : [{ name: 'increment' }, { name: 'decrement' }];
  const valueText = (
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
      // A pressable value fills the space between the buttons and may wrap
      // at the largest text sizes rather than clip its own figure.
      numberOfLines={onValuePress ? 2 : 1}
    >
      {display}
    </Text>
  );

  return (
    <View
      // With a `centre` node the row is not one adjustable: its children (the
      // two buttons and the caller's field) are each reached as themselves.
      accessible={!centre}
      accessibilityRole={centre ? undefined : 'adjustable'}
      accessibilityLabel={centre ? undefined : label}
      accessibilityValue={centre ? undefined : { text: String(display) }}
      accessibilityActions={centre ? undefined : accessibilityActions}
      onAccessibilityAction={centre ? undefined : handleAccessibilityAction}
      style={[styles.row, { gap: sizeStyle.gap }, isCompact && [styles.rowCompact, live.rowCompact], style]}
    >
      <PressableCard
        onPress={dec}
        onLongPress={onDecreaseLongPress}
        disabled={atMin}
        hitSlop={effectiveHitSlop}
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
      {centre ? (
        <View style={styles.centreSlot}>{centre}</View>
      ) : onValuePress ? (
        <PressableCard
          onPress={onValuePress}
          accessibilityRole="button"
          accessibilityLabel={valuePressLabel}
          style={styles.valuePress}
        >
          {valueText}
        </PressableCard>
      ) : valueText}
      <PressableCard
        onPress={inc}
        onLongPress={onIncreaseLongPress}
        disabled={atMax}
        hitSlop={effectiveHitSlop}
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
    // AX-15: React Native hitSlop is clipped at the nearest parent's own
    // layout bounds ("the touch area never extends past the parent view
    // bounds", Libraries/Components/View/ViewPropTypes.js) -- this row is
    // the buttons' immediate parent, so it must carry padding matching
    // COMPACT_HIT_SLOP or the hit slop above silently does nothing. Grows
    // the pill's outer padding, not the button/icon/value inside it.
    padding: 8,
  },
  btn: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
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
  // `centre` only: the caller's node fills the space between the buttons.
  centreSlot: { flex: 1, minWidth: touchTarget.minimum * 2, justifyContent: 'center' },
  // onValuePress only: the value is a full-height control between the two
  // buttons.
  valuePress: {
    flex: 1,
    minHeight: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    textAlign: 'center',
    fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
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
