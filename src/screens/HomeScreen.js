import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { formatBodyWeightShort, stoneLbsToKg, parseBodyWeightToKg } from '../lib/units';
import { VolyumeMark } from '../components/BrandMark';
import {
  getAllWorkouts, getCompletedWorkoutSets, getActivePlan, getRoutinesForPlan,
  getAllRoutineExerciseCounts, createWorkout, getRoutineExercisesWithDetails,
  getWorkoutSetsForWorkout, getExerciseById,
  getCurrentMesocycleWeek, getPlannedMuscleVolume, getAllExercises,
  getMorningWeightToday, logMorningWeight, getProgressionTeaser,
} from '../lib/database';
import { calculateTonnage, calculateWeeklyVolume, MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import InfoTooltip from '../components/InfoTooltip';

// Soft targets used only to size the weekly progress bars — not enforced
const WEEK_TARGETS = { sessions: 5, sets: 80, volume: 15000 };

function getGreeting(firstName) {
  const h = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';
  if (h < 5)  return `Up early${name}.`;
  if (h < 12) return `Morning${name}.`;
  if (h < 17) return `Afternoon${name}.`;
  if (h < 21) return `Evening${name}.`;
  return `Late night${name}.`;
}

export default function HomeScreen({ navigation }) {
  const { user, userProfile, startWorkout, activeWorkout, tier, bodyWeightUnits } = useAppStore(
    useShallow(s => ({ user: s.user, userProfile: s.userProfile, startWorkout: s.startWorkout, activeWorkout: s.activeWorkout, tier: s.tier, bodyWeightUnits: s.bodyWeightUnits }))
  );
  const bwu = bodyWeightUnits || 'st';

  const [weekStats, setWeekStats] = useState({ sessions: 0, sets: 0, volume: 0 });
  const [streakWeeks, setStreakWeeks] = useState(0);
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
  const [lastSessionTonnage, setLastSessionTonnage] = useState(null);
  const [blockProgress, setBlockProgress] = useState([]);
  const [currentMesoWeek, setCurrentMesoWeek] = useState(null);
  const [todayWeight, setTodayWeight] = useState(null);       // logged weight for today
  const [weightInput, setWeightInput] = useState('');          // draft for kg/lbs mode
  const [weightInputSt, setWeightInputSt] = useState('');     // stone field (st mode)
  const [weightInputStLbs, setWeightInputStLbs] = useState(''); // lbs field (st mode)
  const [savingWeight, setSavingWeight] = useState(false);
  const [showCoachingNudge, setShowCoachingNudge] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [showIntentPrompt, setShowIntentPrompt] = useState(false);
  const [teaserInsight, setTeaserInsight] = useState(null);
  const pendingStartRef = React.useRef(null); // ({ routineId, initialExercises })

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);


  function dismissCoachingNudge() {
    setShowCoachingNudge(false);
    AsyncStorage.setItem('@volyume_seen_coaching_nudge', 'true').catch(() => {});
  }

  useFocusEffect(
    useCallback(() => {
      // Reset starting flag when screen regains focus (prevents "Session in Progress"
      // flashing during the navigation transition away to ActiveWorkout)
      setIsStartingWorkout(false);
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
    await Promise.all([loadWeekStats(), loadNextWorkout(), loadExerciseCounts(), loadBlockProgress(), ...(tier === 'pro' ? [loadTodayWeight()] : [])]);
  }

  async function loadTodayWeight() {
    try {
      const entry = await getMorningWeightToday(user.id);
      setTodayWeight(entry?.weightKg ?? null);
    } catch (_) {}
  }

  async function handleLogWeight() {
    let weightKg;
    if (bwu === 'st') {
      if (!weightInputSt) return;
      weightKg = stoneLbsToKg(weightInputSt, weightInputStLbs || '0');
    } else {
      weightKg = parseBodyWeightToKg(weightInput, bwu);
    }
    if (!weightKg || isNaN(weightKg) || weightKg <= 0 || weightKg > 300) return;
    setSavingWeight(true);
    try {
      await logMorningWeight(user.id, { weightKg, loggedAt: Date.now() });
      setTodayWeight(weightKg);
      setWeightInput('');
      setWeightInputSt('');
      setWeightInputStLbs('');
    } catch (_) {}
    setSavingWeight(false);
  }

  async function loadWeekStats() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const [allWorkouts, allSets] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
      ]);
      const thisWeek = allWorkouts.filter(w => w.startedAt >= weekAgo && w.isCompleted);
      const workoutIds = new Set(thisWeek.map(w => w.id));
      const weekSets = allSets.filter(s => workoutIds.has(s.workoutId) && s.setType !== 'warmup');
      const totalVol = weekSets.reduce((t, s) => t + (s.weight || 0) * (s.actualReps || 0), 0);
      setWeekStats({ sessions: thisWeek.length, sets: weekSets.length, volume: totalVol });

      const completed = allWorkouts.filter(w => w.isCompleted).sort((a, b) => b.startedAt - a.startedAt);
      setLastSession(completed[0] || null);
      setTotalSessions(completed.length);

      // Only show the coaching nudge once the user has real training data to review
      if (tier === 'pro' && completed.length >= 3) {
        AsyncStorage.getItem('@volyume_seen_coaching_nudge').then(val => {
          if (val !== 'true') setShowCoachingNudge(true);
        });
      }

      // Compute tonnage for last session
      if (completed[0]) {
        const lastId = completed[0].id;
        const lastSets = allSets.filter(s => s.workoutId === lastId);
        const tonnage = calculateTonnage(lastSets);
        setLastSessionTonnage(tonnage > 0 ? tonnage : null);
      } else {
        setLastSessionTonnage(null);
      }

      // Weekly streak: consecutive calendar weeks (Mon–Sun) with at least one session.
      // Uses UTC Monday as the week boundary so the bucket aligns to the calendar.
      function mondayWeekIndex(ts) {
        if (!ts) return -1;
        const d = new Date(ts);
        const daysFromMon = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
        const mondayMidnight = ts - (ts % 86400000) - daysFromMon * 86400000;
        return Math.floor(mondayMidnight / (7 * 86400000));
      }
      const trainedWeeks = new Set(
        completed.map(w => mondayWeekIndex(w.startedAt ?? w.createdAt ?? 0)),
      );
      let streak = 0;
      let week = mondayWeekIndex(Date.now());
      if (!trainedWeeks.has(week)) week -= 1;
      while (trainedWeeks.has(week)) {
        streak += 1;
        week -= 1;
      }
      setStreakWeeks(streak);

      // Progression teaser — free tier only, needs 2+ sessions to compare
      if (tier === 'free' && completed.length >= 2) {
        getProgressionTeaser(user.id, completed[0].id, completed[1].id)
          .then(t => setTeaserInsight(t))
          .catch(() => {});
      }
    } catch (_e) {}
  }

  async function loadExerciseCounts() {
    try {
      const counts = await getAllRoutineExerciseCounts();
      setExerciseCounts(counts);
    } catch (_e) {}
  }

  async function loadBlockProgress() {
    if (!user?.id) return;
    try {
      const week = await getCurrentMesocycleWeek(user.id);
      setCurrentMesoWeek(week);
      if (!week) return;

      const [planned, allSets, allExercises] = await Promise.all([
        getPlannedMuscleVolume(week.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
      ]);

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentSets = allSets.filter(s => (s.createdAt || 0) >= weekAgo);
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
      const actual = calculateWeeklyVolume(recentSets, exerciseMap);

      const progress = planned
        .filter(p => p.planned_sets > 0)
        .map(p => ({
          muscle: p.muscle,
          planned: p.planned_sets,
          actual: Math.round(actual[p.muscle]?.workingSets || 0),
          label: MUSCLE_DISPLAY_NAMES[p.muscle] || p.muscle,
        }))
        .sort((a, b) => b.planned - a.planned)
        .slice(0, 8); // top 8 muscles by volume

      setBlockProgress(progress);
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
    try {
      const routine = target.routine;
      const withExercises = await getRoutineExercisesWithDetails(routine.id);
      const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
        exercise, routineExercise, sets: [],
      }));
      pendingStartRef.current = { routineId: routine.id, initialExercises };
      setShowIntentPrompt(true);
    } catch (_) {
      setIsStartingWorkout(false);
    }
  }

  async function confirmStart(intent) {
    setShowIntentPrompt(false);
    const pending = pendingStartRef.current;
    if (!pending) return;
    setIsStartingWorkout(true);
    try {
      const workout = await createWorkout(user.id, pending.routineId, { intent });
      startWorkout(workout, pending.initialExercises);
      navigation.navigate('ActiveWorkout');
    } catch (_) {
      setIsStartingWorkout(false);
    }
    pendingStartRef.current = null;
  }

  async function handleRepeatLastSession() {
    if (!lastSession) return;
    const routineId = lastSession.routineId || lastSession.routine_id || null;

    let initialExercises;
    if (routineId) {
      // Load the FULL routine — not just what was done last time
      const withExercises = await getRoutineExercisesWithDetails(routineId);
      initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
        exercise, routineExercise, sets: [],
      }));
    } else {
      // No routine linked — fall back to exercises from the session's sets
      const prevSets = await getWorkoutSetsForWorkout(lastSession.id);
      const seenIds = [];
      const orderedExerciseIds = [];
      for (const s of prevSets) {
        if (s.exerciseId && !seenIds.includes(s.exerciseId)) {
          seenIds.push(s.exerciseId);
          orderedExerciseIds.push(s.exerciseId);
        }
      }
      initialExercises = (
        await Promise.all(orderedExerciseIds.map(id => getExerciseById(id).catch(() => null)))
      )
        .filter(Boolean)
        .map(exercise => ({ exercise, routineExercise: null, sets: [] }));
    }

    pendingStartRef.current = { routineId, initialExercises };
    setShowIntentPrompt(true);
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
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Branded header ── */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>Train</Text>
            <Text style={styles.greeting}>{getGreeting(userProfile?.firstName)}</Text>
          </View>
          <VolyumeMark size={38} color={colors.textMuted} />
        </View>

        {/* ── Morning weight card ── */}
        {tier === 'pro' && (todayWeight != null ? (
          <View style={styles.weightCard}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.weightCardText}>
              {formatBodyWeightShort(todayWeight, bwu)} logged today
            </Text>
            <TouchableOpacity onPress={() => setTodayWeight(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.weightCardEdit}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.weightCard}>
            <Ionicons name="scale-outline" size={16} color={colors.textMuted} />
            {bwu === 'st' ? (
              <>
                <TextInput
                  style={[styles.weightInput, { flex: 1 }]}
                  value={weightInputSt}
                  onChangeText={setWeightInputSt}
                  placeholder="12 st"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TextInput
                  style={[styles.weightInput, { flex: 1 }]}
                  value={weightInputStLbs}
                  onChangeText={setWeightInputStLbs}
                  placeholder="7 lbs"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleLogWeight}
                />
              </>
            ) : (
              <TextInput
                style={styles.weightInput}
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder={`Morning weight (${bwu})`}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleLogWeight}
              />
            )}
            <TouchableOpacity
              style={[styles.weightLogBtn, ((!weightInput && !weightInputSt) || savingWeight) && styles.weightLogBtnDisabled]}
              onPress={handleLogWeight}
              disabled={(!weightInput && !weightInputSt) || savingWeight}
            >
              <Text style={styles.weightLogBtnText}>Log</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* ── This week — progress bars ── */}
        <View style={styles.weekCard}>
          <View style={styles.weekCardHeader}>
            <Text style={styles.weekLabel}>This week</Text>
            {streakWeeks >= 2 && (
              <View style={styles.streakChip}>
                <Text style={styles.streakChipText}>{streakWeeks} weeks consistent</Text>
              </View>
            )}
          </View>
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
              display={`${Math.round(weekStats.volume).toLocaleString('en-GB')} kg`}
            />
          </View>
        </View>

        {/* ── Pro teaser (free tier only, after 3+ sessions) ── */}
        {tier === 'free' && totalSessions >= 3 && (
          <TouchableOpacity
            style={styles.proTeaserCard}
            onPress={() => navigation.navigate('ProUpgrade')}
            activeOpacity={0.88}
          >
            <View style={styles.proTeaserLeft}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proTeaserTitle}>
                  {teaserInsight?.progressed && teaserInsight?.stalled
                    ? `${teaserInsight.progressed} went up. ${teaserInsight.stalled} held. Pro tells you what to do next.`
                    : teaserInsight?.progressed
                      ? `${teaserInsight.progressed} progressed this week. Pro builds on it.`
                      : totalSessions >= 10
                        ? `${totalSessions} sessions logged. Pro coaching uses all of it.`
                        : 'Add a coach that adjusts your plan each week.'}
                </Text>
                <Text style={styles.proTeaserSub}>Free during beta</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── Primary workout area ── */}
        {hasActiveWorkout ? (
          <TouchableOpacity
            style={styles.continueCard}
            onPress={() => navigation.navigate('ActiveWorkout')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continue active workout"
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
                accessibilityRole="button"
                accessibilityLabel={isStartingWorkout ? 'Starting workout' : `Start ${displayWorkout?.routine?.name || 'workout'}`}
              >
                <Ionicons name="play" size={16} color={colors.background} />
                <Text style={styles.primaryBtnText}>
                  {isStartingWorkout ? 'Starting…' : 'Start Workout'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => setShowChangeWorkout(true)}
                accessibilityRole="button"
                accessibilityLabel="Change planned workout"
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.blankLink}
              onPress={() => navigation.navigate('BuildWorkout')}
              accessibilityRole="button"
              accessibilityLabel="Start a blank workout instead"
            >
              <Ionicons name="add-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.blankLinkText}>Start Blank Workout instead</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noPlanSection}>
            <View style={styles.noPlanHero}>
              <View style={styles.noPlanIconWrap}>
                <Ionicons name="barbell-outline" size={28} color={colors.primary} />
              </View>
              {lastSession == null ? (
                <>
                  <Text style={styles.noPlanTitle}>Welcome. Let's get you started.</Text>
                  <Text style={styles.noPlanSub}>
                    Not sure where to begin? Use Coach Builder and we'll put together a plan around your goals and schedule in two minutes.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.noPlanTitle}>Pick up where you left off</Text>
                  <Text style={styles.noPlanSub}>
                    You've been training without a set plan. Setting one up will keep things structured and help Volyume track your progress properly.
                  </Text>
                </>
              )}
            </View>

            {/* Progress at a glance — shown when there's history but no plan */}
            {lastSession != null && (
              <View style={styles.glanceCard}>
                <Text style={styles.glanceTitle}>Your progress at a glance</Text>
                <View style={styles.glanceRow}>
                  <View style={styles.glanceStat}>
                    <Text style={styles.glanceStatValue}>{weekStats.sessions}</Text>
                    <Text style={styles.glanceStatLabel}>Sessions this week</Text>
                  </View>
                  <View style={styles.glanceDivider} />
                  <View style={styles.glanceStat}>
                    <Text style={styles.glanceStatValue}>
                      {getRelativeDay(lastSession.startedAt)}
                    </Text>
                    <Text style={styles.glanceStatLabel}>Last session</Text>
                  </View>
                </View>
              </View>
            )}

            <PlanBuilderCard
              icon="sparkles"
              title="Coach Builder"
              desc="Answer 5 questions about your goals and time available. We'll build you a complete programme."
              badge="Recommended"
              onPress={() => navigation.navigate('PlansTab', { screen: 'CoachBuilder', initial: false })}
            />
            <PlanBuilderCard
              icon="library-outline"
              title="Plan Library"
              desc="Browse ready-made programmes for every level, schedule, and goal."
              onPress={() => navigation.navigate('PlansTab', { screen: 'PlanLibrary', initial: false })}
            />
            <PlanBuilderCard
              icon="create-outline"
              title="Build Your Own"
              desc="Already know exactly what you want to train? Build a custom programme from scratch."
              onPress={() => navigation.navigate('PlansTab', { screen: 'ManualBuilder', initial: false })}
            />

            <TouchableOpacity
              style={styles.blankSessionLink}
              onPress={() => navigation.navigate('BuildWorkout')}
              accessibilityRole="button"
              accessibilityLabel="Start a blank session"
            >
              <Text style={styles.blankSessionLinkText}>Start a blank session instead</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Last session ── */}
        {lastSession && (
          <TouchableOpacity
            style={styles.lastSessionCard}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory', initial: false })}
            activeOpacity={0.7}
          >
            <View style={styles.lastSessionTop}>
              <View style={{ gap: 2 }}>
                <Text style={styles.lastSessionLabel}>Last session</Text>
                <Text style={styles.lastSessionRelDate}>{getRelativeDay(lastSession.startedAt)}</Text>
              </View>
              <TouchableOpacity
                style={styles.repeatBtn}
                onPress={e => { e.stopPropagation(); handleRepeatLastSession(); }}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Repeat last session"
              >
                <Ionicons name="refresh-outline" size={13} color={colors.primary} />
                <Text style={styles.repeatBtnText}>Repeat</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.lastSessionName} numberOfLines={1}>
              {lastSession.name || lastSession.routineName || 'Session'}
            </Text>
            <View style={styles.lastSessionStatRow}>
              {lastSession.durationMinutes ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>{lastSession.durationMinutes}m</Text>
                </View>
              ) : null}
              {lastSession.setCount ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="repeat-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>{lastSession.setCount} sets</Text>
                </View>
              ) : null}
              {lastSession.totalVolume ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="barbell-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>
                    {Math.round(lastSession.totalVolume).toLocaleString('en-GB')} kg
                  </Text>
                </View>
              ) : lastSessionTonnage ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="barbell-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>
                    {Math.round(lastSessionTonnage).toLocaleString('en-GB')} kg
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {/* ── Training brain line ── */}
        {totalSessions >= 10 && (
          <TouchableOpacity
            style={styles.trainingBrainRow}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory', initial: false })}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="View your training history"
          >
            <Ionicons name="library-outline" size={14} color={colors.textMuted} />
            <Text style={styles.trainingBrainText}>
              {totalSessions.toLocaleString('en-GB')} sessions logged. This is your training brain.
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Block progress — planned vs actual this week */}
          {blockProgress.length > 0 && (
            <View style={styles.blockCard}>
              <View style={styles.blockCardHeader}>
                <Text style={styles.blockCardTitle}>This week's plan</Text>
                {currentMesoWeek && (
                  <Text style={styles.blockCardWeek}>
                    Week {currentMesoWeek.weekIndex}/{currentMesoWeek.plannedWeeks}
                    {currentMesoWeek.isDeload ? ' · Recovery week' : ` · Effort ${currentMesoWeek.rirTarget != null ? 5 - currentMesoWeek.rirTarget : '–'}`}
                  </Text>
                )}
              </View>
              {blockProgress.map(p => {
                const pct = p.planned > 0 ? Math.min(1, p.actual / p.planned) : 0;
                const barColor = pct >= 1 ? colors.primary : pct >= 0.7 ? colors.warning : 'rgba(245,158,11,0.25)';
                return (
                  <View key={p.muscle} style={styles.blockRow}>
                    <Text style={styles.blockMuscle} numberOfLines={1}>{p.label}</Text>
                    <View style={styles.blockBarBg}>
                      <View style={[styles.blockBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.blockSets}>
                      {p.actual}/{p.planned}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

        {/* ── Coaching discovery nudge (Pro, one-time) ── */}
        {showCoachingNudge && (
          <View style={styles.coachingNudge}>
            <View style={styles.coachingNudgeLeft}>
              <Ionicons name="pulse-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.coachingNudgeTitle}>Your weekly coaching review is here</Text>
              <Text style={styles.coachingNudgeBody}>
                Each week Volyume looks at how your training went and suggests what to adjust going forward. Tap to see yours.
              </Text>
              <TouchableOpacity
                style={styles.coachingNudgeBtn}
                onPress={() => {
                  dismissCoachingNudge();
                  navigation.navigate('ProfileTab', { screen: 'WeeklyCheckIn', initial: false });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.coachingNudgeBtnText}>Show me</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={dismissCoachingNudge}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Dismiss coaching nudge"
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick nav ── */}
        <View style={styles.quickRow}>
          <QuickLink
            icon="time-outline"
            label="History"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory', initial: false })}
          />
          <QuickLink
            icon="trophy-outline"
            label="Records"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'PRWall', initial: false })}
          />
          <QuickLink
            icon="grid-outline"
            label="Volume"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'VolumeHeatmap', initial: false })}
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

      {/* ── Pre-workout intent prompt ── */}
      <Modal
        visible={showIntentPrompt}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowIntentPrompt(false); pendingStartRef.current = null; }}
      >
        <View style={styles.intentOverlay}>
          <View style={styles.intentSheet}>
            <Text style={styles.intentTitle}>How are you feeling today?</Text>
            <Text style={styles.intentSub}>Takes a second. Helps us read your sessions better over time.</Text>
            {[
              { key: 'sharp', label: 'Sharp', sub: 'Energised and ready', icon: 'flash-outline' },
              { key: 'average', label: 'Average', sub: 'Normal day, feeling fine', icon: 'remove-outline' },
              { key: 'below_par', label: 'Below par', sub: 'Tired, stressed, or off', icon: 'arrow-down-outline' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={styles.intentOption}
                onPress={() => confirmStart(opt.key)}
                activeOpacity={0.85}
              >
                <View style={styles.intentOptionIcon}>
                  <Ionicons name={opt.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.intentOptionLabel}>{opt.label}</Text>
                  <Text style={styles.intentOptionSub}>{opt.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.intentSkip}
              onPress={() => confirmStart(null)}
            >
              <Text style={styles.intentSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRelativeDay(ts) {
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return format(new Date(ts), 'd MMM');
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

function PlanBuilderCard({ icon, title, desc, badge, onPress }) {
  return (
    <TouchableOpacity style={styles.builderCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.builderIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.builderTitleRow}>
          <Text style={styles.builderTitle}>{title}</Text>
          {badge && (
            <View style={styles.builderBadge}>
              <Text style={styles.builderBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
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

  // Morning weight card
  weightCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  weightInput: {
    flex: 1, fontSize: fontSize.sm, color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  weightCardText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  weightCardEdit: { fontSize: fontSize.xs, color: colors.primary },
  weightLogBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  weightLogBtnDisabled: { backgroundColor: colors.surface3 },
  weightLogBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.background },

  // Header — matches Plans/Progress/Athlete Hub pattern
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  headerText: { gap: 1 },
  pageTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.regular,
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
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  streakChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
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
  blankLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  blankLinkText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },

  // No plan — plan-first section
  noPlanSection: { gap: spacing.md },
  noPlanHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noPlanIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryBg, borderWidth: 1.5, borderColor: colors.primary + '50',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  noPlanTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, textAlign: 'center',
  },
  noPlanSub: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    lineHeight: 20, textAlign: 'center',
  },
  blankSessionLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
  },
  blankSessionLinkText: { fontSize: fontSize.sm, color: colors.textMuted },

  // Progress at a glance (no-plan + has history)
  glanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  glanceTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  glanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glanceStat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  glanceStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  glanceStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  glanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  // Plan builder cards
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
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
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  builderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  builderTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  builderBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  builderBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.primary },
  builderDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },

  // Last session
  lastSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  lastSessionTop: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  lastSessionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.2,
  },
  lastSessionRelDate: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  repeatBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  lastSessionName: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  lastSessionStatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  lastSessionStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  lastSessionStatText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },

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

  // Block progress card
  blockCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.md,
  },
  blockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockCardTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5 },
  blockCardWeek: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  blockMuscle: { width: 80, fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  blockBarBg: {
    flex: 1, height: 6, backgroundColor: colors.border,
    borderRadius: radius.full, overflow: 'hidden',
  },
  blockBarFill: { height: '100%', borderRadius: radius.full },
  blockSets: { width: 36, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  blockNote: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },

  // Pro coaching discovery nudge
  coachingNudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  coachingNudgeLeft: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  coachingNudgeTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary,
  },
  coachingNudgeBody: {
    fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17,
  },
  coachingNudgeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  coachingNudgeBtnText: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary,
  },

  trainingBrainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  trainingBrainText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
  },

  intentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  intentSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  intentTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  intentSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  intentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface2 ?? colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intentOptionIcon: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  intentOptionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  intentOptionSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  intentSkip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  intentSkipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  proTeaserCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proTeaserLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  proTeaserTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 19,
  },
  proTeaserSub: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: 1,
  },
});
