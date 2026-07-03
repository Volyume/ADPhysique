/**
 * ActiveSessionMiniBar, the E15 flagship (greenlit 2026-07-02; design in
 * audit/e15-signature-elements.md §1).
 *
 * A docked bar pinned directly above the tab bar on every tab while a
 * workout is live, so leaving ActiveWorkout never loses the session from
 * view. It is a REMOTE DISPLAY of the session store: it owns no session
 * state, writes nothing, and rides the crash-restore machinery by
 * construction (it renders whatever restoreActiveWorkout rebuilt). Tapping
 * anywhere returns to ActiveWorkout, where the draft/interruption machinery
 * owns logging.
 *
 * Performance contract (the §1 Android-honest note): this renders on every
 * frame of every screen mid-session, so the per-second rest tick is
 * isolated in the self-subscribing MiniBarStatus child (the HeaderRestChip
 * pattern), only that slot re-renders per tick, never the bar or the app
 * shell. The live-dot pulse is a single UI-thread opacity loop.
 *
 * Reduce Motion: appears/disappears instantly, the dot is static, the
 * countdown still ticks (a countdown is information, not decoration).
 * Calm/ED: exercise name + timer only, nothing celebratory, no
 * weight/food-adjacent number, so no suppression applies.
 */
import { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import PressableCard from './PressableCard';
import { colors, spacing, fontSize, fontWeight, circle, shadow, motion, type } from '../styles/theme';

const BAR_HEIGHT = 44;

// Self-subscribing status slot: rest countdown while resting, set progress
// otherwise, never a timer at 00:00, and never "Set 3 of 2" (past the
// recommended count it reads plain sets-done; that numbering confusion is
// the class the founder retired on the Android notification).
function MiniBarStatus() {
  const { restActive, remaining, setsDone, recommended } = useAppStore(useShallow((s) => {
    const ex = s.workoutExercises?.[s.currentExerciseIndex];
    return {
      restActive: s.restTimerActive,
      remaining: s.restTimerRemaining,
      setsDone: ex?.sets?.length ?? 0,
      recommended: ex?.routineExercise?.recommendedSets ?? null,
    };
  }));
  if (restActive && remaining > 0) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return (
      <Animated.View
        style={styles.statusWrap}
        accessibilityLabel={`Rest, ${mins} minute${mins === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'} remaining`}
      >
        <Ionicons name="timer-outline" size={13} color={colors.primary} />
        <Text style={styles.statusTimer}>{`${mins}:${String(secs).padStart(2, '0')}`}</Text>
      </Animated.View>
    );
  }
  const label = recommended && setsDone < recommended
    ? `Set ${setsDone + 1} of ${recommended}`
    : `${setsDone} ${setsDone === 1 ? 'set' : 'sets'} done`;
  return <Text style={styles.statusText}>{label}</Text>;
}

// The pulsing "live" dot: one opacity worklet on motion.pulse; static under
// Reduce Motion.
function LiveDot({ reduceMotion }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) { opacity.value = 1; return; }
    opacity.value = withRepeat(withTiming(0.35, { duration: motion.pulse }), -1, true);
  }, [reduceMotion, opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.liveDot, pulse]} />;
}

export default function ActiveSessionMiniBar({ navigation }) {
  const { hasActiveWorkout, exerciseName, reduceMotion } = useAppStore(useShallow((s) => {
    const ex = s.workoutExercises?.[s.currentExerciseIndex];
    return {
      hasActiveWorkout: !!s.activeWorkout,
      exerciseName: ex?.exercise?.name ?? ex?.name ?? 'Workout in progress',
      reduceMotion: !!s.accessibility?.reduceMotion,
    };
  }));

  if (!hasActiveWorkout) return null;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : SlideInDown.duration(motion.state)}
      exiting={reduceMotion ? undefined : SlideOutDown.duration(motion.exit)}
    >
      <PressableCard
        style={styles.bar}
        // ActiveWorkout is registered in HomeStack, so from any other tab
        // this must be the parent-tab form (the F4 silent-drop class), with
        // initial: false per the lazy-tab rule.
        onPress={() => navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false })}
        accessibilityLabel={`Workout in progress: ${exerciseName}. Return to your session.`}
      >
        <LiveDot reduceMotion={reduceMotion} />
        <Text style={styles.exercise} numberOfLines={1}>{exerciseName}</Text>
        <MiniBarStatus />
        <Ionicons name="chevron-up" size={16} color={colors.textMuted} />
      </PressableCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    height: BAR_HEIGHT, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle,
    ...shadow.sm,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: circle(8),
    backgroundColor: colors.success,
  },
  exercise: { ...type.label, color: colors.textPrimary, flex: 1 },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  statusTimer: {
    color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  statusText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
