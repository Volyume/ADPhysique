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
import { generateAndSavePlan, generatePlanDryRun, planShortfallNote } from '../lib/planAutoGen';
import { getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails } from '../lib/database';
import { diffPlans, summariseProspectivePlan, summariseCurrentPlan } from '../lib/planDiff';
import BottomSheet from '../components/BottomSheet';

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
  // Plan diff/preview (ULTIMATE-PLANDIFF-01): a pre-commit dry-run + diff sheet.
  const [previewing, setPreviewing] = useState(false);
  const [diff, setDiff] = useState(null);     // Now/After view-model for the sheet
  const [staged, setStaged] = useState(null); // { profile, partial, missedCount }

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

  // Build the staged training profile from the current form values. Training
  // fields only; goal, phase, protein approach and body composition are left
  // exactly as they were, so nothing here changes calorie or macro targets.
  function buildUpdatedProfile() {
    const nextWeakPoints = GOALS_WITH_WEAK_POINTS.includes(selectedGoal)
      ? planWeakPoints
      : [];
    return {
      ...(userProfile || {}),
      trainingGoal: selectedGoal,
      planWeakPoints: nextWeakPoints,
      experience,
      daysPerWeek,
      sessionLengthMinutes,
      equipment,
      recoveryRating,
    };
  }

  // Read the current active plan into a comparable summary (NA-coaching-13:
  // getActivePlan → getRoutinesForPlan → getRoutineExercisesWithDetails).
  // Returns null when there is no active plan or the read fails; the diff then
  // shows everything in the prospective plan as new.
  async function readCurrentPlanSummary() {
    try {
      const active = await getActivePlan(user.id);
      if (!active?.id) return null;
      const routines = await getRoutinesForPlan(active.id);
      const withExercises = [];
      for (const r of (routines || [])) {
        const rows = await getRoutineExercisesWithDetails(r.id).catch(() => []);
        withExercises.push({ ...r, exercises: (rows || []).map(x => ({ name: x?.exercise?.name })) });
      }
      return summariseCurrentPlan(withExercises, userProfile?.sessionLengthMinutes ?? null);
    } catch (_) {
      return null;
    }
  }

  // Step 1 (NEW): "Rebuild my plan" runs a dry-run + diff and opens the preview.
  // Nothing is written until the user confirms — the active plan and profile are
  // untouched if they back out.
  async function handleRebuildPress() {
    if (previewing || saving) return;
    setPreviewing(true);
    const updatedProfile = buildUpdatedProfile();
    try {
      const dry = await generatePlanDryRun(user.id, updatedProfile);
      if (!dry.ok) {
        toast.show(`Couldn't rebuild your plan (${dry.error}). Your training setup wasn't changed, try again.`, { variant: 'error', duration: 5000 });
        return;
      }
      const nowSummary = await readCurrentPlanSummary();
      const afterSummary = summariseProspectivePlan(dry.plan, dry.sessionLengthMinutes);
      setDiff(diffPlans(nowSummary, afterSummary));
      setStaged({ profile: updatedProfile, partial: !!dry.partial, missedCount: dry.missedCount ?? 0 });
    } catch (e) {
      toast.show(`Couldn't rebuild your plan (${e?.message ?? 'unknown'}). Your training setup wasn't changed, try again.`, { variant: 'error', duration: 5000 });
    } finally {
      setPreviewing(false);
    }
  }

  // Step 2 (NEW): confirm → the real commit. FF-002 split-brain protection is
  // unchanged: generateAndSavePlan rebuilds-first-then-activates, and the
  // profile is only saved as canonical once that succeeds.
  async function handleConfirmRebuild() {
    if (saving || !staged) return;
    setSaving(true);
    const updatedProfile = staged.profile;

    // FF-002 (unchanged invariant): rebuild FIRST, bail on failure without
    // saving or navigating, and only commit the profile as canonical once the
    // rebuild succeeds, so a failed rebuild can't split-brain.
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
    setDiff(null);
    setStaged(null);

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
          style={[styles.saveBtn, (previewing || saving) && styles.saveBtnDisabled]}
          onPress={handleRebuildPress}
          disabled={previewing || saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: previewing || saving }}
          accessibilityLabel="Rebuild my plan"
        >
          <Text style={[styles.saveBtnText, (previewing || saving) && styles.saveBtnTextDisabled]}>
            {previewing ? 'Checking…' : 'Rebuild my plan'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Plan diff/preview (ULTIMATE-PLANDIFF-01): the before/after of what the
          rebuild would change, shown BEFORE the active plan is overwritten. The
          real commit only runs on confirm; backing out writes nothing. */}
      <BottomSheet
        visible={!!diff}
        onClose={() => { if (!saving) { setDiff(null); setStaged(null); } }}
        accessibilityLabel="Plan changes preview"
      >
        {diff ? (
          <>
            <Text style={styles.diffTitle}>Before you rebuild</Text>
            {diff.identical ? (
              <Text style={styles.diffSub}>
                Your training days, split and moves already match this setup. Rebuilding refreshes your sets and volume.
              </Text>
            ) : (
              <>
                <Text style={styles.diffSub}>
                  Here's what changes. Your current plan stays until you confirm.
                </Text>
                <View style={styles.diffTable}>
                  <View style={styles.diffHeadRow}>
                    <Text style={[styles.diffCell, styles.diffCellLabel]} />
                    <Text style={[styles.diffCell, styles.diffHeadText]}>Now</Text>
                    <Text style={[styles.diffCell, styles.diffHeadText]}>After</Text>
                  </View>
                  <DiffRow label="Training days" now={diff.days.now} after={diff.days.after} changed={diff.days.changed} />
                  <DiffRow label="Split" now={diff.split.now ?? '-'} after={diff.split.after ?? '-'} changed={diff.split.changed} />
                  <DiffRow
                    label="Session length"
                    now={diff.sessionLength.now != null ? `${diff.sessionLength.now} min` : '-'}
                    after={diff.sessionLength.after != null ? `${diff.sessionLength.after} min` : '-'}
                    changed={diff.sessionLength.changed}
                  />
                </View>
                {(diff.movesAdded.length > 0 || diff.movesDropped.length > 0) ? (
                  <View style={styles.diffMoves}>
                    <Text style={styles.diffMovesLabel}>Moves changed</Text>
                    {diff.movesAdded.map(m => (
                      <Text key={`add-${m}`} style={styles.diffMoveText}>Added: {m}</Text>
                    ))}
                    {diff.movesDropped.map(m => (
                      <Text key={`drop-${m}`} style={styles.diffMoveText}>Dropped: {m}</Text>
                    ))}
                  </View>
                ) : null}
                {staged?.partial ? (
                  <Text style={styles.diffShortfall}>{planShortfallNote(staged.missedCount)}</Text>
                ) : null}
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleConfirmRebuild}
              disabled={saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              accessibilityLabel="Confirm and rebuild"
            >
              <Text style={[styles.saveBtnText, saving && styles.saveBtnTextDisabled]}>
                {saving ? 'Rebuilding…' : 'Confirm and rebuild'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.diffBackBtn}
              onPress={() => { if (!saving) { setDiff(null); setStaged(null); } }}
              disabled={saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.diffBackText}>Back</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

// One Now/After row in the diff table. Class-neutral: a changed row is emphasised
// by weight, not a valence colour (a plan change is neither good nor bad).
function DiffRow({ label, now, after, changed }) {
  const fmt = (v) => (v == null ? '-' : String(v));
  return (
    <View style={styles.diffRow}>
      <Text style={[styles.diffCell, styles.diffCellLabel]}>{label}</Text>
      <Text style={[styles.diffCell, styles.diffNow]}>{fmt(now)}</Text>
      <Text style={[styles.diffCell, styles.diffAfter, changed && styles.diffAfterChanged]}>{fmt(after)}</Text>
    </View>
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

  // Plan diff/preview sheet
  diffTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  diffSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs, lineHeight: 19 },
  diffTable: { marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  diffHeadRow: { flexDirection: 'row', backgroundColor: colors.surface2, paddingVertical: spacing.xs },
  diffRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  diffCell: { flex: 1, paddingHorizontal: spacing.sm, fontSize: fontSize.sm, color: colors.textPrimary },
  diffCellLabel: { color: colors.textSecondary },
  diffHeadText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, textTransform: 'uppercase' },
  diffNow: { color: colors.textMuted },
  diffAfter: { color: colors.textPrimary },
  diffAfterChanged: { fontWeight: fontWeight.bold },
  diffMoves: { marginTop: spacing.md, gap: spacing.xxs },
  diffMovesLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  diffMoveText: { color: colors.textPrimary, fontSize: fontSize.sm },
  diffShortfall: { marginTop: spacing.md, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  diffBackBtn: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  diffBackText: { color: colors.textSecondary, ...type.bodyStrong },
});
