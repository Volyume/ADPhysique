import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { setupFormSignature, SETUP_CHANGED_NOTICE, COACH_FORM_FIELDS } from '../lib/setupFormSeed';
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
// Final pass S3 (certification 2026-09-05): this screen lives in the Coach
// tab's stack and PlanLibrary in the Train tab's, so the jump must cross tabs.
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Dropdown from '../components/Dropdown';
import BackHeader from '../components/BackHeader';
import CoachingSetupCard from '../components/CoachingSetupCard';
import useCoachingSetUp from '../hooks/useCoachingSetUp';
import Button from '../components/Button';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import { useToast } from '../components/Toast';
import {
  TRAINING_PHASES,
  phaseToCoachingKey, phaseToNutritionKey, buildNutritionEngineInputs,
  isCompetitionGoal,
} from '../lib/coachingGoals';
import { parseShowDate } from '../lib/contestCountdown';
import { calculateNutritionTargets, PROTEIN_APPROACHES, ADVANCED_PROTEIN_GOALS } from '../lib/nutritionEngine';
import { resolveEffectiveMaintenanceForUser } from '../lib/effectiveMaintenanceService';
import {
  saveNutritionTargets, getNutritionTargets, getMorningWeightsLast14Days,
  getLatestBodyComposition, getUserBodyProfile, getActivePeakWeekPlan, setPeakWeekShowDate,
} from '../lib/database';
import { ageYearsFromDateOfBirth } from '../lib/profileAge';
import { computeEWMA } from '../lib/weeklyCoach';
import { formatBodyWeightShort } from '../lib/units';

const APPROACH_SHORT = {
  standard:  'Enough for consistent training. Easy to sustain day to day.',
  optimised: 'The proven target for serious training. Best for most people.',
  advanced:  'Upper end for competitive athletes and harder cuts.',
};

const NUTRITION_KEY = '@volyume_nutrition_targets';

