import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import {
  getLibraryPlans, getPlanWorkoutCounts, copyPlanFromLibrary, activatePlanWithBlock,
} from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import {
  FREE_STARTER_STEPS, getFreeStarterRecommendation, getPlanDays,
} from '../lib/onboarding/freeStarter';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { logError, logWarn } from '../lib/errorLog';

// B2, the FREE guided beginner on-ramp (founder decision 4a: this is free).
// Three plain questions -> one difficulty-0 library plan, installed and
// activated, so a brand-new free user lands on Home with today's session
// already answered. Reached from:
//   * FirstRunStack, straight after the name screen (fromFirstRun: true);
//   * Home's no-plan card and the Train tab's no-plan card.
// Deterministic throughout: scoring lives in lib/onboarding/freeStarter.js.
// The "skip, I'll choose myself" path is always visible (autonomy first).
export default function FreeStarterScreen({ navigation, route }) {
  const toast = useToast();
  const { user, completeFirstRun } = useAppStore(useShallow(s => ({
    user: s.user,
    completeFirstRun: s.completeFirstRun,
  })));
  const fromFirstRun = route?.params?.fromFirstRun ?? false;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [plans, setPlans] = useState([]);
  const [workoutCounts, setWorkoutCounts] = useState({});
  const [busy, setBusy] = useState(false);
  // CP-10 batch G lane 1 (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (user?.id) await seedRoutinesIfNeeded(user.id);
        const [lib, pwc] = await Promise.all([getLibraryPlans(), getPlanWorkoutCounts()]);
        if (!cancelled) {
          setPlans(lib);
          setWorkoutCounts(pwc);
        }
      } catch (e) {
        logWarn('FreeStarter.load', e?.message ?? 'unknown');
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const onResultStep = step >= FREE_STARTER_STEPS.length;

  // Computed at render so a slow library load can never freeze a stale
  // null result: the moment plans arrive, the recommendation appears.
  const recommendation = useMemo(
    () => (onResultStep ? getFreeStarterRecommendation(answers, plans) : null),
    [onResultStep, answers, plans],
  );

  function handleOption(stepKey, optionKey) {
    setAnswers(prev => ({ ...prev, [stepKey]: optionKey }));
    setStep(s => s + 1);
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1);
    else navigation.goBack();
  }

  // "Skip, I'll choose myself": from first run this finishes onboarding and
  // lands on Home, where the no-plan card offers both this quiz and the
  // library. From Home/Plans it simply returns.
  async function handleSkip() {
    if (busy) return;
    if (fromFirstRun) {
      setBusy(true);
      try {
        await completeFirstRun();
      } catch (e) {
        logError('FreeStarter.handleSkip', e, { userId: user?.id });
        setBusy(false);
      }
      return;
    }
    navigation.goBack();
  }

  // Browse instead (Home/Plans contexts only): pop back, then open the
  // library through the Train tab, the same route HomeScreen uses.
  function handleBrowse() {
    navigation.popToTop?.();
    navigation.navigate('PlansTab', { screen: 'PlanLibrary', initial: false });
  }

  async function handleStartPlan() {
    if (!recommendation || busy) return;
    if (!user?.id) {
      toast.show('Setting up your profile, try again in a second', { variant: 'info' });
      return;
    }
    setBusy(true);
    try {
      const copy = await copyPlanFromLibrary(recommendation.id, user.id);
      if (!copy?.id) throw new Error('Copy failed.');
      await activatePlanWithBlock(user.id, copy.id, recommendation.name);
      if (fromFirstRun) {
        // Flips the navigator into MainTabs; Home loads the active plan and
        // the hero answers "what do I do today" with the first session.
        await completeFirstRun();
      } else {
        navigation.popToTop?.();
      }
    } catch (e) {
      logError('FreeStarter.handleStartPlan', e, { userId: user?.id, planId: recommendation?.id });
      toast.show("Couldn't set up your plan, try again", { variant: 'error' });
      setBusy(false);
    }
  }

  const wc = recommendation ? workoutCounts[recommendation.id] : null;
  const recDays = recommendation ? getPlanDays(recommendation) : null;

  return (
    <SafeAreaView style={[styles.safe, live.safe]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={step > 0 ? 'Back to the previous question' : 'Back'}
        >
          <Ionicons name="chevron-back" size={24} color={t.colors.textPrimary} />
        </TouchableOpacity>
        <View
          style={styles.progressDots}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {FREE_STARTER_STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, live.dot, i <= step && [styles.dotActive, live.dotActive]]} />
          ))}
        </View>
        {/* Spacer balances the back chevron so the dots sit centred */}
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!onResultStep ? (
          <>
            <Text style={[styles.question, live.question]}>{FREE_STARTER_STEPS[step].question}</Text>
            <Text style={[styles.questionSub, live.questionSub]}>
              {step === 0
                ? "There's no wrong answer. You can change direction any time."
                : step === 1
                  ? 'Your plan only uses equipment you actually have.'
                  : 'Pick what fits your week. Consistency beats volume.'}
            </Text>
            <View style={styles.options}>
              {FREE_STARTER_STEPS[step].options.map(opt => (
                <TouchableOpacity
                  key={String(opt.key)}
                  style={[styles.optionBtn, live.optionBtn]}
                  onPress={() => handleOption(FREE_STARTER_STEPS[step].key, opt.key)}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                >
                  {opt.icon ? (
                    <Ionicons name={opt.icon} size={20} color={t.colors.primary} style={{ marginRight: spacing.md }} />
                  ) : null}
                  <Text style={[styles.optionText, live.optionText]}>{opt.label}</Text>
                  <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : recommendation ? (
          <>
            <View style={styles.resultIcon}>
              <Ionicons name="checkmark-circle" size={32} color={t.colors.primary} />
            </View>
            <Text style={[styles.resultTitle, live.resultTitle]}>Your starter plan</Text>
            <Text style={[styles.resultIntro, live.resultIntro]}>
              Built for people starting out. Every session tells you exactly what to do:
              the exercises, the sets, and the reps.
            </Text>
            <Card style={[styles.resultCard, live.resultCard]}>
              <View style={[styles.resultBadge, live.resultBadge]}>
                <Text style={[styles.resultBadgeText, live.resultBadgeText]}>Beginner friendly</Text>
              </View>
              <Text style={[styles.resultName, live.resultName]}>{recommendation.name}</Text>
              {recommendation.description ? (
                <Text style={[styles.resultDesc, live.resultDesc]} numberOfLines={4}>{recommendation.description}</Text>
              ) : null}
              <Text style={[styles.resultMeta, live.resultMeta]}>
                {[
                  recDays ? `${recDays} days a week` : null,
                  wc ? `${wc} workout${wc !== 1 ? 's' : ''}` : null,
                ].filter(Boolean).join(' - ')}
              </Text>
            </Card>
            <Button
              title="Start with this plan"
              size="lg"
              loading={busy}
              onPress={handleStartPlan}
              accessibilityLabel={`Start with ${recommendation.name}`}
            />
            <Text style={[styles.resultFootnote, live.resultFootnote]}>
              The first couple of weeks are for learning the movements. That counts as progress.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.resultTitle, live.resultTitle]}>We couldn't pick a plan</Text>
            <Text style={[styles.resultIntro, live.resultIntro]}>
              The plan library hasn't loaded yet. You can browse it yourself, or try again in a moment.
            </Text>
            <Button
              title={fromFirstRun ? 'Continue' : 'Browse plans'}
              size="lg"
              loading={busy}
              onPress={fromFirstRun ? handleSkip : handleBrowse}
              accessibilityLabel={fromFirstRun ? 'Continue without a plan' : 'Browse the plan library'}
            />
          </>
        )}

        {onResultStep && recommendation && !fromFirstRun ? (
          <TouchableOpacity
            style={[styles.skipLink, live.skipLink]}
            onPress={handleBrowse}
            accessibilityRole="button"
            accessibilityLabel="Browse all plans instead"
          >
            <Ionicons name="library-outline" size={14} color={t.colors.textSecondary} />
            <Text style={[styles.skipLinkText, live.skipLinkText]}>Browse all plans instead</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.skipLink, live.skipLink]}
          onPress={handleSkip}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Skip, I'll choose a plan myself"
        >
          <Ionicons name="arrow-forward" size={14} color={t.colors.textSecondary} />
          <Text style={[styles.skipLinkText, live.skipLinkText]}>Skip, I'll choose myself</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  progressDots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: circle(8), backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },

  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  question: { ...type.h2, color: colors.textPrimary, marginTop: spacing.lg },
  questionSub: {
    ...type.bodySm, color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  options: { gap: spacing.sm },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  optionText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.medium },

  resultIcon: { alignSelf: 'center', marginTop: spacing.lg },
  resultTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.black,
    color: colors.textPrimary, textAlign: 'center',
  },
  resultIntro: {
    ...type.bodySm, color: colors.textSecondary,
    textAlign: 'center', marginTop: -spacing.sm,
  },
  // backgroundColor/borderRadius/padding now come from Card's defaults
  // (surface, radius.lg, spacing.lg); borderColor stays explicit since
  // this card's tint (0.251 alpha) doesn't match Card's tone alpha (0.33).
  resultCard: {
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251),
    gap: spacing.sm,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.376),
  },
  resultBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.primary },
  resultName: { ...type.bodyStrong, color: colors.textPrimary },
  resultDesc: { ...type.bodySm, color: colors.textSecondary },
  resultMeta: { ...type.caption, color: colors.textMuted },
  resultFootnote: {
    ...type.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 17,
  },

  skipLink: {
    minHeight: 40,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  skipLinkText: { ...type.label, color: colors.textPrimary },
});

// CP-10 batch G lane 1 (2026-07-11): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/padding/gap/width/height/alignItems, no token) are correctly
// omitted -- there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    dot: { backgroundColor: t.colors.border },
    dotActive: { backgroundColor: t.colors.primary },
    question: { ...t.type.h2, color: t.colors.textPrimary },
    questionSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    optionBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    optionText: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    resultTitle: { fontSize: t.fontSize.xl, color: t.colors.textPrimary },
    resultIntro: { ...t.type.bodySm, color: t.colors.textSecondary },
    resultCard: { borderColor: withAlpha(t.colors.primary, 0.251) },
    resultBadge: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, 0.376) },
    resultBadgeText: { fontSize: t.fontSize.micro, color: t.colors.primary },
    resultName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    resultDesc: { ...t.type.bodySm, color: t.colors.textSecondary },
    resultMeta: { ...t.type.caption, color: t.colors.textMuted },
    resultFootnote: { ...t.type.caption, color: t.colors.textMuted },
    skipLink: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    skipLinkText: { ...t.type.label, color: t.colors.textPrimary },
  };
}
