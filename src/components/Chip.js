/**
 * Chip
 *
 * A single selectable pill with one selected treatment (amber fill +
 * border), used for "pick one / pick some" choices. Replaces the per-screen
 * goal / phase / protein / day-hour chip styling the audit found drifting.
 *
 * Pass `selected` + `onPress`. `icon` is an optional leading Ionicons name.
 */

import { Platform, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from './PressableCard';
import { spacing, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';

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
  // Launch accessibility audit AX-05 (2026-07-12): this used to default to
  // 1.3 so a row of chips could not blow past its container, silently
  // reintroducing the app-wide 1.3x cap EP-14 removed everywhere else and
  // denying low-vision users their requested text size on 49 call sites. No
  // default now -- the label scales with the system like every other Text.
  // A caller with a genuinely fixed-geometry need may still pass its own
  // value; none currently do.
  maxFontSizeMultiplier,
  testID,
}) {
  // CP-10 stage 1: live theme (src/hooks/useTheme.js) instead of the static
  // colors/type imports, so Chip re-renders correctly on a theme change.
  const t = useTheme();
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
      style={[
        styles.chip,
        { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
        selected && { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
        disabled && styles.chipDisabled,
        style,
      ]}
      testID={testID}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? t.colors.primary : t.colors.textMuted}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          { ...t.type.label, color: t.colors.textSecondary },
          labelStyle,
          selected && { color: t.colors.primary },
          selected && selectedLabelStyle,
        ]}
        numberOfLines={numberOfLines}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {label}
      </Text>
    </PressableCard>
  );
}

// Layout-only (theme-invariant): backgroundColor / borderColor / the type
// role + text colour now come from the live theme per-render above (CP-10
// stage 1) so Chip follows a theme flip with no restart.
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    // AX-05: base geometry (18px label line + 8dp vertical padding) was
    // ~36dp tall, under the 44dp minimum target size, before any large-text
    // growth. minHeight keeps the label vertically centred at default text
    // (unchanged look) and lets the chip grow taller instead of clipping
    // once Dynamic Type/system scaling pushes the label past this height.
    // Android's touch-target guidance is 48dp; iOS is 44dp.
    minHeight: Platform.select({ android: 48, default: 44 }),
  },
  chipDisabled: { opacity: 0.5 },
  icon: { marginRight: spacing.xs },
  label: {},
});
