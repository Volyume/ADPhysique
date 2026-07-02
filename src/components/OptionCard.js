import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../styles/theme';

// A full-width selectable card: an icon, a label, a one-line detail, and a
// checkmark when selected. Shared by the onboarding wizard and the coached
// builder for choices that read better with a description visible (experience,
// equipment, focus, recovery) so the two flows use the same control.
export default function OptionCard({ icon, label, detail, active, onPress, iconSize = 18 }) {
  return (
    <TouchableOpacity
      style={[styles.card, active && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={iconSize} color={active ? colors.primary : colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
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
