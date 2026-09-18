/**
 * COMP-019 Stage 1a, the time-window chip row shared by the hero charts
 * (weight trend, e1RM, weekly volume). One small, accessible control so the
 * three charts present windowing identically. Styling follows the in-house
 * precedent (VolumeHeatmapScreen's rolling-window selector).
 *
 * D192 (2026-09-18, finish spec section 4 point 6 / items 1b+2f): rebuilt as
 * ONE segmented control -- a single hairline-edged pill, four equal cells
 * divided by hairlines, the selected cell a surface3 fill -- replacing the
 * four separate Chip pills this used to render with gaps between them. Both
 * consumers (ExerciseDetailScreen's strength-trend period control and
 * BodyMetricsScreen's own weight-trend period control) share this one
 * component, so restyling it once covers both; VolumeHeatmapScreen's volume-
 * trend window picker also renders through it and inherits the same control.
 * Same props, same state, same onSelect handler as before.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

export default function WindowChips({ windows, selectedKey, onSelect, accessibilityPrefix = 'time window' }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.row, live.row]} accessibilityRole="radiogroup">
      {windows.map((w, i) => {
        const active = w.key === selectedKey;
        return (
          <TouchableOpacity
            key={w.key}
            onPress={() => onSelect(w.key)}
            accessibilityRole="radio"
            accessibilityLabel={`${accessibilityPrefix}: ${w.label}`}
            accessibilityState={{ selected: active }}
            // The 36 dp control sits under the 44/48 dp touch-target
            // guidance (AX-05); a vertical-only hitSlop restores a
            // comfortable target without widening the visual pill or
            // creating horizontal overlap with the neighbouring cell.
            hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
            style={[
              styles.cell,
              i > 0 && [styles.cellDivider, live.cellDivider],
              active && [styles.cellActive, live.cellActive],
            ]}
          >
            <Text style={[styles.label, live.label, active && [styles.labelActive, live.labelActive]]}>
              {w.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  cellActive: {
    backgroundColor: colors.surface3,
  },
  label: { ...type.label, color: colors.textSecondary },
  labelActive: { color: colors.textPrimary },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. `cell` has no colour token (pure layout).
function buildLiveStyles(t) {
  return {
    row: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    cellDivider: { borderLeftColor: t.colors.border },
    cellActive: { backgroundColor: t.colors.surface3 },
    label: { ...t.type.label, color: t.colors.textSecondary },
    labelActive: { color: t.colors.textPrimary },
  };
}
