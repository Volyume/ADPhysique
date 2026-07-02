/**
 * COMP-019 Stage 1a — the time-window chip row shared by the hero charts
 * (weight trend, e1RM, weekly volume). One small, accessible control so the
 * three charts present windowing identically. Styling follows the in-house
 * precedent (VolumeHeatmapScreen's rolling-window selector).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, type, withAlpha, alpha } from '../styles/theme';

export default function WindowChips({ windows, selectedKey, onSelect, accessibilityPrefix = 'time window' }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {windows.map((w) => {
        const active = w.key === selectedKey;
        return (
          <TouchableOpacity
            key={w.key}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
            onPress={() => onSelect(w.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${accessibilityPrefix}: ${w.label}`}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{w.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // 44pt touch target
  },
  chipIdle: { borderColor: colors.border, backgroundColor: 'transparent' },
  chipActive: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, alpha.tint) },
  chipText: { ...type.label, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});
