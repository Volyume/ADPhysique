import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  PHYSIQUE_GOALS, PHYSIQUE_GOAL_GROUPS,
  TRAINING_PHASES,
  GOALS_WITH_WEAK_POINTS,
  phaseToCoachingKey, phaseToNutritionKey, daysToActivityLevel,
} from '../lib/coachingGoals';

// Weak-point options. Matches the list used elsewhere so plan generation
// receives names it recognises.
const WEAK_POINT_MUSCLES = [
  'Chest', 'Upper Chest', 'Lats / Back Width', 'Back Thickness',
  'Side Delts', 'Rear Delts', 'Front Delts',
  'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Core / Abs', 'Traps',
];
import { calculateNutritionTargets, PROTEIN_APPROACHES, ADVANCED_PROTEIN_GOALS } from '../lib/nutritionEngine';
import { saveNutritionTargets } from '../lib/database';
import { generateAndSavePlan } from '../lib/planAutoGen';

const APPROACH_SHORT = {
  standard:  'Enough for consistent training. Easy to sustain day to day.',
  optimised: 'The proven target for serious training. Best for most people.',
  advanced:  'Upper end for competitive athletes and harder cuts.',
};

// Training setup options — mirror the lists in ProOnboardingScreen so
// re-running this screen produces the same plan structure as a fresh
// wizard run with identical answers.
const EXPERIENCE_OPTIONS = [
  { value: 'beginner',     label: 'Beginner',     sub: 'Less than 18 months of consistent training' },
  { value: 'intermediate', label: 'Intermediate', sub: '18 months to 3 years of consistent training' },
  { value: 'advanced',     label: 'Advanced',     sub: '3 to 5 years, consistently adding weight over time' },
  { value: 'competitive',  label: 'Competitive',  sub: '5+ years, training for physique or performance' },
];

const DAYS_OPTIONS = [3, 4, 5, 6];

const SESSION_LENGTH_OPTIONS = [
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
  { label: '90 min', value: 90 },
];

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym',        label: 'Full Gym',          sub: 'Barbells, cables, machines, dumbbells' },
  { value: 'machines_cables', label: 'Machines & Cables', sub: 'No free barbells' },
  { value: 'dumbbells_only',  label: 'Dumbbells Only',    sub: 'Adjustable or fixed dumbbells' },
  { value: 'barbell_plates',  label: 'Barbell & Plates',  sub: 'Power rack or squat stand setup' },
  { value: 'home_gym',        label: 'Home Gym',          sub: 'Mixed equipment at home' },
  { value: 'bodyweight',      label: 'Bodyweight',        sub: 'No equipment needed' },
];

