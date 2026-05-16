import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getAllWorkoutSets, getAllExercises, updateWorkout } from '../lib/database';
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
      <Text style={styles.ratingLabel}>{label}</Text>
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
      {labels?.[value] && <Text style={styles.ratingValueLabel}>{labels[value]}</Text>}
    </View>
  );
}

export default function WorkoutSummaryScreen({ navigation, route }) {
  const { workoutId, durationMinutes, exerciseCount, setCount, tonnage, exerciseNames = [] } =
    route.params || {};
  const { user, units } = useAppStore();

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

  useEffect(() => {
    loadVolumeAndSuggestions();
  }, []);

  useEffect(() => {
    const suggestions = getAutoRegSuggestion(feedback, weeklyVolume);
    setAutoRegSuggestions(suggestions);
  }, [feedback, weeklyVolume]);

  async function loadVolumeAndSuggestions() {
    if (!user?.id) return;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const allSets = await getAllWorkoutSets(user.id);
    const recentSets = allSets.filter(s => s.createdAt >= weekAgo);
    const allExercises = await getAllExercises();
    const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
    const volume = calculateWeeklyVolume(recentSets, exerciseMap);
    setWeeklyVolume(volume);
  }

  async function handleSave() {
    if (!workoutId) { navigation.popToTop(); return; }
    setSaving(true);
    try {
      await updateWorkout(workoutId, {
        sessionDifficulty: feedback.sessionDifficulty,
        overallPump: feedback.overallPump,
        soreness24hBefore: feedback.soreness24hBefore,
        fatigueLevel: feedback.fatigueLevel,
        notes: notes || null,
      });
    } finally {
      setSaving(false);
      navigation.popToTop();
    }
  }

  const musclesWorked = Object.keys(weeklyVolume)
    .filter(m => weeklyVolume[m]?.hardSets > 0)
    .sort((a, b) => (weeklyVolume[b]?.hardSets || 0) - (weeklyVolume[a]?.hardSets || 0))
    .slice(0, 6);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.completionHeader}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.background} />
          </View>
          <Text style={styles.completionTitle}>Workout Complete</Text>
          <Text style={styles.completionSub}>
            {exerciseNames.slice(0, 3).join(', ')}
            {exerciseNames.length > 3 ? ` +${exerciseNames.length - 3} more` : ''}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatBox icon="barbell-outline" value={String(exerciseCount || 0)} label="Exercises" />
          <StatBox icon="layers-outline" value={String(setCount || 0)} label="Sets" />
          <StatBox icon="time-outline" value={`${durationMinutes || 0}m`} label="Duration" />
          <StatBox icon="trending-up-outline" value={`${((tonnage || 0) / 1000).toFixed(1)}t`} label="Tonnage" />
        </View>

        {/* Volume by Muscle */}
        {musclesWorked.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VOLUME THIS WEEK</Text>
            {musclesWorked.map(muscle => {
              const data = weeklyVolume[muscle];
              const { status, color, label, landmarks } = getVolumeStatus(data.hardSets, muscle);
              return (
                <View key={muscle} style={styles.volumeRow}>
                  <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle] || muscle}</Text>
                  <Text style={styles.muscleSetCount}>{Math.round(data.hardSets)} sets</Text>
                  <View style={[styles.statusBadge, { backgroundColor: color + '25' }]}>
                    <Text style={[styles.statusText, { color }]}>{label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Auto-Reg Suggestions */}
        {autoRegSuggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEXT WEEK SUGGESTIONS</Text>
            {autoRegSuggestions.map((s, i) => (
              <View key={i} style={styles.suggestionRow}>
                <Ionicons
                  name={s.type === 'reduce_volume' ? 'arrow-down' :
                        s.type === 'add_volume' ? 'arrow-up' :
                        s.type === 'deload_muscle' ? 'warning' : 'checkmark-circle'}
                  size={16}
                  color={s.type === 'deload_muscle' ? colors.error :
                         s.type === 'maintain' ? colors.success : colors.primary}
                />
                <Text style={styles.suggestionText}>{s.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Post-workout Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOW WAS IT?</Text>
          <View style={styles.feedbackCard}>
            <RatingRow
              label="Difficulty"
              field="sessionDifficulty"
              value={feedback.sessionDifficulty}
              max={5}
              onChange={v => setFeedback(f => ({ ...f, sessionDifficulty: v }))}
            />
            <RatingRow
              label="Pump"
              field="overallPump"
              value={feedback.overallPump}
              max={3}
              onChange={v => setFeedback(f => ({ ...f, overallPump: v }))}
            />
            <RatingRow
              label="Soreness before"
              field="soreness24hBefore"
              value={feedback.soreness24hBefore}
              max={3}
              onChange={v => setFeedback(f => ({ ...f, soreness24hBefore: v }))}
            />
            <RatingRow
              label="Fatigue"
              field="fatigueLevel"
              value={feedback.fatigueLevel}
              max={5}
              onChange={v => setFeedback(f => ({ ...f, fatigueLevel: v }))}
            />
            <RatingRow
              label="Joint discomfort"
              field="jointDiscomfort"
              value={feedback.jointDiscomfort}
              max={3}
              onChange={v => setFeedback(f => ({ ...f, jointDiscomfort: v }))}
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SESSION NOTES (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel? Anything notable..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>Save & Return Home</Text>
        </TouchableOpacity>
      </ScrollView>
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
  completionHeader: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  completionSub: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  muscleSetCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingRow: {
    gap: spacing.sm,
  },
  ratingLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  ratingBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  ratingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ratingBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  ratingBtnTextActive: {
    color: colors.background,
  },
  ratingValueLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
});
