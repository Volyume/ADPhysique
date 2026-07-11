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
import { colors, spacing, radius, fontSize, fontWeight, type, circle } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Chip from '../components/Chip';
import useAppStore from '../store/useAppStore';
import { PHYSIQUE_GOALS, GOAL_LABELS, TRAINING_PHASES, PHASE_LABELS } from '../lib/coachingGoals';
import { PHASE_PRE_ACCOUNT } from '../lib/onboarding/quizFlow';

// Onboarding finish (quiz progress indicator): every sibling wizard in the
// first-run path shows the user how far through they are (ProOnboarding's
// numbered fill bar, FreeStarterScreen's dot row); this single-page quiz had
// none at all. Reuses FreeStarterScreen's exact dot pattern rather than
// inventing a new affordance, one dot per question actually answerable on
// this screen, lit as it's answered. trainingPhase is included only when
// PHASE_PRE_ACCOUNT is on, matching the question it gates below.
const QUIZ_PROGRESS_FIELDS = [
  'experience', 'daysPerWeek', 'sessionLengthMinutes', 'equipment', 'trainingGoal',
  ...(PHASE_PRE_ACCOUNT ? ['trainingPhase'] : []),
];

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
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen never renders a FlatList/FlashList/SectionList row (everything is
  // a fixed .map inside a ScrollView), so an unmemoised call matches
  // AddCustomFoodScreen's own precedent (batch D).
  const t = useTheme();
  const live = buildLiveStyles(t);

  const ready = quiz.experience && quiz.daysPerWeek && quiz.trainingGoal;
  const answeredCount = QUIZ_PROGRESS_FIELDS.filter((k) => quiz[k] !== undefined && quiz[k] !== null).length;

  function go() {
    markQuizStep('quiz_done');
    navigation.navigate('PlanPreview');
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        {/* NAV-8: the flow had no way back (headerless stack screen), and the
            headline promised eight questions while rendering six. */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={t.colors.textPrimary} />
        </TouchableOpacity>
        {/* Quiz progress indicator: same dot pattern as FreeStarterScreen's
            sibling quiz, decorative only (the questions themselves already
            carry accessible state via each chip's radio role). */}
        <View
          style={styles.progressDots}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {QUIZ_PROGRESS_FIELDS.map((_, i) => (
            <View key={i} style={[styles.dot, live.dot, i < answeredCount && [styles.dotActive, live.dotActive]]} />
          ))}
        </View>
        {/* Spacer balances the back chevron so the dots sit centred */}
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.h1, live.h1]}>A few quick questions.</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.lede, live.lede]}>Your plan takes shape as you answer.</Text>

        <Text maxFontSizeMultiplier={1.3} style={[styles.section, live.section]}>How do you train?</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.q, live.q]}>Experience</Text>
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
        <Text maxFontSizeMultiplier={1.3} style={[styles.q, live.q]}>Days a week</Text>
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
        <Text maxFontSizeMultiplier={1.3} style={[styles.q, live.q]}>Session length</Text>
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
        <Text maxFontSizeMultiplier={1.3} style={[styles.q, live.q]}>Equipment</Text>
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

        <Text maxFontSizeMultiplier={1.3} style={[styles.section, live.section]}>What are you training for?</Text>
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
            <Text maxFontSizeMultiplier={1.3} style={[styles.q, live.q]}>Right now you want to…</Text>
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

      <View style={[styles.footer, live.footer]}>
        <TouchableOpacity
          style={[styles.cta, live.cta, !ready && styles.ctaOff]} onPress={go} disabled={!ready}
          accessibilityRole="button" accessibilityLabel="See your plan"
        >
          <Text maxFontSizeMultiplier={1.3} style={[styles.ctaText, live.ctaText]}>See your plan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  progressDots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: circle(8), backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.black },
  lede: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  section: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
  q: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quizChip: { minHeight: 44 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  cta: { backgroundColor: colors.primaryFill, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md, minHeight: 50, justifyContent: 'center' },
  ctaOff: { opacity: 0.5 },
  ctaText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
});

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/minHeight, no token) and fontWeight (not part of
// useTheme()'s shape) are correctly omitted -- there is nothing to unfreeze
// for them. Same pattern as AddCustomFoodScreen.js's buildLiveStyles
// (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    dot: { backgroundColor: t.colors.border },
    dotActive: { backgroundColor: t.colors.primary },
    h1: { color: t.colors.textPrimary, fontSize: t.fontSize.xxl },
    lede: { ...t.type.body, color: t.colors.textSecondary },
    section: { color: t.colors.textPrimary, fontSize: t.fontSize.lg },
    q: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    footer: { borderTopColor: t.colors.borderSubtle },
    cta: { backgroundColor: t.colors.primaryFill },
    ctaText: { color: t.colors.onPrimary, fontSize: t.fontSize.md },
  };
}
