import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePlan, GOAL_LABELS, SPLIT_LABELS } from '../lib/planEngine';
import { getPlanNutritionContext } from '../lib/nutritionEngine';
import { getMesoSchedule, getCurrentMesoWeek } from '../lib/mesocycle';
import { applyPhaseToInputs, getPhaseLabel, getPhaseDescription, buildSessionAddons } from '../lib/phaseEngine';
import { annotateSessionSetTypes } from '../lib/setTypeEngine';
import InfoTooltip from '../components/InfoTooltip';

const NUTRITION_STORAGE_KEY = '@volyume_nutrition_targets';
import {
  createProgramme,
  createRoutine,
  addExerciseToRoutine,
  getAllExercises,
  activatePlanWithBlock,
} from '../lib/database';
import useAppStore from '../store/useAppStore';

// ─── Static data ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

const EXPERIENCE_OPTIONS = [
  { value: 'beginner',     label: 'Beginner',     subtitle: 'Less than 18 months of consistent training' },
  { value: 'intermediate', label: 'Intermediate', subtitle: '18 months to 3 years of consistent training' },
  { value: 'advanced',     label: 'Advanced',     subtitle: '3 to 5 years, consistently adding weight over time' },
  { value: 'competitive',  label: 'Competitive',  subtitle: '5+ years, training for physique or performance' },
];

const TRAINING_AGE_OPTIONS = ['<6 months', '6–18 months', '2–5 years', '5+ years'];

const DAYS_OPTIONS    = [3, 4, 5, 6];
const SESSION_OPTIONS = [
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
  { label: '90 min', value: 90 },
];

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym',        label: 'Full Gym',           icon: 'barbell-outline' },
  { value: 'machines_cables', label: 'Machines & Cables',  icon: 'cog-outline' },
  { value: 'dumbbells_only',  label: 'Dumbbells Only',     icon: 'fitness-outline' },
  { value: 'barbell_plates',  label: 'Barbell & Plates',   icon: 'barbell-outline' },
  { value: 'home_gym',        label: 'Home Gym',           icon: 'home-outline' },
  { value: 'bodyweight',      label: 'Bodyweight',         icon: 'body-outline' },
];

const GOAL_OPTIONS = [
  { value: 'general_hypertrophy',         icon: 'trending-up-outline',   subtitle: 'Balanced muscle growth across the whole body' },
  { value: 'balanced_bodybuilding',       icon: 'grid-outline',           subtitle: 'Structured physique focus with even volume distribution' },
  { value: 'aesthetic_v_taper',           icon: 'triangle-outline',       subtitle: 'Prioritises upper-body width, shoulder-to-waist ratio' },
  { value: 'x_frame_physique', icon: 'expand-outline', subtitle: 'Prioritises shoulders, lats, glutes and hamstrings for a dramatic X silhouette' },
  { value: 'weak_point_spec',             icon: 'warning-outline',        subtitle: 'Extra volume and priority on muscles you want to bring up' },
  { value: 'strength_hypertrophy', icon: 'flash-outline',          subtitle: 'Heavier compounds with muscle growth as the goal' },
  { value: 'recomp',               icon: 'swap-horizontal-outline', subtitle: 'Build or preserve muscle with controlled fatigue' },
];

const WEAK_POINT_MUSCLES = [
  'Chest', 'Upper Chest', 'Lats / Back Width', 'Back Thickness',
  'Side Delts', 'Rear Delts', 'Front Delts',
  'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Core / Abs', 'Traps',
];

const V_TAPER_SUGGESTIONS = ['Side Delts', 'Lats / Back Width', 'Upper Chest', 'Rear Delts'];

const RECOVERY_OPTIONS = [
  { value: 'poor',    label: 'Poor',    subtitle: 'Often sore, disrupted sleep, high life stress' },
  { value: 'average', label: 'Average', subtitle: 'Typical recovery between sessions' },
  { value: 'good',    label: 'Good',    subtitle: 'Sleeping well, low stress, nutrition on point' },
];

