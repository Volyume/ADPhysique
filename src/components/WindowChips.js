/**
 * COMP-019 Stage 1a, the time-window chip row shared by the hero charts
 * (weight trend, e1RM, weekly volume). One small, accessible control so the
 * three charts present windowing identically. Styling follows the in-house
 * precedent (VolumeHeatmapScreen's rolling-window selector).
 *
 * `inkSelected` (D214 addendum 9, census 6.2 and H4): the selected chip is
 * drawn in ink, a `textPrimary` label on a `surface3` fill with a
 * `textPrimary` border, instead of the Chip's own amber. The rule it keeps:
 * amber is never on a fact, and one amber sits on a screen, on the thing to
 * do. A selected chip is a control state, so the ONE control that changes
 * what the whole screen shows keeps the Chip's amber (the default), and a
 * second control on the same screen, such as a card's own window, passes this.
 * Off by default, so every other caller is unchanged.
 */
import { View, StyleSheet } from 'react-native';
import Chip from './Chip';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { touchTarget } from '../styles/layout';

export default function WindowChips({
  windows, selectedKey, onSelect, accessibilityPrefix = 'time window', inkSelected = false,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {windows.map((w) => {
        const active = w.key === selectedKey;
        return (
          <Chip
            key={w.key}
            label={w.label}
            selected={active}
            onPress={() => onSelect(w.key)}
            accessibilityRole="tab"
            accessibilityLabel={`${accessibilityPrefix}: ${w.label}`}
            style={[styles.chip, active && inkSelected && styles.chipInkSelected, active && inkSelected && live.chipInkSelected]}
            labelStyle={[styles.chipText, live.chipText]}
            selectedLabelStyle={inkSelected
              ? [styles.chipTextInkSelected, live.chipTextInkSelected]
              : [styles.chipTextActive, live.chipTextActive]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.minimum, // 44pt touch target
  },
  chipText: { ...type.label, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  // The ink-selected variant: no amber on a control that does not change what
  // the screen shows.
  chipInkSelected: { backgroundColor: colors.surface3, borderColor: colors.textPrimary },
  chipTextInkSelected: { color: colors.textPrimary },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. row/chip have no colour tokens.
function buildLiveStyles(t) {
  return {
    chipText: { ...t.type.label, color: t.colors.textSecondary },
    chipTextActive: { color: t.colors.primary },
    chipInkSelected: { backgroundColor: t.colors.surface3, borderColor: t.colors.textPrimary },
    chipTextInkSelected: { color: t.colors.textPrimary },
  };
}
