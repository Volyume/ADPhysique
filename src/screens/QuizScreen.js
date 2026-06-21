/**
 * COMP-030 — the pre-account quiz (Variant B, §4B steps 2–3).
 *
 * Two sections — how you train, what you train for — answered before any
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
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

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipOn]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

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
        <Text style={styles.h1}>Eight quick questions.</Text>
        <Text style={styles.lede}>Your plan takes shape as you answer.</Text>

        <Text style={styles.section}>How do you train?</Text>
        <Text style={styles.q}>Experience</Text>
        <View style={styles.row}>
          {EXPERIENCE.map((o) => (
            <Chip key={o.value} label={o.label} selected={quiz.experience === o.value}
              onPress={() => setQuizField('experience', o.value)} />
          ))}
        </View>
        <Text style={styles.q}>Days a week</Text>
        <View style={styles.row}>
          {DAYS.map((d) => (
            <Chip key={d} label={String(d)} selected={quiz.daysPerWeek === d}
              onPress={() => setQuizField('daysPerWeek', d)} />
          ))}
        </View>
        <Text style={styles.q}>Session length</Text>
        <View style={styles.row}>
          {LENGTHS.map((m) => (
            <Chip key={m} label={`${m} min`} selected={quiz.sessionLengthMinutes === m}
              onPress={() => setQuizField('sessionLengthMinutes', m)} />
          ))}
        </View>
        <Text style={styles.q}>Equipment</Text>
        <View style={styles.row}>
          {EQUIPMENT.map((o) => (
            <Chip key={o.value} label={o.label} selected={quiz.equipment === o.value}
              onPress={() => setQuizField('equipment', o.value)} />
          ))}
        </View>

        <Text style={styles.section}>What are you training for?</Text>
        <View style={styles.row}>
          {PHYSIQUE_GOALS.map((g) => (
            <Chip key={g.value} label={GOAL_LABELS[g.value] || g.label} selected={quiz.trainingGoal === g.value}
              onPress={() => setQuizField('trainingGoal', g.value)} />
          ))}
        </View>
        {PHASE_PRE_ACCOUNT && (
          <>
            <Text style={styles.q}>Right now you want to…</Text>
            <View style={styles.row}>
              {TRAINING_PHASES.map((p) => (
                <Chip key={p.value} label={PHASE_LABELS[p.value] || p.label} selected={quiz.trainingPhase === p.value}
                  onPress={() => setQuizField('trainingPhase', p.value)} />
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
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.black },
  lede: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  section: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
  q: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary, fontSize: fontSize.sm },
  chipTextOn: { color: colors.onPrimary, fontWeight: fontWeight.bold },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md, minHeight: 50, justifyContent: 'center' },
  ctaOff: { opacity: 0.5 },
  ctaText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
});
