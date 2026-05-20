import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import useAppStore from '../store/useAppStore';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';

const WEEK_STEPS = [
  {
    icon: 'scale-outline',
    title: 'Log your weight each morning',
    body: 'Before food, after the bathroom. One number, 3 seconds. Your progress is tracked in the background.',
  },
  {
    icon: 'barbell-outline',
    title: 'Train your sessions',
    body: 'Your plan is ready to go. Just open Train, start a session, and log each set as you go.',
  },
  {
    icon: 'calendar-outline',
    title: 'Check in once a week',
    body: "At the end of your training week, review how it went. We'll adjust your plan based on how your body responded.",
  },
];

export default function ProSetupCompleteScreen({ navigation }) {
  const { userProfile, completeFirstRun } = useAppStore();
  const firstName = userProfile?.firstName || 'there';

  const [nutritionSummary, setNutritionSummary] = useState(null);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(20)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 0, duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
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

  async function handleStart() {
    await completeFirstRun();
    // Navigation resolves automatically — RootNavigator re-renders on firstRunComplete
  }

  const goalLabel = GOAL_LABELS[userProfile?.trainingGoal] ?? 'Build Muscle';
  const phaseLabel = PHASE_LABELS[userProfile?.trainingPhase] ?? null;
  const daysPerWeek = userProfile?.daysPerWeek ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Check mark animation */}
        <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.background} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.mainBlock, { opacity, transform: [{ translateY: slideY }] }]}>
          <View style={styles.brandRow}>
            <VolyumeMark size={20} color={colors.textPrimary} accent={colors.primary} />
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          <Text style={styles.headline}>You're all set, {firstName}.</Text>
          <Text style={styles.sub}>
            Your plan is ready. Your targets are in. Your reminders are on. Here's the routine that makes coaching work:
          </Text>

          {/* Setup summary card */}
          <View style={styles.setupSummaryCard}>
            <Text style={styles.setupSummaryTitle}>Your setup</Text>
            <View style={styles.summaryGrid}>
              {daysPerWeek && (
                <View style={styles.summaryItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemLabel}>Training days</Text>
                    <Text style={styles.summaryItemValue}>{daysPerWeek} days / week</Text>
                  </View>
                </View>
              )}
              <View style={styles.summaryItem}>
                <Ionicons name="trophy-outline" size={14} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryItemLabel}>Goal</Text>
                  <Text style={styles.summaryItemValue}>{goalLabel}</Text>
                </View>
              </View>
              {phaseLabel && (
                <View style={styles.summaryItem}>
                  <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemLabel}>Phase</Text>
                    <Text style={styles.summaryItemValue}>{phaseLabel}</Text>
                  </View>
                </View>
              )}
              {nutritionSummary?.targetKcal && (
                <View style={styles.summaryItem}>
                  <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemLabel}>Daily calories</Text>
                    <Text style={styles.summaryItemValue}>{nutritionSummary.targetKcal} kcal</Text>
                  </View>
                </View>
              )}
              {nutritionSummary?.proteinG && (
                <View style={styles.summaryItem}>
                  <Ionicons name="fish-outline" size={14} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemLabel}>Protein target</Text>
                    <Text style={styles.summaryItemValue}>{nutritionSummary.proteinG}g / day</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.weekCard}>
            <Text style={styles.weekCardTitle}>Your weekly rhythm</Text>
            {WEEK_STEPS.map((item, i) => (
              <View key={i} style={[styles.weekStep, i < WEEK_STEPS.length - 1 && styles.weekStepBorder]}>
                <View style={styles.weekIconWrap}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weekStepTitle}>{item.title}</Text>
                  <Text style={styles.weekStepBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tipsCard}>
            <Ionicons name="bulb-outline" size={15} color={colors.primary} />
            <Text style={styles.tipsText}>
              The more consistently you log, the more precisely we can coach you. Even a single workout a week is enough to start seeing your data work for you.
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity }}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.88}>
            <Text style={styles.startBtnText}>Start training</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl },

  checkWrap: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },

  mainBlock: { flex: 1, marginBottom: spacing.xl },

  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  proBadge: {
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 9, fontWeight: fontWeight.black,
    color: colors.background, letterSpacing: 0.8,
  },

  headline: {
    fontSize: fontSize.xxxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.md,
    lineHeight: 38,
  },
  sub: {
    fontSize: fontSize.md, color: colors.textSecondary,
    lineHeight: 23, marginBottom: spacing.xl,
  },

  // Setup summary card
  setupSummaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: colors.primary + '40',
    padding: spacing.lg, marginBottom: spacing.md,
    gap: spacing.md,
  },
  setupSummaryTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.xs, width: '47%',
  },
  summaryItemLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  summaryItemValue: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },

  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  weekCardTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3,
    padding: spacing.lg, paddingBottom: spacing.md,
  },
  weekStep: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  weekStepBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  weekIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  weekStepTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textPrimary, marginBottom: 3,
  },
  weekStepBody: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17,
  },

  tipsCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary + '30',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  tipsText: {
    fontSize: fontSize.xs, color: colors.textSecondary, flex: 1, lineHeight: 18,
  },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.lg + 2,
  },
  startBtnText: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.background,
  },
});
