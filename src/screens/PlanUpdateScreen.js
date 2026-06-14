import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import Dropdown from '../components/Dropdown';
import SegmentedControl from '../components/SegmentedControl';
import BackHeader from '../components/BackHeader';
import { useToast } from '../components/Toast';
import {
  PHYSIQUE_GOALS,
  GOALS_WITH_WEAK_POINTS, WEAK_POINT_MUSCLES,
} from '../lib/coachingGoals';
import { generateAndSavePlan, planShortfallNote } from '../lib/planAutoGen';

// Training setup options, mirror the lists in ProOnboardingScreen and
// ProGoalSetupScreen so a re-run here produces the same plan structure as a
// fresh wizard run with identical answers.
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

// Training-only plan update for the Plans tab. Changes training parameters and
// rebuilds the plan around them. It deliberately does NOT touch calories or
// macros: nutrition targets are recalculated only from the You tab (Update your
// plan / Nutrition targets), which is the single place body composition and
// goal drive the calorie maths.
export default function PlanUpdateScreen({ navigation }) {
  const toast = useToast();
  const { user, userProfile, saveLocalProfile } = useAppStore();

  const [selectedGoal, setSelectedGoal] = useState(userProfile?.trainingGoal ?? null);
  const [planWeakPoints, setPlanWeakPoints] = useState(userProfile?.planWeakPoints ?? []);
  const [experience, setExperience] = useState(userProfile?.experience ?? 'intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(userProfile?.daysPerWeek ?? 4);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(userProfile?.sessionLengthMinutes ?? 60);
  const [equipment, setEquipment] = useState(userProfile?.equipment ?? 'full_gym');
  const [recoveryRating, setRecoveryRating] = useState(userProfile?.recoveryRating ?? 'average');
  const [saving, setSaving] = useState(false);

  const weakPointsApplicable = GOALS_WITH_WEAK_POINTS.includes(selectedGoal);

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

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    // Only keep weak points if the goal supports them, switching to a
    // non-applicable goal clears them so the plan generator doesn't keep
    // biasing toward muscles the user no longer wants prioritised.
    const nextWeakPoints = GOALS_WITH_WEAK_POINTS.includes(selectedGoal)
      ? planWeakPoints
      : [];

    // Training fields only. Goal, phase, protein approach and body composition
    // are left exactly as they were, so nothing here changes calorie or macro
    // targets. generateAndSavePlan reads these to drive plan generation.
    const updatedProfile = {
      ...(userProfile || {}),
      trainingGoal: selectedGoal,
      planWeakPoints: nextWeakPoints,
      experience,
      daysPerWeek,
      sessionLengthMinutes,
      equipment,
      recoveryRating,
    };

    // FF-002: rebuild the plan FIRST off the staged profile
    // (generateAndSavePlan reads the profile passed to it, not storage). Only
    // commit the new training profile as canonical once the rebuild succeeds,
    // so a failed rebuild can't leave a split-brain state (profile says one
    // setup, the active plan still the old one). On failure, keep the user here
    // to retry instead of saving and navigating away.
    let planResult = { ok: false, error: 'not attempted' };
    try {
      planResult = await generateAndSavePlan(user.id, updatedProfile);
    } catch (e) {
      planResult = { ok: false, error: e?.message ?? 'unknown' };
    }

    if (!planResult.ok) {
      setSaving(false);
      toast.show(`Couldn't rebuild your plan (${planResult.error}). Your training setup wasn't changed, try again.`, { variant: 'error', duration: 5000 });
      return;
    }

    try {
      await saveLocalProfile(user.id, updatedProfile);
    } catch (_) {}

    setSaving(false);

    if (planResult.partial) {
      // FF-003: the plan generated but couldn't fulfil every requested move.
      toast.show(planShortfallNote(planResult.missedCount), { variant: 'warning', duration: 6000 });
    } else {
      toast.show('Plan rebuilt around your new training setup', { variant: 'success' });
    }
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Update training" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionSub}>
          Adjust your training setup and rebuild the plan around it. Your calorie and macro targets stay as they are. Update those from the You tab.
        </Text>

        {/* ── Physique category (optional) ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Competing in a category? (optional)</Text>
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

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          accessibilityLabel="Rebuild my plan"
        >
          <Text style={[styles.saveBtnText, saving && styles.saveBtnTextDisabled]}>
            {saving ? 'Rebuilding…' : 'Rebuild my plan'}
          </Text>
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

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
    marginTop: spacing.xxl,
  },
  saveBtnDisabled: { backgroundColor: colors.surface2 },
  saveBtnText: { color: colors.onPrimary, ...type.bodyStrong },
  saveBtnTextDisabled: { color: colors.textMuted },
});
