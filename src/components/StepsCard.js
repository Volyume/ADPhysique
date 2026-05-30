/**
 * StepsCard
 *
 * The steps view on the Progress tab. Steps no longer have a daily card on the
 * Train tab; they are read silently from the platform health aggregator (Apple
 * Health / Health Connect) on app foreground and shown here: today's total
 * against the target, plus the week's average that feeds the coach.
 *
 * Self-loading from local SQLite. Renders nothing useful until there is data,
 * so a user with no registered steps just sees zeros against their target,
 * which is honest. No prompt, no manual entry here; the weekly check-in owns
 * the manual fallback.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, type } from '../styles/theme';
import { getDailyStepsToday, getDailyStepsRange, activityDayKey } from '../lib/database';
import { summariseWeekSteps } from '../lib/stepsSummary';

export default function StepsCard({ userId, stepsTarget }) {
  const [today, setToday] = useState(null);
  const [summary, setSummary] = useState(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (userId) {
      (async () => {
        try {
          const t = await getDailyStepsToday(userId);
          const toDate = activityDayKey();
          const fromDate = activityDayKey(Date.now() - 6 * 24 * 60 * 60 * 1000);
          const rows = await getDailyStepsRange(userId, fromDate, toDate);
          if (!alive) return;
          setToday(t?.steps ?? null);
          setSummary(summariseWeekSteps(rows));
        } catch (_) { /* leave the zeros */ }
      })();
    }
    return () => { alive = false; };
  }, [userId]));

  const target = stepsTarget ?? 8000;
  const todayVal = today ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((todayVal / target) * 100)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="walk-outline" size={18} color={colors.primary} />
        <Text style={styles.title}>Steps</Text>
      </View>

      <Text style={styles.today}>{todayVal.toLocaleString('en-GB')}</Text>
      <Text style={styles.todayLabel}>today, of {target.toLocaleString('en-GB')} target</Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>

      {summary?.avgSteps != null ? (
        <Text style={styles.avg}>
          {summary.avgSteps.toLocaleString('en-GB')} a day on average this week
        </Text>
      ) : (
        <Text style={styles.avg}>No average yet this week</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: { ...type.label, color: colors.textSecondary },
  today: { ...type.num('display'), color: colors.textPrimary },
  todayLabel: { ...type.caption, color: colors.textMuted },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  avg: { ...type.num('caption'), color: colors.textSecondary, marginTop: spacing.xs },
});
