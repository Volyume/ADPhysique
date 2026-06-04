import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import Dropdown from '../components/Dropdown';
import SegmentedControl from '../components/SegmentedControl';
import BackHeader from '../components/BackHeader';
import { useToast } from '../components/Toast';
import {
  PHYSIQUE_GOALS,
  TRAINING_PHASES,
  GOALS_WITH_WEAK_POINTS, WEAK_POINT_MUSCLES,
  phaseToCoachingKey, phaseToNutritionKey, daysToActivityLevel,
} from '../lib/coachingGoals';
import { calculateNutritionTargets, PROTEIN_APPROACHES, ADVANCED_PROTEIN_GOALS } from '../lib/nutritionEngine';
import { saveNutritionTargets, getMorningWeightsLast14Days } from '../lib/database';
import { computeEWMA } from '../lib/weeklyCoach';
import { formatBodyWeightShort } from '../lib/units';
import { generateAndSavePlan } from '../lib/planAutoGen';

const APPROACH_SHORT = {
  standard:  'Enough for consistent training. Easy to sustain day to day.',
  optimised: 'The proven target for serious training. Best for most people.',
  advanced:  'Upper end for competitive athletes and harder cuts.',
};

// Training setup options, mirror the lists in ProOnboardingScreen so
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
  const toast = useToast();
  const { user, userProfile, saveLocalProfile } = useAppStore();

  const [selectedGoal, setSelectedGoal] = useState(userProfile?.trainingGoal ?? null);
  const [selectedPhase, setSelectedPhase] = useState(userProfile?.trainingPhase ?? 'lean_gain');
  const [proteinApproach, setProteinApproach] = useState(
    userProfile?.proteinApproach
    ?? (ADVANCED_PROTEIN_GOALS.includes(userProfile?.trainingGoal) ? 'advanced' : 'optimised')
  );
  // Weak points, only meaningful for goals that bias volume toward priority
  // muscles. Hidden in the UI otherwise but the value is preserved across edits.
  const [planWeakPoints, setPlanWeakPoints] = useState(userProfile?.planWeakPoints ?? []);
  // Training setup, prefilled from the user's existing profile so they
  // can review and tweak. Changing any of these rerolls the plan around
  // the new values (different days, equipment, experience all affect
  // exercise selection + volume).
  const [experience, setExperience] = useState(userProfile?.experience ?? 'intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(userProfile?.daysPerWeek ?? 4);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(userProfile?.sessionLengthMinutes ?? 60);
  const [equipment, setEquipment] = useState(userProfile?.equipment ?? 'full_gym');
  const [recoveryRating, setRecoveryRating] = useState(userProfile?.recoveryRating ?? 'average');

  // The weight the targets are actually built from: the smoothed morning-weight
  // trend if there's history, otherwise the profile value. Read-only here, the
  // user changes it by logging a morning weight on Home, not in the builder.
  const [displayWeightKg, setDisplayWeightKg] = useState(userProfile?.weightKg ?? null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        const weights = await getMorningWeightsLast14Days(user.id);
        if (cancelled || !weights?.length) return;
        const ewma = computeEWMA(weights);
        const latest = ewma[ewma.length - 1]?.ewmaKg ?? weights[weights.length - 1]?.weightKg;
        if (typeof latest === 'number' && latest > 0) setDisplayWeightKg(latest);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const suggestedApproach = ADVANCED_PROTEIN_GOALS.includes(selectedGoal) ? 'advanced' : 'optimised';
  const weakPointsApplicable = GOALS_WITH_WEAK_POINTS.includes(selectedGoal);
  const canSave = selectedGoal !== null && selectedPhase !== null;

  function toggleWeakPoint(muscle) {
    setPlanWeakPoints(prev => {
      if (prev.includes(muscle)) return prev.filter(m => m !== muscle);
      if (prev.length >= 3) {
        toast.show('Pick up to 3 muscles. Deselect one first', { variant: 'warning' });
        return prev;
      }
      return [...prev, muscle];
    });
  }

  // Phases that represent a calorie deficit, used to track when the deficit began.
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
      // Entering a deficit phase, record the start date.
      goalStartDate = new Date().toISOString();
    } else if (!isNowInDeficit) {
      // Leaving a deficit phase (bulk, maintain, recomp), clear the date.
      goalStartDate = null;
    }
    // If staying in a deficit phase, preserve the existing start date.

    // Only keep weak points if the new goal supports them, switching to a
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
      // Training setup fields, picking up changes the user made to
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
    // on goal change, the previous behaviour silently skipped recalc when
    // any of weightKg/heightCm/age/sex was missing, which left the
    // Nutrition widget on Athlete Hub showing stale values.
    const { userProfile: latestProfile } = useAppStore.getState();
    const wp = latestProfile || userProfile || {};

    // The profile's weightKg is the enrolment-day reading and never
    // updates as the user logs morning weights. For nutrition target
    // recalculation we want the LATEST reading (or the smoothed
    // 7-day trend) so the calorie / protein targets track the user's
    // actual current body weight. Fall back to the profile value if
    // there's no morning-weight history.
    let latestWeightKg = wp.weightKg;
    try {
      if (user?.id) {
        const weights = await getMorningWeightsLast14Days(user.id);
        if (weights?.length) {
          const ewma = computeEWMA(weights);
          latestWeightKg = ewma[ewma.length - 1]?.ewmaKg ?? weights[weights.length - 1]?.weightKg ?? wp.weightKg;
        }
      }
    } catch (_) {}

    const safeWeightKg = (typeof latestWeightKg === 'number' && latestWeightKg > 0) ? latestWeightKg : 80;
    const safeHeightCm = (typeof wp.heightCm === 'number' && wp.heightCm > 0) ? wp.heightCm : 175;
    const safeAge      = (typeof wp.age === 'number' && wp.age > 0) ? wp.age : 28;
    const safeSex      = wp.sex === 'female' ? 'female' : 'male';

    // Also persist the latest weight back into the profile so other
    // surfaces that read userProfile.weightKg (BodyMetrics summary,
    // BMR readout, etc) see the current value instead of the stale
    // enrolment-day reading.
    if (latestWeightKg && latestWeightKg !== wp.weightKg) {
      try {
        if (user?.id && typeof saveLocalProfile === 'function') {
          await saveLocalProfile(user.id, { ...wp, weightKg: latestWeightKg });
        }
      } catch (_) {}
    }

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
    } catch (_e) {
      // Don't block the goal save if the recalc fails. Surface to the user
      // so they know targets weren't updated this time.
      toast.show("Goal saved, but targets didn't recalculate. Open Nutrition Targets to refresh", { variant: 'warning', duration: 5000 });
    }

    await saveLocalProfile(user.id, updatedProfile);

    // Pro users keep an always-active plan, a goal change resets the
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
      // Don't block navigation, the goal is saved, nutrition updated. Just
      // tell the user the plan side didn't reroll so they can retry from Home.
      toast.show(`Goal and targets saved, but the plan didn't reroll (${planResult.error}). On Home, tap Build my plan to retry`, { variant: 'warning', duration: 5000 });
    }

    // Navigate to the change-summary screen instead of just popping back so
    // the user can see exactly what shifted and why. planRerolled tells the
    // summary whether the active plan was rebuilt (the path generateAndSavePlan
    // returns ok) or left in place (engine failure, see the toast above).
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
      <BackHeader title="Update your plan" />

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
          Only matters if you're chasing a competitive physique. It biases your plan toward the muscles that category is judged on.
        </Text>

        <Dropdown
          value={selectedGoal}
          options={PHYSIQUE_GOALS.map(g => ({ value: g.value, label: g.label, sub: g.subtitle }))}
          onChange={setSelectedGoal}
          placeholder="Not competing, General"
        />

        {/* ── Weak points (only for goals that support them) ── */}
        {weakPointsApplicable && (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
              Weak points <Text style={styles.optionalTag}>(optional, max 3)</Text>
            </Text>
            <Text style={styles.sectionSub}>
              Muscles you want to bring up. Your plan puts extra work into them.
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
          Drives your calorie target and how the plan is built.
        </Text>

        <Dropdown
          value={selectedPhase}
          options={TRAINING_PHASES.map(p => ({ value: p.value, label: p.label, sub: p.detail }))}
          onChange={setSelectedPhase}
          placeholder="Select your focus"
        />

        {/* ── Training experience ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Experience</Text>
        <Text style={styles.sectionSub}>
          This sets your starting volume and exercise selection. Change it as you get more experience.
        </Text>
        <Dropdown
          value={experience}
          options={EXPERIENCE_OPTIONS}
          onChange={setExperience}
          placeholder="Select your experience"
        />

        {/* ── Training schedule ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Training days per week</Text>
        <Text style={styles.sectionSub}>
          Changing how many days you train changes the exercise mix. Your plan rebuilds around it.
        </Text>
        <SegmentedControl
          options={DAYS_OPTIONS.map(d => ({ label: String(d), value: d }))}
          value={daysPerWeek}
          onChange={setDaysPerWeek}
          accessibilityLabel="Training days per week"
        />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Session length</Text>
        <SegmentedControl
          options={SESSION_LENGTH_OPTIONS}
          value={sessionLengthMinutes}
          onChange={setSessionLengthMinutes}
          accessibilityLabel="Session length"
        />

        {/* ── Equipment ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Equipment</Text>
        <Text style={styles.sectionSub}>
          What you have access to. The exercises adapt to your equipment.
        </Text>
        <Dropdown
          value={equipment}
          options={EQUIPMENT_OPTIONS}
          onChange={setEquipment}
          placeholder="Select your equipment"
        />

        {/* ── Recovery ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Recovery</Text>
        <Text style={styles.sectionSub}>
          How well you're recovering between sessions. This sets how hard the coach pushes your progress.
        </Text>
        <Dropdown
          value={recoveryRating}
          options={RECOVERY_OPTIONS}
          onChange={setRecoveryRating}
          placeholder="Select your recovery"
        />

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
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={ap.label}
            >
              <View style={styles.phaseIconWrap}>
                <Ionicons
                  name="barbell-outline"
                  size={18}
                  color={active ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.phaseBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs }}>
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

        {displayWeightKg ? (
          <View style={styles.footerNote}>
            <Ionicons name="scale-outline" size={15} color={colors.textMuted} />
            <Text style={styles.footerNoteText}>
              Targets use your latest weight, {formatBodyWeightShort(displayWeightKg, userProfile?.bodyWeightUnits ?? 'st')}. Log a new one on Home.
            </Text>
          </View>
        ) : null}

        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            Changing your goals updates your plan targets immediately. Precision Coaching adjusts at the next check-in.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          accessibilityLabel="Rebuild my plan"
        >
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Rebuild my plan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  sectionLabel: {
    ...type.label,
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  sectionLabelSpaced: { marginTop: spacing.xxl },
  sectionSub: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17,
    marginBottom: spacing.md,
  },

  optionalTag: {
    ...type.caption,
    color: colors.textMuted,
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
    ...type.bodyStrong,
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
    backgroundColor: withAlpha(colors.primary, 0.125), borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 1,
  },
  suggestedBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, color: colors.primary },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.surface2 },
  saveBtnText: { color: colors.background, ...type.bodyStrong },
  saveBtnTextDisabled: { color: colors.textMuted },

});