const RECOVERY_OPTIONS = [
  { value: 'poor',    label: 'Poor',    sub: 'Often sore, disrupted sleep, high life stress' },
  { value: 'average', label: 'Average', sub: 'Typical recovery between sessions' },
  { value: 'good',    label: 'Good',    sub: 'Sleeping well, low stress, nutrition on point' },
];

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
  // Weak points — only meaningful for goals that bias volume toward priority
  // muscles. Hidden in the UI otherwise but the value is preserved across edits.
  const [planWeakPoints, setPlanWeakPoints] = useState(userProfile?.planWeakPoints ?? []);
  // Training setup — prefilled from the user's existing profile so they
  // can review and tweak. Changing any of these rerolls the plan around
  // the new values (different days, equipment, experience all affect
  // exercise selection + volume).
  const [experience, setExperience] = useState(userProfile?.experience ?? 'intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(userProfile?.daysPerWeek ?? 4);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(userProfile?.sessionLengthMinutes ?? 60);
  const [equipment, setEquipment] = useState(userProfile?.equipment ?? 'full_gym');
  const [recoveryRating, setRecoveryRating] = useState(userProfile?.recoveryRating ?? 'average');

  const suggestedApproach = ADVANCED_PROTEIN_GOALS.includes(selectedGoal) ? 'advanced' : 'optimised';
  const weakPointsApplicable = GOALS_WITH_WEAK_POINTS.includes(selectedGoal);
  const canSave = selectedGoal !== null && selectedPhase !== null;

  function toggleWeakPoint(muscle) {
    setPlanWeakPoints(prev => {
      if (prev.includes(muscle)) return prev.filter(m => m !== muscle);
      if (prev.length >= 3) {
        Alert.alert('Max 3 muscles', 'Deselect one before adding another.');
        return prev;
      }
      return [...prev, muscle];
    });
  }

  const filteredGoals = goalFilterGroup === 'All'
    ? PHYSIQUE_GOALS
    : PHYSIQUE_GOALS.filter(g => g.group === goalFilterGroup);

  // Phases that represent a calorie deficit — used to track when the deficit began.
  const DEFICIT_PHASES = ['cut'];

  async function handleSave() {
    if (!canSave) return;

    const goalPhase = phaseToCoachingKey(selectedPhase);

    // Capture the previous state for the change-summary screen.
    const previousProfile = {
      goal: userProfile?.trainingGoal ?? null,
      phase: userProfile?.trainingPhase ?? null,
      approach: userProfile?.proteinApproach ?? null,
    };
    let previousTargets = null;
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_KEY);
      if (raw) previousTargets = JSON.parse(raw);
    } catch (_) {}

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

    // Only keep weak points if the new goal supports them — switching to a
    // non-applicable goal clears them so the plan generator doesn't keep
    // biasing toward muscles the user no longer wants prioritised.
    const nextWeakPoints = GOALS_WITH_WEAK_POINTS.includes(selectedGoal)
      ? planWeakPoints
      : [];

    const updatedProfile = {
      ...(userProfile || {}),
      trainingGoal: selectedGoal,
      trainingPhase: selectedPhase,
      goalPhase,
      proteinApproach,
      goalStartDate,
      planWeakPoints: nextWeakPoints,
      // Training setup fields — picking up changes the user made to
      // experience / schedule / equipment / recovery. generateAndSavePlan
      // reads these from the profile to drive plan generation.
      experience,
      daysPerWeek,
      sessionLengthMinutes,
      equipment,
      recoveryRating,
    };

    // Recalculate nutrition. Pulls userProfile from the store to make sure we
    // pick up any changes (e.g. weight logged from BodyMetrics) since this
    // screen mounted. Uses sensible fallbacks for any missing field so a
    // partially-set profile still gets its kcal / protein targets refreshed
    // on goal change — the previous behaviour silently skipped recalc when
    // any of weightKg/heightCm/age/sex was missing, which left the
    // Nutrition widget on Athlete Hub showing stale values.
    const { userProfile: latestProfile } = useAppStore.getState();
    const wp = latestProfile || userProfile || {};
    const safeWeightKg = (typeof wp.weightKg === 'number' && wp.weightKg > 0) ? wp.weightKg : 80;
    const safeHeightCm = (typeof wp.heightCm === 'number' && wp.heightCm > 0) ? wp.heightCm : 175;
    const safeAge      = (typeof wp.age === 'number' && wp.age > 0) ? wp.age : 28;
    const safeSex      = wp.sex === 'female' ? 'female' : 'male';

    let nextTargets = null;
    try {
      nextTargets = calculateNutritionTargets({
        weightKg: safeWeightKg,
        heightCm: safeHeightCm,
        ageYears: safeAge,
        sex: safeSex,
        bodyFatPct: wp.bodyFatPct ?? null,
        activityLevel: daysToActivityLevel(daysPerWeek),
        goal: phaseToNutritionKey(selectedPhase),
        trainingGoal: selectedGoal,
        proteinApproach,
      });
      await AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nextTargets));
      if (user?.id) {
        await saveNutritionTargets(user.id, nextTargets);
      }
    } catch (e) {
      // Don't block the goal save if the recalc fails. Surface to the user
      // so they know targets weren't updated this time.
      Alert.alert(
        'Nutrition targets not updated',
        'Your goal was saved but we couldn\'t recalculate the targets. Try opening Nutrition Targets to refresh them.',
      );
    }

    await saveLocalProfile(user.id, updatedProfile);

    // Pro users keep an always-active plan — a goal change resets the
    // mesocycle to week 1 of a freshly-generated plan that reflects the
    // new goal/phase. The previous plan is deactivated by
    // activatePlanWithBlock; session history stays intact.
    let planResult = { ok: false, error: 'not attempted' };
    try {
      planResult = await generateAndSavePlan(user.id, updatedProfile);
    } catch (e) {
      planResult = { ok: false, error: e?.message ?? 'unknown' };
    }
    if (!planResult.ok) {
      // Don't block navigation — the goal is saved, nutrition updated. Just
      // tell the user the plan side didn't reroll so they can retry from Home.
      Alert.alert(
        'Plan didn\'t update',
        `Your goal and calorie targets are saved, but the training plan didn\'t reroll for the new goal (${planResult.error}). Open Home and tap "Build my plan" to retry.`,
      );
    }

    // Navigate to the change-summary screen instead of just popping back so
    // the user can see exactly what shifted and why. planRerolled tells the
    // summary whether the active plan was rebuilt (the path generateAndSavePlan
    // returns ok) or left in place (engine failure, see the Alert above).
    navigation.replace('GoalChangeSummary', {
      previous: {
        goal: previousProfile.goal,
        phase: previousProfile.phase,
        approach: previousProfile.approach,
        kcal: previousTargets?.targetKcal ?? null,
        protein: previousTargets?.proteinG ?? null,
        carbs: previousTargets?.carbsG ?? null,
        fat: previousTargets?.fatG ?? null,
      },
      next: {
        goal: selectedGoal,
        phase: selectedPhase,
        approach: proteinApproach,
        kcal: nextTargets?.targetKcal ?? null,
        protein: nextTargets?.proteinG ?? null,
        carbs: nextTargets?.carbsG ?? null,
        fat: nextTargets?.fatG ?? null,
      },
      planRerolled: !!planResult?.ok,
    });
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
        <Text style={styles.headerTitle}>Update your plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Physique category (optional) ──
            Most users leave this on "Not competing, General". Competitive
            lifters pick their division so volume gets biased toward the
            muscles their category is judged on. */}
        <Text style={styles.sectionLabel}>Competing in a category? (optional)</Text>
        <Text style={styles.sectionSub}>
          Only matters if you're chasing a competitive physique. Biases plan volume toward the muscles that category is judged on.
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

        {/* ── Weak points (only for goals that support them) ── */}
        {weakPointsApplicable && (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
              Weak points <Text style={styles.optionalTag}>(optional, max 3)</Text>
            </Text>
            <Text style={styles.sectionSub}>
              Muscles you want to bring up. Your plan biases extra volume towards them.
            </Text>
            <View style={styles.weakPointGrid}>
              {WEAK_POINT_MUSCLES.map(muscle => {
                const sel = planWeakPoints.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.weakPointChip, sel && styles.weakPointChipSelected]}
                    onPress={() => toggleWeakPoint(muscle)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.weakPointChipText, sel && styles.weakPointChipTextSelected]}>
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Current focus (primary question post-merge) ──
            Drives nutrition, plan structure, and emphasis overlays
            (weak_point spec, strength_size's isolation reduction). */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>What are you focused on right now?</Text>
        <Text style={styles.sectionSub}>
          Drives your calorie target and how the plan is built. Pick what your current block is doing.
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

        {/* ── Training experience ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Experience</Text>
        <Text style={styles.sectionSub}>
          Sets starting volume and exercise selection. You can change this when your training maturity moves.
        </Text>
        {EXPERIENCE_OPTIONS.map(opt => {
          const active = experience === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.phaseCard, active && styles.phaseCardActive]}
              onPress={() => setExperience(opt.value)}
              activeOpacity={0.75}
            >
              <View style={styles.phaseIconWrap}>
                <Ionicons name="trophy-outline" size={18} color={active ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.phaseBody}>
                <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]}>{opt.label}</Text>
                <Text style={styles.phaseDetail}>{opt.sub}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}

        {/* ── Training schedule ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Training days per week</Text>
        <Text style={styles.sectionSub}>
          Changing the split affects exercise spread. Plan rebuilds around the new frequency.
        </Text>
        <View style={styles.chipRow}>
          {DAYS_OPTIONS.map(d => {
            const active = daysPerWeek === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.scheduleChip, active && styles.scheduleChipActive]}
                onPress={() => setDaysPerWeek(d)}
                activeOpacity={0.75}
              >
                <Text style={[styles.scheduleChipText, active && styles.scheduleChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Session length</Text>
        <View style={styles.chipRow}>
          {SESSION_LENGTH_OPTIONS.map(opt => {
            const active = sessionLengthMinutes === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.scheduleChip, active && styles.scheduleChipActive]}
                onPress={() => setSessionLengthMinutes(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.scheduleChipText, active && styles.scheduleChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Equipment ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Equipment</Text>
        <Text style={styles.sectionSub}>
          What you have access to. Exercise selection adapts to the kit available.
        </Text>
        {EQUIPMENT_OPTIONS.map(opt => {
          const active = equipment === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.phaseCard, active && styles.phaseCardActive]}
              onPress={() => setEquipment(opt.value)}
              activeOpacity={0.75}
            >
              <View style={styles.phaseIconWrap}>
                <Ionicons name="barbell-outline" size={18} color={active ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.phaseBody}>
                <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]}>{opt.label}</Text>
                <Text style={styles.phaseDetail}>{opt.sub}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}

        {/* ── Recovery ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Recovery</Text>
        <Text style={styles.sectionSub}>
          How well you're recovering between sessions. Influences how aggressively the coach progresses you.
        </Text>
        {RECOVERY_OPTIONS.map(opt => {
          const active = recoveryRating === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.phaseCard, active && styles.phaseCardActive]}
              onPress={() => setRecoveryRating(opt.value)}
              activeOpacity={0.75}
            >
              <View style={styles.phaseIconWrap}>
                <Ionicons name="bed-outline" size={18} color={active ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.phaseBody}>
                <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]}>{opt.label}</Text>
                <Text style={styles.phaseDetail}>{opt.sub}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
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
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Rebuild my plan</Text>
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

  optionalTag: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.regular,
  },
  weakPointGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  weakPointChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weakPointChipSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  weakPointChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  weakPointChipTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

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

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 64,
    alignItems: 'center',
  },
  scheduleChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  scheduleChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  scheduleChipTextActive: { color: colors.primary },
});
