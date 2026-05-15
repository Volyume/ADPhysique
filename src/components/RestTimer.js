import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (restTimerActive) {
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

  useEffect(() => {
    if (restTimerActive && restTimerRemaining === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
    }
  }, [restTimerRemaining]);

  if (!restTimerActive && restTimerRemaining === 0) return null;

  const mins = Math.floor(restTimerRemaining / 60);
  const secs = restTimerRemaining % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const isAlmostDone = restTimerRemaining <= 10 && restTimerActive;

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
        <Text style={[styles.timeText, isAlmostDone && styles.almostDone]}>{timeStr}</Text>
        <Text style={styles.label}>rest</Text>
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
});
