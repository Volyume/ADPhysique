import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Dropdown from '../components/Dropdown';
import SegmentedControl from '../components/SegmentedControl';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SectionLabel from '../components/SectionLabel';
import { useToast } from '../components/Toast';
import { logError, logWarn } from '../lib/errorLog';
import {
  PHYSIQUE_GOALS,
  GOALS_WITH_WEAK_POINTS, WEAK_POINT_MUSCLES,
} from '../lib/coachingGoals';
import { capabilityPreflight, offerCapabilityPreflightChoice } from '../lib/capability/preflight';
import {
  generateAndSavePlan, generatePlanDryRun, planShortfallNote, assessScheduleFit, thinSessionReport,
  activePlanHasCircuitGroups, CIRCUIT_FLATTEN_NOTICE,
} from '../lib/planAutoGen';
// F-16 REVISED point 3 / F-15: the active plan's own style tag and its
// circuit grouping decide what this screen may offer. The lock rule itself is
// shared with ProGoalSetupScreen (the other screen that rebuilds the active
// plan), so the two cannot drift.
import {
  styleLockFromTags, styleLockRebuildNotice, styleLockBrowseLabel,
} from '../lib/exercise/styleLock';
import { appAlert } from '../components/AppAlert';
import { PLAN_FIT } from '../lib/planFit';
import { buildChangeReceipt } from '../lib/planRationale';
import { getAllPlansForUser, getActivePlan } from '../lib/database';
import { diffPlans, summariseProspectivePlan, keepsBlockOnRebuild } from '../lib/planDiff';
// D139: the preview sheet is shared with the three other generation moments
// (Today and Train's no-plan empty states, and a goal/phase change), so all
// four say the same things in the same order before anything is written.
import PlanPreviewSheet from '../components/PlanPreviewSheet';
import { readActivePlanSummary } from '../lib/startWithPlan';
import { confirmPlanSwitchMidBlock, readActiveBlockStatus } from '../lib/planSwitch';

// Training setup options, mirror the lists in ProOnboardingScreen and
// ProGoalSetupScreen so a re-run here produces the same plan structure as a
// fresh wizard run with identical answers.
const EXPERIENCE_OPTIONS = [
  { value: 'beginner',     label: 'Beginner',     sub: 'Less than 18 months of consistent training' },
  { value: 'intermediate', label: 'Intermediate', sub: '18 months to 3 years of consistent training' },
  { value: 'advanced',     label: 'Advanced',     sub: '3 to 5 years, consistently adding weight over time' },
  { value: 'competitive',  label: 'Competitive',  sub: '5+ years, training for physique or performance' },
];

// Two sessions is a real, supported week: the engine builds a full-body plan
// for it rather than quietly rounding the athlete up to three. Kept identical
// to the onboarding list so the two schedule questions offer the same answers.
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const SESSION_LENGTH_OPTIONS = [
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
  { label: '90 min', value: 90 },
];

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym',        label: 'Full gym',          sub: 'Barbells, cables, machines, dumbbells' },
  { value: 'machines_cables', label: 'Machines and cables', sub: 'No free barbells' },
  { value: 'dumbbells_only',  label: 'Dumbbells only',    sub: 'Adjustable or fixed dumbbells' },
  { value: 'barbell_plates',  label: 'Barbell and plates', sub: 'Power rack or squat stand setup' },
  { value: 'home_gym',        label: 'Home gym',          sub: 'Mixed equipment at home' },
  { value: 'bodyweight',      label: 'Bodyweight',        sub: 'No equipment needed' },
];

const RECOVERY_OPTIONS = [
  { value: 'poor',    label: 'Poor',    sub: 'Often sore, disrupted sleep, high life stress' },
  { value: 'average', label: 'Average', sub: 'Typical recovery between sessions' },
  { value: 'good',    label: 'Good',    sub: 'Sleeping well, low stress, nutrition on point' },
];

