/**
 * COMP-019 Stage 1a, the time-window chip row shared by the hero charts
 * (weight trend, e1RM, weekly volume). One small, accessible control so the
 * three charts present windowing identically. Styling follows the in-house
 * precedent (VolumeHeatmapScreen's rolling-window selector).
 */
import { View, StyleSheet } from 'react-native';
import Chip from './Chip';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

export default function WindowChips({ windows, selectedKey, onSelect, accessibilityPrefix = 'time window' }) {
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
            style={styles.chip}
            labelStyle={[styles.chipText, live.chipText]}
            selectedLabelStyle={[styles.chipTextActive, live.chipTextActive]}
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
    minHeight: 44, // 44pt touch target
  },
  chipText: { ...type.label, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. row/chip have no colour tokens.
function buildLiveStyles(t) {
  return {
    chipText: { ...t.type.label, color: t.colors.textSecondary },
    chipTextActive: { color: t.colors.primary },
  };
}
