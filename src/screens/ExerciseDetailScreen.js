import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getExerciseById, getWorkoutSetsForExercise, getAllExercises } from '../lib/database';
import { calculate1RM, getExerciseSubstitutes, MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

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

      // PRs: computed locally from history for Stage 1
      setPRs([]);

      // Substitutes
      const allExercises = await getAllExercises();
      const subs = getExerciseSubstitutes(ex, allExercises, []);
      setSubstitutes(subs);
    } catch (e) {
      console.error('ExerciseDetail loadData:', e);
    }
  }

  if (!exercise) return null;

  const primaryMuscle = MUSCLE_DISPLAY_NAMES[(exercise.primaryMuscle || '').toLowerCase()] || exercise.primaryMuscle;
  const secondaryMuscles = exercise.secondaryMuscles || [];

  const allTimeSets = history.flat();
  const best1RM = allTimeSets.reduce((best, s) => {
    const est = calculate1RM(s.weight || 0, s.actualReps || 0);
    return est > best ? est : best;
  }, 0);

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
              <Text style={styles.secMuscleLabel}>Secondary: </Text>
              <Text style={styles.secMuscleText}>
                {secondaryMuscles.map(m => m.muscle || m).join(', ')}
              </Text>
            </View>
          )}

          {best1RM > 0 && (
            <View style={styles.est1RM}>
              <Ionicons name="trophy-outline" size={16} color={colors.gold} />
              <Text style={styles.est1RMText}>Est. 1RM: {best1RM.toFixed(1)} {units}</Text>
            </View>
          )}

          <View style={styles.sfrRow}>
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.stimulusToFatigueRatio || 3}/5</Text>
              <Text style={styles.sfrLabel}>SFR</Text>
            </View>
            <View style={styles.sfrDivider} />
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.fatigueCost || 3}/5</Text>
              <Text style={styles.sfrLabel}>Fatigue</Text>
            </View>
            <View style={styles.sfrDivider} />
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.defaultRepMin || 6}–{exercise.defaultRepMax || 12}</Text>
              <Text style={styles.sfrLabel}>Rep range</Text>
            </View>
          </View>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HISTORY (Last {history.length} sessions)</Text>
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
                        {s.rir !== null && s.rir !== undefined ? ` (RIR ${s.rir})` : ''}
                      </Text>
                    ))}
                  </View>
                  {sessionEst1RM > 0 && (
                    <Text style={styles.historyEst}>≈{sessionEst1RM.toFixed(0)}{units} 1RM</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* PRs */}
        {prs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ALL-TIME PRs</Text>
            {prs.slice(0, 5).map((pr, i) => (
              <View key={pr.id} style={styles.prRow}>
                <Text style={styles.prIcon}>
                  {pr.record_type === '1rm_estimate' ? '🥇' :
                   pr.record_type === 'heaviest_weight' ? '🏋️' : '🔁'}
                </Text>
                <View style={styles.prInfo}>
                  <Text style={styles.prLabel}>
                    {pr.record_type === '1rm_estimate' ? 'Est. 1RM' :
                     pr.record_type === 'heaviest_weight' ? 'Heaviest Weight' : 'Most Reps'}
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
            <Text style={styles.sectionTitle}>SUBSTITUTES</Text>
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

        {exercise.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{exercise.notes}</Text>
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
  sfrDivider: { width: 1, height: 36, backgroundColor: colors.border },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
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
