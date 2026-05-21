import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { scheduleRestNotif, cancelRestNotif } from '../lib/restNotifications';

const TIME_ADJUSTMENTS = [
  { delta: -30, label: '−30s' },
  { delta: -15, label: '−15s' },
  { delta: 15,  label: '+15s' },
  { delta: 30,  label: '+30s' },
];

export default function RestTimer() {
  // Subscribe to only the fields this component needs; using
  // `useAppStore()` without a selector re-renders this on every store
  // mutation (PR celebrations, set saves, profile updates, etc.) which
  // ran through every second of every workout.
  const {
    restTimerActive, restTimerRemaining, restTimerDuration,
    stopRestTimer, tickRestTimer, addRestTime,
    workoutExercises, currentExerciseIndex,
  } = useAppStore(useShallow(s => ({
    restTimerActive: s.restTimerActive,
    restTimerRemaining: s.restTimerRemaining,
    restTimerDuration: s.restTimerDuration,
    stopRestTimer: s.stopRestTimer,
    tickRestTimer: s.tickRestTimer,
    addRestTime: s.addRestTime,
    workoutExercises: s.workoutExercises,
    currentExerciseIndex: s.currentExerciseIndex,
  })));

  // Derive the current exercise name so the lock-screen notification is specific
  const currentExerciseName =
    workoutExercises[currentExerciseIndex]?.exercise?.name || '';
  const intervalRef = useRef(null);
  const notifIdRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [showDone, setShowDone] = useState(false);
  // Track all queued timeouts so we can cancel them on unmount (was
  // leaking three uncancelled setTimeouts per cycle — haptics + done-flag).
  const timeoutsRef = useRef([]);

  useEffect(() => {
    if (restTimerActive) {
      setShowDone(false);
      progressAnim.stopAnimation();
      // Use restTimerRemaining so bar stays in sync if user adjusts time or resumes mid-timer
      const remaining = restTimerRemaining > 0 ? restTimerRemaining : restTimerDuration;
      const startValue = restTimerDuration > 0 ? remaining / restTimerDuration : 1;
      progressAnim.setValue(startValue);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: remaining * 1000,
        useNativeDriver: false,
      }).start();
      intervalRef.current = setInterval(() => { tickRestTimer(); }, 1000);
      // Post lock-screen notification and schedule the done alert
      scheduleRestNotif(remaining, currentExerciseName).then(id => {
        notifIdRef.current = id;
      }).catch(() => {});
    } else {
      clearInterval(intervalRef.current);
      progressAnim.stopAnimation();
      progressAnim.setValue(1);
      // Cancel the ongoing lock-screen notification and any pending done alert
      cancelRestNotif(notifIdRef.current);
      notifIdRef.current = null;
    }
    return () => clearInterval(intervalRef.current);
  }, [restTimerActive]);

  // Reanimate the progress bar when the user adjusts the timer with ±15s /
  // ±30s. Previously the bar finished early or hit 0 with the numeric timer
  // still counting because this branch never re-ran the Animated.timing.
  useEffect(() => {
    if (!restTimerActive || restTimerDuration <= 0 || restTimerRemaining <= 0) return;
    progressAnim.stopAnimation();
    progressAnim.setValue(restTimerRemaining / restTimerDuration);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: restTimerRemaining * 1000,
      useNativeDriver: false,
    }).start();
    // We rebind on every restTimerRemaining change which is once per
    // second; the stopAnimation + setValue + start is cheap. The previous
    // useEffect on [restTimerActive] only fired once when the timer
    // started, leaving the animation disconnected from the live remaining.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimerRemaining, restTimerDuration]);

  useEffect(() => {
    if (!restTimerActive) return;
    if (restTimerRemaining <= 3 && restTimerRemaining > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    if (restTimerRemaining === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      const t1 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
      const t2 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 400);
      setShowDone(true);
      const t3 = setTimeout(() => setShowDone(false), 3000);
      timeoutsRef.current.push(t1, t2, t3);
    }
  }, [restTimerRemaining]);

  // Component-wide cleanup — drains any pending timeouts so they don't fire
  // on an unmounted component (workout ended, user signed out, etc.).
  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  function handleAdjust(delta) {
    Haptics.selectionAsync();
    // Clamp so we never drop below 5 seconds
    const safeAmount = delta < 0 ? Math.max(delta, -(restTimerRemaining - 5)) : delta;
    if (safeAmount !== 0) addRestTime(safeAmount);
  }

  const isCountdown = restTimerActive && restTimerRemaining <= 3 && restTimerRemaining > 0;
  const isAlmostDone = restTimerRemaining <= 10 && restTimerActive;

  if (!restTimerActive && restTimerRemaining === 0 && !showDone) return null;

  const mins = Math.floor(restTimerRemaining / 60);
  const secs = restTimerRemaining % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (showDone && !restTimerActive) {
    return (
      <View style={styles.doneContainer}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.doneText}>Start next set</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: barWidth, backgroundColor: isAlmostDone ? colors.warning : colors.primary },
          ]}
        />
      </View>

      {/* Timer row */}
      <View style={styles.row}>
        <Ionicons name="timer-outline" size={18} color={isAlmostDone ? colors.warning : colors.primary} />
        {isCountdown ? (
          <Text style={styles.countdownNum}>{restTimerRemaining}</Text>
        ) : (
          <Text style={[styles.timeText, isAlmostDone && styles.almostDone]}>{timeStr}</Text>
        )}
        <Text style={styles.label}>{isCountdown ? 'seconds' : 'rest'}</Text>
        <TouchableOpacity
          onPress={stopRestTimer}
          style={styles.skipBtn}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Time adjustment row */}
      <View style={styles.adjustRow}>
        {TIME_ADJUSTMENTS.map(({ delta, label }) => {
          const isNeg = delta < 0;
          return (
            <TouchableOpacity
              key={delta}
              style={[styles.adjBtn, isNeg && styles.adjBtnNeg]}
              onPress={() => handleAdjust(delta)}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              <Text style={[styles.adjBtnText, isNeg && styles.adjBtnTextNeg]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  progressBar: { height: 3, backgroundColor: colors.border },
  progressFill: { height: '100%', borderRadius: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
  },
  almostDone: { color: colors.warning },
  countdownNum: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.warning,
    minWidth: 52,
    textAlign: 'center',
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  adjBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '50',
    backgroundColor: colors.primaryBg,
  },
  adjBtnNeg: {
    borderColor: colors.border,
    backgroundColor: colors.surface3,
  },
  adjBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  adjBtnTextNeg: { color: colors.textSecondary },
  doneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginVertical: spacing.sm,
  },
  doneText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
});