// C1 (pre-release sweep 2026-07-27, LANE C): one calm, fixed message for
// every rebuild-failure toast on this screen, regardless of which internal
// error code or exception produced it, so no raw technical text ever reaches
// the user here. The real reason is always logged via errorLog just before
// this is shown, so the diagnostic survives, it is just never displayed.
const REBUILD_FAILED_MESSAGE = "Couldn't rebuild your plan. Your training setup wasn't changed, try again.";

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
  // F-16 REVISED point 3 / F-15: what the ACTIVE plan is, read once on entry.
  // `styleLock` non-null removes the regenerate path entirely; `hasCircuit`
  // keeps it but discloses that the rounds are not carried across.
  const [planKind, setPlanKind] = useState(null); // { styleLock, hasCircuit } once read
  const [kindChecked, setKindChecked] = useState(false);
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let styleLock = null;
      let hasCircuit = false;
      try {
        const active = user?.id ? await getActivePlan(user.id) : null;
        styleLock = styleLockFromTags(active?.tags);
        // A style plan never reaches the preview, so the circuit read is
        // only needed for the plans that still can.
        if (!styleLock) hasCircuit = await activePlanHasCircuitGroups(user?.id ?? null);
      } catch (e) {
        // Best effort: an unreadable plan behaves exactly as it did before
        // this existed. It is logged rather than shown.
        logWarn('PlanUpdateScreen.readPlanKind', e?.message ?? 'unknown', { userId: user?.id });
      }
      if (cancelled) return;
      setPlanKind({ styleLock, hasCircuit });
      setKindChecked(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const styleLock = planKind?.styleLock ?? null;
  const hasCircuitGroups = !!planKind?.hasCircuit;

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
  // shows everything in the prospective plan as new. D139: the same reader the
  // other three generation surfaces use, so no two previews can drift.
  async function readCurrentPlanSummary() {
    return readActivePlanSummary(user.id, userProfile?.sessionLengthMinutes ?? null);
  }

  // Step 1 (NEW): the review button runs a dry-run + diff and opens the preview.
  // Nothing is written until the user confirms, the active plan and profile are
  // untouched if they back out.
  async function handleRebuildPress() {
    if (previewing || saving) return;
    // F-16 REVISED point 3: belt and braces. The button is not rendered for
    // a style plan, so this can only be reached by a stale render.
    if (styleLock) return;
    setPreviewing(true);
    const updatedProfile = buildUpdatedProfile();
    try {
      // CC27 (section 9.6) / D112 R3 (closes audit T1-21): the SAME
      // capability pre-flight the commit runs, taken before the dry run,
      // so the preview can never show an unchecked plan that the confirm
      // step would then refuse to build.
      const preflight = await capabilityPreflight(user.id);
      if (!preflight.proceed) {
        const goAhead = await new Promise((resolve) => {
          offerCapabilityPreflightChoice({
            onHold: () => resolve(false),
            onContinue: () => resolve(true),
          });
        });
        if (!goAhead) return;
      }
      const dry = await generatePlanDryRun(user.id, updatedProfile);
      if (!dry.ok) {
        // C1: the code is logged for diagnostics, never shown, see
        // REBUILD_FAILED_MESSAGE above.
        logWarn('PlanUpdateScreen.reviewRebuild', dry.error ?? 'unknown', { userId: user?.id });
        toast.show(REBUILD_FAILED_MESSAGE, { variant: 'error', duration: 5000 });
        return;
      }
      const nowSummary = await readCurrentPlanSummary();
      // C9 cosmetic patch: hand the summariser the dry run's own blocked
      // list so the preview never names an exercise the user set aside as
      // though it were about to be prescribed.
      const afterSummary = summariseProspectivePlan(dry.plan, dry.sessionLengthMinutes, {
        blockedSlots: dry.blockedSlots ?? null,
      });
      // The SAME schedule-fit resolver onboarding uses (founder law: one
      // resolver, so the two surfaces cannot give the athlete different
      // answers about the same schedule). Advisory here: the preview says
      // how the new schedule fits, and the athlete still decides.
      const fit = await assessScheduleFit(updatedProfile, {
        userId: user.id,
        durationOptions: SESSION_LENGTH_OPTIONS.map(o => o.value),
        dayOptions: DAYS_OPTIONS,
      }).catch(() => null);
      // D139: the same two facts every preview now carries - where the
      // block stands (read through planSwitch, so the sheet and the confirm
      // dialogue can never disagree), and how many plans the commit will
      // archive.
      const blockStatus = await readActiveBlockStatus(user.id).catch(() => null);
      const otherPlans = await getAllPlansForUser(user.id).catch(() => []);
      const nextDiff = diffPlans(nowSummary, afterSummary);
      // C16 job 11: the reason-coded receipt. Built from the SAME
      // continuity decisions the commit will act on, so the sheet cannot
      // describe a change the rebuild is not about to make.
      const receipt = dry.continuity?.decisions?.length
        ? buildChangeReceipt(dry.continuity.decisions)
        : null;
      setDiff(nextDiff);
      setStaged({
        profile: updatedProfile,
        plan: dry.plan,
        sessionLengthMinutes: dry.sessionLengthMinutes ?? null,
        // CAMPAIGN 18 JOB C (moved forward, D139): the athlete's own history
        // is named BEFORE they confirm, not in a receipt toast afterwards.
        structureMemory: dry.structureMemory ?? null,
        blockStatus,
        // D140 (founder decision 2026-09-03): a rebuild that keeps every
        // exercise keeps the running block. Ruled here by the one pure rule
        // the commit re-reads below, so the sheet's line and the write agree.
        keepBlock: keepsBlockOnRebuild({ diff: nextDiff, receipt, blockStatus }),
        currentPlanName: nowSummary?.planName ?? null,
        otherPlansCount: Array.isArray(otherPlans) ? otherPlans.length : 0,
        partial: !!dry.partial,
        missedCount: dry.missedCount ?? 0,
        blockedCount: afterSummary.blockedCount ?? 0,
        // CC27 (sections 9.5, 33.11, 33.14): the capability reason class,
        // its near misses, and per-session thinness ride the preview so
        // the copy below never conflates "you set this aside" with
        // "clashes with a limitation you have set".
        capabilityBlockedCount: dry.capabilityBlockedCount ?? 0,
        capabilityNearMisses: dry.capabilityNearMisses ?? null,
        thinSessions: thinSessionReport(dry.plan, dry.blockedSlots ?? []),
        // Schedule fit, from the shared resolver. Only staged when the new
        // schedule cannot carry the plan comfortably: telling someone their
        // week works every single time they rebuild is noise, not guidance.
        fit: fit?.ok
          && (fit.state === PLAN_FIT.VALID_TIME_CONSTRAINED
            || fit.state === PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN)
          ? fit : null,
        receipt,
      });
    } catch (e) {
      logError('PlanUpdateScreen.reviewRebuild', e, { userId: user?.id });
      toast.show(REBUILD_FAILED_MESSAGE, { variant: 'error', duration: 5000 });
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

    // F-15 (evidence A3): no generation path emits `groupKind`, so a plan
    // with circuit groups comes back as ungrouped straight sets. Said in
    // full, and answered, BEFORE anything is written.
    if (hasCircuitGroups) {
      const acceptsFlatten = await new Promise((resolve) => {
        appAlert('Your plan has circuits', CIRCUIT_FLATTEN_NOTICE, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Rebuild anyway', onPress: () => resolve(true) },
        ]);
      });
      if (!acceptsFlatten) { setSaving(false); return; }
    }

    // FF-002 (unchanged invariant): rebuild FIRST, bail on failure without
    // saving or navigating, and only commit the profile as canonical once the
    // rebuild succeeds, so a failed rebuild can't split-brain.
    // CC27 (section 9.6): capability pre-flight BEFORE the engine call.
    // Rebuild-first means nothing has been saved yet, so a hold aborts the
    // whole update cleanly.
    const preflight = await capabilityPreflight(user.id);
    if (!preflight.proceed) {
      const goAhead = await new Promise((resolve) => {
        offerCapabilityPreflightChoice({
          onHold: () => resolve(false),
          onContinue: () => resolve(true),
        });
      });
      if (!goAhead) { setSaving(false); return; }
    }
    // D140: re-rule "keep the block" against the block's position NOW, not
    // the one the preview read. If the block finished between preview and
    // confirm, the rule flips to a restart and the dialogue below says so
    // honestly, rather than keeping a finished block the preview never saw.
    const blockStatusNow = await readActiveBlockStatus(user.id).catch(() => null);
    const keepBlock = keepsBlockOnRebuild({ diff, receipt: staged.receipt ?? null, blockStatus: blockStatusNow });
    // D139: the same mid-block confirm every other plan-replacing path runs,
    // in its usual position (before the write, with the rebuild wording).
    // The preview above already SAYS what happens to the block; this is the
    // explicit yes to a restart. With the block kept (D140) nothing at block
    // level is lost, so the sheet's confirm is the explicit yes and the
    // dialogue is skipped. Abort leaves the setup and the active plan
    // untouched.
    const proceed = await confirmPlanSwitchMidBlock(user.id, { mode: 'rebuild', keepBlock });
    if (!proceed) { setSaving(false); return; }
    let planResult = { ok: false, error: 'not attempted' };
    try {
      planResult = await generateAndSavePlan(user.id, updatedProfile, { keepBlock });
    } catch (e) {
      // C1: log the real exception here, the diagnostic must survive even
      // though planResult.error below is never shown to the user.
      logError('PlanUpdateScreen.confirmRebuild', e, { userId: user?.id });
      planResult = { ok: false, error: e?.message ?? 'unknown' };
    }

    if (!planResult.ok) {
      setSaving(false);
      // C1: a code from generateAndSavePlan (not necessarily a caught
      // exception) still gets logged for diagnostics before the calm,
      // fixed message is shown, see REBUILD_FAILED_MESSAGE above.
      logWarn('PlanUpdateScreen.confirmRebuild', planResult.error ?? 'unknown', { userId: user?.id });
      toast.show(REBUILD_FAILED_MESSAGE, { variant: 'error', duration: 5000 });
      return;
    }

    try {
      await saveLocalProfile(user.id, updatedProfile);
    } catch (_) {}

    setSaving(false);
    setDiff(null);
    setStaged(null);

    // D141 item 10c: the `else if` branch that used to key off the commit
    // result's own structureMemory field is removed. generateAndSavePlan's
    // commit-side success result never carries that field (only
    // generatePlanDryRun does,
    // src/lib/planAutoGen.js ~line 1263 vs the commit's own result object
    // ~line 1112) -- the history line already shows on the preview sheet
    // before confirm (D139, `dry.structureMemory` staged above), so this
    // branch could never fire. `structureMemoryCopy` and `SPLIT_LABELS` are
    // no longer used anywhere else in this file and their imports are
    // removed with it.
    if (planResult.partial) {
      // FF-003: the plan generated but couldn't fulfil every requested move.
      toast.show(planShortfallNote(planResult.missedCount), { variant: 'warning', duration: 6000 });
    } else if (planResult.blockKept) {
      // D140: say what the preview promised, in the same terms.
      toast.show('Plan rebuilt around your new training setup. Your block carries on where it was', { variant: 'success', duration: 5000 });
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
        {/* F-16 REVISED point 3: nothing on this form can be applied to a
            library style plan, because the only thing it does is regenerate
            and generation cannot build that kind of plan. So the form is
            replaced by the plain reason and the route that CAN change it,
            rather than left on screen as an inert set of controls. */}
        {!kindChecked ? (
          <View style={styles.kindLoading}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : null}

        {kindChecked && styleLock ? (
          <>
            <Text style={[styles.sectionSub, live.sectionSub]}>
              {styleLockRebuildNotice(styleLock.label)}
            </Text>
            <Button
              title={styleLockBrowseLabel(styleLock.label)}
              onPress={() => navigation.navigate('PlanLibrary', { initialCollection: styleLock.collection })}
              accessibilityLabel={styleLockBrowseLabel(styleLock.label)}
              style={styles.saveBtn}
            />
          </>
        ) : null}

        {kindChecked && !styleLock ? (
        <>
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

        {/* F-15 (evidence A3): the circuit grouping is not carried across a
            rebuild. Said here, before the preview is even opened, and again
            as an explicit answer before anything is written. */}
        {hasCircuitGroups ? (
          <Text style={[styles.circuitNotice, live.circuitNotice]}>{CIRCUIT_FLATTEN_NOTICE}</Text>
        ) : null}

        <Button
          title="Review my plan changes"
          onPress={handleRebuildPress}
          loading={previewing}
          disabled={previewing || saving}
          accessibilityLabel="Review my plan changes"
          style={styles.saveBtn}
        />
        </>
        ) : null}
      </ScrollView>

      {/* Plan diff/preview (ULTIMATE-PLANDIFF-01, shared out under D139): the
          before/after of what the rebuild would change, shown BEFORE the
          active plan is overwritten, in the same sheet the other three
          generation moments use. The real commit only runs on confirm;
          backing out writes nothing. */}
      <PlanPreviewSheet
        userId={user?.id ?? null}
        source="update"
        visible={!!diff}
        preview={diff && staged ? { ...staged, mode: 'rebuild', diff } : null}
        currentPlanName={staged?.currentPlanName ?? null}
        otherPlansCount={staged?.otherPlansCount ?? 0}
        confirmLabel="Confirm and rebuild"
        onConfirm={handleConfirmRebuild}
        onClose={() => { if (!saving) { setDiff(null); setStaged(null); } }}
        busy={saving}
      />
    </SafeAreaView>
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
  kindLoading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  circuitNotice: {
    ...type.captionTight, color: colors.textMuted,
    marginTop: spacing.xxl,
  },
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
    circuitNotice: { ...t.type.captionTight, color: t.colors.textMuted },
    optionalTag: { ...t.type.caption, color: t.colors.textMuted },
  };
}
