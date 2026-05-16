import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';

export default function RestTimer() {
  const { restTimerActive, restTimerRemaining, restTimerDuration, stopRestTimer, tickRestTimer } =
    useAppStore();
  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (restTimerActive) {
      setShowDone(false);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: restTimerDuration * 1000,
        useNativeDriver: false,
      }).start();

      intervalRef.current = setInterval(() => {
        tickRestTimer();
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      progressAnim.stopAnimation();
      progressAnim.setValue(1);
    }
    return () => clearInterval(intervalRef.current);
  }, [restTimerActive]);

  // Haptics at 3, 2, 1 seconds and "done" banner at 0
  useEffect(() => {
    if (!restTimerActive) return;
    if (restTimerRemaining <= 3 && restTimerRemaining > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    if (restTimerRemaining === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
      setShowDone(true);
      setTimeout(() => setShowDone(false), 3000);
    }
  }, [restTimerRemaining]);

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
      <View style={styles.row}>
        <Ionicons name="timer-outline" size={18} color={isAlmostDone ? colors.warning : colors.primary} />
        {isCountdown ? (
          <Text style={styles.countdownNum}>{restTimerRemaining}</Text>
        ) : (
          <Text style={[styles.timeText, isAlmostDone && styles.almostDone]}>{timeStr}</Text>
        )}
        <Text style={styles.label}>{isCountdown ? 'seconds' : 'rest'}</Text>
        <TouchableOpacity onPress={stopRestTimer} style={styles.skipBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
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
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
  },
  almostDone: {
    color: colors.warning,
  },
  countdownNum: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.warning,
    minWidth: 52,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
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