const GOALS_WITH_WEAK_POINTS = ['aesthetic_v_taper', 'weak_point_spec', 'general_hypertrophy', 'x_frame_physique'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function stepTitle(step) {
  return [
    'Training Experience',
    'Schedule',
    'Equipment',
    'Training Goal',
    'Weak Points',
    'Recovery',
    'Your Plan',
  ][step - 1] ?? '';
}

function isStepComplete(step, inputs) {
  if (step === 1) return !!inputs.experience;
  if (step === 2) return !!inputs.daysPerWeek && !!inputs.sessionLengthMinutes;
  if (step === 3) return !!inputs.equipment;
  if (step === 4) return !!inputs.goal;
  if (step === 5) return true;
  if (step === 6) return !!inputs.recoveryRating;
  return true;
}

function resolveEffectiveStep(goal, step) {
  if (step === 5 && !GOALS_WITH_WEAK_POINTS.includes(goal)) return 6;
  return step;
}

// ─── Sub-components ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }) {
  return (
    <View style={pbStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            pbStyles.dot,
            i + 1 < current  && pbStyles.dotDone,
            i + 1 === current && pbStyles.dotActive,
          ]}
        />
      ))}
      <Text style={pbStyles.label}>Step {current} of {total}</Text>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface3 },
  dotDone:   { backgroundColor: colors.primaryDim },
  dotActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  label:     { marginLeft: spacing.sm, fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
});

function SelectionCard({ label, subtitle, icon, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.selCard, selected && styles.selCardActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon ? (
        <Ionicons name={icon} size={20} color={selected ? colors.primary : colors.textSecondary} style={{ marginBottom: spacing.xs }} />
      ) : null}
      <View style={styles.selCardTextWrap}>
        <Text style={[styles.selCardLabel, selected && styles.selCardLabelActive]}>{label}</Text>
        {subtitle ? <Text style={styles.selCardSubtitle}>{subtitle}</Text> : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.selCardCheck} />
      ) : null}
    </TouchableOpacity>
  );
}

