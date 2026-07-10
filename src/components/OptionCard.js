import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// A full-width selectable card: an icon, a label, a one-line detail, and a
// checkmark when selected. Shared by the onboarding wizard and the coached
// builder for choices that read better with a description visible (experience,
// equipment, focus, recovery) so the two flows use the same control.
export default function OptionCard({ icon, label, detail, active, onPress, iconSize = 18 }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <TouchableOpacity
      style={[styles.card, live.card, active && [styles.cardActive, live.cardActive]]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, live.iconWrap]}>
        <Ionicons name={icon} size={iconSize} color={active ? t.colors.primary : t.colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.label, live.label, active && [styles.labelActive, live.labelActive]]}>{label}</Text>
        {detail ? <Text maxFontSizeMultiplier={1.3} style={[styles.detail, live.detail]}>{detail}</Text> : null}
      </View>
      {active ? <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.sm,
  },
  cardActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  iconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1 },
  label: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  labelActive: { color: colors.primary },
  detail: { ...type.bodySm, color: colors.textSecondary },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    cardActive: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    iconWrap: { backgroundColor: t.colors.surface2 },
    label: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    labelActive: { color: t.colors.primary },
    detail: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
