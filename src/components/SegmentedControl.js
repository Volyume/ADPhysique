import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// Equal-width segmented control: a bordered track with pill segments, the
// selected one filled. Shared by the onboarding wizard and the coached
// builder for short choices (training days, session length) so the two flows
// read as one product. Options are { label, value }; value is matched against
// the current `value` prop.
//
// D174 A2 (2026-09-15): the selected segment was a solid `primaryFill` amber
// block. A segmented control chooses a VIEW, which is not "now", so it is
// outside amber discipline 1's ceiling. Selection is now a `surface3` fill,
// the `textPrimary` ink at the semibold face and a `borderLight` edge -- three
// differences where the amber version had fill and ink. Every segment carries
// a transparent 1px border so the selected edge appears without the control
// changing height when selection moves.
//
// `equalWidth` (default true) splits the track into equal segments, which
// reads cleanly for short, even labels. Set it false when one label is much
// longer than the others (e.g. "Best estimate" beside BIA/Caliper/DEXA): the
// segments then size to their content and share the slack, so the long label
// keeps its room instead of truncating to "Best estim...".
// error (D146): true renders the track border in the error colour; the
// message beneath is the caller's (FieldError), since the label and hint are.
export default function SegmentedControl({ options, value, onChange, accessibilityLabel, equalWidth = true, error = false }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.row, live.row, error ? { borderColor: t.colors.error } : null]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[equalWidth ? styles.segment : styles.segmentFit, active && [styles.segmentActive, live.segmentActive]]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={opt.label}
          >
            <Text
              style={[styles.segmentText, live.segmentText, active && [styles.segmentTextActive, live.segmentTextActive]]}
              numberOfLines={1}
            >{opt.label}</Text>
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
    borderWidth: 1, borderColor: 'transparent',
  },
  // Content-sized variant (equalWidth={false}): each segment starts at its
  // label width (flexBasis auto) and grows to share the leftover track space,
  // so a long label keeps its room instead of cropping inside an equal quarter.
  segmentFit: {
    flexGrow: 1, flexShrink: 1, flexBasis: 'auto',
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    alignItems: 'center', borderRadius: radius.sm - 2,
    borderWidth: 1, borderColor: 'transparent',
  },
  segmentActive: { backgroundColor: colors.surface3, borderColor: colors.borderLight },
  segmentText: { ...type.label, color: colors.textMuted },
  segmentTextActive: { ...type.w('label', 'semibold'), color: colors.textPrimary },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    row: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    segmentActive: { backgroundColor: t.colors.surface3, borderColor: t.colors.borderLight },
    segmentText: { ...t.type.label, color: t.colors.textMuted },
    segmentTextActive: { ...t.type.w('label', 'semibold'), color: t.colors.textPrimary },
  };
}
