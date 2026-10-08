/**
 * SessionToolbar
 *
 * The session sheet's top bar (12-BUILD-SPEC sections 2 to 4, register D220).
 * It replaces WorkoutHeader: a Cancel control, the Rest tool, the
 * session clock in a well and the icon-only Finish well. Presentation only:
 * every action is a callback the screen owns, so the cancel and finish
 * contracts (BEHAVIOURAL-CONTRACT sections 1 and 6) are untouched.
 *
 * Test ids kept from WorkoutHeader: volyume-workout-close and
 * volyume-workout-finish. New: volyume-tool-rest. The Notes tool was
 * removed on the founder's device verdict (2026-10-08): the note line under
 * the session title, directly beneath the toolbar, already opens the same
 * sheet and shows the note once written, so two controls sat touching.
 *
 * Finish stays icon only (founder order 2026-07-27, pinned for the old header
 * in loggerHeaderFinishIconOnly.guard.test.js): the visible word is gone, so
 * the accessibility label "Finish workout" is the whole name of the control and
 * must not be shortened. `finishBusy` swaps the glyph for a spinner and
 * disables the well while the finish is being saved.
 *
 * Layout from the drawing: the tools sit on the left, a flexible gap, then the
 * clock and Finish. The drawing shows no Cancel control; the prop and the test
 * id are required by the spec, so it takes the leftmost slot, where the old
 * header had it, as a quiet icon in the muted ink ("leave" is muted, "finish"
 * is amber: the grammar the logger already used).
 */
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, radius, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';
import SessionClock from './SessionClock';

// Spec section 2: tool glyph 22 over a caption, 56 wide by 48 tall; bar 56.
const TOOL_GLYPH = 22;
const TOOL_WIDTH = 56;
const BAR_MIN_HEIGHT = 56;

function ToolButton({ testID, icon, label, accessibilityLabel, accessibilityHint, onPress, glyphColor, labelStyle }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.tool}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Ionicons name={icon} size={TOOL_GLYPH} color={glyphColor} />
      <Text style={labelStyle} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SessionToolbar({
  startTime,
  onClose,
  onRest,
  onFinish,
  finishBusy = false,
}) {
  const t = useTheme();
  const live = useMemo(() => ({
    bar: { backgroundColor: t.colors.surface },
    toolLabel: { ...t.type.caption, color: t.colors.textSecondary },
    finish: { backgroundColor: t.colors.background, borderColor: t.colors.borderSubtle },
  }), [t]);
  const busy = !!finishBusy;

  return (
    <View style={[styles.bar, live.bar]}>
      <TouchableOpacity
        testID="volyume-workout-close"
        style={styles.close}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cancel workout"
      >
        <Ionicons name="close" size={iconSize.md} color={t.colors.textMuted} />
      </TouchableOpacity>

      <ToolButton
        testID="volyume-tool-rest"
        icon="timer-outline"
        label="Rest"
        accessibilityLabel="Rest timer"
        accessibilityHint="Opens the full rest view"
        onPress={onRest}
        glyphColor={t.colors.textPrimary}
        labelStyle={live.toolLabel}
      />

      <View style={styles.gap} />

      <SessionClock startTime={startTime} />

      <TouchableOpacity
        testID="volyume-workout-finish"
        style={[styles.finish, live.finish]}
        onPress={onFinish}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Finish workout"
        accessibilityState={{ busy, disabled: busy }}
      >
        {busy ? (
          <ActivityIndicator color={t.colors.primary} />
        ) : (
          <Ionicons name="checkmark-done" size={iconSize.lg} color={t.colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: BAR_MIN_HEIGHT,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
  },
  close: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tool: {
    width: TOOL_WIDTH,
    minHeight: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  gap: { flex: 1 },
  finish: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
