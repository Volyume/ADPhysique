import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getAllWorkoutSets, getAllExercises, getAllWorkouts, updateWorkout,
  getActivePlan, getRoutinesForPlan, advancePlanNextWorkout,
} from '../lib/database';
import { calculateWeeklyVolume, getVolumeStatus, getAutoRegSuggestion, MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

const RATING_LABELS = {
  sessionDifficulty: ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal'],
  overallPump: ['', 'None', 'Mild', 'Good'],
  soreness24hBefore: ['', 'Fresh', 'Mild', 'Sore'],
  fatigueLevel: ['', 'Fresh', 'Mild', 'Moderate', 'High', 'Exhausted'],
  jointDiscomfort: ['None', 'Slight', 'Moderate', 'Significant'],
};

function RatingRow({ label, field, value, max, onChange }) {
  const labels = RATING_LABELS[field];
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingLabelRow}>
        <Text style={styles.ratingLabel}>{label}</Text>
        {labels?.[value] ? <Text style={styles.ratingValueLabel}>{labels[value]}</Text> : null}
      </View>
      <View style={styles.ratingBtns}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.ratingBtn, value === i && styles.ratingBtnActive]}
            onPress={() => onChange(i)}
          >
            <Text style={[styles.ratingBtnText, value === i && styles.ratingBtnTextActive]}>
              {i}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function WorkoutSummaryScreen({ navigation, route }) {
  const {
    workoutId, durationMinutes, exerciseCount, setCount, workingSetCount, tonnage,
    exerciseNames = [], readOnly = false,
    routineId = null, detectedPRs = [], exerciseData = [],
  } = route.params || {};
  const { user, units } = useAppStore();
  const insets = useSafeAreaInsets();

  const [feedback, setFeedback] = useState({
    sessionDifficulty: 3,
    overallPump: 2,
    soreness24hBefore: 1,
    fatigueLevel: 2,
    jointDiscomfort: 0,
  });
  const [notes, setNotes] = useState('');
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [autoRegSuggestions, setAutoRegSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(null);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);

  const feedbackDebounceRef = useRef(null);

  useEffect(() => {
    if (!readOnly && routineId && user?.id) {
      (async () => {
        try {
          const activePlan = await getActivePlan(user.id);
          if (activePlan) {
            const planRoutines = await getRoutinesForPlan(activePlan.id);
            if (planRoutines.some(r => r.id === routineId)) {
              await advancePlanNextWorkout(activePlan.id, planRoutines.length);
            }
          }
        } catch (_e) {}
      })();
    }
  }, []);

  useEffect(() => {
    loadVolumeAndHistory();
  }, []);

  useEffect(() => {
    const suggestions = getAutoRegSuggestion(feedback, weeklyVolume);
    setAutoRegSuggestions(suggestions);
  }, [feedback, weeklyVolume]);

  useEffect(() => {
    if (!workoutId || readOnly) return;
    if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    feedbackDebounceRef.current = setTimeout(async () => {
      try {
        await updateWorkout(workoutId, {
          sessionDifficulty: feedback.sessionDifficulty,
          overallPump: feedback.overallPump,
          soreness24hBefore: feedback.soreness24hBefore,
          fatigueLevel: feedback.fatigueLevel,
          notes: notes || null,
        });
      } catch (_e) {}
    }, 1000);
    return () => {
      if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    };
  }, [feedback]);

  async function loadVolumeAndHistory() {
    if (!user?.id) return;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const [allSets, allExercises, allWorkouts] = await Promise.all([
      getAllWorkoutSets(user.id),
      getAllExercises(),
      getAllWorkouts(user.id),
    ]);
    const recentSets = allSets.filter(s => s.createdAt >= weekAgo);
    const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
    const volume = calculateWeeklyVolume(recentSets, exerciseMap);
    setWeeklyVolume(volume);
    setCompletedWorkoutCount(allWorkouts.filter(w => w.isCompleted).length);
  }

  async function handleDone() {
    if (readOnly) {
      navigation.goBack();
      return;
    }
    if (!workoutId) { navigation.popToTop(); return; }
    setSaving(true);
    if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    try {
      await updateWorkout(workoutId, {
        sessionDifficulty: feedback.sessionDifficulty,
        overallPump: feedback.overallPump,
        soreness24hBefore: feedback.soreness24hBefore,
        fatigueLevel: feedback.fatigueLevel,
        notes: notes || null,
      });
    } catch (_e) {}
    setSaving(false);
    navigation.popToTop();
  }

  function handleShareCard() {
    const sessionData = {
      sessionName: exerciseNames.length > 0
        ? exerciseNames.slice(0, 2).join(' & ') + (exerciseNames.length > 2 ? ' +more' : '')
        : 'Session Complete',
      duration: durationMinutes || 0,
      workingSets: workingSetCount ?? setCount ?? 0,
      exerciseCount: exerciseCount || 0,
      tonnage: tonnage || 0,
      exercises: exerciseNames,
      prCount: detectedPRs.length,
    };
    const prData = detectedPRs.length > 0 ? detectedPRs[0] : null;
    navigation.navigate('ShareCard', { sessionData, prData });
  }

  async function handleSaveAsTemplate() {
    if (!exerciseData.length) {
      Alert.alert('No exercises', 'No exercise data available to save as template.');
      return;
    }
    Alert.prompt(
      'Save as Workout Template',
      'Name this template:',
      async (name) => {
        if (!name?.trim()) return;
        const { createWorkoutTemplateFromWorkout } = require('../lib/database');
        await createWorkoutTemplateFromWorkout(user.id, name.trim(), exerciseData);
        Alert.alert('Template Saved', `"${name.trim()}" added to Workout Templates in Plans.`);
      },
      'plain-text',
      exerciseNames.slice(0, 2).join(' & ') || 'My Workout',
    );
  }

  const musclesWorked = Object.keys(weeklyVolume)
    .filter(m => weeklyVolume[m]?.workingSets > 0)
    .sort((a, b) => (weeklyVolume[b]?.workingSets || 0) - (weeklyVolume[a]?.workingSets || 0))
    .slice(0, 6);

  const displayWorkingSets = workingSetCount ?? setCount ?? 0;
  const dataLimited = completedWorkoutCount !== null && completedWorkoutCount < 4;

  const completionDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const sessionLabel = exerciseNames.length > 0
    ? exerciseNames.slice(0, 3).join(' · ') + (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3} more` : '')
    : null;

  const prExerciseNames = detectedPRs
    .slice(0, 3)
    .map(pr => pr.exerciseName || pr.exercise || '')
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.completionHeader}>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={styles.completionTitle}>Session Complete</Text>
          </View>
          <Text style={styles.completionDate}>{completionDate}</Text>
          {sessionLabel && (
            <Text style={styles.completionSub}>{sessionLabel}</Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          <StatBox icon="barbell-outline" value={String(exerciseCount || 0)} label="Exercises" />
          <StatBox icon="layers-outline" value={String(displayWorkingSets)} label="Working Sets" />
          <StatBox icon="time-outline" value={`${durationMinutes || 0}m`} label="Duration" />
          <StatBox icon="trending-up-outline" value={`${((tonnage || 0) / 1000).toFixed(1)}t`} label="Total Volume" />
        </View>

        {detectedPRs.length > 0 && (
          <View style={styles.prRow}>
            <Ionicons name="trophy-outline" size={18} color={colors.warning} />
            <Text style={styles.prRowText}>
              {detectedPRs.length} new PR{detectedPRs.length !== 1 ? 's' : ''}
              {prExerciseNames ? ` · ${prExerciseNames}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {musclesWorked.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THIS WEEK AFTER SESSION</Text>
            {musclesWorked.map(muscle => {
              const data = weeklyVolume[muscle];
              const { color, label } = getVolumeStatus(data.workingSets, muscle);
              return (
                <View key={muscle} style={styles.volumeRow}>
                  <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle] || muscle}</Text>
                  <Text style={styles.muscleSetCount}>{Math.round(data.workingSets)} working sets</Text>
                  <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.statusText, { color }]}>{label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECOMMENDATIONS</Text>
          {dataLimited ? (
            <View style={styles.limitedCard}>
              <Text style={styles.limitedText}>
                Learning your landmarks. Complete more sessions before recommendations become reliable.
              </Text>
            </View>
          ) : (
            autoRegSuggestions.map((s, i) => (
              <View key={i} style={styles.suggestionRow}>
                <Ionicons
                  name={s.type === 'reduce_volume' ? 'arrow-down' :
                        s.type === 'add_volume' ? 'arrow-up' :
                        s.type === 'deload_muscle' ? 'warning-outline' : 'checkmark-circle-outline'}
                  size={16}
                  color={s.type === 'deload_muscle' ? colors.error :
                         s.type === 'maintain' ? colors.success : colors.primary}
                />
                <Text style={styles.suggestionText}>{s.message}</Text>
              </View>
            ))
          )}
        </View>

        {!readOnly && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>SESSION FEEDBACK</Text>
              <Text style={styles.optionalLabel}>optional</Text>
            </View>
            <TouchableOpacity
              style={styles.feedbackToggleBtn}
              onPress={() => setFeedbackExpanded(e => !e)}
              activeOpacity={0.7}
            >
              <Text style={styles.feedbackToggleBtnText}>
                {feedbackExpanded ? 'Hide session feedback' : 'Add session feedback'}
              </Text>
              <Ionicons
                name={feedbackExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {feedbackExpanded && (
              <View style={styles.feedbackCard}>
                <RatingRow label="Difficulty" field="sessionDifficulty" value={feedback.sessionDifficulty} max={5} onChange={v => setFeedback(f => ({ ...f, sessionDifficulty: v }))} />
                <RatingRow label="Pump quality" field="overallPump" value={feedback.overallPump} max={3} onChange={v => setFeedback(f => ({ ...f, overallPump: v }))} />
                <RatingRow label="Soreness coming in" field="soreness24hBefore" value={feedback.soreness24hBefore} max={3} onChange={v => setFeedback(f => ({ ...f, soreness24hBefore: v }))} />
                <RatingRow label="Fatigue" field="fatigueLevel" value={feedback.fatigueLevel} max={5} onChange={v => setFeedback(f => ({ ...f, fatigueLevel: v }))} />
                <RatingRow label="Joint discomfort" field="jointDiscomfort" value={feedback.jointDiscomfort} max={3} onChange={v => setFeedback(f => ({ ...f, jointDiscomfort: v }))} />
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything notable from this session..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            )}
          </View>
        )}

        {!readOnly && !routineId && exerciseData.length > 0 && (
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.templateBtn} onPress={handleSaveAsTemplate}>
              <Ionicons name="bookmark-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.templateBtnText}>Save as Workout Template</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}>
        <TouchableOpacity
          style={[styles.doneBtn, saving && styles.btnDisabled]}
          onPress={handleDone}
          disabled={saving}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
        {!readOnly && (
          <TouchableOpacity style={styles.shareFooterBtn} onPress={handleShareCard}>
            <Ionicons name="share-outline" size={16} color={colors.primary} />
            <Text style={styles.shareFooterBtnText}>Share Session Card</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  completionHeader: { gap: spacing.xs, paddingVertical: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  completionTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  completionDate: { fontSize: fontSize.sm, color: colors.textMuted },
  completionSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statBox: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  prRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.warningBg, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.warning + '40',
  },
  prRowText: { flex: 1, fontSize: fontSize.sm, color: colors.warning, fontWeight: fontWeight.semibold },
  divider: { height: 1, backgroundColor: colors.border },
  section: { gap: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5 },
  optionalLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  volumeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  muscleName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  muscleSetCount: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  limitedCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  limitedText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  suggestionText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  feedbackToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  feedbackToggleBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  feedbackCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  ratingRow: { gap: spacing.sm },
  ratingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  ratingBtns: { flexDirection: 'row', gap: spacing.xs },
  ratingBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  ratingBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  ratingBtnTextActive: { color: colors.background },
  ratingValueLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  notesInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    fontSize: fontSize.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 80,
  },
  secondaryActions: { gap: spacing.sm },
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  templateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  stickyFooter: {
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.lg, gap: spacing.sm,
  },
  doneBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  doneBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  shareFooterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  shareFooterBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
});
