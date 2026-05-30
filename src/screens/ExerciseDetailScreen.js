import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { CartesianChart, Line, Area } from 'victory-native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import { SkeletonCard } from '../components/Skeleton';
import AnimatedEntrance from '../components/AnimatedEntrance';
import {
  getExerciseById, getWorkoutSetsForExercise, getAllExercises,
  getExerciseGoal, saveExerciseGoal, markGoalAchieved, deleteExerciseGoal,
} from '../lib/database';
import { calculate1RM, MUSCLE_DISPLAY_NAMES, detectPlateau } from '../lib/algorithms';
import { equipmentDisplayLabel, difficultyDisplayLabel, subregionDisplayLabel } from '../lib/exerciseDisplay';
import { rankSwaps } from '../lib/swapEngine';
import useAppStore from '../store/useAppStore';
import { FORM_TIPS } from '../lib/formTips';
import InfoTooltip from '../components/InfoTooltip';

// Loose date parser, accepts "Dec 2025", "December 2025", "2025-12", "12/2025" etc.
// Returns unix timestamp (ms) for the 1st of the parsed month, or null.
function parseLooseDate(str) {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  // ISO yyyy-mm
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, 1);
    if (!isNaN(d)) return d.getTime();
  }

  // mm/yyyy or mm-yyyy
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const d = new Date(parseInt(slashMatch[2], 10), parseInt(slashMatch[1], 10) - 1, 1);
    if (!isNaN(d)) return d.getTime();
  }

  // "Dec 2025" / "December 2025"
  const d = new Date(`1 ${s}`);
  if (!isNaN(d)) return d.getTime();

  // Full date string fallback
  const d2 = new Date(s);
  if (!isNaN(d2)) return d2.getTime();

  return null;
}

