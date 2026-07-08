import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle, motion } from '../styles/theme';
import { VolyumeIcon } from '../components/BrandMark';
import Button from '../components/Button';
import Card from '../components/Card';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { GOAL_LABELS, PHASE_LABELS, isCompetitionGoal } from '../lib/coachingGoals';
import { getSplitRationale, getSetupReceiptLine } from '../lib/whyThisTemplates';
import { getActivePlan, getRoutinesForPlan, getMorningWeightsLast14Days, getOpenEdPatternFlag } from '../lib/database';
import { firstReviewUnlockDate } from '../lib/trialActivation';
import { formatUnlockDate } from '../lib/coachLedger';
import { planNextWeek } from '../lib/food/mealPlanService';
import { PLAN_WHYTHIS_KEY } from '../lib/planAutoGen';
import { planReady } from '../lib/haptics';

// Order the rationale reads top-to-bottom: how the week is structured,
// then why the volume and progression, then exercise selection and the
// recovery / nutrition adjustments that shaped it.
const WHY_ORDER = ['schedule', 'goal', 'experience', 'progression', 'equipment', 'recovery', 'nutrition', 'weakPoints'];

export default function ProSetupCompleteScreen({ navigation }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile, completeFirstRun } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    completeFirstRun: s.completeFirstRun,
  })));
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const energyUnit = useAppStore(s => s.accessibility?.energyUnit ?? 'kcal');
  const firstName = userProfile?.firstName || 'there';

  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [planRoutines, setPlanRoutines] = useState([]);
  const [planName, setPlanName] = useState(null);
  // Keep the reveal scannable. The split receipt is available immediately, but
  // the user should reach Start training before reading every rationale line.
  const [planOpen, setPlanOpen] = useState(false);
  const [whyThis, setWhyThis] = useState(null);
  // Optional head start: build the first week of meals from the targets shown
  // above (founder 2026-06-15). It persists, so it's waiting in Meal planning
  // when the user enters the app.
  const [buildingMeals, setBuildingMeals] = useState(false);
  const [mealsBuilt, setMealsBuilt] = useState(false);
  // A3 (audit OB-4): the first review is 5 to 11 days away and this reveal used
  // to say only "end of your training week". Name the actual date, computed
  // with the same helper the check-in gate honours (kept-promise rule).
  const [firstReviewLabel, setFirstReviewLabel] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // ED-safety (hostile review): the dated line carries a "keep logging
        // your morning weight" ask, so under an open ED-pattern flag this
        // surface stays on the generic weight-free copy like Home's ledger
        // and CoachOutput's receipt. (Re-onboarding can reach this screen
        // with a flag already open.)
        try {
          const flag = user?.id ? await getOpenEdPatternFlag(user.id).catch(() => 'read_failed') : null;
          if (flag) return;
        } catch (_) { return; /* unknown flag state: keep the neutral copy */ }
        let checkinDay = 0;
        const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
        if (raw) {
          const p = JSON.parse(raw);
          if (Number.isFinite(p?.checkinDay)) checkinDay = p.checkinDay;
        }
        // Enrolment seeds a morning weight, so the earliest reading (or now,
        // for safety) anchors the FIRST_CHECKIN_MIN_DAYS clock.
        let firstWeightAt = Date.now();
        try {
          const weights = await getMorningWeightsLast14Days(user?.id);
          const earliest = weights?.length ? Math.min(...weights.map(w => w.loggedAt ?? Infinity)) : null;
          if (Number.isFinite(earliest)) firstWeightAt = earliest;
        } catch (_) {}
        const label = formatUnlockDate(firstReviewUnlockDate(firstWeightAt, checkinDay));
        if (!cancelled && label) setFirstReviewLabel(label);
      } catch (_) { /* copy falls back to the generic line */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleBuildMeals = async () => {
    if (!user?.id || buildingMeals || mealsBuilt) return;
    setBuildingMeals(true);
    try {
      const res = await planNextWeek(user.id, userProfile, { repeat: false });
      setMealsBuilt(!res?.error);
    } catch (_) { /* leave the affordance so they can retry */ }
    setBuildingMeals(false);
  };

  useEffect(() => {
    // D2: the plan reveal is the Pro funnel's peak; a single success note
    // marks it (the vocabulary no-ops under reduce-motion).
    planReady();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // E9: the reveal is staged, not a single fade. Each block lands in
  // sequence on the UI thread (Reanimated entering); the step is the micro
  // token so the whole page settles inside ~a second. Under Reduce Motion
  // every block renders in place immediately.
  const stage = (i, duration = motion.enter) =>
    reduceMotion ? undefined : FadeInDown.duration(duration).delay(i * motion.micro);

  useEffect(() => {
    AsyncStorage.getItem('@volyume_nutrition_targets')
      .then(raw => {
        if (raw) {
          const parsed = JSON.parse(raw);
          setNutritionSummary(parsed);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const active = await getActivePlan(user.id);
        if (active) {
          setPlanName(active.name);
          const routines = await getRoutinesForPlan(active.id);
          setPlanRoutines(routines || []);
        }
        const raw = await AsyncStorage.getItem(PLAN_WHYTHIS_KEY(user.id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setWhyThis(parsed);
        }
      } catch (_) {}
    })();
  }, [user?.id]);

  async function handleStart() {
    await completeFirstRun();
  }

  const goalLabel = GOAL_LABELS[userProfile?.trainingGoal] ?? 'Build Muscle';
  const phaseLabel = PHASE_LABELS[userProfile?.trainingPhase] ?? null;
  const hasPlan = planRoutines.length > 0;

  // COMP-013: the personalisation receipt, the one line that makes the user
  // feel seen. Built only from inputs the engine acted on (division, weak
  // points the plan prioritised, days committed).
  const receiptLine = getSetupReceiptLine({
    trainingGoal: userProfile?.trainingGoal,
    weakPointLabels: userProfile?.planWeakPoints || [],
    daysPerWeek: userProfile?.daysPerWeek,
  });

  // Macro bars for the targets card. The bar length is each macro's share of
  // the day's calories (protein and carbs 4 kcal/g, fat 9), so the three bars
  // read as the real composition of the plan rather than three identical
  // blocks. The number on each bar stays the gram target. Protein keeps the
  // single weight emphasis, matching the Nutrition tab.
  const macroTargets = nutritionSummary ? [
    { label: 'Protein', g: nutritionSummary.proteinG, kcal: (nutritionSummary.proteinG || 0) * 4, primary: true },
    { label: 'Carbs', g: nutritionSummary.carbsG, kcal: (nutritionSummary.carbsG || 0) * 4 },
    { label: 'Fat', g: nutritionSummary.fatG, kcal: (nutritionSummary.fatG || 0) * 9 },
  ].filter(m => m.g) : [];
  const maxMacroKcal = Math.max(1, ...macroTargets.map(m => m.kcal));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mainBlock}>
          {/* Same header furniture as the wizard steps, so this reads as the
              last beat of that flow rather than a different screen: brand row,
              the progress bar drawn full, then the title and sub. The
              completion signal is the full amber bar and the eyebrow, not a
              glowing orb. The bar matches the wizard's continuous track so the
              two screens share one system. */}
          <Animated.View entering={stage(0, motion.hero)}>
          <View style={styles.brandRow}>
            <VolyumeIcon size={22} />
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={styles.doneEyebrow}>Setup complete</Text>
          </View>

          <Text style={styles.headline}>You're all set, {firstName}.</Text>
          <Text style={styles.sub}>{receiptLine || "Here's your daily routine."}</Text>
          </Animated.View>

          {/* 1. Log your weight, first thing each morning */}
          <Animated.View entering={stage(1)}>
          <Card style={styles.routineCardChrome}>
            <View style={styles.routineHeader}>
              <View style={styles.routineIconWrap}>
                <Ionicons name="scale-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>1. Log your weight</Text>
                <Text style={styles.routineBody}>
                  Every morning before food, after the bathroom. Three seconds. Feeds your weight trend so Coach can make calmer weekly decisions.
                </Text>
              </View>
            </View>
          </Card>
          </Animated.View>

          {/* 2. Hit your calorie + macro targets */}
          {nutritionSummary?.targetKcal ? (
            <Animated.View entering={stage(2)}>
            <Card style={styles.routineCardChrome}>
              <View style={styles.routineHeader}>
                <View style={styles.routineIconWrap}>
                  <Ionicons name="flame-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routineTitle}>2. Hit your daily targets</Text>
                </View>
              </View>
              {/* Wave A B5: the primer is offered BEFORE the numbers. Most
                  users seeing macro targets for the first time have never
                  tracked, so the escape hatch comes ahead of the possibly
                  confusing content, not after it. */}
              <TouchableOpacity
                style={[styles.eduLearnRow, styles.eduLearnRowTop]}
                onPress={() => navigation.navigate('NutritionEducation')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="New to calories and macros? Open the five-minute guide"
              >
                <Ionicons name="book-outline" size={14} color={colors.primary} />
                <Text style={styles.eduLearnText}>
                  New to calories and macros? 5-minute guide
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
              {/* The kcal ring is the Nutrition tab's signature, so the reveal
                  shows the same shape the first time these numbers appear.
                  Target framing, not progress: the ring is drawn full, since
                  the whole ring is the day's allowance and nothing is logged
                  yet. No "remaining" readout, that belongs in the diary. */}
              <View style={styles.ringWrap}>
                <View style={styles.ring}>
                  <Text style={styles.ringValue}>{toEnergy(nutritionSummary.targetKcal, energyUnit)}</Text>
                  <Text style={styles.ringSub}>{energyUnitLabel(energyUnit)} per day</Text>
                </View>
              </View>
              {/* Same horizontal macro bars the Nutrition tab uses. */}
              <View style={styles.macroBars}>
                {macroTargets.map(m => (
                  <View key={m.label} style={styles.macroBar}>
                    <View style={styles.macroBarTop}>
                      <Text style={[styles.macroBarLabel, m.primary && styles.macroBarLabelPrimary]}>{m.label}</Text>
                      <Text style={[styles.macroBarValue, m.primary && styles.macroBarValuePrimary]}>{m.g}g</Text>
                    </View>
                    <View style={styles.macroTrack}>
                      <View style={[styles.macroFill, { width: `${Math.round((m.kcal / maxMacroKcal) * 100)}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.goalRow}>
                <View style={styles.goalChip}>
                  <Ionicons
                    name={isCompetitionGoal(userProfile?.trainingGoal) ? 'trophy-outline' : 'body-outline'}
                    size={11}
                    color={colors.primary}
                  />
                  <Text style={styles.goalChipText}>{goalLabel}</Text>
                </View>
                {phaseLabel ? (
                  <View style={styles.goalChip}>
                    <Ionicons name="layers-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.goalChipText, { color: colors.textMuted }]}>{phaseLabel}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.targetsNote}>
                Hit these most days. Logging your meals sharpens your coaching, and your weight trend carries the rest.
              </Text>
              {/* Optional head start: a full week of meals built to these
                  targets, with a shopping list, waiting in Meal planning. */}
              {mealsBuilt ? (
                <View style={styles.eduLearnRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.eduLearnText, { color: colors.textSecondary }]}>
                    Your first week of meals is ready in Meal planning.
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.eduLearnRow}
                  onPress={handleBuildMeals}
                  disabled={buildingMeals}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Create my first week of meals to these targets"
                >
                  <Ionicons name="restaurant-outline" size={14} color={colors.primary} />
                  <Text style={styles.eduLearnText}>
                    {buildingMeals ? 'Creating your week' : 'Create my first week of meals'}
                  </Text>
                  {!buildingMeals ? <Ionicons name="chevron-forward" size={14} color={colors.primary} /> : null}
                </TouchableOpacity>
              )}
            </Card>
            </Animated.View>
          ) : null}

          {/* 3. Training split, collapsible */}
          <Animated.View entering={stage(3)}>
          <TouchableOpacity
            style={[styles.routineCard, planOpen && styles.routineCardOpen]}
            onPress={() => setPlanOpen(v => !v)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ expanded: hasPlan ? planOpen : undefined }}
            accessibilityLabel="Train your split"
          >
            <View style={styles.routineHeader}>
              <View style={styles.routineIconWrap}>
                <Ionicons name="barbell-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>3. Train your split</Text>
                {hasPlan ? (
                  <Text style={styles.routineBody}>
                    {planName ?? 'Your plan'} - {planRoutines.length} workout{planRoutines.length !== 1 ? 's' : ''} per week
                  </Text>
                ) : (
                  <Text style={styles.routineBody}>
                    Create or choose a routine before your first session.
                  </Text>
                )}
              </View>
              {hasPlan && (
                <Ionicons
                  name={planOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              )}
            </View>
            {hasPlan && planOpen && (
              <View style={styles.splitList}>
                {/* The richer engine rationale supersedes the one-line split
                    note when it's available. */}
                {!whyThis && planRoutines[0]?.split_type ? (
                  <Text style={styles.splitWhy}>{getSplitRationale(planRoutines[0].split_type)}</Text>
                ) : null}
                {planRoutines.map((r, i) => (
                  <View key={r.id} style={[styles.splitRow, i < planRoutines.length - 1 && styles.splitRowBorder]}>
                    <View style={styles.splitBadge}>
                      <Text style={styles.splitBadgeText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.splitName}>{r.name}</Text>
                  </View>
                ))}
                {whyThis && WHY_ORDER.some(k => whyThis[k]) ? (
                  <View style={styles.whyPlanWrap}>
                    <Text style={styles.whyPlanTitle}>Why this plan, for you</Text>
                    {WHY_ORDER.filter(k => whyThis[k]).map(k => (
                      <View key={k} style={styles.whyPlanItem}>
                        <View style={styles.whyPlanBullet} />
                        <Text style={styles.whyPlanText}>{whyThis[k]}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </TouchableOpacity>
          </Animated.View>

          {/* 4. Check in once a week */}
          <Animated.View entering={stage(4)}>
          <Card style={styles.routineCardChrome}>
            <View style={styles.routineHeader}>
              <View style={styles.routineIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>4. Check in once a week</Text>
                <Text style={styles.routineBody}>
                  {firstReviewLabel
                    ? `Keep logging your morning weight. Your first weekly check-in opens on ${firstReviewLabel} and takes about two minutes. The Coach then explains any calorie or training change before you apply it.`
                    : 'At the end of your training week, review how it went. The Coach then explains any calorie or training change before you apply it.'}
                </Text>
                {/* Wave A B3: the trial arc, stated once, calmly, so day 14
                    is never a surprise. Facts mirror the subscription FAQ. */}
                <Text style={styles.routineBody}>
                  Your full access runs for 14 days. If you decide not to
                  continue after that, your training log, plans and personal
                  bests stay free forever.
                </Text>
              </View>
            </View>
            {/* Wave A B3: Precision Coaching is named twice on this screen;
                this link means it is explained BEFORE it ever acts. */}
            <TouchableOpacity
              style={styles.eduLearnRow}
              onPress={() => navigation.navigate('Methodology', { source: 'setup_complete' })}
              activeOpacity={0.7}
              accessibilityRole="button"
                accessibilityLabel="How the Coach works"
            >
              <Ionicons name="bulb-outline" size={14} color={colors.primary} />
              <Text style={styles.eduLearnText}>How the Coach works</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </Card>
          </Animated.View>

        </View>

        <Animated.View entering={reduceMotion ? undefined : FadeInUp.duration(motion.enter).delay(5 * motion.micro)}>
          <Button
            title="Start training"
            trailingIcon="arrow-forward"
            size="lg"
            onPress={handleStart}
            style={styles.startBtn}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl },

  mainBlock: { flex: 1, marginTop: spacing.sm },

  // Header furniture, matched to ProOnboardingScreen so the wizard and this
  // completion screen share one visual system.
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg,
  },
  proBadge: {
    backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 7, paddingVertical: spacing.xxs,
  },
  proBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.onPrimary, letterSpacing: 0 },

  // Matched to the wizard's continuous track, drawn full here (setup complete).
  progressTrack: {
    height: 3, borderRadius: radius.hair, backgroundColor: colors.border,
    overflow: 'hidden', marginBottom: spacing.sm,
  },
  progressFill: { width: '100%', height: '100%', borderRadius: radius.hair, backgroundColor: colors.primary },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  doneEyebrow: { ...type.num('caption'), color: colors.primary, fontWeight: fontWeight.semibold },

  headline: {
    ...type.h2,
    color: colors.textPrimary, marginBottom: spacing.sm,
  },
  sub: {
    ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.xl,
  },

  // Cards 1, 2 and 4 (plain, non-collapsible) now render via the shared
  // Card component; this is just the residual chrome Card doesn't own
  // (its hairline border is 1px, this reveal has always drawn 1.5px, so
  // it stays explicit here to keep the conversion visually identical).
  // backgroundColor/borderRadius/padding come from Card's defaults
  // (surface, radius.lg, spacing.lg) and match what this used to set.
  routineCardChrome: {
    borderWidth: 1.5, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  // Card 3 (the collapsible split card) stays a hand-rolled TouchableOpacity:
  // it needs accessibilityState={{expanded}} which Card doesn't forward, so
  // it keeps its own full chrome rather than going through Card.
  routineCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  routineCardOpen: { borderColor: withAlpha(colors.primary, 0.314) },
  routineHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  routineIconWrap: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  routineTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  routineBody: { ...type.bodySm, color: colors.textSecondary },

  // Full amber ring drawn as a thick-bordered circle. At full progress a Skia
  // arc and a bordered circle are visually identical, and this keeps the native
  // canvas (and its test setup) out of the onboarding flow. The surface2 inner
  // fill matches the Diary ring's track colour.
  ringWrap: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  ring: {
    width: 128, height: 128, borderRadius: circle(128),
    borderWidth: 13, borderColor: colors.primary,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  // eslint-disable-next-line no-restricted-syntax -- setup-complete hero numeral
  ringValue: { fontSize: 34, fontWeight: fontWeight.bold, color: colors.textPrimary, lineHeight: 38, fontVariant: ['tabular-nums'] },
  ringSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xxs },
  // Macro bars, matched to the Nutrition tab's MacroRings so the reveal and the
  // place the user tracks every day read as one component.
  macroBars: {
    gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, marginBottom: spacing.md,
  },
  macroBar: { gap: spacing.xs2 },
  macroBarTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  macroBarLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  macroBarLabelPrimary: { color: colors.textSecondary, fontWeight: fontWeight.semibold },
  macroBarValue: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  macroBarValuePrimary: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  macroTrack: { height: 6, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  goalRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.188),
  },
  goalChipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  eduLearnRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRadius: radius.md,
  },
  // Variant for a primer offered ABOVE content (B5): no divider, tighter.
  eduLearnRowTop: { borderTopWidth: 0, paddingTop: 0, marginTop: spacing.xs, marginBottom: spacing.xs, backgroundColor: colors.surface2 },
  eduLearnText: { color: colors.textPrimary, ...type.label, flex: 1 },
  targetsNote: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.sm },

  splitList: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  splitWhy: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.sm },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  splitRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  splitBadge: {
    width: 24, height: 24, borderRadius: circle(24),
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  splitBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary },
  splitName: { ...type.label, color: colors.textPrimary, flex: 1 },
  whyPlanWrap: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.sm },
  whyPlanTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0 },
  whyPlanItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  whyPlanBullet: { width: 6, height: 6, borderRadius: circle(6), backgroundColor: colors.primary, marginTop: 7 },
  whyPlanText: { ...type.bodySm, flex: 1, color: colors.textSecondary },

  startBtn: { marginTop: spacing.md },
});
