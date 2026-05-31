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
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, type } from '../styles/theme';
import { getDailyStepsToday, getDailyStepsRange, activityDayKey } from '../lib/database';
import { summariseWeekSteps } from '../lib/stepsSummary';

export default function StepsCard({ userId, stepsTarget }) {
  const [today, setToday] = useState(null);
  const [summary, setSummary] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load the figure shown on the card. Refreshes from the health source first
  // (recordTodaySteps reads Health Connect / Apple Health and writes the
  // daily_steps store; it no-ops if the steps permission isn't granted), then
  // reads the store. Doing the refresh here, rather than relying on the
  // app-foreground sync that runs elsewhere, means the number is current
  // whenever this card is shown instead of lagging behind by a sync cycle.
  const load = useCallback(async () => {
    if (!userId) return;
    try {
      // eslint-disable-next-line global-require
      const { recordTodaySteps } = require('../lib/activitySteps');
      await recordTodaySteps(userId);
    } catch (_) { /* best effort; fall through to whatever is already stored */ }
    try {
      const t = await getDailyStepsToday(userId);
      const toDate = activityDayKey();
      const fromDate = activityDayKey(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const rows = await getDailyStepsRange(userId, fromDate, toDate);
      if (!mountedRef.current) return;
      setToday(t?.steps ?? null);
      setSummary(summariseWeekSteps(rows));
    } catch (_) { /* leave the zeros */ }
  }, [userId]);

  // Re-read on navigation focus, then keep polling while the screen stays
  // focused so the figure tracks new steps without a tab switch. Health Connect
  // batches its on-device step writes no more than once a minute, so a 30s poll
  // is as live as the data ever gets; polling faster would re-read an identical
  // number. The tick no-ops while the app is backgrounded, and the interval is
  // cleared on blur, so there is no background battery cost.
  useFocusEffect(useCallback(() => {
    load();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') load();
    }, 30_000);
    return () => clearInterval(id);
  }, [load]));

  // Re-read when the app returns to the foreground. useFocusEffect fires on
  // navigation focus only, not on a background→active transition, so without
  // this the figure stayed frozen at the last cold-start value until the user
  // switched tabs or force-closed the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

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
