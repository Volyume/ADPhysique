/**
 * EngineLog
 *
 * The coaching-decision log from the retired Athlete Hub dashboard, now
 * shown on the Coach tab inside the Strategic journal. Lists recent engine
 * adaptations (set added/dropped, deload, exercise rotation) plus
 * rep-regression warnings detected from logged sets. Collapsible.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getRecentAdaptationEvents, getCompletedWorkoutSets, getAllExercises } from '../lib/database';
import InfoTooltip from './InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';

// Detects exercises with 2+ consecutive weeks of declining average reps
// (a >= 2 rep drop each week), a sign the load may be too high.
function detectRepRegressions(sets, exerciseMap) {
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const byExerciseWeek = {};
  for (const set of sets) {
    if ((set.setType ?? set.set_type) === 'warmup') continue;
    const ts = set.createdAt ?? set.created_at ?? 0;
    const weeksAgo = Math.floor((now - ts) / WEEK_MS);
    if (weeksAgo > 2) continue;
    const exId = set.exerciseId ?? set.exercise_id;
    if (!exId) continue;
    if (!byExerciseWeek[exId]) byExerciseWeek[exId] = {};
    if (!byExerciseWeek[exId][weeksAgo]) byExerciseWeek[exId][weeksAgo] = [];
    byExerciseWeek[exId][weeksAgo].push(set);
  }
  const warnings = [];
  for (const [exId, weeks] of Object.entries(byExerciseWeek)) {
    const w0 = weeks[0] ?? [];
    const w1 = weeks[1] ?? [];
    const w2 = weeks[2] ?? [];
    if (w0.length < 2 || w1.length < 2 || w2.length < 2) continue;
    const avg = arr => arr.reduce((s, x) => s + (x.actualReps ?? x.actual_reps ?? 0), 0) / arr.length;
    const r0 = avg(w0); const r1 = avg(w1); const r2 = avg(w2);
    if (r1 - r0 >= 2 && r2 - r1 >= 2) {
      const ex = exerciseMap?.[exId];
      warnings.push({
        id: `reg_${exId}`,
        exerciseName: ex?.name ?? 'Unknown exercise',
        reason_text: `Avg reps: ${Math.round(r2 * 10) / 10} -> ${Math.round(r1 * 10) / 10} -> ${Math.round(r0 * 10) / 10} over 3 weeks. Consider dropping the weight slightly or taking a lighter week.`,
      });
    }
  }
  return warnings;
}

export default function EngineLog({ userId }) {
  const [adaptationHistory, setAdaptationHistory] = useState([]);
  const [repWarnings, setRepWarnings] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const events = await getRecentAdaptationEvents(userId, 4);
      setAdaptationHistory((events || []).slice(0, 12));
    } catch (_) {}
    try {
      const [sets, exercises] = await Promise.all([
        getCompletedWorkoutSets(userId),
        getAllExercises(),
      ]);
      const exMap = Object.fromEntries((exercises || []).map(e => [e.id, e]));
      setRepWarnings(detectRepRegressions(sets || [], exMap));
    } catch (_) {}
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (adaptationHistory.length === 0 && repWarnings.length === 0) return null;

  return (
    <View style={styles.card}>
      {/* AY-5 (2026-07-09 design audit): expanded-state so the disclosure is
          screen-reader navigable (matches CollapsibleSection.js's convention). */}
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.header} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="pulse" size={18} color={colors.primary} />
          </View>
          <View>
            <Text maxFontSizeMultiplier={1.3} style={styles.headerLabel}>Engine Log</Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.headerSub}>{repWarnings.length + adaptationHistory.length} recent coaching decisions</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* U-F-5: define what the log is, in plain English, on the header. */}
          <InfoTooltip text={GLOSSARY.engineLog} size={15} />
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          {repWarnings.map((w, i) => (
            <View key={w.id || `reg_${i}`} style={styles.row}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <View style={styles.regTitleRow}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.muscle, { color: colors.warning }]}>{w.exerciseName}: Rep regression</Text>
                  {/* U-F-5: define "rep regression" in lay terms (once is enough). */}
                  {i === 0 && <InfoTooltip text={GLOSSARY.repRegression} size={13} />}
                </View>
                {w.reason_text ? <Text maxFontSizeMultiplier={1.3} style={styles.reason} numberOfLines={3}>{w.reason_text}</Text> : null}
              </View>
            </View>
          ))}
          {adaptationHistory.map((event, i) => {
            const icon =
              event.decision === 'add_set' ? 'trending-up' :
              event.decision === 'drop_set' ? 'trending-down' :
              event.decision === 'deload_trigger' ? 'warning-outline' :
              event.decision === 'rotate_exercise' ? 'swap-horizontal' :
              'remove-outline';
            const iconColor =
              event.decision === 'add_set' ? colors.primary :
              event.decision === 'drop_set' || event.decision === 'deload_trigger' ? colors.error :
              colors.textMuted;
            const muscleLabel = MUSCLE_DISPLAY_NAMES[event.muscle] || event.muscle || 'Unknown';
            const date = event.created_at
              ? new Date(event.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '';
            return (
              <View key={event.id || i} style={styles.row}>
                <Ionicons name={icon} size={14} color={iconColor} />
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.muscle}>
                    {muscleLabel}
                    {event.delta != null && event.delta !== 0 ? ` ${event.delta > 0 ? '+' : ''}${event.delta} set` : ''}
                  </Text>
                  {event.reason_text ? <Text maxFontSizeMultiplier={1.3} style={styles.reason} numberOfLines={2}>{event.reason_text}</Text> : null}
                </View>
                <Text maxFontSizeMultiplier={1.3} style={styles.date}>{date}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  headerSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  body: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  regTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muscle: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  reason: { ...type.captionTight, color: colors.textSecondary, marginTop: spacing.xxs },
  date: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
});