export default function ExerciseDetailScreen({ navigation, route }) {
  const { exerciseId } = route.params || {};
  const { user, units } = useAppStore();
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const [exercise, setExercise] = useState(null);
  const [history, setHistory] = useState([]);
  const [prs, setPRs] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);
  const [plateau, setPlateau] = useState(null);
  const [chartMode, setChartMode] = useState('weight'); // 'weight' | 'e1rm'

  // Goal state
  const [goal, setGoal] = useState(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState('');
  const [goalDateInput, setGoalDateInput] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);
  const [congratsBanner, setCongratusBanner] = useState(false);
  const congratsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (exerciseId) loadData();
  }, [exerciseId]);

  async function loadData() {
    try {
      const ex = await getExerciseById(exerciseId);
      if (!ex) return; // exercise not found, screen will stay on null guard
      setExercise(ex);
      navigation.setOptions({ title: ex.name });

      // History, group by workout, last 8 sessions
      const mySets = await getWorkoutSetsForExercise(exerciseId, user.id, 200);

      const byWorkout = {};
      for (const s of mySets) {
        if (!byWorkout[s.workoutId]) byWorkout[s.workoutId] = [];
        byWorkout[s.workoutId].push(s);
      }
      const sessions = Object.values(byWorkout).slice(0, 8);
      setHistory(sessions);

      // Plateau detection
      const sessionArrays = sessions.map(s => s.sets ?? s); // newest-first already
      const plateauResult = detectPlateau(sessionArrays, ex?.defaultRepMin ?? 6, ex?.defaultRepMax ?? 12);
      setPlateau(plateauResult.plateau ? plateauResult : null);

      // Compute local PRs from working sets
      const workingSets = mySets.filter(
        s => (s.setType ?? s.set_type) !== 'warmup' && (s.weight || 0) > 0 && (s.actualReps || 0) > 0,
      );
      let computedBest1RM = 0;
      if (workingSets.length > 0) {
        const computedPRs = [];
        let best1RMVal = 0, best1RMSet = null, heaviest = null, mostReps = null;
        for (const s of workingSets) {
          const est = calculate1RM(s.weight, s.actualReps);
          if (est > best1RMVal) { best1RMVal = est; best1RMSet = s; }
          if (!heaviest || s.weight > heaviest.weight) heaviest = s;
          if (!mostReps || s.actualReps > mostReps.actualReps) mostReps = s;
        }
        computedBest1RM = best1RMVal;
        if (best1RMSet) computedPRs.push({ id: 'pr_1rm', record_type: '1rm_estimate', value: best1RMVal, reps: best1RMSet.actualReps, achieved_date: best1RMSet.createdAt });
        if (heaviest)   computedPRs.push({ id: 'pr_heavy', record_type: 'heaviest_weight', value: heaviest.weight, reps: heaviest.actualReps, achieved_date: heaviest.createdAt });
        if (mostReps && mostReps !== heaviest) computedPRs.push({ id: 'pr_reps', record_type: 'most_reps', value: mostReps.weight, reps: mostReps.actualReps, achieved_date: mostReps.createdAt });
        setPRs(computedPRs);
      }

      // Load goal and auto-detect achievement
      const loadedGoal = await getExerciseGoal(user.id, exerciseId);
      if (loadedGoal && !loadedGoal.achievedAt && computedBest1RM >= loadedGoal.targetWeight) {
        await markGoalAchieved(loadedGoal.id);
        const updatedGoal = { ...loadedGoal, achievedAt: Date.now() };
        setGoal(updatedGoal);
        showCongratsBanner();
      } else {
        setGoal(loadedGoal);
      }

      // Substitutes, ranked by SFR score and similarity
      const allExercises = await getAllExercises();
      try {
        const swaps = rankSwaps(ex, allExercises, { equipment: [] });
        setSubstitutes(swaps.slice(0, 4));
      } catch (_) {
        // swapEngine unavailable, hide section silently
      }
    } catch (e) {
      console.error('ExerciseDetail loadData:', e);
    }
  }

  function showCongratsBanner() {
    setCongratusBanner(true);
    if (reduceMotion) {
      congratsOpacity.setValue(1);
      setTimeout(() => {
        congratsOpacity.setValue(0);
        setCongratusBanner(false);
      }, 3500);
      return;
    }
    Animated.sequence([
      Animated.timing(congratsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(congratsOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setCongratusBanner(false));
  }

  function openGoalSheet() {
    if (goal) {
      setGoalWeightInput(String(goal.targetWeight));
      setGoalDateInput(
        goal.targetDate
          ? format(new Date(goal.targetDate), 'MMM yyyy')
          : '',
      );
    } else {
      setGoalWeightInput('');
      setGoalDateInput('');
    }
    setGoalModalVisible(true);
  }

  async function handleSaveGoal() {
    const w = parseFloat(goalWeightInput);
    if (!w || w <= 0) return;
    const targetDate = parseLooseDate(goalDateInput);
    setGoalSaving(true);
    try {
      await saveExerciseGoal(user.id, exerciseId, { targetWeight: w, targetDate });
      const updated = await getExerciseGoal(user.id, exerciseId);
      setGoal(updated);
      setGoalModalVisible(false);
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleRemoveGoal() {
    await deleteExerciseGoal(user.id, exerciseId);
    setGoal(null);
    setGoalModalVisible(false);
  }

  if (!exercise) {
    // Content-shaped skeletons during the initial DB load, instead of a bare
    // spinner, so it reads as the screen filling in rather than stalling.
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <SkeletonCard height={120} />
          <SkeletonCard height={180} />
          <SkeletonCard height={92} />
        </View>
      </SafeAreaView>
    );
  }

  const formTip = FORM_TIPS[exercise.name] ?? null;
  const primaryMuscle = MUSCLE_DISPLAY_NAMES[(exercise.primaryMuscle || '').toLowerCase()] || exercise.primaryMuscle;
  const secondaryMuscles = exercise.secondaryMuscles || [];
  const equipmentLabel = equipmentDisplayLabel(exercise);
  const difficultyLabel = difficultyDisplayLabel(exercise);
  const subregionLabel = subregionDisplayLabel(exercise.subregion);
  const coachingCue = exercise.cue || null;

  const allTimeSets = history.flat();
  const best1RM = allTimeSets.reduce((best, s) => {
    const est = calculate1RM(s.weight || 0, s.actualReps || 0);
    return est > best ? est : best;
  }, 0);

  // Goal progress derived values
  const goalProgress = goal && !goal.achievedAt
    ? Math.min(1, best1RM / goal.targetWeight)
    : goal && goal.achievedAt
      ? 1
      : 0;
  const goalKgToGo = goal && !goal.achievedAt
    ? Math.max(0, goal.targetWeight - best1RM)
    : 0;

  // Build chart data: one point per session (oldest → newest)
  const reversedHistory = [...history].reverse();
  const chartData = reversedHistory.map((sessionSets, i) => {
    const workingSets = sessionSets.filter(s => (s.weight || 0) > 0 && (s.actualReps || 0) > 0);
    const topSet = workingSets.reduce((best, s) => {
      if (!best || (s.weight || 0) > (best.weight || 0)) return s;
      return best;
    }, null);
    const maxWeight = topSet ? (topSet.weight || 0) : 0;
    const e1rmVal = topSet ? calculate1RM(topSet.weight || 0, topSet.actualReps || 0) : 0;
    return { x: i, weight: maxWeight, est1rm: e1rmVal };
  });
  const activeYKey = chartMode === 'e1rm' ? 'est1rm' : 'weight';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview */}
        <AnimatedEntrance index={0}>
        <View style={styles.overviewCard}>
          <View style={styles.tags}>
            <View style={styles.tag}><Text style={styles.tagText}>{primaryMuscle}</Text></View>
            {subregionLabel && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>{subregionLabel}</Text>
              </View>
            )}
            {equipmentLabel && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>{equipmentLabel}</Text>
              </View>
            )}
            {exercise.compoundIsolation && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>
                  {exercise.compoundIsolation.charAt(0).toUpperCase() + exercise.compoundIsolation.slice(1)}
                </Text>
              </View>
            )}
            {difficultyLabel && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>{difficultyLabel}</Text>
              </View>
            )}
          </View>

          {secondaryMuscles.length > 0 && (
            <View style={styles.secMuscles}>
              <Text style={styles.secMuscleLabel}>Also works: </Text>
              <Text style={styles.secMuscleText}>
                {secondaryMuscles.map(m => {
                  const key = m.muscle || m;
                  return MUSCLE_DISPLAY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                }).join(', ')}
              </Text>
            </View>
          )}

          {best1RM > 0 && (
            <View style={styles.est1RM}>
              <Ionicons name="trophy-outline" size={16} color={colors.gold} />
              <Text style={styles.est1RMText}>Estimated max: {best1RM.toFixed(1)} {units}</Text>
              <InfoTooltip text="Your estimated max lift: the most weight you could lift for a single rep, calculated from the sets you've logged. It updates automatically as you get stronger." size={12} />
            </View>
          )}

          <View style={styles.sfrRow}>
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.stimulusToFatigueRatio || 3}/5</Text>
              <View style={styles.sfrLabelRow}>
                <Text style={styles.sfrLabel}>Quality</Text>
                <InfoTooltip text="Effort rating: how much growth this exercise produces relative to how tiring it is overall. 5/5 = great return for the fatigue cost. 3/5 = moderate. 1/5 = very demanding for what you get back." size={11} />
              </View>
            </View>
            <View style={styles.sfrDivider} />
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.fatigueCost || 3}/5</Text>
              <View style={styles.sfrLabelRow}>
                <Text style={styles.sfrLabel}>Fatigue</Text>
                <InfoTooltip text="How much systemic fatigue this exercise creates. 5/5 = very demanding (deadlift). 1/5 = minimal fatigue. High-fatigue exercises need more recovery between sessions." size={11} />
              </View>
            </View>
            <View style={styles.sfrDivider} />
            <View style={styles.sfrItem}>
              <Text style={styles.sfrValue}>{exercise.defaultRepMin || 6}–{exercise.defaultRepMax || 12}</Text>
              <Text style={styles.sfrLabel}>Rep range</Text>
            </View>
          </View>
        </View>
        </AnimatedEntrance>

        {/* Personal Record highlight card */}
        {prs.length > 0 && (() => {
          const pr1rm   = prs.find(p => p.record_type === '1rm_estimate');
          const prHeavy = prs.find(p => p.record_type === 'heaviest_weight');
          const prReps  = prs.find(p => p.record_type === 'most_reps');
          const displayPR = pr1rm || prHeavy;
          if (!displayPR) return null;
          return (
            <View style={styles.prHighlightCard}>
              <View style={styles.prHighlightHeader}>
                <Ionicons name="trophy" size={18} color={colors.primary} />
                <Text style={styles.prHighlightTitle}>Personal records</Text>
              </View>
              <View style={styles.prHighlightRow}>
                {displayPR && (
                  <View style={styles.prHighlightStat}>
                    <Text style={styles.prHighlightStatValue}>
                      {parseFloat(displayPR.value).toFixed(1)}{units}
                    </Text>
                    <Text style={styles.prHighlightStatLabel}>
                      {displayPR.record_type === '1rm_estimate' ? 'Est. 1RM' : 'Heaviest set'}
                    </Text>
                  </View>
                )}
                {prHeavy && displayPR !== prHeavy && (
                  <View style={[styles.prHighlightStat, styles.prHighlightStatBordered]}>
                    <Text style={styles.prHighlightStatValue}>
                      {prHeavy.value}{units} × {prHeavy.reps}
                    </Text>
                    <Text style={styles.prHighlightStatLabel}>Best set</Text>
                  </View>
                )}
                {prReps && (
                  <View style={[styles.prHighlightStat, styles.prHighlightStatBordered]}>
                    <Text style={styles.prHighlightStatValue}>
                      {prReps.value}{units} × {prReps.reps}
                    </Text>
                    <Text style={styles.prHighlightStatLabel}>Most reps</Text>
                  </View>
                )}
              </View>
              <Text style={styles.prHighlightDate}>
                Achieved {format(new Date(displayPR.achieved_date), 'MMM d yyyy')}
              </Text>
            </View>
          );
        })()}

        {/* Congratulatory banner, shown briefly when goal is auto-detected as achieved */}
        {congratsBanner && (
          <Animated.View style={[styles.congratsBanner, { opacity: congratsOpacity }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.congratsText}>You've hit your target! Set a new one.</Text>
          </Animated.View>
        )}

        {/* Goal section */}
        {!goal && (
          <TouchableOpacity style={styles.goalSetLink} onPress={openGoalSheet} activeOpacity={0.7}>
            <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
            <Text style={styles.goalSetLinkText}>Set a target weight</Text>
          </TouchableOpacity>
        )}

        {goal && (
          <View style={styles.goalCard}>
            <View style={styles.goalCardHeader}>
              <View style={styles.goalCardLeft}>
                <Ionicons name="flag" size={14} color={colors.primary} />
                <Text style={styles.goalCardTitle}>Target</Text>
              </View>
              <TouchableOpacity onPress={openGoalSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.goalWeightRow}>
              <View style={styles.goalWeightItem}>
                <Text style={styles.goalWeightValue}>{best1RM > 0 ? best1RM.toFixed(1) : '-'}{best1RM > 0 ? units : ''}</Text>
                <Text style={styles.goalWeightLabel}>Current est. 1RM</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              <View style={styles.goalWeightItem}>
                <Text style={[styles.goalWeightValue, { color: colors.primary }]}>
                  {goal.targetWeight}{units}
                </Text>
                <Text style={styles.goalWeightLabel}>
                  Target{goal.targetDate ? ` · by ${format(new Date(goal.targetDate), 'MMM yyyy')}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.goalBarTrack}>
              <View style={[styles.goalBarFill, { width: `${Math.round(goalProgress * 100)}%` }]} />
            </View>

            <Text style={[
              styles.goalBarCaption,
              goalProgress >= 1 && { color: colors.primary },
            ]}>
              {goalProgress >= 1
                ? 'Goal reached!'
                : `${goalKgToGo.toFixed(1)}${units} to go`}
            </Text>
          </View>
        )}

        {plateau && (
          <View style={styles.plateauBanner}>
            <Ionicons name="analytics-outline" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.plateauTitle}>Progress has stalled</Text>
              <Text style={styles.plateauBody}>{plateau.message}</Text>
            </View>
          </View>
        )}

        {/* Strength trend chart */}
        {history.length >= 2 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartLabel}>Strength trend</Text>
            <View style={styles.chartToggle}>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartMode === 'weight' && styles.chartToggleBtnActive]}
                onPress={() => setChartMode('weight')}
              >
                <Text style={[styles.chartToggleBtnText, chartMode === 'weight' && styles.chartToggleBtnTextActive]}>
                  Max weight
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartMode === 'e1rm' && styles.chartToggleBtnActive]}
                onPress={() => setChartMode('e1rm')}
              >
                <Text style={[styles.chartToggleBtnText, chartMode === 'e1rm' && styles.chartToggleBtnTextActive]}>
                  Est. 1RM
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chartContainer}>
              <CartesianChart data={chartData} xKey="x" yKeys={[activeYKey]}>
                {({ points, chartBounds }) => (
                  <>
                    <Area
                      points={points[activeYKey]}
                      y0={chartBounds.bottom}
                      color={colors.chartFill}
                    />
                    <Line
                      points={points[activeYKey]}
                      color={colors.primary}
                      strokeWidth={2}
                    />
                  </>
                )}
              </CartesianChart>
            </View>
            {chartMode === 'e1rm' && (
              <Text style={styles.e1rmNote}>
                Estimated from top set using the Epley formula. Best for rep ranges 2–10.
              </Text>
            )}
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History (last {history.length} sessions)</Text>
            {history.map((sessionSets, i) => {
              const firstSet = sessionSets[0];
              const date = new Date(firstSet.createdAt);
              const sessionEst1RM = Math.max(...sessionSets.map(s => calculate1RM(s.weight || 0, s.actualReps || 0)));
              return (
                <View key={i} style={styles.historyCard}>
                  <Text style={styles.historyDate}>{format(date, 'MMM d')}</Text>
                  <View style={styles.historySets}>
                    {sessionSets.map((s, j) => (
                      <Text key={j} style={styles.historySetText}>
                        {s.weight}{units} × {s.actualReps}
                        {s.set_type === 'warmup' || s.setType === 'warmup' ? ' · Warm-up' : ''}
                        {s.set_type === 'dropset' || s.setType === 'dropset' ? ' · Drop Set' : ''}
                      </Text>
                    ))}
                  </View>
                  {sessionEst1RM > 0 && (
                    <Text style={styles.historyEst}>Est. max: ≈{sessionEst1RM.toFixed(0)}{units}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* History empty state */}
        {history.length === 0 && exercise && (
          <View style={styles.historyEmpty}>
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            <Text style={styles.historyEmptyText}>
              You haven't logged this exercise yet. Add it to a session to start tracking your progress.
            </Text>
          </View>
        )}

        {/* PRs */}
        {prs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All-time bests</Text>
            {prs.slice(0, 5).map((pr, i) => (
              <View key={pr.id} style={styles.prRow}>
                <Text style={styles.prIcon}>
                  {pr.record_type === '1rm_estimate' ? '🥇' :
                   pr.record_type === 'heaviest_weight' ? '🏋️' : '🔁'}
                </Text>
                <View style={styles.prInfo}>
                  <Text style={styles.prLabel}>
                    {pr.record_type === '1rm_estimate' ? 'Estimated max' :
                     pr.record_type === 'heaviest_weight' ? 'Heaviest weight' : 'Most reps'}
                  </Text>
                  <Text style={styles.prValue}>
                    {pr.record_type === '1rm_estimate' ? `${parseFloat(pr.value).toFixed(1)}${units}` :
                     `${pr.value}${units} × ${pr.reps} reps`}
                  </Text>
                </View>
                <Text style={styles.prDate}>{format(new Date(pr.achieved_date), 'MMM d yyyy')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Similar exercises, horizontal scroll of small cards */}
        {substitutes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar exercises</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subScrollContent}
            >
              {substitutes.map(({ exercise: sub }) => {
                const subPrimary = MUSCLE_DISPLAY_NAMES[(sub.primaryMuscle || '').toLowerCase()] || sub.primaryMuscle;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={styles.subCard}
                    onPress={() => navigation.push('ExerciseDetail', { exerciseId: sub.id, exerciseName: sub.name })}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.subCardName} numberOfLines={2}>{sub.name}</Text>
                    <View style={styles.subCardFooter}>
                      {sub.equipment ? (
                        <Ionicons name="barbell-outline" size={11} color={colors.textMuted} />
                      ) : null}
                      <Text style={styles.subCardEquipment} numberOfLines={1}>
                        {sub.equipment || subPrimary || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {coachingCue && (
          <View style={styles.section}>
            <View style={styles.cueCard}>
              <Ionicons name="bulb-outline" size={16} color={colors.primary} />
              <Text style={styles.cueText}>{coachingCue}</Text>
            </View>
          </View>
        )}

        {(formTip || exercise.notes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to do it</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{formTip ?? exercise.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Goal-setting bottom sheet */}
      <Modal
        visible={goalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setGoalModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{goal ? 'Edit target' : 'Set a target weight'}</Text>
            <Text style={styles.modalSubtitle}>
              Based on your estimated 1RM. Progress will be shown each time you open this exercise.
            </Text>

            <Text style={styles.inputLabel}>Target weight ({units})</Text>
            <TextInput
              style={styles.weightInput}
              value={goalWeightInput}
              onChangeText={setGoalWeightInput}
              keyboardType="decimal-pad"
              placeholder={`e.g. 100`}
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />

            <Text style={styles.inputLabel}>Target date (optional)</Text>
            <TextInput
              style={styles.dateInput}
              value={goalDateInput}
              onChangeText={setGoalDateInput}
              placeholder="e.g. Dec 2025"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[styles.saveGoalBtn, goalSaving && { opacity: 0.6 }]}
              onPress={handleSaveGoal}
              disabled={goalSaving || !goalWeightInput}
              activeOpacity={0.8}
            >
              <Text style={styles.saveGoalBtnText}>Save goal</Text>
            </TouchableOpacity>

            {goal && (
              <TouchableOpacity style={styles.removeGoalLink} onPress={handleRemoveGoal} activeOpacity={0.7}>
                <Text style={styles.removeGoalLinkText}>Remove goal</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  tagText: { ...type.label, color: colors.primary },
  tagSecondary: { backgroundColor: colors.surface2 },
  tagTextSecondary: { color: colors.textSecondary },
  secMuscles: { flexDirection: 'row', alignItems: 'center' },
  secMuscleLabel: { ...type.label, color: colors.textMuted },
  secMuscleText: { fontSize: fontSize.sm, color: colors.textSecondary },
  est1RM: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold + '15',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  est1RMText: { ...type.bodyStrong, color: colors.gold },
  sfrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sfrItem: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  sfrValue: { ...type.num('title'), color: colors.textPrimary },
  sfrLabel: { ...type.caption, color: colors.textMuted },
  sfrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  sfrDivider: { width: 1, height: 36, backgroundColor: colors.border },
  chartSection: { gap: spacing.sm },
  chartLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  chartToggle: { flexDirection: 'row', gap: spacing.xs, alignSelf: 'flex-start' },
  chartToggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartToggleBtnActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chartToggleBtnText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chartToggleBtnTextActive: { color: colors.primary },
  e1rmNote: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs, fontStyle: 'italic' },
  chartContainer: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  historyEmptyText: {
    flex: 1, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 19,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    ...type.label,
    color: colors.textSecondary,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  historyDate: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
  historySets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  historySetText: { fontSize: fontSize.sm, color: colors.textSecondary },
  historyEst: { ...type.num('caption'), color: colors.textMuted },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // eslint-disable-next-line no-restricted-syntax -- PR medal glyph, intentional large size
  prIcon: { fontSize: 22 },
  prInfo: { flex: 1 },
  prLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  prValue: { ...type.num('bodyStrong'), color: colors.textPrimary },
  prDate: { ...type.num('caption'), color: colors.textMuted },
  // Similar exercises, horizontal scroll cards
  subScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  subCard: {
    width: 140,
    height: 72,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  subCardName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  subCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subCardEquipment: {
    ...type.caption,
    color: colors.textMuted,
    flex: 1,
  },
  // PR highlight card
  prHighlightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    gap: spacing.sm,
  },
  prHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prHighlightTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  prHighlightRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  prHighlightStat: {
    flex: 1,
    gap: spacing.xxs,
  },
  prHighlightStatBordered: {
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  prHighlightStatValue: {
    ...type.num('title'),
    color: colors.primary,
  },
  prHighlightStatLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  prHighlightDate: {
    ...type.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  cueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  cueText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  plateauBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  plateauTitle: {
    ...type.label,
    color: colors.warning,
    marginBottom: spacing.xxs,
  },
  plateauBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  // Goal section
  goalSetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  goalSetLinkText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  goalCardTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalWeightItem: {
    flex: 1,
    gap: spacing.xxs,
  },
  goalWeightValue: {
    ...type.num('title'),
    color: colors.textPrimary,
  },
  goalWeightLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  goalBarTrack: {
    height: 6,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  goalBarCaption: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  // Congrats banner
  congratsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  congratsText: {
    ...type.label,
    flex: 1,
    color: colors.primary,
  },
  // Goal modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
  inputLabel: {
    ...type.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  weightInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  dateInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  saveGoalBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveGoalBtnText: {
    ...type.bodyStrong,
    color: colors.background,
  },
  removeGoalLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  removeGoalLinkText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
