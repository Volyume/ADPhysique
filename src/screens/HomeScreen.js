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
import { VolyumeMark } from '../components/BrandMark';
import {
  getAllWorkouts, getActivePlan, getRoutinesForPlan,
  getAllRoutineExerciseCounts, createWorkout, getRoutineExercisesWithDetails,
} from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';

const NUTRITION_KEY = '@volyume_nutrition_targets';

export default function HomeScreen({ navigation }) {
  const { user, startWorkout, activeWorkout } = useAppStore();

  const [weekStats, setWeekStats] = useState({ sessions: 0, sets: 0, volume: 0 });
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
  const [nutritionTargets, setNutritionTargets] = useState(null);

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
      loadNutrition(),
    ]);
  }

  async function loadWeekStats() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const all = await getAllWorkouts(user.id);
      const thisWeek = all.filter(w => w.startedAt >= weekAgo && w.isCompleted);
      const totalSets = thisWeek.reduce((s, w) => s + (w.setCount || 0), 0);
      const totalVol = thisWeek.reduce((s, w) => s + (w.totalVolume || 0), 0);
      setWeekStats({ sessions: thisWeek.length, sets: totalSets, volume: totalVol });

      const completed = all.filter(w => w.isCompleted).sort((a, b) => b.startedAt - a.startedAt);
      setLastSession(completed[0] || null);
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

  async function loadNutrition() {
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_KEY);
      setNutritionTargets(raw ? JSON.parse(raw) : null);
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

  const hasActiveWorkout = !!activeWorkout && !isStartingWorkout;
  const displayWorkout = selectedWorkoutOverride || nextWorkout;
  const planProgress = displayWorkout
    ? `Day ${(displayWorkout?.idx ?? 0) + 1} of ${nextWorkout?.total ?? 1}`
    : null;

  const PHASE_LABELS = {
    lean_gain: 'Lean Gain', build: 'Build', maintain: 'Maintenance',
    recomp: 'Recomposition', mild_cut: 'Mild Cut', aggressive_cut: 'Aggressive Cut',
  };
  const nutritionPhaseLabel = nutritionTargets?.phase
    ? (PHASE_LABELS[nutritionTargets.phase] ?? nutritionTargets.phase)
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
            <VolyumeMark size={26} />
            <Text style={styles.appTitle}>VOLYUME</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab', { screen: 'NutritionTargets' })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="nutrition-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProgressTab', { screen: 'BodyMetrics' })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="body-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── This Week strip ── */}
        <View style={styles.weekStrip}>
          <WeekStat value={weekStats.sessions} label="Sessions" />
          <View style={styles.weekDivider} />
          <WeekStat value={weekStats.sets} label="Sets" />
          <View style={styles.weekDivider} />
          <WeekStat
            value={weekStats.volume >= 1000
              ? `${(weekStats.volume / 1000).toFixed(1)}t`
              : `${weekStats.volume}kg`}
            label="Volume"
          />
        </View>

        {/* ── Primary workout area ── */}
        {hasActiveWorkout ? (
          <TouchableOpacity style={styles.continueCard} onPress={() => navigation.navigate('ActiveWorkout')} activeOpacity={0.85}>
            <View style={styles.continueCardInner}>
              <View style={styles.continueIconWrap}>
                <Ionicons name="play" size={20} color={colors.background} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.continueTitle}>Session in Progress</Text>
                <Text style={styles.continueSub}>Tap to return to your workout</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.background + 'CC'} />
            </View>
          </TouchableOpacity>
        ) : activePlan && nextWorkout ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroPlanBadge}>
                <Text style={styles.heroPlanBadgeText} numberOfLines={1}>{activePlan.name}</Text>
              </View>
              <Text style={styles.heroDayProgress}>{planProgress}</Text>
            </View>
            <Text style={styles.heroWorkoutName} numberOfLines={2}>
              {displayWorkout?.routine?.name}
            </Text>
            {exerciseCounts[displayWorkout?.routine?.id] ? (
              <Text style={styles.heroMeta}>
                {exerciseCounts[displayWorkout.routine.id]} exercises
              </Text>
            ) : null}
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.startBtn, isStartingWorkout && { opacity: 0.6 }]}
                onPress={handleStartNextWorkout}
                disabled={isStartingWorkout}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={16} color={colors.background} />
                <Text style={styles.startBtnText}>
                  {isStartingWorkout ? 'Starting…' : 'Start Workout'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => setShowChangeWorkout(true)}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.blankLink} onPress={() => navigation.navigate('BuildWorkout')}>
              <Text style={styles.blankLinkText}>Start Blank Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noPlanCard}>
            <Text style={styles.noPlanTitle}>No active plan</Text>
            <Text style={styles.noPlanSub}>
              Build a personalised plan, browse the library, or start a blank session.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('BuildWorkout')}>
              <Ionicons name="add" size={18} color={colors.background} />
              <Text style={styles.startBtnText}>Start Blank Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('PlansTab')}>
              <Text style={styles.ghostBtnText}>Choose a Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Start or Build a Plan (compact cards) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>START OR BUILD A PLAN</Text>
          <ActionCard
            icon="sparkles"
            title="Coach Builder"
            desc="Answer 7 questions — get a plan tailored to your schedule and goal."
            onPress={() => navigation.navigate('PlansTab', { screen: 'CoachBuilder' })}
          />
          <ActionCard
            icon="library-outline"
            title="Plan Library"
            desc="Browse ready-made plans for every split, level and goal."
            onPress={() => navigation.navigate('PlansTab', { screen: 'PlanLibrary' })}
          />
          <ActionCard
            icon="create-outline"
            title="Manual Builder"
            desc="Build a custom plan from scratch with your own exercises."
            onPress={() => navigation.navigate('PlansTab', { screen: 'ManualBuilder' })}
          />
        </View>

        {/* ── Body & Nutrition card ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BODY & NUTRITION</Text>
          {nutritionTargets ? (
            <TouchableOpacity
              style={styles.nutritionCard}
              onPress={() => navigation.navigate('ProfileTab', { screen: 'NutritionTargets' })}
              activeOpacity={0.7}
            >
              <View style={styles.nutritionCardHeader}>
                <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
                <Text style={styles.nutritionCardPhase}>
                  {nutritionPhaseLabel || 'Targets Set'}
                </Text>
                <Text style={styles.nutritionCardEdit}>Edit</Text>
              </View>
              <View style={styles.nutritionMacroRow}>
                {nutritionTargets.calories ? (
                  <View style={styles.nutritionMacroCell}>
                    <Text style={styles.nutritionMacroValue}>{Math.round(nutritionTargets.calories)}</Text>
                    <Text style={styles.nutritionMacroLabel}>kcal</Text>
                  </View>
                ) : null}
                {nutritionTargets.protein ? (
                  <View style={styles.nutritionMacroCell}>
                    <Text style={styles.nutritionMacroValue}>{Math.round(nutritionTargets.protein)}g</Text>
                    <Text style={styles.nutritionMacroLabel}>Protein</Text>
                  </View>
                ) : null}
                {nutritionTargets.carbs ? (
                  <View style={styles.nutritionMacroCell}>
                    <Text style={styles.nutritionMacroValue}>{Math.round(nutritionTargets.carbs)}g</Text>
                    <Text style={styles.nutritionMacroLabel}>Carbs</Text>
                  </View>
                ) : null}
                {nutritionTargets.fat ? (
                  <View style={styles.nutritionMacroCell}>
                    <Text style={styles.nutritionMacroValue}>{Math.round(nutritionTargets.fat)}g</Text>
                    <Text style={styles.nutritionMacroLabel}>Fat</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nutritionEmptyCard}
              onPress={() => navigation.navigate('ProfileTab', { screen: 'NutritionTargets' })}
              activeOpacity={0.7}
            >
              <Ionicons name="nutrition-outline" size={22} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nutritionEmptyTitle}>Set Nutrition Targets</Text>
                <Text style={styles.nutritionEmptySub}>
                  Calculate daily calories and macros so future plans account for your recovery.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.bodyMetricsLink}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'BodyMetrics' })}
          >
            <Ionicons name="body-outline" size={16} color={colors.textMuted} />
            <Text style={styles.bodyMetricsLinkText}>Log Body Weight & Measurements</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Recent Session ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT SESSION</Text>
          {lastSession ? (
            <TouchableOpacity
              style={styles.sessionCard}
              onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory' })}
              activeOpacity={0.7}
            >
              <View style={styles.sessionCardRow}>
                <Text style={styles.sessionDate}>
                  {format(new Date(lastSession.startedAt), 'd MMM yyyy')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
              <View style={styles.sessionStats}>
                {lastSession.durationMinutes ? (
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{lastSession.durationMinutes}m</Text>
                    <Text style={styles.sessionStatLabel}>Duration</Text>
                  </View>
                ) : null}
                {lastSession.setCount ? (
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{lastSession.setCount}</Text>
                    <Text style={styles.sessionStatLabel}>Sets</Text>
                  </View>
                ) : null}
                {lastSession.totalVolume ? (
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>
                      {lastSession.totalVolume >= 1000
                        ? `${(lastSession.totalVolume / 1000).toFixed(1)}t`
                        : `${lastSession.totalVolume}kg`}
                    </Text>
                    <Text style={styles.sessionStatLabel}>Volume</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={24} color={colors.textMuted} />
              <Text style={styles.emptyCardText}>Your completed sessions will appear here.</Text>
            </View>
          )}
        </View>

        {/* ── Quick nav ── */}
        <View style={styles.quickRow}>
          <QuickLink icon="time-outline" label="History" onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory' })} />
          <QuickLink icon="trophy-outline" label="Records" onPress={() => navigation.navigate('ProgressTab', { screen: 'PRWall' })} />
          <QuickLink icon="stats-chart-outline" label="Progress" onPress={() => navigation.navigate('ProgressTab')} />
          <QuickLink icon="barbell-outline" label="Exercises" onPress={() => navigation.navigate('PlansTab', { screen: 'ExerciseLibrary' })} />
        </View>
      </ScrollView>

      {/* Change Workout Sheet */}
      <Modal
        visible={showChangeWorkout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangeWorkout(false)}
      >
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowChangeWorkout(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Choose Workout</Text>
          {activePlan && <Text style={styles.sheetSub}>{activePlan.name}</Text>}
          <ScrollView showsVerticalScrollIndicator={false}>
            {planAllWorkouts.map((routine, i) => {
              const isNext = i === nextWorkout?.idx && !selectedWorkoutOverride;
              const isSel = selectedWorkoutOverride?.idx === i;
              return (
                <TouchableOpacity
                  key={routine.id ?? i}
                  style={[styles.pickerRow, (isNext || isSel) && styles.pickerRowActive]}
                  onPress={() => {
                    setSelectedWorkoutOverride(i === nextWorkout?.idx ? null : { routine, total: planAllWorkouts.length, idx: i });
                    setShowChangeWorkout(false);
                  }}
                >
                  <View style={[styles.dayBadge, (isNext || isSel) && styles.dayBadgeActive]}>
                    <Text style={[styles.dayNum, (isNext || isSel) && styles.dayNumActive]}>D{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName} numberOfLines={1}>{routine.name}</Text>
                    {exerciseCounts[routine.id] ? (
                      <Text style={styles.pickerMeta}>{exerciseCounts[routine.id]} exercises</Text>
                    ) : null}
                  </View>
                  {isNext && (
                    <View style={styles.nextUpBadge}><Text style={styles.nextUpText}>Next up</Text></View>
                  )}
                  {isSel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowChangeWorkout(false)}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function WeekStat({ value, label }) {
  return (
    <View style={styles.weekStatCell}>
      <Text style={styles.weekStatValue}>{value}</Text>
      <Text style={styles.weekStatLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, title, desc, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function QuickLink({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: 2,
  },

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
  weekDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  weekStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  weekStatLabel: { fontSize: fontSize.xs, color: colors.textMuted },

  // Continue card
  continueCard: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  continueCardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  continueTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  continueSub: { fontSize: fontSize.xs, color: colors.background + 'CC', marginTop: 2 },

  // Hero plan card
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heroPlanBadge: {
    flex: 1,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  heroPlanBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  heroDayProgress: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 0 },
  heroWorkoutName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  heroMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: -spacing.xs },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  startBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  changeBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  blankLink: { alignItems: 'center', paddingVertical: spacing.xs },
  blankLinkText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },

  // No plan card
  noPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  noPlanTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  noPlanSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginTop: -spacing.xs },
  ghostBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  ghostBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  // Sections
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },

  // Action cards (Coach/Library/Manual)
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  actionDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },

  // Nutrition card
  nutritionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  nutritionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nutritionCardPhase: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  nutritionCardEdit: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  nutritionMacroRow: { flexDirection: 'row', gap: spacing.sm },
  nutritionMacroCell: { flex: 1, alignItems: 'center', gap: 2 },
  nutritionMacroValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  nutritionMacroLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  nutritionEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nutritionEmptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  nutritionEmptySub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  bodyMetricsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bodyMetricsLinkText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },

  // Recent session card
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sessionCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  sessionStats: { flexDirection: 'row', gap: spacing.xl },
  sessionStat: { gap: 2 },
  sessionStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  sessionStatLabel: { fontSize: fontSize.xs, color: colors.textMuted },

  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCardText: { flex: 1, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

  // Quick links
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLinkLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },

  // Change workout sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerRowActive: {
    backgroundColor: colors.primaryBg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  dayBadge: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  dayBadgeActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary + '60' },
  dayNum: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary },
  dayNumActive: { color: colors.primary },
  pickerName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  pickerMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  nextUpBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  nextUpText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  sheetCancel: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  sheetCancelText: { fontSize: fontSize.md, color: colors.textSecondary },
});
