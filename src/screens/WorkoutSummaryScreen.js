import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import {
  getCompletedWorkoutSets, getAllExercises, getAllWorkouts, updateWorkout,
  getActivePlan, getRoutinesForPlan, advancePlanNextWorkout,
  createAdaptationEvent, getCurrentMesocycleWeek,
  getNextMesocycleWeek, upsertPlannedMuscleVolume, getRecentAdaptationEvents,
} from '../lib/database';
import { calculateWeeklyVolume, getVolumeStatus, getAutoRegSuggestion, MUSCLE_DISPLAY_NAMES, runAdaptiveEngine, computeAdaptiveDecision, VOLUME_LANDMARKS, evaluateDeloadTriggers } from '../lib/algorithms';
import { evaluateAutoReg, predictDeloadWeek, getMesoSchedule } from '../lib/mesocycle';
import { getDeloadPredictionMessage, getAutoRegMessage } from '../lib/whyThisTemplates';
import useAppStore from '../store/useAppStore';

const RATING_LABELS = {
  sessionDifficulty: ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal'],
  overallPump: ['', 'None', 'Mild', 'Good'],
  soreness24hBefore: ['', 'Fresh', 'Mild', 'Sore'],
  fatigueLevel: ['', 'Fresh', 'Mild', 'Moderate', 'High', 'Exhausted'],
  jointDiscomfort: ['None', 'Slight', 'Moderate', 'Significant'],
};

