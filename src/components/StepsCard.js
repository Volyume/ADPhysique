/**
 * StepsCard
 *
 * A small, secondary steps line on the Train tab, shown under the morning
 * weight. Steps are read silently from the platform health aggregator (Apple
 * Health / Health Connect) and written to daily_steps on app foreground; this
 * line just surfaces today's total as nice-to-see context. It is deliberately
 * understated, a single muted row, so it does not compete with the training
 * content. The weekly average that feeds the coach is computed from the same
 * store elsewhere, not here.
 *
 * Self-loading: refreshes the figure from the health source first
 * (recordTodaySteps no-ops without the steps permission), then reads
 * daily_steps. Renders nothing until there is a real figure, so a user who
 * hasn't connected steps sees no empty "0 steps" line.
 *
 * Refreshes on navigation focus, on app foreground, and on a 30s poll while
 * the screen is focused. Health Connect batches its on-device step writes no
 * more than once a minute, so 30s is as live as the data gets.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, fontSize } from '../styles/theme';
import { getDailyStepsToday } from '../lib/database';

export default function StepsCard({ userId, stepsTarget }) {
  const [today, setToday] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Refresh from the health source (recordTodaySteps reads Health Connect /
  // Apple Health and writes daily_steps; no-ops without the steps permission),
  // then read today's stored total.
  const load = useCallback(async () => {
    if (!userId) return;
    try {
      // eslint-disable-next-line global-require
      const { recordTodaySteps } = require('../lib/activitySteps');
      await recordTodaySteps(userId);
    } catch (_) { /* best effort; fall through to whatever is stored */ }
    try {
      const t = await getDailyStepsToday(userId);
      if (!mountedRef.current) return;
      setToday(t?.steps ?? null);
    } catch (_) { /* leave the last value */ }
  }, [userId]);

  // Re-read on focus, then poll every 30s while the screen stays focused. The
  // tick no-ops while the app is backgrounded and is cleared on blur, so there
  // is no background cost. 30s matches Health Connect's once-a-minute write.
  useFocusEffect(useCallback(() => {
    load();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') load();
    }, 30_000);
    return () => clearInterval(id);
  }, [load]));

  // Refresh on app foreground too; focus alone does not fire on warm resume.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  // Keep the line off the page until there is a real figure, rather than
  // showing a bare zero to someone who has not connected steps.
  if (today == null) return null;

  const target = stepsTarget ?? null;

  return (
    <View style={styles.card}>
      <Ionicons name="walk-outline" size={16} color={colors.primary} />
      <Text style={styles.text}>
        <Text style={styles.num}>{today.toLocaleString('en-GB')}</Text>
        {target ? ` of ${target.toLocaleString('en-GB')} steps` : ' steps'} today
      </Text>
    </View>
  );
}

// Matches the morning-weight card on Train (same box: surface, hairline
// border, md radius, sm/md padding) so the two sit together as a pair.
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
