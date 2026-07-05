/**
 * COMP-030: the pre-account quiz (Variant B, §4B steps 2-3).
 *
 * Two sections, how you train, what you train for, answered before any
 * account exists. Answers go ONLY to the in-memory store slice (never persisted,
 * never transmitted: the privacy property). Reaches the plan preview, then the
 * "Save your plan" account wall. Options reuse coachingGoals as the single source
 * of truth, so nothing is re-asked in the post-account wizard.
 *
 * Only shown when ONBOARDING_QUIZ_FIRST is on; the live account-first flow is
 * untouched while the flag is off.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
import Chip from '../components/Chip';
import useAppStore from '../store/useAppStore';
import { PHYSIQUE_GOALS, GOAL_LABELS, TRAINING_PHASES, PHASE_LABELS } from '../lib/coachingGoals';
import { PHASE_PRE_ACCOUNT } from '../lib/onboarding/quizFlow';

const EXPERIENCE = [
  { value: 'beginner', label: 'New to lifting' },
  { value: 'intermediate', label: 'A year or two in' },
  { value: 'advanced', label: 'Experienced' },
];
const DAYS = [2, 3, 4, 5, 6];
const LENGTHS = [45, 60, 75, 90];
const EQUIPMENT = [
  { value: 'full_gym', label: 'Full gym' },
  { value: 'home_gym', label: 'Home gym' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

export default function QuizScreen({ navigation }) {
  const { quiz, setQuizField, markQuizStep } = useAppStore((s) => ({
    quiz: s.onboardingQuiz || {}, setQuizField: s.setQuizField, markQuizStep: s.markQuizStep,
  }));
  const [touched] = useState(() => { markQuizStep('quiz_open'); return true; });
  void touched;

  const ready = quiz.experience && quiz.daysPerWeek && quiz.trainingGoal;

  function go() {
    markQuizStep('quiz_done');
    navigation.navigate('PlanPreview');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* NAV-8: the flow had no way back (headerless stack screen), and the
            headline promised eight questions while rendering six. */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.h1}>A few quick questions.</Text>
        <Text style={styles.lede}>Your plan takes shape as you answer.</Text>

        <Text style={styles.section}>How do you train?</Text>
        <Text style={styles.q}>Experience</Text>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Experience">
          {EXPERIENCE.map((o) => (
            <Chip key={o.value} label={o.label} selected={quiz.experience === o.value}
              onPress={() => setQuizField('experience', o.value)}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              style={styles.quizChip}
            />
          ))}
        </View>
        <Text style={styles.q}>Days a week</Text>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Days a week">
          {DAYS.map((d) => (
            <Chip key={d} label={String(d)} selected={quiz.daysPerWeek === d}
              onPress={() => setQuizField('daysPerWeek', d)}
              accessibilityRole="radio"
              accessibilityLabel={`${d} days a week`}
              style={styles.quizChip}
            />
          ))}
        </View>
        <Text style={styles.q}>Session length</Text>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Session length">
          {LENGTHS.map((m) => (
            <Chip key={m} label={`${m} min`} selected={quiz.sessionLengthMinutes === m}
              onPress={() => setQuizField('sessionLengthMinutes', m)}
              accessibilityRole="radio"
              accessibilityLabel={`${m} minutes`}
              style={styles.quizChip}
            />
          ))}
        </View>
        <Text style={styles.q}>Equipment</Text>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Equipment">
          {EQUIPMENT.map((o) => (
            <Chip key={o.value} label={o.label} selected={quiz.equipment === o.value}
              onPress={() => setQuizField('equipment', o.value)}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              style={styles.quizChip}
            />
          ))}
        </View>

        <Text style={styles.section}>What are you training for?</Text>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Training goal">
          {PHYSIQUE_GOALS.map((g) => (
            <Chip key={g.value} label={GOAL_LABELS[g.value] || g.label} selected={quiz.trainingGoal === g.value}
              onPress={() => setQuizField('trainingGoal', g.value)}
              accessibilityRole="radio"
              accessibilityLabel={GOAL_LABELS[g.value] || g.label}
              style={styles.quizChip}
            />
          ))}
        </View>
        {PHASE_PRE_ACCOUNT && (
          <>
            <Text style={styles.q}>Right now you want to…</Text>
            <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Training phase">
              {TRAINING_PHASES.map((p) => (
                <Chip key={p.value} label={PHASE_LABELS[p.value] || p.label} selected={quiz.trainingPhase === p.value}
                  onPress={() => setQuizField('trainingPhase', p.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={PHASE_LABELS[p.value] || p.label}
                  style={styles.quizChip}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !ready && styles.ctaOff]} onPress={go} disabled={!ready}
          accessibilityRole="button" accessibilityLabel="See your plan"
        >
          <Text style={styles.ctaText}>See your plan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.black },
  lede: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  section: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
  q: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quizChip: { minHeight: 44 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md, minHeight: 50, justifyContent: 'center' },
  ctaOff: { opacity: 0.5 },
  ctaText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
});