function PillButton({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachBuilderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, completeFirstRun, tier } = useAppStore();

  const nutritionPhaseFromRoute = route?.params?.nutritionPhase ?? null;
  const isFirstRun = route?.params?.firstRun === true;

  const [step, setStep]   = useState(1);
  const [inputs, setInputs] = useState({
    experience:            null,
    trainingAge:           null,
    daysPerWeek:           4,
    sessionLengthMinutes:  60,
    equipment:             null,
    goal:                  null,
    weakPoints:            [],
    recoveryRating:        null,
    nutritionPhase:        nutritionPhaseFromRoute,
  });

  const [plan, setPlan]         = useState(null);
  const [planName, setPlanName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [whyExpanded, setWhyExpanded] = useState(false);

  const scrollRef = useRef(null);

  // ── Navigation helpers ──

  function goNext() {
    if (step === 6) {
      handleGenerate();
      return;
    }
    const nextStep = step + 1;
    const effectiveNext = resolveEffectiveStep(inputs.goal, nextStep);
    setStep(effectiveNext);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function goBack() {
    if (step === 1) {
      navigation.goBack();
      return;
    }
    let prev = step - 1;
    if (step === 6 && !GOALS_WITH_WEAK_POINTS.includes(inputs.goal)) {
      prev = 4;
    }
    setStep(prev);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function update(key, value) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  function toggleWeakPoint(muscle) {
    setInputs(prev => {
      const already = prev.weakPoints.includes(muscle);
      if (already) {
        return { ...prev, weakPoints: prev.weakPoints.filter(m => m !== muscle) };
      }
      if (prev.weakPoints.length >= 3) {
        Alert.alert('Max 3 muscles', 'Deselect one before adding another.');
        return prev;
      }
      return { ...prev, weakPoints: [...prev.weakPoints, muscle] };
    });
  }

  // ── Generate ──

  async function handleGenerate() {
    setGenerating(true);
    setStep(7);
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    await new Promise(resolve => setTimeout(resolve, 300));

    let nutritionContext = null;
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_STORAGE_KEY);
      if (raw) {
        const targets = JSON.parse(raw);
        nutritionContext = getPlanNutritionContext(targets);
      }
    } catch (_e) {}

    // Phase 7: apply competition phase modifiers before generating
    const compDateMs = user?.profile?.competitionDate ?? null;
    const { inputs: phaseInputs, phase, modifiers, weeksToComp } = applyPhaseToInputs(
      {
        ...inputs,
        nutritionPhase: inputs.nutritionPhase ?? nutritionPhaseFromRoute ?? nutritionContext?.phaseType ?? null,
        nutritionContext,
        age: user?.profile?.age ?? null,
      },
      compDateMs
    );

    const result = generatePlan(phaseInputs);

    // Phase 8: annotate session exercises with advanced set-type intelligence
    const experience = phaseInputs.experience ?? 'intermediate';
    const mesoWeek = 1; // new plan always starts at week 1
    const mesoSchedule = getMesoSchedule(experience);
    const mesoEntry = mesoSchedule.find(s => s.week === mesoWeek) ?? mesoSchedule[0];
    const setTypeContext = { mesoWeek, mesoPhase: mesoEntry.phase, isTimeCrunch: false, experience };

    const annotatedWorkouts = result.workouts.map(w => ({
      ...w,
      exercises: annotateSessionSetTypes(w.exercises, setTypeContext),
    }));

    // Phase 7: attach competition phase metadata and session add-ons
    const sessionAddons = buildSessionAddons(phase, weeksToComp);

    const finalResult = {
      ...result,
      workouts: annotatedWorkouts,
      compPhase: phase,
      compPhaseLabel: getPhaseLabel(phase),
      compPhaseDescription: getPhaseDescription(phase, weeksToComp),
      weeksToComp,
      sessionAddons: sessionAddons.length > 0 ? sessionAddons : undefined,
    };

    setPlan(finalResult);
    setPlanName(finalResult.name);
    setGenerating(false);
  }

  // ── Save ──

  async function handleSave(activate) {
    if (!plan) return;
    setSaving(true);
    try {
      const userId = user?.id;
      const prog   = await createProgramme(userId, planName.trim() || plan.name, plan.description, 0);
      const allExercises = await getAllExercises();
      const exerciseMap  = {};
      for (const ex of allExercises) {
        exerciseMap[ex.name.toLowerCase()] = ex;
      }

      for (const workout of plan.workouts) {
        const routine = await createRoutine(
          userId,
          workout.name,
          null,
          plan.splitType,
          0,
          null,
          prog.id,
        );
        for (let i = 0; i < workout.exercises.length; i++) {
          const ex     = workout.exercises[i];
          const dbEx   = exerciseMap[ex.exerciseName.toLowerCase()];
          const exId   = dbEx?.id ?? null;
          if (!exId) continue;
          await addExerciseToRoutine(
            routine.id,
            exId,
            i,
            ex.repMin,
            ex.repMax,
            ex.notes ?? null,
            ex.sets,
          );
        }
      }

      if (activate) {
        await activatePlanWithBlock(userId, prog.id, planName.trim() || plan.name);
      }

      if (isFirstRun) {
        await completeFirstRun();
        // Pro users: prompt to create an account so their data is backed up.
        // The prompt is shown via the Login screen with a signup-first flag.
        if (tier === 'pro' && user?.isLocal) {
          navigation.navigate('Login', { promptSignup: true });
        }
        return;
      }
      navigation.navigate('PlansTab', { screen: 'Plans' });
    } catch (err) {
      Alert.alert('Error saving plan', err?.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render steps ──

  function renderStep1() {
    return (
      <View style={styles.stepBody}>
        <Text style={styles.stepQuestion}>What's your training experience?</Text>
        {EXPERIENCE_OPTIONS.map(opt => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.subtitle}
            selected={inputs.experience === opt.value}
            onPress={() => update('experience', opt.value)}
          />
        ))}

        <Text style={styles.subLabel}>Training age (optional)</Text>
        <View style={styles.pillRow}>
          {TRAINING_AGE_OPTIONS.map(t => (
            <PillButton
              key={t}
              label={t}
              selected={inputs.trainingAge === t}
              onPress={() => update('trainingAge', inputs.trainingAge === t ? null : t)}
            />
          ))}
        </View>
      </View>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepBody}>
        <Text style={styles.stepQuestion}>How many days per week can you train?</Text>
        <View style={styles.pillRow}>
          {DAYS_OPTIONS.map(d => (
            <PillButton
              key={d}
              label={String(d)}
              selected={inputs.daysPerWeek === d}
              onPress={() => update('daysPerWeek', d)}
            />
          ))}
        </View>

        <Text style={[styles.stepQuestion, { marginTop: spacing.xl }]}>How long is your typical session?</Text>
        <View style={styles.pillRow}>
          {SESSION_OPTIONS.map(s => (
            <PillButton
              key={s.value}
              label={s.label}
              selected={inputs.sessionLengthMinutes === s.value}
              onPress={() => update('sessionLengthMinutes', s.value)}
            />
          ))}
        </View>
      </View>
    );
  }

  function renderStep3() {
    return (
      <View style={styles.stepBody}>
        <Text style={styles.stepQuestion}>What equipment do you have access to?</Text>
        {EQUIPMENT_OPTIONS.map(opt => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            selected={inputs.equipment === opt.value}
            onPress={() => update('equipment', opt.value)}
          />
        ))}
      </View>
    );
  }

  function renderStep4() {
    return (
      <View style={styles.stepBody}>
        <Text style={styles.stepQuestion}>What's your primary training goal?</Text>
        {GOAL_OPTIONS.map(opt => (
          <SelectionCard
            key={opt.value}
            label={GOAL_LABELS[opt.value]}
            subtitle={opt.subtitle}
            icon={opt.icon}
            selected={inputs.goal === opt.value}
            onPress={() => update('goal', opt.value)}
          />
        ))}
      </View>
    );
  }

  function renderStep5() {
    const isVTaper = inputs.goal === 'aesthetic_v_taper';
    return (
      <View style={styles.stepBody}>
        <Text style={styles.stepQuestion}>Select up to 3 muscles you want to bring up</Text>
        {isVTaper && inputs.weakPoints.length === 0 && (
          <View style={styles.suggestionBanner}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.suggestionText}>
              Suggested for V-Taper: {V_TAPER_SUGGESTIONS.join(', ')}
            </Text>
          </View>
        )}
        <View style={styles.muscleGrid}>
          {WEAK_POINT_MUSCLES.map(muscle => {
            const selected = inputs.weakPoints.includes(muscle);
            return (
              <TouchableOpacity
                key={muscle}
                style={[styles.muscleChip, selected && styles.muscleChipActive]}
                onPress={() => toggleWeakPoint(muscle)}
                activeOpacity={0.7}
              >
                <Text style={[styles.muscleChipText, selected && styles.muscleChipTextActive]}>
                  {muscle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {inputs.weakPoints.length > 0 && (
          <Text style={styles.selectedMusclesHint}>
            Selected: {inputs.weakPoints.join(', ')}
          </Text>
        )}
      </View>
    );
  }

  function renderStep6() {
    const hasNutrition = !!inputs.nutritionPhase;
    return (
      <View style={styles.stepBody}>
        {hasNutrition && (
          <View style={styles.nutritionBanner}>
            <Ionicons name="nutrition-outline" size={18} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nutritionBannerTitle}>Nutrition Phase Detected</Text>
              <Text style={styles.nutritionBannerText}>
                Phase "{inputs.nutritionPhase}" will be used to calibrate your volume.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.stepQuestion}>How is your current recovery?</Text>
        {RECOVERY_OPTIONS.map(opt => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.subtitle}
            selected={inputs.recoveryRating === opt.value}
            onPress={() => update('recoveryRating', opt.value)}
          />
        ))}
        <Text style={styles.recoveryNote}>
          This affects how much volume your plan includes.
        </Text>
      </View>
    );
  }

  function renderStep7() {
    if (generating) {
      return (
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingText}>Building your plan…</Text>
        </View>
      );
    }
    if (!plan) return null;

    return (
      <View style={styles.stepBody}>
        {/* Editable plan name */}
        <View style={styles.planNameRow}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <TextInput
            style={styles.planNameInput}
            value={planName}
            onChangeText={setPlanName}
            placeholder="Plan name"
            placeholderTextColor={colors.textMuted}
            maxLength={80}
          />
        </View>

        {/* ── Plan overview ── */}
        {(() => {
          const exp = inputs.experience ?? 'intermediate';
          const isAdvanced = exp === 'advanced' || exp === 'competitive';
          const totalWeeks = isAdvanced ? 6 : 5;
          const peakWeek = isAdvanced ? 5 : 4;
          const recoveryWeek = totalWeeks;
          return (
            <View style={styles.overviewCard}>
              <View style={styles.overviewTitleRow}>
                <Text style={styles.overviewTitle}>
                  {totalWeeks}-Week Training Block
                </Text>
                <InfoTooltip
                  size={13}
                  text={`A Training Block is a structured period (typically 4–6 weeks) where volume and effort increase week by week, followed by a lighter recovery week. After completing one block, you can start another (or a different plan) in Training Blocks to keep progressing long-term.`}
                />
              </View>
              <Text style={styles.overviewSub}>
                Weeks 1–{peakWeek}: volume and effort build progressively each week.
                Week {recoveryWeek} is a lighter recovery week (fewer sets, lower effort) so you recharge and come back stronger.
              </Text>
              <View style={styles.overviewWeekRow}>
                {Array.from({ length: totalWeeks }, (_, i) => {
                  const w = i + 1;
                  const isRecovery = w === totalWeeks;
                  const isPeak = w === peakWeek;
                  return (
                    <View key={w} style={[styles.overviewWeekDot, isRecovery && styles.overviewWeekDotRec, isPeak && styles.overviewWeekDotPeak]}>
                      <Text style={[styles.overviewWeekNum, isRecovery && styles.overviewWeekNumRec]}>{w}</Text>
                    </View>
                  );
                })}
                <Text style={styles.overviewWeekLegend}> ← recovery</Text>
              </View>
              <Text style={styles.overviewStack}>
                Tip: once complete, start another block in Training Blocks to keep the momentum going.
              </Text>
            </View>
          );
        })()}

        {/* Warnings */}
        {plan.warnings?.length > 0 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              {plan.warnings.map((w, i) => (
                <Text key={i} style={styles.warningText}>{w}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Competition phase banner (Phase 7) */}
        {plan.compPhase && plan.compPhase !== 'offseason' && (
          <View style={styles.phaseBanner}>
            <Ionicons name="ribbon-outline" size={15} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.phaseBannerTitle}>{plan.compPhaseLabel}</Text>
              <Text style={styles.phaseBannerDesc}>{plan.compPhaseDescription}</Text>
            </View>
          </View>
        )}

        {/* Session add-ons (posing / conditioning) */}
        {plan.sessionAddons?.length > 0 && (
          <View style={styles.addonsCard}>
            <Text style={styles.addonsTitle}>Added to every session</Text>
            {plan.sessionAddons.map((addon, i) => (
              <View key={i} style={styles.addonRow}>
                <Ionicons
                  name={addon.type === 'posing' ? 'body-outline' : 'bicycle-outline'}
                  size={14}
                  color={colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addonLabel}>{addon.durationMinutes} min {addon.type === 'posing' ? 'Posing Practice' : 'Conditioning'}</Text>
                  <Text style={styles.addonInstructions} numberOfLines={3}>{addon.instructions}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Built around you */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Built around you</Text>
          <View style={styles.summaryGrid}>
            <SummaryItem icon="person-outline"    label="Experience"  value={inputs.experience ?? '—'} />
            <SummaryItem icon="calendar-outline"  label="Days / week" value={String(inputs.daysPerWeek)} />
            <SummaryItem icon="time-outline"      label="Session"     value={`${inputs.sessionLengthMinutes} min`} />
            <SummaryItem icon="barbell-outline"   label="Equipment"   value={(inputs.equipment ?? '—').replace(/_/g, ' ')} />
            <SummaryItem icon="trophy-outline"    label="Goal"        value={GOAL_LABELS[inputs.goal] ?? '—'} />
            <SummaryItem icon="heart-outline"     label="Recovery"    value={inputs.recoveryRating ?? '—'} />
            {inputs.weakPoints?.length > 0 && (
              <SummaryItem icon="star-outline" label="Weak points" value={inputs.weakPoints.join(', ')} wide />
            )}
          </View>
        </View>

        {/* Why this plan */}
        <TouchableOpacity
          style={styles.whyHeader}
          onPress={() => setWhyExpanded(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.whyHeaderText}>Why this plan?</Text>
          <Ionicons
            name={whyExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        {whyExpanded && (
          <View style={styles.whyBody}>
            {Object.values(plan.whyThis).map((exp, i) => (
              <View key={i} style={styles.whyItem}>
                <View style={styles.whyBullet} />
                <Text style={styles.whyText}>{exp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Workout list */}
        <Text style={styles.sectionHeading}>
          {plan.workouts.length} Workout{plan.workouts.length !== 1 ? 's' : ''} · {SPLIT_LABELS[plan.splitType] ?? plan.splitType}
        </Text>
        {plan.workouts.map((workout, wi) => (
          <View key={wi} style={styles.workoutCard}>
            <Text style={styles.workoutCardName}>{workout.name}</Text>
            {workout.exercises.map((ex, ei) => (
              <View key={ei} style={styles.exerciseRow}>
                <View style={styles.exerciseDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                  <Text style={styles.exerciseMeta}>
                    {ex.sets} × {ex.repMin}–{ex.repMax} reps · {ex.restSec}s rest
                  </Text>
                  {ex.advancedSetType && (
                    <Text style={styles.advancedSetBadge}>{ex.advancedSetNote}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  function SummaryItem({ icon, label, value, wide }) {
    return (
      <View style={[styles.summaryItem, wide && styles.summaryItemWide]}>
        <Ionicons name={icon} size={14} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryItemLabel}>{label}</Text>
          <Text style={styles.summaryItemValue}>{value}</Text>
        </View>
      </View>
    );
  }

  // ── Footer buttons ──

  function renderFooter() {
    const canNext = isStepComplete(step, inputs);

    if (step === 7) {
      return (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.draftBtn, saving && styles.btnDisabled]}
            onPress={() => handleSave(false)}
            disabled={saving || generating}
          >
            {saving ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <Text style={styles.draftBtnText}>Save Draft</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.activateBtn, saving && styles.btnDisabled]}
            onPress={() => handleSave(true)}
            disabled={saving || generating}
          >
            <Text style={styles.activateBtnText}>Save & Activate</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const nextLabel = step === 6 ? 'Generate Plan' : 'Next';

    return (
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={!canNext}
        >
          <Text style={[styles.nextBtnText, !canNext && styles.nextBtnTextDisabled]}>
            {nextLabel}
          </Text>
          {step < 6 && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={canNext ? colors.background : colors.textDisabled}
            />
          )}
          {step === 6 && (
            <Ionicons
              name="flash-outline"
              size={18}
              color={canNext ? colors.background : colors.textDisabled}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ──

  const stepContent = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
    6: renderStep6,
    7: renderStep7,
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ProgressBar current={step} total={TOTAL_STEPS} />
        <Text style={styles.headerTitle}>{stepTitle(step)}</Text>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {(stepContent[step] ?? (() => null))()}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrapper, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {renderFooter()}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.md },

  stepBody: { gap: spacing.md },
  stepQuestion: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, lineHeight: 24 },
  subLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginTop: spacing.sm },

  selCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, minHeight: 56,
  },
  selCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  selCardTextWrap: { flex: 1, gap: spacing.xs },
  selCardLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  selCardLabelActive: { color: colors.primary },
  selCardSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  selCardCheck: { marginLeft: 'auto', alignSelf: 'center' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    minHeight: 48, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  pillText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textSecondary },
  pillTextActive: { color: colors.primary, fontWeight: fontWeight.bold },

  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muscleChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40,
    borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  muscleChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  muscleChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  muscleChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  selectedMusclesHint: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },

  suggestionBanner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  suggestionText: { flex: 1, fontSize: fontSize.sm, color: colors.primary, lineHeight: 18 },

  nutritionBanner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.success + '40',
  },
  nutritionBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.success },
  nutritionBannerText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },

  recoveryNote: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },

  generatingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl * 2, gap: spacing.lg },
  generatingText: { fontSize: fontSize.lg, color: colors.textSecondary, fontWeight: fontWeight.medium },

  planNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.primary + '60', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  planNameInput: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, minHeight: 48 },

  warningBanner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.warningBg, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.warning + '50',
  },
  warningText: { fontSize: fontSize.sm, color: colors.warning, lineHeight: 18 },

  summaryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  summaryCardTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, width: '47%' },
  summaryItemWide: { width: '100%' },
  summaryItemLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  summaryItemValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, textTransform: 'capitalize' },

  whyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  whyHeaderText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  whyBody: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md, marginTop: -spacing.xs },
  whyItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  whyBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6 },
  whyText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  sectionHeading: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2, marginTop: spacing.sm },

  workoutCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  workoutCardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  exerciseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryDim, marginTop: 6 },
  exerciseName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  exerciseMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  advancedSetBadge: { fontSize: fontSize.xs, color: colors.primary, marginTop: 3, lineHeight: 16, fontStyle: 'italic' },
  phaseBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.warningBg ?? colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.warning + '55', marginBottom: spacing.sm },
  phaseBannerTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.warning, letterSpacing: 0.5 },
  phaseBannerDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  addonsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.sm },
  addonsTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1 },
  addonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  addonLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  addonInstructions: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },

  footerWrapper: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  footer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 48 },
  backBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, minHeight: 52 },
  nextBtnDisabled: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  nextBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  nextBtnTextDisabled: { color: colors.textDisabled },
  draftBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.primary + '60' },
  draftBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  activateBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.primary },
  activateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },
  btnDisabled: { opacity: 0.5 },

  overviewCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.primary + '30', gap: spacing.sm,
  },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  overviewTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  overviewSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  overviewWeekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  overviewWeekDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  overviewWeekDotPeak: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  overviewWeekDotRec: { borderColor: colors.textMuted, backgroundColor: colors.surface3 },
  overviewWeekNum: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
  overviewWeekNumRec: { color: colors.textMuted },
  overviewWeekLegend: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  overviewStack: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17, fontStyle: 'italic' },
});