// Owns goal, phase, protein target, show date and the calorie and macro targets
// (proposal 10, Option B). The training setup (category, style, weak points,
// experience, days, session length, equipment, recovery) is owned by "Adjust
// training plan" on the Train tab. The phase does not feed the plan builder
// (planAutoGen.buildPlanInputs -> structure/adapt.structureArgs reads no phase),
// so this save never rebuilds the plan.
export default function ProGoalSetupScreen({ navigation }) {
  // Coaching-first onboarding (founder brief 2026-10-19): goal and phase set
  // nutrition targets, so a quick-start person sets them through coaching
  // setup, the one path that enforces the required baseline.
  const coachingSetUp = useCoachingSetUp();
  const toast = useToast();
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile, saveLocalProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    saveLocalProfile: s.saveLocalProfile,
  })));

  // CP-10 batch G lane 1 (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // The physique category is owned by Adjust training plan: read here only, for
  // the show-date question and the target calculation.
  const selectedGoal = userProfile?.trainingGoal ?? null;
  // Wave A B4: the footer names the next check-in day. Same flat prefs blob
  // the check-in screen reads (checkinDay 0=Sunday, default 0); best-effort.
  const [nextCheckinLabel, setNextCheckinLabel] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
        const day = raw ? (JSON.parse(raw).checkinDay ?? 0) : 0;
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        if (!cancelled) setNextCheckinLabel(DAYS[day] ?? 'Sunday');
      } catch (_) { /* footer falls back to the undated line */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [selectedPhase, setSelectedPhase] = useState(userProfile?.trainingPhase ?? 'lean_gain');
  // One save at a time. The ref is the guard (state lags a render, so two
  // quick taps would both read it as idle); the state drives the spinner.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [proteinApproach, setProteinApproach] = useState(
    userProfile?.proteinApproach
    ?? (ADVANCED_PROTEIN_GOALS.includes(userProfile?.trainingGoal) ? 'advanced' : 'optimised')
  );
  // D94 (Campaign 3, ownership finding 6): every live consumer reads the
  // nutrition_targets row, and NutritionTargetsScreen writes ONLY that row.
  // Seeding this picker from the profile copy alone meant a save here
  // recalculated targets with a STALE approach and silently reverted a
  // choice the user made on Nutrition Targets. The saved row is the live
  // truth, so it takes precedence over the profile mirror at seed time;
  // the save path (which writes both stores) is unchanged and now cannot
  // regress an untouched picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userId = useAppStore.getState().user?.id;
        if (!userId) return;
        const t = await getNutritionTargets(userId);
        const saved = t?.proteinApproach ?? t?.protein_approach;
        if (!cancelled && saved && PROTEIN_APPROACHES[saved]) {
          setProteinApproach(saved);
        }
      } catch (_) { /* profile-seeded default stands */ }
    })();
    return () => { cancelled = true; };
  }, []);
  // B4: optional show date for competition divisions, stored on the user's
  // active peak_week_plans row (its only writer). Feeds the ED-gated
  // countdown on CoachOutput (docs/b4-contest-countdown-ed-review).
  const [showDateInput, setShowDateInput] = useState('');
  // Proposal 10 (F1): reload the form from the saved profile whenever the
  // screen regains focus AND the saved setup has changed since this form last
  // seeded. Tabs keep their stack, so this form can sit mounted while the other
  // setup screen saves; without this, pressing save writes the old values back.
  // Unsaved edits survive a trip to a sub-screen (same signature, no reseed).
  const seededSigRef = useRef(setupFormSignature(userProfile, COACH_FORM_FIELDS));
  const [setupReloaded, setSetupReloaded] = useState(false);
  useFocusEffect(useCallback(() => {
    const sig = setupFormSignature(userProfile, COACH_FORM_FIELDS);
    if (sig === seededSigRef.current) return;
    seededSigRef.current = sig;
    const p = userProfile || {};
    setSelectedPhase(p.trainingPhase ?? 'lean_gain');
    if (p.proteinApproach && PROTEIN_APPROACHES[p.proteinApproach]) setProteinApproach(p.proteinApproach);
    setSetupReloaded(true);
  }, [userProfile]));

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
  const showDateApplicable = isCompetitionGoal(selectedGoal);
  const canSave = selectedPhase !== null;

  // Pre-fill the show date from the active peak-week plan, if one exists.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const plan = await getActivePeakWeekPlan(user.id);
        if (plan?.showDate) setShowDateInput(String(plan.showDate));
      } catch (_) {} // best effort: an unreadable plan just leaves the field blank
    })();
  }, [user?.id]);

  // Phases that represent a calorie deficit, used to track when the deficit began.
  const DEFICIT_PHASES = ['cut'];

  async function handleSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await runSave();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function runSave() {
    if (!canSave) return;

    // B4: validate the optional show date up front so nothing half-saves.
    const trimmedShowDate = showDateInput.trim();
    if (showDateApplicable && trimmedShowDate && parseShowDate(trimmedShowDate) === null) {
      toast.show('Show date needs the format YYYY-MM-DD, for example 2026-09-19', { variant: 'warning' });
      return;
    }

    const goalPhase = phaseToCoachingKey(selectedPhase);

    // Capture the previous state for the change-summary screen.
    // Review B finding 4: the picker seeds from the saved targets row
    // (the live truth every consumer reads), so the change summary's
    // "previous" must read the same source or it reports a protein
    // change the user never made. Profile mirror stays the fallback.
    let previousApproach = userProfile?.proteinApproach ?? null;
    try {
      const prevTargets = await getNutritionTargets(user?.id);
      const savedApproach = prevTargets?.proteinApproach ?? prevTargets?.protein_approach;
      if (savedApproach && PROTEIN_APPROACHES[savedApproach]) previousApproach = savedApproach;
    } catch (_) { /* profile fallback stands */ }
    const previousProfile = {
      goal: userProfile?.trainingGoal ?? null,
      phase: userProfile?.trainingPhase ?? null,
      approach: previousApproach,
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

    // Proposal 10 (F1, F2): built on the LATEST saved profile, not the render's
    // copy, and carrying only the fields this screen owns (phase, protein,
    // start date). Training fields belong to Adjust training plan, so a form
    // left open can never write an older days or equipment value back.
    const updatedProfile = {
      ...(useAppStore.getState().userProfile || userProfile || {}),
      trainingPhase: selectedPhase,
      goalPhase,
      // nutrition goal key, kept in step with the phase so surfaces reading
      // userProfile.goal (Nutrition Targets summary) match the saved calories.
      goal: phaseToNutritionKey(selectedPhase),
      // C6 Phase 1 seam 4 (D97): the phase clock. Reset ONLY when the phase
      // genuinely changes, so a protein or show-date save never touches it.
      ...(selectedPhase !== userProfile?.trainingPhase
        ? { phaseStartedAt: Date.now() }
        : {}),
      proteinApproach,
      goalStartDate,
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
    const canonicalBodyProfile = user?.id
      ? await getUserBodyProfile(user.id).catch(() => null)
      : null;

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

    // C5-P5-02 (D96): no invented biology. This block used to substitute
    // 80kg / 175cm / 28y and default a missing sex to MALE, which computed
    // and PERSISTED nutrition targets from a fabricated body - and hid the
    // exact enforcement gap buildNutritionEngineInputs' sexMissing guard
    // exists to catch (sex is a REQUIRED blocking field, founder
    // 2026-07-01, and drives the sacred calorie floor). When any required
    // field is missing the recalculation is SKIPPED - the stored targets
    // stay (stale-but-real beats fabricated) - and the user is told where
    // to complete the profile instead of being silently defaulted.
    const hasWeight = typeof latestWeightKg === 'number' && latestWeightKg > 0;
    const currentAge = canonicalBodyProfile?.dateOfBirth
      ? ageYearsFromDateOfBirth(canonicalBodyProfile.dateOfBirth)
      : wp.age;
    const currentHeight = canonicalBodyProfile?.heightCm ?? wp.heightCm;
    const currentSex = canonicalBodyProfile?.sex ?? wp.sex;
    const hasHeight = typeof currentHeight === 'number' && currentHeight > 0;
    const hasAge    = typeof currentAge === 'number' && currentAge > 0;
    const hasSex    = currentSex === 'male' || currentSex === 'female';
    const biologyComplete = hasWeight && hasHeight && hasAge && hasSex;
    const safeWeightKg = latestWeightKg;
    const safeHeightCm = currentHeight;
    const safeAge      = currentAge;
    const safeSex      = currentSex;

    // Body composition for the BMR formula. Prefer the profile (what onboarding
    // stored), and for users who onboarded before the profile carried body fat,
    // fall back to the most recent logged reading. Passing both the percentage
    // AND the source is what keeps this calc on the Katch-McArdle path that
    // onboarding used, instead of silently dropping to Mifflin.
    let bodyFatPct    = (typeof wp.bodyFatPct === 'number' && wp.bodyFatPct > 0) ? wp.bodyFatPct : null;
    let bodyFatSource = wp.bodyFatSource ?? null;
    if (bodyFatPct == null && user?.id) {
      try {
        const comp = await getLatestBodyComposition(user.id);
        if (comp && typeof comp.bodyFatPercent === 'number') {
          bodyFatPct    = comp.bodyFatPercent;
          bodyFatSource = comp.bodyFatSource ?? null;
        }
      } catch (_) {}
    }

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
      if (!biologyComplete) {
        // Stale-but-real beats fabricated: the stored targets stay and the
        // user is told where to complete the profile. The goal save itself
        // proceeds; only the nutrition recalculation is withheld.
        toast.show('Goal saved, but calorie targets were not updated. Complete sex, age and height in your profile, then open Nutrition targets to refresh', { variant: 'warning', duration: 5000 });
        throw Object.assign(new Error('profile biology incomplete'), { _handled: true });
      }
      const engineInputs = buildNutritionEngineInputs({
        sex: safeSex,
        age: safeAge,
        heightCm: safeHeightCm,
        weightKg: safeWeightKg,
        bodyFatPct,
        bodyFatSource,
        // Days and experience are set on Adjust training plan; this save is
        // where the targets pick up whatever was saved there.
        daysPerWeek: wp.daysPerWeek ?? 4,
        trainingPhase: selectedPhase,
        trainingGoal: wp.trainingGoal ?? null,
        proteinApproach,
        experience: wp.experience ?? 'intermediate',
      });
      const authority = await resolveEffectiveMaintenanceForUser(user.id, {
        ...engineInputs,
        dateOfBirth: canonicalBodyProfile?.dateOfBirth ?? null,
      });
      const calculatedTargets = calculateNutritionTargets({
        ...engineInputs,
        effectiveMaintenanceResidualKcal: authority.resolved.appliedResidualKcal,
      });
      nextTargets = { ...calculatedTargets, maintenanceAuthority: authority.resolved };
      await AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nextTargets));
      if (user?.id) {
        await saveNutritionTargets(user.id, nextTargets);
      }
    } catch (_e) {
      // Don't block the goal save if the recalc fails. Surface to the user
      // so they know targets weren't updated this time. The incomplete-
      // biology skip above already showed its own specific message.
      if (!_e?._handled) {
        toast.show("Goal saved, but targets did not recalculate. Open Nutrition targets to refresh them.", { variant: 'warning', duration: 5000 });
      }
    }

    // Persist the body composition we calculated from, so a value recovered
    // from the body-metric log gets cached on the profile and the next recalc
    // reads it directly.
    if (bodyFatPct != null) {
      updatedProfile.bodyFatPct = bodyFatPct;
      updatedProfile.bodyFatSource = bodyFatSource;
    }

    // F2: the latest weigh-in was written back above; the profile saved here
    // must carry that weigh-in too or this write puts the enrolment weight back.
    if (latestWeightKg && latestWeightKg !== updatedProfile.weightKg) {
      updatedProfile.weightKg = latestWeightKg;
    }
    await saveLocalProfile(user.id, updatedProfile);
    // Our own save is not "another screen": keep the reload check quiet.
    seededSigRef.current = setupFormSignature(updatedProfile, COACH_FORM_FIELDS);
    setSetupReloaded(false);

    // B4: store or clear the show date on the active peak-week plan row.
    // Best effort: the goal save must not fail on this.
    if (user?.id && showDateApplicable) {
      try {
        await setPeakWeekShowDate(user.id, trimmedShowDate || null);
      } catch (_) {
        toast.show('Goal saved, but the show date could not be stored. Please try again from this screen.', { variant: 'warning' });
      }
    }

    // The plan is not part of this save: the phase is no input to the plan
    // builder, and the category and every training field are set on Adjust
    // training plan, which previews and rebuilds. The summary says so.
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
        goal: previousProfile.goal,
        phase: selectedPhase,
        approach: proteinApproach,
        kcal: nextTargets?.targetKcal ?? null,
        protein: nextTargets?.proteinG ?? null,
        carbs: nextTargets?.carbsG ?? null,
        fat: nextTargets?.fatG ?? null,
      },
      planRerolled: false,
      planKeptReason: 'training_on_train',
    });
  }

  // The save writes the goal, phase, protein target and targets. Same words as
  // the owner's Stage 2 answer for item 10.
  const primaryLabel = 'Review and save';

  if (!coachingSetUp) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Update goal and phase" />
        <View style={{ paddingHorizontal: t.screenPadding }}>
          <CoachingSetupCard surface="goal_setup" onPress={() => navigation.navigate('CoachingSetup')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Update goal and phase" />

      {/* L03-C5 (2026-07-09 design audit): standardise on the app's
          KeyboardAvoidingView pattern for consistency, no fixed footer was
          found below this scroll. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, live.scroll]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {setupReloaded ? (
          <Text style={[styles.sectionSub, live.sectionSub]} accessibilityLiveRegion="polite">
            {SETUP_CHANGED_NOTICE}
          </Text>
        ) : null}
        {/* ── Show date (competition divisions only, optional) ──
            B4: feeds the ED-gated countdown on CoachOutput. Process copy
            only; safety holds always outrank the countdown. */}
        {showDateApplicable && (
          <>
            <SectionLabel style={styles.sectionLabelSpaced}>
              Show date <Text style={[styles.optionalTag, live.optionalTag]}>(optional)</Text>
            </SectionLabel>
            <Text style={[styles.sectionSub, live.sectionSub]}>
              Adds a quiet weeks-out line and a prep checklist to your weekly coaching. You can clear it any time.
            </Text>
            <TextField
              fieldStyle={styles.showDateField}
              inputStyle={[styles.showDateInput, live.showDateInput]}
              surface="surface"
              value={showDateInput}
              onChangeText={setShowDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={t.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Show date, optional, format year month day"
            />
          </>
        )}

        {/* ── Current focus (primary question post-merge) ──
            Drives nutrition, plan structure, and emphasis overlays
            (weak_point spec, strength_size's isolation reduction). */}
        <SectionLabel style={styles.sectionLabelSpaced}>What are you focused on right now?</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          Drives your calorie and protein targets.
        </Text>

        <Dropdown
          value={selectedPhase}
          options={TRAINING_PHASES.map(p => ({ value: p.value, label: p.label, sub: p.detail }))}
          onChange={setSelectedPhase}
          placeholder="Choose your focus"
        />

        {/* Proposal 10 (Option B): the training setup lives on the Train tab's
            "Adjust training plan". Here it is a read-out with the link. */}
        <SectionLabel style={styles.sectionLabelSpaced}>Training setup</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          {`${userProfile?.daysPerWeek ?? 4} days a week, ${userProfile?.sessionLengthMinutes ?? 60} minutes a session. Your category, training style, experience, days, equipment and recovery are set on the Train tab.`}
        </Text>
        <Button
          title="Adjust training plan"
          onPress={() => navigateCrossTab(navigation, 'PlansTab', 'PlanUpdate')}
          accessibilityLabel="Adjust training plan"
          variant="secondary"
        />

        {/* ── Protein target ── */}
        <SectionLabel style={styles.sectionLabelSpaced}>Protein target</SectionLabel>
        <Text style={[styles.sectionSub, live.sectionSub]}>
          How much protein your daily targets include. Optimised works for most people.
        </Text>

        {['standard', 'optimised', 'advanced'].map(key => {
          const ap = PROTEIN_APPROACHES[key];
          const active = proteinApproach === key;
          const isSuggested = suggestedApproach === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.phaseCard, live.phaseCard, active && [styles.phaseCardActive, live.phaseCardActive]]}
              onPress={() => setProteinApproach(key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={ap.label}
            >
              <View style={[styles.phaseIconWrap, live.phaseIconWrap]}>
                <Ionicons
                  name="barbell-outline"
                  size={18}
                  color={active ? t.colors.primary : t.colors.textSecondary}
                />
              </View>
              <View style={styles.phaseBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs }}>
                  <Text style={[styles.phaseLabel, live.phaseLabel, active && [styles.phaseLabelActive, live.phaseLabelActive]]}>{ap.label}</Text>
                  <Text style={[styles.approachRange, live.approachRange, active && [styles.approachRangeActive, live.approachRangeActive]]}>{ap.range}</Text>
                  {isSuggested && (
                    <View style={[styles.suggestedBadge, live.suggestedBadge]}>
                      <Text style={[styles.suggestedBadgeText, live.suggestedBadgeText]}>Suggested</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.phaseDetail, live.phaseDetail]}>{APPROACH_SHORT[key]}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} />}
            </TouchableOpacity>
          );
        })}

        {displayWeightKg ? (
          <View style={styles.footerNote}>
            <Ionicons name="scale-outline" size={15} color={t.colors.textMuted} />
            {/* C6 Phase 7 (D97): displayWeightKg is the LAST logged
                weigh-in (or the profile weight) at any age - after months
                away, "your recent weight trend" was a false recency claim.
                "Last logged weight" is true at any age, like "last block".
                Copy only; the value and the calculation are untouched. */}
            <Text style={[styles.footerNoteText, live.footerNoteText]}>
              Targets use your last logged weight, {formatBodyWeightShort(displayWeightKg, userProfile?.bodyWeightUnits ?? 'st')}. Log a new weigh-in on Today.
            </Text>
          </View>
        ) : null}

        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={15} color={t.colors.textMuted} />
          <Text style={[styles.footerNoteText, live.footerNoteText]}>
            {/* Wave A B4: the next check-in is a date, not an abstract
                future event. Same prefs source the check-in screen reads. */}
            Changing your goals updates your plan targets immediately.
            {nextCheckinLabel
              ? ` Your coach adjusts at your next check-in on ${nextCheckinLabel}.`
              : ' Your coach adjusts at the next check-in.'}
          </Text>
        </View>

        <Button
          title={primaryLabel}
          onPress={handleSave}
          loading={saving}
          disabled={!canSave || saving}
          accessibilityLabel={primaryLabel}
        />
      </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  sectionLabel: { marginBottom: spacing.xs },
  sectionLabelSpaced: { marginTop: spacing.xxl, marginBottom: spacing.xs },
  sectionSub: {
    ...type.captionTight, color: colors.textMuted,
    marginBottom: spacing.md,
  },

  optionalTag: {
    ...type.caption,
    color: colors.textMuted,
  },
  showDateField: { borderRadius: radius.md },
  showDateInput: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  weakPointGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  phaseCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSubtle,
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
  phaseDetail: { ...type.bodySm, color: colors.textSecondary },

  footerNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.xl, marginBottom: spacing.xl,
  },
  footerNoteText: { ...type.captionTight, flex: 1, color: colors.textMuted },

  approachRange: {
    fontSize: fontSize.xs, color: colors.textMuted, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
  },
  approachRangeActive: { color: colors.primaryDim },
  suggestedBadge: {
    backgroundColor: withAlpha(colors.primary, alpha.tint), borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 1,
  },
  suggestedBadgeText: { ...type.captionStrong, color: colors.primary },

});

// CP-10 batch G lane 1 (2026-07-11): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/padding/gap/margin/borderRadius/borderWidth, no token) and
// fontWeight (not part of useTheme()'s shape) are correctly omitted. No
// coaching-engine or nutrition-calc logic touched -- colours only.
function buildLiveStyles(t) {
  return {
    scroll: { paddingHorizontal: t.screenPadding },
    safe: { backgroundColor: t.colors.background },
    sectionSub: { ...t.type.captionTight, color: t.colors.textMuted },
    optionalTag: { ...t.type.caption, color: t.colors.textMuted },
    showDateInput: { fontSize: t.fontSize.md },
    phaseCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    phaseCardActive: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    phaseIconWrap: { backgroundColor: t.colors.surface2 },
    phaseLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    phaseLabelActive: { color: t.colors.primary },
    phaseDetail: { ...t.type.bodySm, color: t.colors.textSecondary },
    footerNoteText: { ...t.type.captionTight, color: t.colors.textMuted },
    approachRange: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    approachRangeActive: { color: t.colors.primaryDim },
    suggestedBadge: { backgroundColor: withAlpha(t.colors.primary, alpha.tint) },
    suggestedBadgeText: { ...t.type.captionStrong, color: t.colors.primary },
  };
}
