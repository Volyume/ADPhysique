/**
 * CardioCard
 *
 * A small, secondary cardio line on the Train tab, beside the steps line. Shown
 * only when the user has cardio enabled (default on; gate treats undefined as
 * on). It is the entry point for logging cardio and a quiet summary of what was
 * done today. Cardio is available, never allocated: this card invites a log, it
 * does not prescribe anything.
 *
 * Self-loading: reads today's cardio_log rows on focus and foreground. Always
 * renders when enabled (unlike StepsCard, which hides with no data), because it
 * doubles as the "Log cardio" affordance.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */
import { useState, useCallback, useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, fontSize } from '../styles/theme';
import { getCardioLogForDate } from '../lib/database';
import { summariseWeekCardio } from '../lib/cardio/cardioEngine';

export default function CardioCard({ userId, onPress }) {
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await getCardioLogForDate(userId);
      setSummary(summariseWeekCardio(rows));
    } catch (_) { /* leave last value */ }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  const did = summary && summary.sessions > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={did ? 'Cardio logged today, tap to log more' : 'Log cardio'}
    >
      <Ionicons name="heart-outline" size={16} color={colors.primary} />
      <Text style={styles.text}>
        {did ? (
          <>
            <Text style={styles.num}>{summary.totalMinutes}</Text> min cardio today
            {summary.totalKcal > 0 ? `, about ${summary.totalKcal} kcal` : ''}
          </>
        ) : 'Log cardio'}
      </Text>
      <Ionicons name="add" size={18} color={colors.primary} />
    </TouchableOpacity>
  );
}

// Matches StepsCard so the two sit together as a pair.
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  num: { color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
