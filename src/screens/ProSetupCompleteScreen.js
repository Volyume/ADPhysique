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
import { getActivePlan, getRoutinesForPlan } from '../lib/database';

export default function ProSetupCompleteScreen({ navigation }) {
  const { user, userProfile, completeFirstRun } = useAppStore();
  const firstName = userProfile?.firstName || 'there';

  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [planRoutines, setPlanRoutines] = useState([]);
  const [planName, setPlanName] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(20)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
      } catch (_) {}
    })();
  }, [user?.id]);

  async function handleStart() {
    await completeFirstRun();
  }

  const goalLabel = GOAL_LABELS[userProfile?.trainingGoal] ?? 'Build Muscle';
  const phaseLabel = PHASE_LABELS[userProfile?.trainingPhase] ?? null;
  const hasPlan = planRoutines.length > 0;

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
            <VolyumeMark size={20} color={colors.textPrimary} accent={colors.primary} />
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          <Text style={styles.headline}>You're all set, {firstName}.</Text>
          <Text style={styles.sub}>Here's your daily routine.</Text>

          {/* 1. Log your weight — first thing each morning */}
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
              <View style={styles.calorieRow}>
                <Text style={styles.calorieNum}>{nutritionSummary.targetKcal}</Text>
                <Text style={styles.calorieUnit}>kcal / day</Text>
              </View>
              <View style={styles.macroRow}>
                {nutritionSummary.proteinG ? (
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{nutritionSummary.proteinG}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                ) : null}
                {nutritionSummary.carbsG ? (
                  <View style={[styles.macroItem, styles.macroItemBorder]}>
                    <Text style={styles.macroValue}>{nutritionSummary.carbsG}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                ) : null}
                {nutritionSummary.fatG ? (
                  <View style={[styles.macroItem, styles.macroItemBorder]}>
                    <Text style={styles.macroValue}>{nutritionSummary.fatG}g</Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.goalRow}>
                <View style={styles.goalChip}>
                  <Ionicons name="trophy-outline" size={11} color={colors.primary} />
                  <Text style={styles.goalChipText}>{goalLabel}</Text>
                </View>
                {phaseLabel ? (
                  <View style={styles.goalChip}>
                    <Ionicons name="layers-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.goalChipText, { color: colors.textMuted }]}>{phaseLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* 3. Training split — collapsible */}
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
                {planRoutines.map((r, i) => (
                  <View key={r.id} style={[styles.splitRow, i < planRoutines.length - 1 && styles.splitRowBorder]}>
                    <View style={styles.splitBadge}>
                      <Text style={styles.splitBadgeText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.splitName}>{r.name}</Text>
                  </View>
                ))}
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
                  End of your training week, review how it went. Your plan and calories adjust based on how your body responded.
                </Text>
              </View>
            </View>
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
    backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  proBadgeText: { fontSize: 9, fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.8 },

  headline: {
    fontSize: fontSize.xxxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 38,
  },
  sub: {
    fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 23, marginBottom: spacing.xl,
  },

  routineCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  routineCardOpen: { borderColor: colors.primary + '50' },
  routineHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  routineIconWrap: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  routineTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: 4 },
  routineBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },

  calorieRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm,
    marginTop: spacing.md, marginBottom: spacing.md,
  },
  calorieNum: { fontSize: 38, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 42 },
  calorieUnit: { fontSize: fontSize.sm, color: colors.textMuted },
  macroRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, marginBottom: spacing.md,
  },
  macroItem: { flex: 1, alignItems: 'center', gap: 2 },
  macroItemBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
  macroValue: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.textPrimary },
  macroLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  goalRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  goalChipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  splitList: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  splitRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  splitBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  splitBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary },
  splitName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, flex: 1 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.lg + 2,
    marginTop: spacing.md,
  },
  startBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
});
