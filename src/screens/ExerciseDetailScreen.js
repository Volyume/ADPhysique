import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { CartesianChart, Line, Area } from 'victory-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getExerciseById, getWorkoutSetsForExercise, getAllExercises } from '../lib/database';
import { calculate1RM, getExerciseSubstitutes, MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';
import { FORM_TIPS } from '../lib/formTips';
import InfoTooltip from '../components/InfoTooltip';

export default function ExerciseDetailScreen({ navigation, route }) {
  const { exerciseId } = route.params || {};
  const { user, units } = useAppStore();
  const [exercise, setExercise] = useState(null);
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);

  useEffect(() => {
    if (exerciseId) loadData();
  }, [exerciseId]);

  async function loadData() {
    try {
      const ex = await getExerciseById(exerciseId);
      if (!ex) return; // exercise not found — screen will stay on null guard
      setExercise(ex);
      navigation.setOptions({ title: ex.name });

      // History — group by workout, last 8 sessions
      const mySets = await getWorkoutSetsForExercise(exerciseId, user.id, 200);

      const byWorkout = {};
      for (const s of mySets) {
        if (!byWorkout[s.workoutId]) byWorkout[s.workoutId] = [];
        byWorkout[s.workoutId].push(s);
      }
      const sessions = Object.values(byWorkout).slice(0, 8);
      setHistory(sessions);

      // Compute local PRs from working sets
      const workingSets = mySets.filter(
        s => (s.setType ?? s.set_type) !== 'warmup' && (s.weight || 0) > 0 && (s.actualReps || 0) > 0,
      );
      if (workingSets.length > 0) {
        const computedPRs = [];
        let best1RMVal = 0, best1RMSet = null, heaviest = null, mostReps = null;
        for (const s of workingSets) {
          const est = calculate1RM(s.weight, s.actualReps);
          if (est > best1RMVal) { best1RMVal = est; best1RMSet = s; }
          if (!heaviest || s.weight > heaviest.weight) heaviest = s;
          if (!mostReps || s.actualReps > mostReps.actualReps) mostReps = s;
        }
        if (best1RMSet) computedPRs.push({ id: 'pr_1rm', record_type: '1rm_estimate', value: best1RMVal, reps: best1RMSet.actualReps, achieved_date: best1RMSet.createdAt });
        if (heaviest)   computedPRs.push({ id: 'pr_heavy', record_type: 'heaviest_weight', value: heaviest.weight, reps: heaviest.actualReps, achieved_date: heaviest.createdAt });
        if (mostReps && mostReps !== heaviest) computedPRs.push({ id: 'pr_reps', record_type: 'most_reps', value: mostReps.weight, reps: mostReps.actualReps, achieved_date: mostReps.createdAt });
        setPRs(computedPRs);
      }

      // Substitutes
      const allExercises = await getAllExercises();
      const subs = getExerciseSubstitutes(ex, allExercises, []);
      setSubstitutes(subs);
    } catch (e) {
      console.error('ExerciseDetail loadData:', e);
    }
  }

  if (!exercise) return null;

  const formTip = FORM_TIPS[exercise.name] ?? null;
  const primaryMuscle = MUSCLE_DISPLAY_NAMES[(exercise.primaryMuscle || '').toLowerCase()] || exercise.primaryMuscle;
  const secondaryMuscles = exercise.secondaryMuscles || [];

  const allTimeSets = history.flat();
  const best1RM = allTimeSets.reduce((best, s) => {
    const est = calculate1RM(s.weight || 0, s.actualReps || 0);
    return est > best ? est : best;
  }, 0);

  // Build chart data: one point per session (oldest → newest)
  const chartData = [...history].reverse().map((sessionSets, i) => {
    const vals = sessionSets.map(s => calculate1RM(s.weight || 0, s.actualReps || 0));
    return { x: i, est1rm: vals.length > 0 ? Math.max(...vals) : 0 };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.tags}>
            <View style={styles.tag}><Text style={styles.tagText}>{primaryMuscle}</Text></View>
            {exercise.equipment && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>{exercise.equipment}</Text>
              </View>
            )}
            {exercise.compoundIsolation && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>
                  {exercise.compoundIsolation.charAt(0).toUpperCase() + exercise.compoundIsolation.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {secondaryMuscles.length > 0 && (
            <View style={styles.secMuscles}>
              <Text style={styles.secMuscleLabel}>Also works: </Text>
              <Text style={styles.secMuscleText}>
                {secondaryMuscles.map(m => {
                  const key = m.muscle || m;
                  return MUSCLE_DISPLAY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                }).join(', ')}
              </Text>
            </View>
          )}

          {best1RM > 0 && (
            <View style={styles.est1RM}>
              <Ionicons name="trophy-outline" size={16} color={colors.gold} />
              <Text style={styles.est1RMText}>Est. max lift: {best1RM.toFixed(1)} {units}</Text>
              <InfoTooltip text="Your estimated max lift: the most weight you could lift for a single rep, calculated from the sets you've logged. It updates automatically as you get stronger." size={12} />
            </View>
          )}

          <View style={styles.sfrRow}>
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.stimulusToFatigueRatio || 3}/5</Text>
              <View style={styles.sfrLabelRow}>
                <Text style={styles.sfrLabel}>Quality</Text>
                <InfoTooltip text="Effort rating: how much growth this exercise produces relative to how tiring it is overall. 5/5 = great return for the fatigue cost. 3/5 = moderate. 1/5 = very demanding for what you get back." size={11} />
              </View>
            </View>
            <View style={styles.sfrDivider} />
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.fatigueCost || 3}/5</Text>
              <View style={styles.sfrLabelRow}>
                <Text style={styles.sfrLabel}>Fatigue</Text>
                <InfoTooltip text="How much systemic fatigue this exercise creates. 5/5 = very demanding (deadlift). 1/5 = minimal fatigue. High-fatigue exercises need more recovery between sessions." size={11} />
              </View>
            </View>
            <View style={styles.sfrDivider} />
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.defaultRepMin || 6}–{exercise.defaultRepMax || 12}</Text>
              <Text style={styles.sfrLabel}>Rep range</Text>
            </View>
          </View>
        </View>

        {/* Strength trend chart */}
        {history.length >= 2 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartLabel}>Strength trend</Text>
            <View style={styles.chartContainer}>
              <CartesianChart data={chartData} xKey="x" yKeys={['est1rm']}>
                {({ points, chartBounds }) => (
                  <>
                    <Area
                      points={points.est1rm}
                      y0={chartBounds.bottom}
                      color="rgba(245,158,11,0.08)"
                    />
                    <Line
                      points={points.est1rm}
                      color={colors.primary}
                      strokeWidth={2}
                    />
                  </>
                )}
              </CartesianChart>
            </View>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History (last {history.length} sessions)</Text>
            {history.map((sessionSets, i) => {
              const firstSet = sessionSets[0];
              const date = new Date(firstSet.createdAt);
              const sessionEst1RM = Math.max(...sessionSets.map(s => calculate1RM(s.weight || 0, s.actualReps || 0)));
              return (
                <View key={i} style={styles.historyCard}>
                  <Text style={styles.historyDate}>{format(date, 'MMM d')}</Text>
                  <View style={styles.historySets}>
                    {sessionSets.map((s, j) => (
                      <Text key={j} style={styles.historySetText}>
                        {s.weight}{units} × {s.actualReps}
                        {s.set_type === 'warmup' || s.setType === 'warmup' ? ' · Warm-up' : ''}
                        {s.set_type === 'dropset' || s.setType === 'dropset' ? ' · Drop Set' : ''}
                      </Text>
                    ))}
                  </View>
                  {sessionEst1RM > 0 && (
                    <Text style={styles.historyEst}>Est. max: ≈{sessionEst1RM.toFixed(0)}{units}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* History empty state */}
        {history.length === 0 && exercise && (
          <View style={styles.historyEmpty}>
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            <Text style={styles.historyEmptyText}>
              You haven't logged this exercise yet. Add it to a session to start tracking your progress.
            </Text>
          </View>
        )}

        {/* PRs */}
        {prs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All-time bests</Text>
            {prs.slice(0, 5).map((pr, i) => (
              <View key={pr.id} style={styles.prRow}>
                <Text style={styles.prIcon}>
                  {pr.record_type === '1rm_estimate' ? '🥇' :
                   pr.record_type === 'heaviest_weight' ? '🏋️' : '🔁'}
                </Text>
                <View style={styles.prInfo}>
                  <Text style={styles.prLabel}>
                    {pr.record_type === '1rm_estimate' ? 'Est. max lift' :
                     pr.record_type === 'heaviest_weight' ? 'Heaviest weight' : 'Most reps'}
                  </Text>
                  <Text style={styles.prValue}>
                    {pr.record_type === '1rm_estimate' ? `${parseFloat(pr.value).toFixed(1)}${units}` :
                     `${pr.value}${units} × ${pr.reps} reps`}
                  </Text>
                </View>
                <Text style={styles.prDate}>{format(new Date(pr.achieved_date), 'MMM d yyyy')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Substitutes */}
        {substitutes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Substitutes</Text>
            {substitutes.map(({ exercise: sub, reason }, i) => (
              <TouchableOpacity
                key={sub.id}
                style={styles.subCard}
                onPress={() => navigation.push('ExerciseDetail', { exerciseId: sub.id })}
              >
                <View style={styles.subInfo}>
                  <Text style={styles.subName}>{sub.name}</Text>
                  <Text style={styles.subReason}>{reason}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(formTip || exercise.notes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to do it</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{formTip ?? exercise.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  tagText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  tagSecondary: { backgroundColor: colors.surface2 },
  tagTextSecondary: { color: colors.textSecondary },
  secMuscles: { flexDirection: 'row', alignItems: 'center' },
  secMuscleLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  secMuscleText: { fontSize: fontSize.sm, color: colors.textSecondary },
  est1RM: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold + '15',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  est1RMText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.gold },
  sfrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sfrItem: { flex: 1, alignItems: 'center', gap: 2 },
  sfrValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  sfrLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  sfrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sfrDivider: { width: 1, height: 36, backgroundColor: colors.border },
  chartSection: { gap: spacing.sm },
  chartLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  chartContainer: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  historyEmptyText: {
    flex: 1, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 19,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  historyDate: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
  historySets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  historySetText: { fontSize: fontSize.sm, color: colors.textSecondary },
  historyEst: { fontSize: fontSize.xs, color: colors.textMuted },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prIcon: { fontSize: 22 },
  prInfo: { flex: 1 },
  prLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  prValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  prDate: { fontSize: fontSize.xs, color: colors.textMuted },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subInfo: { flex: 1 },
  subName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  subReason: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});
