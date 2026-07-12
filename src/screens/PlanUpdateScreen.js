import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, radius, type, letterSpacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Dropdown from '../components/Dropdown';
import SegmentedControl from '../components/SegmentedControl';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SectionLabel from '../components/SectionLabel';
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

// Training-only plan update for the Train tab. Changes training parameters and
// rebuilds the plan around them. It deliberately does NOT touch calories or
// macros: nutrition targets are recalculated only from the Coach tab (Update goal
// plan / Nutrition targets), which is the single place body composition and
// goal drive the calorie maths.
export default function PlanUpdateScreen({ navigation }) {
  const toast = useToast();
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile, saveLocalProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    saveLocalProfile: s.saveLocalProfile,
  })));

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
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

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

  // Step 1 (NEW): the review button runs a dry-run + diff and opens the preview.
  // Nothing is written until the user confirms, the active plan and profile are
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Adjust training" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionSub, live.sectionSub]}>
          Adjust your training setup and rebuild the plan around it. Your calorie and macro targets stay as they are. Update those from the Coach tab.
        </Text>

        {/* ── Physique category (optional) ── */}
        <SectionLabel style={styles.sectionLabelSpaced}>Competing in a category? (optional)</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          Only matters if you're chasing a competitive physique. It biases your plan towards the muscles that category is judged on.
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
            <SectionLabel style={styles.sectionLabelSpaced}>
              Weak points <Text style={[styles.optionalTag, live.optionalTag]}>(optional, max 3)</Text>
            </SectionLabel>
            <Text style={[styles.sectionSub, live.sectionSub]}>
              Muscles you want to bring up. Your plan puts extra work into them.
            </Text>
            <View style={styles.weakPointGrid}>
              {WEAK_POINT_MUSCLES.map(muscle => (
                <Chip
                  key={muscle}
                  label={muscle}
                  selected={planWeakPoints.includes(muscle)}
                  onPress={() => toggleWeakPoint(muscle)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Training experience ── */}
        <SectionLabel style={styles.sectionLabelSpaced}>Experience</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          This sets your starting volume and exercise selection. Change it as you get more experience.
        </Text>
        <Dropdown
          value={experience}
          options={EXPERIENCE_OPTIONS}
          onChange={setExperience}
          placeholder="Select your experience"
        />

        {/* ── Training schedule ── */}
        <SectionLabel style={styles.sectionLabelSpaced}>Training days per week</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          Changing how many days you train changes the exercise mix. Your plan rebuilds around it.
        </Text>
        <SegmentedControl
          options={DAYS_OPTIONS.map(d => ({ label: String(d), value: d }))}
          value={daysPerWeek}
          onChange={setDaysPerWeek}
          accessibilityLabel="Training days per week"
        />

        <SectionLabel style={styles.sectionLabelSpaced}>Session length</SectionLabel>
        <SegmentedControl
          options={SESSION_LENGTH_OPTIONS}
          value={sessionLengthMinutes}
          onChange={setSessionLengthMinutes}
          accessibilityLabel="Session length"
        />

        {/* ── Equipment ── */}
        <SectionLabel style={styles.sectionLabelSpaced}>Equipment</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          What you have access to. The exercises adapt to your equipment.
        </Text>
        <Dropdown
          value={equipment}
          options={EQUIPMENT_OPTIONS}
          onChange={setEquipment}
          placeholder="Select your equipment"
        />

        {/* ── Recovery ── */}
        <SectionLabel style={styles.sectionLabelSpaced}>Recovery</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          How well you're recovering between sessions. This sets how cautious Volyume should be with training volume.
        </Text>
        <Dropdown
          value={recoveryRating}
          options={RECOVERY_OPTIONS}
          onChange={setRecoveryRating}
          placeholder="Select your recovery"
        />

        <Button
          title="Review my plan changes"
          onPress={handleRebuildPress}
          loading={previewing}
          disabled={previewing || saving}
          accessibilityLabel="Review my plan changes"
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Plan diff/preview (ULTIMATE-PLANDIFF-01): the before/after of what the
          rebuild would change, shown BEFORE the active plan is overwritten. The
          real commit only runs on confirm; backing out writes nothing. */}
      <BottomSheet
        visible={!!diff}
        onClose={() => { if (!saving) { setDiff(null); setStaged(null); } }}
        accessibilityLabel="Plan changes preview"
        scroll
        contentContainerStyle={styles.diffSheetContent}
      >
        {diff ? (
          <>
            <Text style={[styles.diffTitle, live.diffTitle]}>Before you rebuild</Text>
            {diff.identical ? (
              <Text style={[styles.diffSub, live.diffSub]}>
                Your training days, split and moves already match this setup. Rebuilding refreshes your sets and volume.
              </Text>
            ) : (
              <>
                <Text style={[styles.diffSub, live.diffSub]}>
                  Here's what changes. Your current plan stays until you confirm.
                </Text>
                <View style={[styles.diffTable, live.diffTable]}>
                  <View style={[styles.diffHeadRow, live.diffHeadRow]}>
                    <Text style={[styles.diffCell, live.diffCell, styles.diffCellLabel, live.diffCellLabel]} />
                    <Text style={[styles.diffCell, live.diffCell, styles.diffHeadText, live.diffHeadText]}>Now</Text>
                    <Text style={[styles.diffCell, live.diffCell, styles.diffHeadText, live.diffHeadText]}>After</Text>
                  </View>
                  <DiffRow live={live} label="Training days" now={diff.days.now} after={diff.days.after} changed={diff.days.changed} />
                  <DiffRow live={live} label="Split" now={diff.split.now ?? '-'} after={diff.split.after ?? '-'} changed={diff.split.changed} />
                  <DiffRow
                    live={live}
                    label="Session length"
                    now={diff.sessionLength.now != null ? `${diff.sessionLength.now} min` : '-'}
                    after={diff.sessionLength.after != null ? `${diff.sessionLength.after} min` : '-'}
                    changed={diff.sessionLength.changed}
                  />
                </View>
                {(diff.movesAdded.length > 0 || diff.movesDropped.length > 0) ? (
                  <View style={styles.diffMoves}>
                    <Text style={[styles.diffMovesLabel, live.diffMovesLabel]}>Moves changed</Text>
                    {diff.movesAdded.map(m => (
                      <Text key={`add-${m}`} style={[styles.diffMoveText, live.diffMoveText]}>Added: {m}</Text>
                    ))}
                    {diff.movesDropped.map(m => (
                      <Text key={`drop-${m}`} style={[styles.diffMoveText, live.diffMoveText]}>Dropped: {m}</Text>
                    ))}
                  </View>
                ) : null}
                {staged?.partial ? (
                  <Text style={[styles.diffShortfall, live.diffShortfall]}>{planShortfallNote(staged.missedCount)}</Text>
                ) : null}
              </>
            )}

            <Button
              title="Confirm and rebuild"
              onPress={handleConfirmRebuild}
              loading={saving}
              disabled={saving}
              accessibilityLabel="Confirm and rebuild"
              style={styles.saveBtn}
            />
            <Button
              title="Back"
              variant="tertiary"
              style={styles.diffBackBtn}
              textStyle={[styles.diffBackText, live.diffBackText]}
              onPress={() => { if (!saving) { setDiff(null); setStaged(null); } }}
              disabled={saving}
              accessibilityLabel="Back"
            />
          </>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

// One Now/After row in the diff table. Class-neutral: a changed row is emphasised
// by weight, not a valence colour (a plan change is neither good nor bad).
// CP-10 batch G (2026-07-11): rendered directly by the parent (not a list
// row), so `live` is passed as a plain prop from the one screen-level
// useTheme() call rather than a second useTheme() call here.
function DiffRow({ label, now, after, changed, live }) {
  const fmt = (v) => (v == null ? '-' : String(v));
  return (
    <View style={[styles.diffRow, live.diffRow]}>
      <Text style={[styles.diffCell, live.diffCell, styles.diffCellLabel, live.diffCellLabel]}>{label}</Text>
      <Text style={[styles.diffCell, live.diffCell, styles.diffNow, live.diffNow]}>{fmt(now)}</Text>
      <Text style={[styles.diffCell, live.diffCell, styles.diffAfter, live.diffAfter, changed && styles.diffAfterChanged]}>{fmt(after)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  sectionLabelSpaced: { marginTop: spacing.xxl, marginBottom: spacing.xs },
  sectionSub: {
    ...type.captionTight, color: colors.textMuted,
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
  saveBtn: { marginTop: spacing.xxl },

  // Plan diff/preview sheet
  diffTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  diffSub: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
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
  diffMovesLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: letterSpacing.overline },
  diffMoveText: { color: colors.textPrimary, fontSize: fontSize.sm },
  diffShortfall: { ...type.bodySm, marginTop: spacing.md, color: colors.textSecondary },
  diffBackBtn: { marginTop: spacing.sm },
  diffBackText: { color: colors.textSecondary, ...type.bodyStrong },
  diffSheetContent: { gap: spacing.md },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/borderWidth/borderRadius, no token) and fontWeight/
// textTransform/letterSpacing (not part of the live theme table) are
// correctly omitted -- there is nothing to unfreeze for them. Same pattern
// as DebugLogScreen.js's buildLiveStyles (batch F).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    sectionSub: { ...t.type.captionTight, color: t.colors.textMuted },
    optionalTag: { ...t.type.caption, color: t.colors.textMuted },
    diffTitle: { color: t.colors.textPrimary, fontSize: t.fontSize.lg },
    diffSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    diffTable: { borderColor: t.colors.border },
    diffHeadRow: { backgroundColor: t.colors.surface2 },
    diffRow: { borderTopColor: t.colors.border },
    diffCell: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    diffCellLabel: { color: t.colors.textSecondary },
    diffHeadText: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    diffNow: { color: t.colors.textMuted },
    diffAfter: { color: t.colors.textPrimary },
    diffMovesLabel: { color: t.colors.textSecondary, fontSize: t.fontSize.xs },
    diffMoveText: { color: t.colors.textPrimary, fontSize: t.fontSize.sm },
    diffShortfall: { ...t.type.bodySm, color: t.colors.textSecondary },
    diffBackText: { color: t.colors.textSecondary, ...t.type.bodyStrong },
  };
}
