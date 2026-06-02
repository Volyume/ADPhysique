import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import { VolyumeIcon } from '../components/BrandMark';
import Button from '../components/Button';
import useAppStore from '../store/useAppStore';
import { GOAL_LABELS, PHASE_LABELS, isCompetitionGoal } from '../lib/coachingGoals';
import { getSplitRationale } from '../lib/whyThisTemplates';
import { getActivePlan, getRoutinesForPlan } from '../lib/database';
import { PLAN_WHYTHIS_KEY } from '../lib/planAutoGen';

// Order the rationale reads top-to-bottom: how the week is structured,
// then why the volume and progression, then exercise selection and the
// recovery / nutrition adjustments that shaped it.
const WHY_ORDER = ['schedule', 'goal', 'experience', 'progression', 'equipment', 'recovery', 'nutrition', 'weakPoints'];

export default function ProSetupCompleteScreen({ navigation }) {
  const { user, userProfile, completeFirstRun } = useAppStore();
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const firstName = userProfile?.firstName || 'there';

  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [planRoutines, setPlanRoutines] = useState([]);
  const [planName, setPlanName] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [whyThis, setWhyThis] = useState(null);

  const opacity    = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideY     = useRef(new Animated.Value(reduceMotion ? 0 : 20)).current;
  const checkScale = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1, tension: 60, friction: 6, useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, duration: 380,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 0, duration: 380,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

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

  // Macro bars for the targets card. The bar length is each macro's share of
  // the day's calories (protein and carbs 4 kcal/g, fat 9), so the three bars
  // read as the real composition of the plan rather than three identical
  // blocks. The number on each bar stays the gram target. Protein keeps the
  // single weight emphasis, matching the Diary tab.
  const macroTargets = nutritionSummary ? [
    { label: 'Protein', g: nutritionSummary.proteinG, kcal: (nutritionSummary.proteinG || 0) * 4, primary: true },
    { label: 'Carbs', g: nutritionSummary.carbsG, kcal: (nutritionSummary.carbsG || 0) * 4 },
    { label: 'Fat', g: nutritionSummary.fatG, kcal: (nutritionSummary.fatG || 0) * 9 },
  ].filter(m => m.g) : [];
  const maxMacroKcal = Math.max(1, ...macroTargets.map(m => m.kcal));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.background} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.mainBlock, { opacity, transform: [{ translateY: slideY }] }]}>
          <View style={styles.brandRow}>
            <VolyumeIcon size={20} />
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          <Text style={styles.headline}>You're all set, {firstName}.</Text>
          <Text style={styles.sub}>Here's your daily routine.</Text>

          {/* 1. Log your weight, first thing each morning */}
          <View style={styles.routineCard}>
            <View style={styles.routineHeader}>
              <View style={styles.routineIconWrap}>
                <Ionicons name="scale-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>1 · Log your weight</Text>
                <Text style={styles.routineBody}>
                  Every morning before food, after the bathroom. Three seconds. Tracks your progress in the background.
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Hit your calorie + macro targets */}
          {nutritionSummary?.targetKcal ? (
            <View style={styles.routineCard}>
              <View style={styles.routineHeader}>
                <View style={styles.routineIconWrap}>
                  <Ionicons name="flame-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routineTitle}>2 · Hit your daily targets</Text>
                </View>
              </View>
              {/* The kcal ring is the Diary tab's signature, so the reveal
                  shows the same shape the first time these numbers appear.
                  Target framing, not progress: the ring is drawn full, since
                  the whole ring is the day's allowance and nothing is logged
                  yet. No "remaining" readout, that belongs in the diary. */}
              <View style={styles.ringWrap}>
                <View style={styles.ring}>
                  <Text style={styles.ringValue}>{nutritionSummary.targetKcal}</Text>
                  <Text style={styles.ringSub}>kcal per day</Text>
                </View>
              </View>
              {/* Same horizontal macro bars the Diary tab uses. */}
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
                Hit these most days. Logging food in your diary sharpens your coaching, but it's optional. Your weight trend does the heavy lifting.
              </Text>
              {/* First-time nutrition primer pointer. Most users seeing
                  these numbers for the first time have never tracked
                  macros, so this gives them a 5-min ramp before they need
                  to actually use them. */}
              <TouchableOpacity
                style={styles.eduLearnRow}
                onPress={() => navigation.navigate('NutritionEducation')}
                activeOpacity={0.7}
              >
                <Ionicons name="book-outline" size={14} color={colors.primary} />
                <Text style={styles.eduLearnText}>
                  New to calories and macros? 5-minute guide
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 3. Training split, collapsible */}
          <TouchableOpacity
            style={[styles.routineCard, planOpen && styles.routineCardOpen]}
            onPress={() => setPlanOpen(v => !v)}
            activeOpacity={0.85}
          >
            <View style={styles.routineHeader}>
              <View style={styles.routineIconWrap}>
                <Ionicons name="barbell-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>3 · Train your split</Text>
                {hasPlan ? (
                  <Text style={styles.routineBody}>
                    {planName ?? 'Your plan'} · {planRoutines.length} workout{planRoutines.length !== 1 ? 's' : ''} per week
                  </Text>
                ) : (
                  <Text style={styles.routineBody}>
                    Open Plans to build or pick a routine, then start a session from Train.
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

          {/* 4. Check in once a week */}
          <View style={styles.routineCard}>
            <View style={styles.routineHeader}>
              <View style={styles.routineIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>4 · Check in once a week</Text>
                <Text style={styles.routineBody}>
                  End of your training week, two minutes to review how it went. Precision Coaching adjusts your calories from your check-in data, automatically, with a written rationale.
                </Text>
              </View>
            </View>
          </View>

          {/* Founder note, appears once at the end of Pro setup. Per the
              competitive-landscape research, visible founder attention is
              one of the cheapest credibility signals in this category
              (Gravitus, RepCount both get praised for it). Sits above the
              Start button so it's the last thing the user reads before
              entering the app. */}
          <View style={styles.founderCard}>
            <Text style={styles.founderLabel}>A NOTE FROM ALLAN</Text>
            <Text style={styles.founderBody}>
              I used a paper log book for years. It worked but it was slow, and it was hard to see real progress without flipping through pages.
            </Text>
            <Text style={styles.founderBody}>
              I tried other apps too. None of them quite fit how I wanted to train. And a good coach can be brilliant, but it's not always an option for everyone. It can be expensive, hard to find, or just not the right fit at the time.
            </Text>
            <Text style={styles.founderBody}>
              I wanted something simple that helps you know what to do, see your progress, and keep getting better. So I built it for me. I hope it works for you too.
            </Text>
            <Text style={styles.founderSig}>Allan</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity }}>
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

  checkWrap: { alignSelf: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },

  mainBlock: { flex: 1 },

  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg,
  },
  proBadge: {
    backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 7, paddingVertical: spacing.xxs,
  },
  proBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.8 },

  headline: {
    ...type.h1,
    color: colors.textPrimary, marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 23, marginBottom: spacing.xl,
  },

  routineCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  routineCardOpen: { borderColor: withAlpha(colors.primary, 0.314) },
  routineHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  routineIconWrap: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  routineTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  routineBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },

  // Full amber ring drawn as a thick-bordered circle. At full progress a Skia
  // arc and a bordered circle are visually identical, and this keeps the native
  // canvas (and its test setup) out of the onboarding flow. The surface2 inner
  // fill matches the Diary ring's track colour.
  ringWrap: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  ring: {
    width: 128, height: 128, borderRadius: 64,
    borderWidth: 13, borderColor: colors.primary,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  // eslint-disable-next-line no-restricted-syntax -- setup-complete hero numeral
  ringValue: { fontSize: 34, fontWeight: fontWeight.bold, color: colors.textPrimary, lineHeight: 38, fontVariant: ['tabular-nums'] },
  ringSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xxs },
  // Macro bars, matched to the Diary tab's MacroRings so the reveal and the
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
  eduLearnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  eduLearnText: { color: colors.primary, ...type.label, flex: 1 },
  targetsNote: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17, marginTop: spacing.sm },

  splitList: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  splitWhy: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 19, marginBottom: spacing.sm },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  splitRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  splitBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  splitBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary },
  splitName: { ...type.label, color: colors.textPrimary, flex: 1 },
  whyPlanWrap: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.sm },
  whyPlanTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  whyPlanItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  whyPlanBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  whyPlanText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Founder note card, sits at the bottom of Pro setup. Distinct visual
  // language from the routine cards above so it reads as personal rather
  // than UI: no icon header, subdued background, accent-coloured signature.
  founderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  founderLabel: {
    fontSize: fontSize.micro, fontWeight: fontWeight.black,
    color: colors.textMuted, letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  founderBody: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    lineHeight: 21,
  },
  founderSig: {
    ...type.bodyStrong,
    color: colors.primary, marginTop: spacing.xs,
  },

  startBtn: { marginTop: spacing.md },
});
