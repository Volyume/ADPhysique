/**
 * IllustrationCard
 *
 * Graceful fallback for an exercise demonstration when no demo media exists
 * (the v1 state, and the permanent state for any exercise without a clip).
 * It is a first-class card, not a "missing content" placeholder: it presents
 * the primary muscle and frames the written technique guide that sits below.
 * Same dimensions as DemoCard so the two states are visually interchangeable.
 *
 * Voice: British English. Visuals: #0D0D0D/#F5A623 tokens only.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';

export default function IllustrationCard({ muscleLabel }) {
  return (
    <View style={styles.card} accessibilityRole="image" accessibilityLabel={muscleLabel ? `${muscleLabel} exercise` : 'Exercise'}>
      <View style={styles.iconWrap}>
        <Ionicons name="body-outline" size={56} color={colors.primary} />
        <Ionicons name="barbell-outline" size={22} color={colors.textMuted} style={styles.barbell} />
      </View>
      {muscleLabel ? <Text style={styles.muscle}>{muscleLabel}</Text> : null}
      <Text style={styles.hint}>Technique guide below</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.25),
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  barbell: { position: 'absolute', bottom: -6, right: -18 },
  muscle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 0.4 },
});
