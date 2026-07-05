/**
 * COMP-019 Stage 1a, the time-window chip row shared by the hero charts
 * (weight trend, e1RM, weekly volume). One small, accessible control so the
 * three charts present windowing identically. Styling follows the in-house
 * precedent (VolumeHeatmapScreen's rolling-window selector).
 */
import { View, StyleSheet } from 'react-native';
import Chip from './Chip';
import { colors, spacing, type } from '../styles/theme';

export default function WindowChips({ windows, selectedKey, onSelect, accessibilityPrefix = 'time window' }) {
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
            labelStyle={styles.chipText}
            selectedLabelStyle={styles.chipTextActive}
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
