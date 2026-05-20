import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

const QUESTIONS = [
  {
    key: 'goal',
    question: 'What is your primary goal?',
    options: ['Build muscle', 'Get stronger', 'General fitness'],
  },
  {
    key: 'experience',
    question: 'How long have you been lifting?',
    options: ['New to lifting (< 1 year)', 'Intermediate (1–3 years)', 'Advanced (3+ years)'],
  },
  {
    key: 'weakPoint',
    question: 'Any area you want to bring up? (optional)',
    options: ['Upper body', 'Lower body', 'Everywhere equally', 'Skip'],
  },
];

function getTemplates(days) {
  if (days === '2–3 days') {
    return [
      { name: 'Full Body 3-Day', description: 'Hit every muscle group 3× per week. Best for beginners and those with limited time.', tag: 'Recommended' },
      { name: 'Upper / Lower Split', description: '2 upper + 2 lower sessions per week. Great for balanced development.', tag: null },
      { name: 'Push / Pull / Legs 3-Day', description: 'Each session targets a different movement pattern. Good for intermediates.', tag: null },
    ];
  } else if (days === '4 days') {
    return [
      { name: 'Upper / Lower 4-Day', description: '2 upper + 2 lower sessions. The evidence-backed sweet spot for hypertrophy frequency.', tag: 'Recommended' },
      { name: 'Push / Pull / Legs + Arms', description: '4-day split with a dedicated arm session. Popular for physique goals.', tag: null },
      { name: 'Full Body 4-Day', description: 'Higher frequency, ideal if you want to train each muscle group twice per week.', tag: null },
    ];
  } else {
    return [
      { name: 'Push / Pull / Legs 6-Day', description: 'Classic PPL run twice per week. High volume, high frequency.', tag: 'Recommended' },
      { name: 'Body Part Split 5-Day', description: 'Dedicated session per muscle group. The traditional hypertrophy approach.', tag: null },
      { name: 'Upper / Lower + Specialisation', description: '4-day U/L base with 1–2 extra sessions targeting weak points.', tag: null },
    ];
  }
}

function ProgressBar({ step }) {
  return (
    <View style={styles.progressBar}>
      {QUESTIONS.map((_, i) => (
        <View
          key={i}
          style={[styles.progressSegment, i < step && styles.progressSegmentFilled]}
        />
      ))}
    </View>
  );
}

function TemplateCard({ template }) {
  return (
    <View style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{template.name}</Text>
        {template.tag && (
          <View style={styles.tagChip}>
            <Text style={styles.tagChipText}>{template.tag}</Text>
          </View>
        )}
      </View>
      <Text style={styles.templateDesc}>{template.description}</Text>
    </View>
  );
}

export default function OnboardingQuizScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0–3 = questions, 4 = results
  const [answers, setAnswers] = useState({
    goal: null,
    experience: null,
    days: null,
    weakPoint: null,
  });

  function handleSelect(option) {
    const key = QUESTIONS[step].key;
    const updated = { ...answers, [key]: option };
    setAnswers(updated);
    setStep(s => s + 1);
  }

  function handleBack() {
    if (step === 0) {
      navigation.goBack();
    } else {
      setStep(s => s - 1);
    }
  }

  if (step === 4) {
    const templates = getTemplates(answers.days || '4 days');
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.resultsHeading}>Here are 3 programmes that fit your goals</Text>
          <Text style={styles.resultsSubtitle}>
            Based on your answers, these are good starting points.
          </Text>

          <View style={styles.templateList}>
            {templates.map((t, i) => (
              <TemplateCard key={i} template={t} />
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('PlanLibrary', { fromFirstRun: true })}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Browse all programmes</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('ActiveWorkout', { blank: true })}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Start with a blank workout</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </TouchableOpacity>

          <Text style={styles.footnote}>
            You can change programme at any time from the Plans tab.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const current = QUESTIONS[step];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backLink}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          <Text style={styles.backLinkText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ProgressBar step={step} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>Question {step + 1} of {QUESTIONS.length}</Text>
        <Text style={styles.question}>{current.question}</Text>

        <View style={styles.optionList}>
          {current.options.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.optionCard}
              onPress={() => handleSelect(option)}
              activeOpacity={0.75}
            >
              <Text style={styles.optionText}>{option}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backLinkText: { fontSize: fontSize.sm, color: colors.textSecondary },
  progressBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface2,
  },
  progressSegmentFilled: {
    backgroundColor: colors.primary,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  stepLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
  },
  question: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  optionList: { gap: spacing.md },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },

  // Results screen
  resultsHeading: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    lineHeight: 28,
    marginTop: spacing.xl,
  },
  resultsSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  templateList: { gap: spacing.md },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  templateName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  tagChip: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  templateDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  footnote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
