import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import {
  getAllWorkouts, getActivePlan, getRoutinesForPlan,
  getAllRoutineExerciseCounts, createWorkout, getRoutineExercisesWithDetails,
} from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';

// Soft targets used only to size the weekly progress bars — not enforced
const WEEK_TARGETS = { sessions: 5, sets: 80, volume: 15000 };

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
    await Promise.all([loadWeekStats(), loadNextWorkout(), loadExerciseCounts()]);
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

  const today = format(new Date(), 'EEE d MMM');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Branded header ── */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <VolyumeMark size={22} />
            <Text style={styles.brandName}>Volyume</Text>
          </View>
          <Text style={styles.headerDate}>{today}</Text>
        </View>

        {/* ── This week — progress bars ── */}
        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>This week</Text>
          <View style={styles.weekStats}>
            <WeekBar
              value={weekStats.sessions}
              target={WEEK_TARGETS.sessions}
              label="Sessions"
              display={String(weekStats.sessions)}
            />
            <View style={styles.weekDivider} />
            <WeekBar
              value={weekStats.sets}
              target={WEEK_TARGETS.sets}
              label="Sets"
              display={String(weekStats.sets)}
            />
            <View style={styles.weekDivider} />
            <WeekBar
              value={weekStats.volume}
              target={WEEK_TARGETS.volume}
              label="Volume"
              display={weekStats.volume >= 1000
                ? `${(weekStats.volume / 1000).toFixed(1)}t`
                : `${weekStats.volume}kg`}
            />
          </View>
        </View>

        {/* ── Primary workout area ── */}
        {hasActiveWorkout ? (
          <TouchableOpacity
            style={styles.continueCard}
            onPress={() => navigation.navigate('ActiveWorkout')}
            activeOpacity={0.85}
          >
            <View style={styles.continueInner}>
              <View style={styles.continueIcon}>
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
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText} numberOfLines={1}>{activePlan.name}</Text>
              </View>
              <Text style={styles.dayProgress}>{planProgress}</Text>
            </View>
            <Text style={styles.workoutName} numberOfLines={2}>
              {displayWorkout?.routine?.name}
            </Text>
            {exerciseCounts[displayWorkout?.routine?.id] ? (
              <Text style={styles.workoutMeta}>
                {exerciseCounts[displayWorkout.routine.id]} exercises
              </Text>
            ) : null}
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, isStartingWorkout && { opacity: 0.6 }]}
                onPress={handleStartNextWorkout}
                disabled={isStartingWorkout}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={16} color={colors.background} />
                <Text style={styles.primaryBtnText}>
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
            <TouchableOpacity
              style={styles.blankLink}
              onPress={() => navigation.navigate('BuildWorkout')}
            >
              <Text style={styles.blankLinkText}>Start Blank Workout instead</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.noPlanCard}>
              <Text style={styles.noPlanTitle}>No active plan</Text>
              <Text style={styles.noPlanSub}>
                Start a blank session now, or build a plan to track progressive overload week to week.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('BuildWorkout')}
              >
                <Ionicons name="add" size={18} color={colors.background} />
                <Text style={styles.primaryBtnText}>Start Blank Workout</Text>
              </TouchableOpacity>
            </View>

            {/* Plan builder options — shown only when no plan, contextually correct here */}
            <View style={styles.getStartedSection}>
              <Text style={styles.sectionLabel}>BUILD A PLAN</Text>
              <PlanBuilderCard
                icon="sparkles"
                title="Coach Builder"
                desc="Answer 7 questions — get a personalised plan built around your schedule and goal."
                onPress={() => navigation.navigate('PlansTab', { screen: 'CoachBuilder' })}
              />
              <PlanBuilderCard
                icon="library-outline"
                title="Plan Library"
                desc="Browse proven training splits for every level, frequency and goal."
                onPress={() => navigation.navigate('PlansTab', { screen: 'PlanLibrary' })}
              />
              <PlanBuilderCard
                icon="create-outline"
                title="Manual Builder"
                desc="Build a fully custom plan from scratch with your own exercises."
                onPress={() => navigation.navigate('PlansTab', { screen: 'ManualBuilder' })}
              />
            </View>
          </>
        )}

        {/* ── Last session ── */}
        {lastSession && (
          <TouchableOpacity
            style={styles.lastSessionCard}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory' })}
            activeOpacity={0.7}
          >
            <View style={styles.lastSessionHeader}>
              <Text style={styles.sectionLabel}>LAST SESSION</Text>
              <Text style={styles.lastSessionDate}>
                {format(new Date(lastSession.startedAt), 'd MMM')}
              </Text>
            </View>
            <Text style={styles.lastSessionName} numberOfLines={1}>
              {lastSession.name || 'Session'}
            </Text>
            <View style={styles.lastSessionStats}>
              {lastSession.durationMinutes ? (
                <View style={styles.lastSessionStat}>
                  <Text style={styles.lastSessionStatVal}>{lastSession.durationMinutes}m</Text>
                  <Text style={styles.lastSessionStatLbl}>Duration</Text>
                </View>
              ) : null}
              {lastSession.setCount ? (
                <View style={styles.lastSessionStat}>
                  <Text style={styles.lastSessionStatVal}>{lastSession.setCount}</Text>
                  <Text style={styles.lastSessionStatLbl}>Sets</Text>
                </View>
              ) : null}
              {lastSession.totalVolume ? (
                <View style={styles.lastSessionStat}>
                  <Text style={styles.lastSessionStatVal}>
                    {lastSession.totalVolume >= 1000
                      ? `${(lastSession.totalVolume / 1000).toFixed(1)}t`
                      : `${lastSession.totalVolume}kg`}
                  </Text>
                  <Text style={styles.lastSessionStatLbl}>Volume</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {/* ── Quick nav ── */}
        <View style={styles.quickRow}>
          <QuickLink
            icon="time-outline"
            label="History"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory' })}
          />
          <QuickLink
            icon="trophy-outline"
            label="Records"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'PRWall' })}
          />
          <QuickLink
            icon="grid-outline"
            label="Volume"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'VolumeHeatmap' })}
          />
          <QuickLink
            icon="barbell-outline"
            label="Exercises"
            onPress={() => navigation.navigate('PlansTab', { screen: 'ExerciseLibrary' })}
          />
        </View>
      </ScrollView>

      {/* Change Workout Sheet */}
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
                    setSelectedWorkoutOverride(
                      i === nextWorkout?.idx ? null : { routine, total: planAllWorkouts.length, idx: i },
                    );
                    setShowChangeWorkout(false);
                  }}
                >
                  <View style={[styles.dayBadge, (isNext || isSel) && styles.dayBadgeActive]}>
                    <Text style={[styles.dayNum, (isNext || isSel) && styles.dayNumActive]}>
                      D{i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName} numberOfLines={1}>{routine.name}</Text>
                    {exerciseCounts[routine.id] ? (
                      <Text style={styles.pickerMeta}>{exerciseCounts[routine.id]} exercises</Text>
                    ) : null}
                  </View>
                  {isNext && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>Next up</Text>
                    </View>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function WeekBar({ value, target, label, display }) {
  const pct = Math.min(value / target, 1);
  return (
    <View style={styles.weekBarCell}>
      <Text style={styles.weekBarValue}>{display}</Text>
      <Text style={styles.weekBarLabel}>{label}</Text>
      <View style={styles.weekBarTrack}>
        <View style={[styles.weekBarFill, { width: `${Math.max(pct * 100, pct > 0 ? 8 : 0)}%` }]} />
      </View>
    </View>
  );
}

function PlanBuilderCard({ icon, title, desc, onPress }) {
  return (
    <TouchableOpacity style={styles.builderCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.builderIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.builderTitle}>{title}</Text>
        <Text style={styles.builderDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  headerDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },

  // Week card with progress bars
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  weekLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  weekStats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weekBarCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  weekDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  weekBarValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  weekBarLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  weekBarTrack: {
    width: '70%',
    height: 3,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  weekBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  // Continue card
  continueCard: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  continueInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueIcon: {
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  planBadge: {
    flex: 1,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  planBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  dayProgress: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 0 },
  workoutName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  workoutMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
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
  blankLinkText: { fontSize: fontSize.sm, color: colors.textMuted },

  // No plan card
  noPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  noPlanTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  noPlanSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Plan builder cards (shown only when no plan)
  getStartedSection: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingBottom: spacing.xs,
  },
  builderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  builderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  builderDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },

  // Last session
  lastSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  lastSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSessionDate: { fontSize: fontSize.xs, color: colors.textMuted },
  lastSessionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  lastSessionStats: { flexDirection: 'row', gap: spacing.xl },
  lastSessionStat: { gap: 2 },
  lastSessionStatVal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  lastSessionStatLbl: { fontSize: fontSize.xs, color: colors.textMuted },

  // Quick nav
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
  nextBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  nextBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  sheetCancel: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  sheetCancelText: { fontSize: fontSize.md, color: colors.textSecondary },
});
