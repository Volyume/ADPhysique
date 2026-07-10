import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from './Button';
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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
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
    <View style={[styles.cardioCard, live.cardioCard]}>
      <View style={styles.cardioHeader}>
        <Ionicons name="heart-outline" size={18} color={t.colors.primary} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.cardioTitle, live.cardioTitle]}>Cardio this week</Text>
        {done > 0 ? (
          <TouchableOpacity style={[styles.cardioHistoryBtn, live.cardioHistoryBtn]} onPress={onHistory} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cardio history">
            <Ionicons name="time-outline" size={13} color={t.colors.textSecondary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.cardioHistoryLink, live.cardioHistoryLink]}>History</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[styles.cardioSub, live.cardioSub]}>{sub}</Text>
      <Button
        title="Log cardio"
        variant="outline"
        size="sm"
        icon="add"
        fullWidth={false}
        onPress={onPress}
      />
      {/* COMP-011: only when there's logged cardio to misread; the empty
          state has nothing to double-count and stays clean. */}
      {done > 0 ? (
        <Text maxFontSizeMultiplier={1.3} style={[styles.cardioFootnote, live.cardioFootnote]}>
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
  cardioHistoryBtn: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  cardioHistoryLink: { ...type.caption, color: colors.textPrimary },
  cardioSub: { ...type.bodySm, color: colors.textSecondary },
  cardioFootnote: { ...type.captionTight, color: colors.textMuted },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. cardioHeader has no colour tokens.
function buildLiveStyles(t) {
  return {
    cardioCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    cardioTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    cardioHistoryBtn: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    cardioHistoryLink: { ...t.type.caption, color: t.colors.textPrimary },
    cardioSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    cardioFootnote: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
