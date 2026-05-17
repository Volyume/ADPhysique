import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import BrandMark from '../components/BrandMark';
import {
  getAllWorkouts, getActivePlan, getRoutinesForPlan,
  getAllRoutineExerciseCounts, createWorkout, getRoutineExercisesWithDetails,
} from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';

const NUTRITION_KEY = '@volyume_nutrition_targets';

export default function HomeScreen({ navigation }) {
  const { user, startWorkout, activeWorkout } = useAppStore();

  const [weekStats, setWeekStats] = useState({ sessions: 0, sets: 0, volume: 0, prs: 0 });
  const [activePlan, setActivePlanData] = useState(null);
  const [nextWorkout, setNextWorkout] = useState(null);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [planAllWorkouts, setPlanAllWorkouts] = useState([]);
  const [selectedWorkoutOverride, setSelectedWorkoutOverride] = useState(null);
  const [showChangeWorkout, setShowChangeWorkout] = useState(false);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [lastSession, setLastSession] = useState(null);
  const [insightText, setInsightText] = useState(null);
  const [nutritionPhaseLabel, setNutritionPhaseLabel] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        if (!seeded) {
          seedRoutinesIfNeeded(user.id).catch(console.warn);
          setSeeded(true);
        }
        loadData();
      }
    }, [user?.id]),
  );

  async function loadData() {
    await Promise.all([
      loadWeekStats(),
      loadNextWorkout(),
      loadExerciseCounts(),
      loadNutritionPhase(),
    ]);
  }

  async function loadWeekStats() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const all = await getAllWorkouts(user.id);
      const thisWeek = all.filter(w => w.startedAt >= weekAgo && w.isCompleted);
      const totalSets = thisWeek.reduce((s, w) => s + (w.setCount || 0), 0);
      const totalVol = thisWeek.reduce((s, w) => s + (w.totalVolume || 0), 0);

      const completed = all.filter(w => w.isCompleted).sort((a, b) => b.startedAt - a.startedAt);
      const last = completed[0] || null;
      if (last) {
        setLastSession(last);
      }

      // Build a simple insight
      const prev2w = all.filter(w => w.startedAt >= Date.now() - 14 * 24 * 60 * 60 * 1000
        && w.startedAt < weekAgo && w.isCompleted);
      if (prev2w.length > 0 && thisWeek.length > 0) {
        const prevVol = prev2w.reduce((s, w) => s + (w.totalVolume || 0), 0);
        if (prevVol > 0) {
          const delta = Math.round(((totalVol - prevVol) / prevVol) * 100);
          if (Math.abs(delta) >= 5) {
            setInsightText(`Volume ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)}% vs last week`);
          } else {
            setInsightText(null);
          }
        }
      }

      setWeekStats({ sessions: thisWeek.length, sets: totalSets, volume: totalVol });
    } catch (_e) {}
  }

  async function loadExerciseCounts() {
    try {
      const counts = await getAllRoutineExerciseCounts();
      setExerciseCounts(counts);
    } catch (_e) {}
  }

  async function loadNextWorkout() {
    try {
      const plan = await getActivePlan(user.id);
      setActivePlanData(plan || null);
      if (!plan) {
        setNextWorkout(null);
        setPlanAllWorkouts([]);
        setSelectedWorkoutOverride(null);
        return;
      }
      const routines = await getRoutinesForPlan(plan.id);
      setPlanAllWorkouts(routines);
      setSelectedWorkoutOverride(null);
      if (routines.length === 0) { setNextWorkout(null); return; }
      const idx = (plan.nextWorkoutIndex || 0) % routines.length;
      setNextWorkout({ routine: routines[idx], total: routines.length, idx });
    } catch (_e) {
      setNextWorkout(null);
      setPlanAllWorkouts([]);
      setSelectedWorkoutOverride(null);
    }
  }

  async function loadNutritionPhase() {
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_KEY);
      if (!raw) { setNutritionPhaseLabel(null); return; }
      const t = JSON.parse(raw);
      const PHASE_LABELS = {
        lean_gain: 'Lean Gain', build: 'Build', maintain: 'Maintenance',
        recomp: 'Recomposition', mild_cut: 'Mild Cut', aggressive_cut: 'Aggressive Cut',
      };
      setNutritionPhaseLabel(t.phase ? (PHASE_LABELS[t.phase] ?? t.phase) : null);
    } catch (_e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleStartNextWorkout() {
    const target = selectedWorkoutOverride || nextWorkout;
    if (!target?.routine) return;
    setIsStartingWorkout(true);
    try {
      const routine = target.routine;
      const workout = await createWorkout(user.id, routine.id);
      const withExercises = await getRoutineExercisesWithDetails(routine.id);
      const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
        exercise, routineExercise, sets: [],
      }));
      startWorkout(workout, initialExercises);
      navigation.navigate('ActiveWorkout');
    } finally {
      setIsStartingWorkout(false);
    }
  }

  function handleContinueWorkout() {
    navigation.navigate('ActiveWorkout');
  }

  const hasActiveWorkout = !!activeWorkout && !isStartingWorkout;
  const displayWorkout = selectedWorkoutOverride || nextWorkout;
  const planProgress = displayWorkout
    ? `Day ${(displayWorkout?.idx ?? 0) + 1} of ${nextWorkout?.total ?? 1}`
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BrandMark size={22} color={colors.primary} />
            <Text style={styles.appTitle}>VOLYUME</Text>
          </View>
          <View style={styles.headerRight}>
            {nutritionPhaseLabel && (
              <TouchableOpacity
                style={styles.phaseChip}
                onPress={() => navigation.navigate('ProfileTab', { screen: 'NutritionTargets' })}
              >
                <Text style={styles.phaseChipText}>{nutritionPhaseLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('ProgressTab', { screen: 'BodyMetrics' })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="body-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Weekly strip ── */}
        <View style={styles.weekStrip}>
          <WeekStatCell value={weekStats.sessions} label="Sessions" />
          <View style={styles.weekStripDivider} />
          <WeekStatCell value={weekStats.sets} label="Sets" />
          <View style={styles.weekStripDivider} />
          <WeekStatCell
            value={weekStats.volume >= 1000
              ? `${(weekStats.volume / 1000).toFixed(1)}t`
              : `${weekStats.volume}kg`}
            label="Volume"
          />
        </View>

        {/* ── Active plan hero or empty state ── */}
        {hasActiveWorkout ? (
          <TouchableOpacity style={styles.continueCard} onPress={handleContinueWorkout} activeOpacity={0.85}>
            <View style={styles.continueCardInner}>
              <Ionicons name="play-circle" size={28} color={colors.background} />
              <View style={{ flex: 1 }}>
                <Text style={styles.continueCardTitle}>Continue Workout</Text>
                <Text style={styles.continueCardSub}>Session in progress — tap to return</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.background} />
            </View>
          </TouchableOpacity>
        ) : activePlan && nextWorkout ? (
          <View style={styles.heroCard}>
            {/* Plan name + progress */}
            <View style={styles.heroTopRow}>
              <View style={styles.heroPlanBadge}>
                <Text style={styles.heroPlanBadgeText}>{activePlan.name}</Text>
              </View>
              <Text style={styles.heroPlanProgress}>{planProgress}</Text>
            </View>

            {/* Workout name */}
            <Text style={styles.heroWorkoutName} numberOfLines={2}>
              {displayWorkout?.routine?.name}
            </Text>

            {/* Target muscles */}
            {displayWorkout?.routine?.targetMuscles?.length > 0 && (
              <View style={styles.muscleChips}>
                {(displayWorkout.routine.targetMuscles || []).slice(0, 4).map(m => (
                  <View key={m} style={styles.muscleChip}>
                    <Text style={styles.muscleChipText}>{m}</Text>
                  </View>
                ))}
              </View>
            )}

            {exerciseCounts[displayWorkout?.routine?.id] ? (
              <Text style={styles.heroMeta}>
                {exerciseCounts[displayWorkout.routine.id]} exercises
              </Text>
            ) : null}

            {/* Actions */}
            <TouchableOpacity style={styles.changeWorkoutBtn} onPress={() => setShowChangeWorkout(true)}>
              <Ionicons name="swap-horizontal-outline" size={15} color={colors.primary} />
              <Text style={styles.changeWorkoutBtnText}>Change Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.startBtn} onPress={handleStartNextWorkout} activeOpacity={0.85}>
              <Ionicons name="play-circle" size={20} color={colors.background} />
              <Text style={styles.startBtnText}>Start Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.blankBtn} onPress={() => navigation.navigate('BuildWorkout')}>
              <Text style={styles.blankBtnText}>Start Blank Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyHero}>
            <BrandMark size={40} color={colors.textMuted} />
            <Text style={styles.emptyHeroTitle}>No active plan</Text>
            <Text style={styles.emptyHeroSub}>
              Build a personalised plan or browse ready-made programmes to get started.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('BuildWorkout')}>
              <Ionicons name="add-circle" size={20} color={colors.background} />
              <Text style={styles.startBtnText}>Start Blank Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choosePlanBtn} onPress={() => navigation.navigate('PlansTab')}>
              <Text style={styles.choosePlanBtnText}>Choose a Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Last session recap ── */}
        {lastSession && (
          <TouchableOpacity
            style={styles.lastSessionCard}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory' })}
            activeOpacity={0.7}
          >
            <View style={styles.lastSessionTop}>
              <Text style={styles.lastSessionLabel}>LAST SESSION</Text>
              <Text style={styles.lastSessionDate}>
                {format(new Date(lastSession.startedAt), 'd MMM')}
              </Text>
            </View>
            <View style={styles.lastSessionStats}>
              {lastSession.durationMinutes ? (
                <Text style={styles.lastSessionStat}>{lastSession.durationMinutes}m</Text>
              ) : null}
              {lastSession.setCount ? (
                <Text style={styles.lastSessionStat}>{lastSession.setCount} sets</Text>
              ) : null}
              {lastSession.totalVolume ? (
                <Text style={styles.lastSessionStat}>
                  {lastSession.totalVolume >= 1000
                    ? `${(lastSession.totalVolume / 1000).toFixed(1)}t`
                    : `${lastSession.totalVolume}kg`}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {/* ── Insight tile ── */}
        {insightText && (
          <View style={styles.insightTile}>
            <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
            <Text style={styles.insightText}>{insightText}</Text>
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={styles.quickActions}>
          <QuickAction
            icon="time-outline"
            label="History"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory' })}
          />
          <QuickAction
            icon="list"
            label="Plans"
            onPress={() => navigation.navigate('PlansTab')}
          />
          <QuickAction
            icon="barbell-outline"
            label="Exercises"
            onPress={() => navigation.navigate('PlansTab', { screen: 'ExerciseLibrary' })}
          />
          <QuickAction
            icon="trophy-outline"
            label="Records"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'PRWall' })}
          />
        </View>
      </ScrollView>

      {/* ── Change Workout sheet ── */}
      <Modal
        visible={showChangeWorkout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangeWorkout(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowChangeWorkout(false)}
        />
        <View style={styles.changeWorkoutSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Choose Workout</Text>
          <Text style={styles.sheetSubtitle}>{activePlan?.name}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {planAllWorkouts.map((routine, i) => {
              const isNextUp = i === nextWorkout?.idx && !selectedWorkoutOverride;
              const isSelected = selectedWorkoutOverride?.idx === i;
              return (
                <TouchableOpacity
                  key={routine.id ?? i}
                  style={[styles.workoutPickerRow, isSelected && styles.workoutPickerRowActive]}
                  onPress={() => {
                    if (i === nextWorkout?.idx) {
                      setSelectedWorkoutOverride(null);
                    } else {
                      setSelectedWorkoutOverride({ routine, total: planAllWorkouts.length, idx: i });
                    }
                    setShowChangeWorkout(false);
                  }}
                >
                  <View style={[styles.dayBadge, (isNextUp || isSelected) && styles.dayBadgeActive]}>
                    <Text style={[styles.dayNum, (isNextUp || isSelected) && styles.dayNumActive]}>
                      D{i + 1}
                    </Text>
                  </View>
                  <View style={styles.workoutPickerInfo}>
                    <Text style={styles.workoutPickerName} numberOfLines={1}>{routine.name}</Text>
                    {exerciseCounts[routine.id] ? (
                      <Text style={styles.workoutPickerMeta}>{exerciseCounts[routine.id]} exercises</Text>
                    ) : null}
                  </View>
                  {isNextUp ? (
                    <View style={styles.nextUpBadge}>
                      <Text style={styles.nextUpBadgeText}>Next up</Text>
                    </View>
                  ) : isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowChangeWorkout(false)}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function WeekStatCell({ value, label }) {
  return (
    <View style={styles.weekStatCell}>
      <Text style={styles.weekStatValue}>{value}</Text>
      <Text style={styles.weekStatLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary, letterSpacing: 2.5 },
  phaseChip: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  phaseChipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  // Week strip
  weekStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  weekStatCell: { flex: 1, alignItems: 'center', gap: 2 },
  weekStripDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  weekStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  weekStatLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },

  // Continue card (active workout)
  continueCard: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  continueCardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueCardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  continueCardSub: { fontSize: fontSize.xs, color: colors.background + 'CC', marginTop: 2 },

  // Hero card (active plan)
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPlanBadge: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary + '50',
    flex: 1,
    marginRight: spacing.md,
  },
  heroPlanBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  heroPlanProgress: { fontSize: fontSize.xs, color: colors.textMuted },
  heroWorkoutName: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 30 },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  muscleChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleChipText: { fontSize: 10, color: colors.textSecondary, fontWeight: fontWeight.medium, textTransform: 'capitalize' },
  heroMeta: { fontSize: fontSize.sm, color: colors.textSecondary },

  changeWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '60',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  changeWorkoutBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  startBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },

  blankBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  blankBtnText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },

  // Empty hero
  emptyHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyHeroTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textSecondary },
  emptyHeroSub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  choosePlanBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  choosePlanBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  // Last session
  lastSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  lastSessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastSessionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.2 },
  lastSessionDate: { fontSize: fontSize.xs, color: colors.textMuted },
  lastSessionStats: { flexDirection: 'row', gap: spacing.lg },
  lastSessionStat: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },

  // Insight tile
  insightTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  insightText: { flex: 1, fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },

  // Change workout sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  changeWorkoutSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  sheetSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  workoutPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  workoutPickerRowActive: {
    backgroundColor: colors.primaryBg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 0,
  },
  dayBadge: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  dayBadgeActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary + '60' },
  dayNum: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary },
  dayNumActive: { color: colors.primary },
  workoutPickerInfo: { flex: 1, gap: 2 },
  workoutPickerName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  workoutPickerMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  nextUpBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  nextUpBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  sheetCancelBtn: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  sheetCancelText: { fontSize: fontSize.md, color: colors.textSecondary },
});
