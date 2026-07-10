import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// Equal-width segmented control: a bordered track with pill segments, the
// selected one filled amber. Shared by the onboarding wizard and the coached
// builder for short choices (training days, session length) so the two flows
// read as one product. Options are { label, value }; value is matched against
// the current `value` prop.
export default function SegmentedControl({ options, value, onChange, accessibilityLabel }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.row, live.row]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.segment, active && [styles.segmentActive, live.segmentActive]]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.segmentText, live.segmentText, active && [styles.segmentTextActive, live.segmentTextActive]]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: 3,
  },
  segment: {
    flex: 1, paddingVertical: spacing.sm + 2,
    alignItems: 'center', borderRadius: radius.sm - 2,
  },
  segmentActive: { backgroundColor: colors.primaryFill },
  segmentText: { ...type.label, color: colors.textMuted },
  segmentTextActive: { color: colors.onPrimary },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    row: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    segmentActive: { backgroundColor: t.colors.primaryFill },
    segmentText: { ...t.type.label, color: t.colors.textMuted },
    segmentTextActive: { color: t.colors.onPrimary },
  };
}
