import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  PHYSIQUE_GOALS, PHYSIQUE_GOAL_GROUPS,
  TRAINING_PHASES,
  phaseToCoachingKey, phaseToNutritionKey, daysToActivityLevel,
} from '../lib/coachingGoals';
import { calculateNutritionTargets, PROTEIN_APPROACHES, ADVANCED_PROTEIN_GOALS } from '../lib/nutritionEngine';
import { saveNutritionTargets } from '../lib/database';

const APPROACH_SHORT = {
  standard:  'Enough for consistent training. Easy to sustain day to day.',
  optimised: 'The proven target for serious training. Best for most people.',
  advanced:  'Upper end for competitive athletes and harder cuts.',
};

const NUTRITION_KEY = '@volyume_nutrition_targets';

export default function ProGoalSetupScreen({ navigation }) {
  const { user, userProfile, saveLocalProfile } = useAppStore();

  const [goalFilterGroup, setGoalFilterGroup] = useState('All');
  const [selectedGoal, setSelectedGoal] = useState(userProfile?.trainingGoal ?? null);
  const [selectedPhase, setSelectedPhase] = useState(userProfile?.trainingPhase ?? null);
  const [proteinApproach, setProteinApproach] = useState(
    userProfile?.proteinApproach
    ?? (ADVANCED_PROTEIN_GOALS.includes(userProfile?.trainingGoal) ? 'advanced' : 'optimised')
  );

  const suggestedApproach = ADVANCED_PROTEIN_GOALS.includes(selectedGoal) ? 'advanced' : 'optimised';
  const canSave = selectedGoal !== null && selectedPhase !== null;

  const filteredGoals = goalFilterGroup === 'All'
    ? PHYSIQUE_GOALS
    : PHYSIQUE_GOALS.filter(g => g.group === goalFilterGroup);

  // Phases that represent a calorie deficit — used to track when the deficit began.
  const DEFICIT_PHASES = ['cut'];

  async function handleSave() {
    if (!canSave) return;

    const goalPhase = phaseToCoachingKey(selectedPhase);

    // Determine whether we're entering, staying in, or leaving a deficit phase.
    const wasInDeficit = DEFICIT_PHASES.includes(userProfile?.trainingPhase);
    const isNowInDeficit = DEFICIT_PHASES.includes(selectedPhase);

    let goalStartDate = userProfile?.goalStartDate ?? null;
    if (isNowInDeficit && !wasInDeficit) {
      // Entering a deficit phase — record the start date.
      goalStartDate = new Date().toISOString();
    } else if (!isNowInDeficit) {
      // Leaving a deficit phase (bulk, maintain, recomp) — clear the date.
      goalStartDate = null;
    }
    // If staying in a deficit phase, preserve the existing start date.

    const updatedProfile = {
      ...(userProfile || {}),
      trainingGoal: selectedGoal,
      trainingPhase: selectedPhase,
      goalPhase,
      proteinApproach,
      goalStartDate,
    };

    // Recalculate nutrition if the phase changed or we have the needed data
    const wp = userProfile || {};
    if (wp.weightKg && wp.heightCm && wp.age && wp.sex) {
      try {
        const targets = calculateNutritionTargets({
          weightKg: wp.weightKg,
          heightCm: wp.heightCm,
          ageYears: wp.age,
          sex: wp.sex,
          bodyFatPct: wp.bodyFatPct ?? null,
          activityLevel: daysToActivityLevel(wp.daysPerWeek ?? 4),
          goal: phaseToNutritionKey(selectedPhase),
          trainingGoal: selectedGoal,
          proteinApproach,
        });
        await AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(targets));
        if (user?.id) {
          await saveNutritionTargets(user.id, targets);
        }
      } catch (_) {}
    }

    await saveLocalProfile(user.id, updatedProfile);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update your goals</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Physique goal ── */}
        <Text style={styles.sectionLabel}>What are you training for?</Text>
        <Text style={styles.sectionSub}>
          Shapes how your plan allocates volume across muscle groups.
        </Text>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['All', ...PHYSIQUE_GOAL_GROUPS].map(group => (
            <TouchableOpacity
              key={group}
              style={[styles.filterChip, goalFilterGroup === group && styles.filterChipActive]}
              onPress={() => setGoalFilterGroup(group)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, goalFilterGroup === group && styles.filterChipTextActive]}>
                {group}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.goalGrid}>
          {filteredGoals.map(g => {
            const active = selectedGoal === g.value;
            return (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalCard, active && styles.goalCardActive]}
                onPress={() => setSelectedGoal(g.value)}
                activeOpacity={0.75}
              >
                <View style={[styles.goalIconWrap, active && styles.goalIconWrapActive]}>
                  <Ionicons name={g.icon} size={20} color={active ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>{g.label}</Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.goalCheck} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Training phase ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Training phase</Text>
        <Text style={styles.sectionSub}>
          Shapes your calorie and nutrition targets, and how hard the plan pushes you.
        </Text>

        {TRAINING_PHASES.map(phase => {
          const active = selectedPhase === phase.value;
          return (
            <TouchableOpacity
              key={phase.value}
              style={[styles.phaseCard, active && styles.phaseCardActive]}
              onPress={() => setSelectedPhase(phase.value)}
              activeOpacity={0.75}
            >
              <View style={styles.phaseIconWrap}>
                <Ionicons name={phase.icon} size={20} color={active ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.phaseBody}>
                <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]}>{phase.label}</Text>
                <Text style={styles.phaseDetail}>{phase.detail}</Text>
              </View>
              {active && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── Protein target ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Protein target</Text>
        <Text style={styles.sectionSub}>
          How much protein your daily targets include. Optimised works for most people.
        </Text>

        {['standard', 'optimised', 'advanced'].map(key => {
          const ap = PROTEIN_APPROACHES[key];
          const active = proteinApproach === key;
          const isSuggested = suggestedApproach === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.phaseCard, active && styles.phaseCardActive]}
              onPress={() => setProteinApproach(key)}
              activeOpacity={0.75}
            >
              <View style={styles.phaseIconWrap}>
                <Ionicons
                  name="barbell-outline"
                  size={18}
                  color={active ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.phaseBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 }}>
                  <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]}>{ap.label}</Text>
                  <Text style={[styles.approachRange, active && styles.approachRangeActive]}>{ap.range}</Text>
                  {isSuggested && (
                    <View style={styles.suggestedBadge}>
                      <Text style={styles.suggestedBadgeText}>Suggested</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.phaseDetail}>{APPROACH_SHORT[key]}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}

        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            Changing your goals updates your plan targets immediately. Your Precision Coaching adjusts at the next check-in.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  sectionLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, letterSpacing: 0.2, marginBottom: spacing.xs,
  },
  sectionLabelSpaced: { marginTop: spacing.xxl },
  sectionSub: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17,
    marginBottom: spacing.md,
  },

  filterRow: { gap: spacing.sm, paddingBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primaryBg, borderColor: colors.primary,
  },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },

  goalGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md,
  },
  goalCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, alignItems: 'flex-start', gap: spacing.xs,
  },
  goalCardActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  goalIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  goalIconWrapActive: { backgroundColor: colors.surface },
  goalLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, flexShrink: 1 },
  goalLabelActive: { color: colors.primary },
  goalCheck: { marginTop: 2 },

  phaseCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.sm,
  },
  phaseCardActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  phaseIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  phaseBody: { flex: 1 },
  phaseLabel: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  phaseLabelActive: { color: colors.primary },
  phaseDetail: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },

  footerNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.xl, marginBottom: spacing.xl,
  },
  footerNoteText: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },

  approachRange: {
    fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium,
  },
  approachRangeActive: { color: colors.primaryDim },
  suggestedBadge: {
    backgroundColor: colors.primary + '20', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 1,
  },
  suggestedBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.surface2 },
  saveBtnText: { color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  saveBtnTextDisabled: { color: colors.textMuted },
});