function RatingRow({ label, field, value, max, onChange }) {
  const labels = RATING_LABELS[field];
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingLabelRow}>
        <Text style={styles.ratingLabel}>{label}</Text>
        {labels?.[value] ? <Text style={styles.ratingValueLabel}>{labels[value]}</Text> : null}
      </View>
      <View style={styles.ratingBtns}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.ratingBtn, value === i && styles.ratingBtnActive]}
            onPress={() => onChange(i)}
          >
            <Text style={[styles.ratingBtnText, value === i && styles.ratingBtnTextActive]}>
              {i}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function WorkoutSummaryScreen({ navigation, route }) {
  const {
    workoutId, durationMinutes, exerciseCount, setCount, workingSetCount, tonnage,
    exerciseNames = [], readOnly = false,
    routineId = null, detectedPRs = [], exerciseData = [],
  } = route.params || {};
  const { user, units } = useAppStore();
  const insets = useSafeAreaInsets();

  const [feedback, setFeedback] = useState({
    sessionDifficulty: 3,
    overallPump: 2,
    soreness24hBefore: 1,
    fatigueLevel: 2,
    jointDiscomfort: 0,
  });
  const [notes, setNotes] = useState('');
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [autoRegSuggestions, setAutoRegSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(null);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [mesoAdvice, setMesoAdvice] = useState(null);
  const [deloadPrediction, setDeloadPrediction] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [adaptiveDecisions, setAdaptiveDecisions] = useState({});
  const [deloadRecommendation, setDeloadRecommendation] = useState(null);

  const feedbackDebounceRef = useRef(null);

  useEffect(() => {
    if (!readOnly && routineId && user?.id) {
      (async () => {
        try {
          const activePlan = await getActivePlan(user.id);
          if (activePlan) {
            const planRoutines = await getRoutinesForPlan(activePlan.id);
            if (planRoutines.some(r => r.id === routineId)) {
              await advancePlanNextWorkout(activePlan.id, planRoutines.length);
            }
          }
        } catch (_e) {}
      })();
    }
  }, []);

  useEffect(() => {
    loadVolumeAndHistory();
  }, []);

  useEffect(() => {
    const suggestions = getAutoRegSuggestion(feedback, weeklyVolume);
    setAutoRegSuggestions(suggestions);

    // Mesocycle autoregulation (Phase 4 engine)
    const window = [...feedbackHistory, feedback];
    const autoReg = evaluateAutoReg(window);
    const experience = user?.profile?.experience ?? 'intermediate';
    const mesoWeek = user?.profile?.currentMesoWeek ?? 1;
    const schedule = getMesoSchedule(experience);
    const currentEntry = schedule.find(s => s.week === mesoWeek) ?? schedule[0];

    setMesoAdvice({
      action: autoReg.action,
      message: getAutoRegMessage(autoReg.action, mesoWeek),
      setsAdjust: autoReg.setsAdjust,
      weekLabel: currentEntry.label,
    });

    const deload = predictDeloadWeek(window, mesoWeek, experience);
    setDeloadPrediction({
      weeksUntilDeload: deload.weeksUntilDeload,
      message: getDeloadPredictionMessage(deload.weeksUntilDeload, deload.reason),
    });

    // Map feedback to adaptive engine scales per muscle, then run adaptive engine
    // soreness24hBefore: 1=fresh→2, 2=mild→3, 3=sore→4
    // sessionDifficulty: 1=veryEasy→1(exceeded), 2=easy→1, 3=moderate→2(met), 4=hard→3(struggled), 5=brutal→4(failed)
    // overallPump: 1=none→1, 2=mild→2, 3=good→4
    // jointDiscomfort: 0=none→0, 1=slight→1, 2=moderate→2, 3=significant→3
    const soreness = [0, 2, 3, 4][feedback.soreness24hBefore - 1] ?? 2;
    const performance = [0, 1, 1, 2, 3, 4][feedback.sessionDifficulty] ?? 2;
    const pump = [1, 1, 2, 4][feedback.overallPump - 1] ?? 3;
    const joint = feedback.jointDiscomfort ?? 0;

    // Build per-muscle feedback using the weekly volume
    const muscleFeedback = {};
    for (const [muscle, volData] of Object.entries(weeklyVolume)) {
      const { mev = 6, mav = 14, mrv = 22 } = (typeof getVolumeStatus === 'function'
        ? (getVolumeStatus(volData.workingSets, muscle)?.landmarks || {})
        : {});
      muscleFeedback[muscle] = {
        soreness,
        performance,
        pump,
        joint,
        currentSets: volData.workingSets,
        mev,
        mav,
        mrv,
      };
    }
    const decisions = runAdaptiveEngine(muscleFeedback);
    setAdaptiveDecisions(decisions);
  }, [feedback, weeklyVolume, feedbackHistory]);

  useEffect(() => {
    if (!workoutId || readOnly) return;
    if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    feedbackDebounceRef.current = setTimeout(async () => {
      try {
        await updateWorkout(workoutId, {
          sessionDifficulty: feedback.sessionDifficulty,
          overallPump: feedback.overallPump,
          soreness24hBefore: feedback.soreness24hBefore,
          jointDiscomfort: feedback.jointDiscomfort,
          fatigueLevel: feedback.fatigueLevel,
          notes: notes || null,
        });
      } catch (_e) {}
    }, 1000);
    return () => {
      if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    };
  }, [feedback, notes]);

  async function loadVolumeAndHistory() {
    if (!user?.id) return;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const [allSets, allExercises, allWorkouts] = await Promise.all([
      getCompletedWorkoutSets(user.id),
      getAllExercises(),
      getAllWorkouts(user.id),
    ]);
    const recentSets = allSets.filter(s => s.createdAt >= weekAgo);
    const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
    const volume = calculateWeeklyVolume(recentSets, exerciseMap);
    setWeeklyVolume(volume);

    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const completed = allWorkouts.filter(w => w.isCompleted && w.startedAt >= fourWeeksAgo);
    setCompletedWorkoutCount(completed.length);

    // Build feedback history from last 4 completed workouts for meso autoReg
    const sorted = completed
      .filter(w => w.sessionDifficulty != null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4)
      .reverse();
    setFeedbackHistory(sorted.map(w => ({
      sessionDifficulty: w.sessionDifficulty ?? 3,
      overallPump:       w.overallPump ?? 2,
      soreness24hBefore: w.soreness24hBefore ?? 1,
      fatigueLevel:      w.fatigueLevel ?? 2,
      jointDiscomfort:   w.jointDiscomfort ?? 0,
    })));

    const events = await getRecentAdaptationEvents(user?.id || '', 1);
    const deloadEval = evaluateDeloadTriggers(events);
    if (deloadEval.reason) setDeloadRecommendation(deloadEval);
  }

  async function handleDone() {
    if (readOnly) {
      navigation.goBack();
      return;
    }
    if (!workoutId) { navigation.popToTop(); return; }
    setSaving(true);
    if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    try {
      await updateWorkout(workoutId, {
        sessionDifficulty: feedback.sessionDifficulty,
        overallPump: feedback.overallPump,
        soreness24hBefore: feedback.soreness24hBefore,
        jointDiscomfort: feedback.jointDiscomfort,
        fatigueLevel: feedback.fatigueLevel,
        notes: notes || null,
      });
    } catch (_e) {}

    // Write adaptation events for engine decisions
    try {
      const currentWeek = await getCurrentMesocycleWeek(user?.id);
      if (currentWeek?.id && Object.keys(adaptiveDecisions).length > 0) {
        for (const [muscle, dec] of Object.entries(adaptiveDecisions)) {
          await createAdaptationEvent({
            mesocycleWeekId: currentWeek.id,
            muscle,
            decision: dec.decision,
            delta: dec.delta,
            reasonCode: dec.reasonCode,
            reasonText: dec.reasonText,
            signals: {
              soreness: dec.soreness ?? null,
              performance: dec.performance ?? null,
              pump: dec.pump ?? null,
              joint: dec.joint ?? null,
              currentSets: dec.currentSets,
              nextWeekSets: dec.nextWeekSets,
            },
          });
        }

        // Write next-week planned volume from engine decisions
        const nextWeek = await getNextMesocycleWeek(currentWeek.id);
        if (nextWeek) {
          for (const [muscle, dec] of Object.entries(adaptiveDecisions)) {
            const base = VOLUME_LANDMARKS[muscle] || { mev: 6, mav: 14, mrv: 22 };
            await upsertPlannedMuscleVolume({
              mesocycleWeekId: nextWeek.id,
              muscle,
              plannedSets: dec.nextWeekSets,
              mev: base.mev,
              mav: base.mav,
              mrv: base.mrv,
              source: 'engine',
            });
          }
        }
      }
    } catch (_e) {}

    setSaving(false);
    navigation.popToTop();
  }

  function handleShareCard() {
    const sessionData = {
      sessionName: exerciseNames.length > 0
        ? exerciseNames.slice(0, 2).join(' & ') + (exerciseNames.length > 2 ? ' +more' : '')
        : 'Session Complete',
      duration: durationMinutes || 0,
      workingSets: workingSetCount ?? setCount ?? 0,
      exerciseCount: exerciseCount || 0,
      tonnage: tonnage || 0,
      exercises: exerciseNames,
      prCount: detectedPRs.length,
    };
    const prData = detectedPRs.length > 0 ? detectedPRs[0] : null;
    navigation.navigate('ShareCard', { sessionData, prData });
  }

  async function handleSaveAsTemplate() {
    if (!exerciseData.length) {
      Alert.alert('No exercises', 'No exercise data available to save as template.');
      return;
    }
    Alert.prompt(
      'Save as Workout Template',
      'Name this template:',
      async (name) => {
        if (!name?.trim()) return;
        const { createWorkoutTemplateFromWorkout } = require('../lib/database');
        await createWorkoutTemplateFromWorkout(user.id, name.trim(), exerciseData);
        Alert.alert('Template Saved', `"${name.trim()}" added to Workout Templates in Plans.`);
      },
      'plain-text',
      exerciseNames.slice(0, 2).join(' & ') || 'My Workout',
    );
  }

  const musclesWorked = Object.keys(weeklyVolume)
    .filter(m => weeklyVolume[m]?.workingSets > 0)
    .sort((a, b) => (weeklyVolume[b]?.workingSets || 0) - (weeklyVolume[a]?.workingSets || 0))
    .slice(0, 6);

  const displayWorkingSets = workingSetCount ?? setCount ?? 0;
  const dataLimited = completedWorkoutCount !== null && completedWorkoutCount < 4;

  const completionDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const sessionLabel = exerciseNames.length > 0
    ? exerciseNames.slice(0, 3).join(' · ') + (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3} more` : '')
    : null;

  const prExerciseNames = detectedPRs
    .slice(0, 3)
    .map(pr => pr.exerciseName || pr.exercise || '')
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.completionHeader}>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={styles.completionTitle}>Session Complete</Text>
          </View>
          <Text style={styles.completionDate}>{completionDate}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox icon="barbell-outline" value={String(exerciseCount || 0)} label="Exercises" />
          <StatBox
            icon="layers-outline"
            value={String(displayWorkingSets)}
            label="Working Sets"
            tooltip={'Hard sets that count towards your training volume. Warm-up sets are excluded.\n\nA working set is any set where you trained close to your limit — typically 0–3 reps from failure.'}
          />
          <StatBox icon="time-outline" value={`${durationMinutes || 0}m`} label="Duration" />
          <StatBox
            icon="trending-up-outline"
            value={`${Math.round(tonnage || 0).toLocaleString('en-GB')} kg`}
            label="Total kg"
            tooltip={'Total load lifted this session — sets × reps × weight added together.\n\nAlso called tonnage. A useful measure of total session workload. Higher isn\'t always better; quality of effort matters more.'}
          />
        </View>

        {exerciseData.length > 0 && (
          <View style={styles.exerciseList}>
            {exerciseData.map((ex, i) => (
              <View key={ex.exerciseId || i} style={styles.exerciseListRow}>
                <Text style={styles.exerciseListName} numberOfLines={1}>{ex.name}</Text>
                <Text style={styles.exerciseListMeta}>
                  {ex.recommendedSets} × {ex.repsMin}–{ex.repsMax}
                </Text>
              </View>
            ))}
          </View>
        )}

        {detectedPRs.length > 0 && (
          <View style={styles.prRow}>
            <Ionicons name="trophy-outline" size={18} color={colors.warning} />
            <Text style={styles.prRowText}>
              {detectedPRs.length} new PR{detectedPRs.length !== 1 ? 's' : ''}
              {prExerciseNames ? ` · ${prExerciseNames}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {musclesWorked.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionTitle}>THIS WEEK AFTER SESSION</Text>
              <InfoTooltip size={11} text={
                'How much you\'ve trained each muscle group this week.\n\n' +
                'Green = Optimal range — you\'re getting growth stimulus without overdoing it\n' +
                'Yellow = Near your ceiling — one more session and you may exceed it\n' +
                'Red = Over ceiling — consider reducing volume next week\n' +
                'Grey = Below minimum — not enough to stimulate growth yet\n\n' +
                'These targets are personalised and adjust over time based on how your body responds.'
              } />
            </View>
            {musclesWorked.map(muscle => {
              const data = weeklyVolume[muscle];
              const { color, label } = getVolumeStatus(data.workingSets, muscle);
              return (
                <View key={muscle} style={styles.volumeRow}>
                  <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle] || muscle}</Text>
                  <Text style={styles.muscleSetCount}>{Math.round(data.workingSets)} working sets</Text>
                  <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.statusText, { color }]}>{label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECOMMENDATIONS</Text>
          {dataLimited ? (
            <View style={styles.limitedCard}>
              <Text style={styles.limitedText}>
                Learning your patterns. Complete more sessions before recommendations become reliable.
              </Text>
            </View>
          ) : (
            autoRegSuggestions.map((s, i) => (
              <View key={i} style={styles.suggestionRow}>
                <Ionicons
                  name={s.type === 'reduce_volume' ? 'arrow-down' :
                        s.type === 'add_volume' ? 'arrow-up' :
                        s.type === 'deload_muscle' ? 'warning-outline' : 'checkmark-circle-outline'}
                  size={16}
                  color={s.type === 'deload_muscle' ? colors.error :
                         s.type === 'maintain' ? colors.success : colors.primary}
                />
                <Text style={styles.suggestionText}>{s.message}</Text>
              </View>
            ))
          )}

          {/* Phase 4: Mesocycle autoregulation advice */}
          {mesoAdvice && mesoAdvice.action !== 'continue' && (
            <View style={[styles.mesoAdviceCard, mesoAdvice.action === 'deload_now' && styles.mesoAdviceCardUrgent]}>
              <View style={styles.mesoAdviceHeader}>
                <Ionicons
                  name={mesoAdvice.action === 'deload_now' ? 'warning-outline' :
                        mesoAdvice.action === 'reduce_volume' ? 'trending-down-outline' : 'pause-circle-outline'}
                  size={16}
                  color={mesoAdvice.action === 'deload_now' ? colors.error : colors.warning}
                />
                <Text style={[styles.mesoAdviceTitle, mesoAdvice.action === 'deload_now' && { color: colors.error }]}>
                  Training Load Check
                </Text>
              </View>
              <Text style={styles.mesoAdviceText}>{mesoAdvice.message}</Text>
            </View>
          )}

          {/* Phase 6: Deload prediction display */}
          {deloadPrediction && deloadPrediction.weeksUntilDeload != null && deloadPrediction.weeksUntilDeload <= 2 && (
            <View style={styles.deloadPredictionCard}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.deloadPredictionText}>{deloadPrediction.message}</Text>
            </View>
          )}
        </View>

          {/* Adaptive engine decisions */}
          {Object.keys(adaptiveDecisions).length > 0 && (
            <View style={styles.adaptiveCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={styles.adaptiveTitle}>ENGINE DECISIONS — NEXT WEEK</Text>
                <InfoTooltip size={11} text={
                  'Volyume\'s training engine analysed your session feedback and adjusted next week\'s plan.\n\n' +
                  '↑ Add set — you recovered well and can handle more volume\n' +
                  '↓ Drop set — signs of fatigue; reducing load will help you recover\n' +
                  '⚠ Deload — recovery signals are low across the board; a lighter week is recommended\n' +
                  '→ Hold — volume looks right, continue as planned\n\n' +
                  'These suggestions are written into your next planned week automatically.'
                } />
              </View>
              {Object.entries(adaptiveDecisions)
                .filter(([, d]) => d.decision !== 'hold' || d.delta !== 0)
                .map(([muscle, d]) => (
                  <View key={muscle} style={styles.adaptiveRow}>
                    <Ionicons
                      name={
                        d.decision === 'add_set' ? 'trending-up' :
                        d.decision === 'drop_set' ? 'trending-down' :
                        d.decision === 'deload_trigger' ? 'warning-outline' :
                        d.decision === 'rotate_exercise' ? 'swap-horizontal' :
                        'remove-outline'
                      }
                      size={14}
                      color={
                        d.decision === 'add_set' ? colors.primary :
                        d.decision === 'drop_set' || d.decision === 'deload_trigger' ? colors.error :
                        colors.textMuted
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adaptiveMuscle}>
                        {(MUSCLE_DISPLAY_NAMES[muscle] || muscle)}{' '}
                        <Text style={styles.adaptiveSetCount}>
                          {d.nextWeekSets} sets
                          {d.delta > 0 ? ` (+${d.delta})` : d.delta < 0 ? ` (${d.delta})` : ''}
                        </Text>
                      </Text>
                      <Text style={styles.adaptiveReason}>{d.reasonText}</Text>
                    </View>
                  </View>
                ))}
              {Object.values(adaptiveDecisions).every(d => d.decision === 'hold' && d.delta === 0) && (
                <Text style={styles.adaptiveHold}>All muscles on track — continue as planned.</Text>
              )}
            </View>
          )}

          {/* Deload recommendation */}
          {deloadRecommendation?.shouldDeload && (
            <View style={styles.deloadCard}>
              <View style={styles.deloadCardHeader}>
                <Ionicons name="battery-charging-outline" size={18} color={colors.warning} />
                <Text style={styles.deloadCardTitle}>DELOAD RECOMMENDED</Text>
              </View>
              <Text style={styles.deloadCardBody}>{deloadRecommendation.reason}</Text>
              <Text style={styles.deloadCardNote}>
                Next week will auto-generate deload loads (week 1 weight × 50% reps). You can skip at any time.
              </Text>
            </View>
          )}
          {deloadRecommendation && !deloadRecommendation.shouldDeload && deloadRecommendation.reason && (
            <View style={[styles.deloadCard, styles.deloadCardWarning]}>
              <Text style={styles.deloadCardBody}>{deloadRecommendation.reason}</Text>
            </View>
          )}

        {!readOnly && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>SESSION FEEDBACK</Text>
              <Text style={styles.optionalLabel}>optional</Text>
            </View>
            <TouchableOpacity
              style={styles.feedbackToggleBtn}
              onPress={() => setFeedbackExpanded(e => !e)}
              activeOpacity={0.7}
            >
              <Text style={styles.feedbackToggleBtnText}>
                {feedbackExpanded ? 'Hide session feedback' : 'Add session feedback'}
              </Text>
              <Ionicons
                name={feedbackExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {feedbackExpanded && (
              <View style={styles.feedbackCard}>
                <RatingRow label="Difficulty" field="sessionDifficulty" value={feedback.sessionDifficulty} max={5} onChange={v => setFeedback(f => ({ ...f, sessionDifficulty: v }))} />
                <RatingRow label="Pump quality" field="overallPump" value={feedback.overallPump} max={3} onChange={v => setFeedback(f => ({ ...f, overallPump: v }))} />
                <RatingRow label="Soreness coming in" field="soreness24hBefore" value={feedback.soreness24hBefore} max={3} onChange={v => setFeedback(f => ({ ...f, soreness24hBefore: v }))} />
                <RatingRow label="Fatigue" field="fatigueLevel" value={feedback.fatigueLevel} max={5} onChange={v => setFeedback(f => ({ ...f, fatigueLevel: v }))} />
                <RatingRow label="Joint discomfort" field="jointDiscomfort" value={feedback.jointDiscomfort} max={3} onChange={v => setFeedback(f => ({ ...f, jointDiscomfort: v }))} />
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything notable from this session..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            )}
          </View>
        )}

        {!readOnly && !routineId && exerciseData.length > 0 && (
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.templateBtn} onPress={handleSaveAsTemplate}>
              <Ionicons name="bookmark-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.templateBtnText}>Save as Workout Template</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.doneBtn, saving && styles.btnDisabled]}
            onPress={handleDone}
            disabled={saving}
          >
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity style={styles.shareFooterBtn} onPress={handleShareCard}>
              <Ionicons name="share-social-outline" size={20} color={colors.background} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatBox({ icon, value, label, tooltip }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={styles.statLabel}>{label}</Text>
        {tooltip ? <InfoTooltip size={10} text={tooltip} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  completionHeader: { gap: spacing.xs, paddingVertical: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  completionTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  completionDate: { fontSize: fontSize.sm, color: colors.textMuted },
  completionSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statBox: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  prRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.warningBg, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.warning + '40',
  },
  prRowText: { flex: 1, fontSize: fontSize.sm, color: colors.warning, fontWeight: fontWeight.semibold },
  divider: { height: 1, backgroundColor: colors.border },
  section: { gap: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5 },
  optionalLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  volumeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  muscleName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  muscleSetCount: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  limitedCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  limitedText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  suggestionText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  mesoAdviceCard: {
    flexDirection: 'column', gap: spacing.xs,
    backgroundColor: colors.warningBg ?? colors.surface,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.warning + '55',
    marginTop: spacing.sm,
  },
  mesoAdviceCardUrgent: {
    backgroundColor: colors.errorBg ?? colors.surface,
    borderColor: colors.error + '55',
  },
  mesoAdviceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mesoAdviceTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.warning, letterSpacing: 0.5 },
  mesoAdviceText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  deloadPredictionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.xs, paddingHorizontal: spacing.xs,
  },
  deloadPredictionText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  feedbackToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  feedbackToggleBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  feedbackCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  ratingRow: { gap: spacing.sm },
  ratingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  ratingBtns: { flexDirection: 'row', gap: spacing.xs },
  ratingBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  ratingBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  ratingBtnTextActive: { color: colors.background },
  ratingValueLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  notesInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    fontSize: fontSize.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 80,
  },
  secondaryActions: { gap: spacing.sm },
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  templateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  doneBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  shareFooterBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adaptiveCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  adaptiveTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  adaptiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  adaptiveMuscle: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  adaptiveSetCount: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  adaptiveReason: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  adaptiveHold: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  exerciseList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  exerciseListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseListName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginRight: spacing.md,
  },
  exerciseListMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  deloadCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.warning,
    padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg,
  },
  deloadCardWarning: { borderColor: colors.border },
  deloadCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deloadCardTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.warning, letterSpacing: 0.5 },
  deloadCardBody: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  deloadCardNote: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
});
