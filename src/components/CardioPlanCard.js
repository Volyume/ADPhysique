import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import { getCardioLogRange, activityDayKey } from '../lib/database';
import { summariseWeekCardio } from '../lib/cardio/cardioEngine';

/**
 * "Cardio this week" card: the week's logged cardio plus a log/history entry.
 * Lives on the Progress tab (a tracking surface), not Plans. Self-contained:
 * loads its own week summary on focus. `target` is the coach's optional cut
 * prescription (userProfile.cardioTarget); when absent the card is purely a
 * log of what the user chose to do. est_kcal is never shown here: cardio is
 * feedback, not an add-back to the calorie target.
 */
export default function CardioPlanCard({ userId, target, onPress, onHistory }) {
  const [summary, setSummary] = useState(null);
  useFocusEffect(useCallback(() => {
    let live = true;
    const to = activityDayKey();
    const from = activityDayKey(Date.now() - 6 * 24 * 60 * 60 * 1000);
    getCardioLogRange(userId, from, to)
      .then((rows) => { if (live) setSummary(summariseWeekCardio(rows)); })
      .catch(() => {});
    return () => { live = false; };
  }, [userId]));

  const done = summary?.sessions ?? 0;
  const goal = target?.sessionsPerWeek ?? 0;
  const sub = goal > 0
    ? `${done} of ${goal} sessions this week. Your choice of activity.`
    : (done > 0
      ? `${done} session${done === 1 ? '' : 's'} this week, ${summary.totalMinutes} min.`
      : 'Log any cardio you do. The coach sets a target only if a cut stalls.');

  return (
    <View style={styles.cardioCard}>
      <View style={styles.cardioHeader}>
        <Ionicons name="heart-outline" size={18} color={colors.primary} />
        <Text style={styles.cardioTitle}>Cardio this week</Text>
        {done > 0 ? (
          <TouchableOpacity onPress={onHistory} hitSlop={8} accessibilityLabel="Cardio history">
            <Text style={styles.cardioHistoryLink}>History</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.cardioSub}>{sub}</Text>
      <TouchableOpacity style={styles.cardioBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel="Log cardio">
        <Ionicons name="add" size={16} color={colors.primary} />
        <Text style={styles.cardioBtnText}>Log cardio</Text>
      </TouchableOpacity>
      {/* COMP-011: only when there's logged cardio to misread; the empty
          state has nothing to double-count and stays clean. */}
      {done > 0 ? (
        <Text style={styles.cardioFootnote}>
          Cardio is already counted in your calorie target. Nothing to add back.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardioCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  cardioHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardioTitle: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  cardioHistoryLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  cardioSub: { ...type.bodySm, color: colors.textSecondary },
  cardioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: radius.sm,
  },
  cardioBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  cardioFootnote: { ...type.captionTight, color: colors.textMuted },
});
