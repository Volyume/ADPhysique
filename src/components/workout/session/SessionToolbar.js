/**
 * SessionToolbar
 *
 * The session sheet's top bar (12-BUILD-SPEC sections 2 to 4, register D220).
 * It replaces WorkoutHeader: a Cancel control, the Rest, Notes and History
 * tools and the icon-only Finish, all chromeless on the page over a bottom
 * hairline, as the approved 2026-08-18 header was (D220 addendum 7). The
 * session clock is not here: it sits on the session title's line
 * (SessionHeader; founder verdict 2026-10-09, addendum 12). Presentation only:
 * every action is a callback the screen owns, so the cancel and finish
 * contracts (BEHAVIOURAL-CONTRACT sections 1 and 6) are untouched.
 *
 * Test ids kept from WorkoutHeader: volyume-workout-close and
 * volyume-workout-finish. New: volyume-tool-rest, volyume-tool-notes and
 * volyume-tool-history (the founder's 2026-10-09 ruling, D220 addendum 10:
 * "the buttons for previous lifts ... at the top and just go to whatever
 * exercise it is"; it renders only when onHistory is given).
 *
 * Finish stays icon only (founder order 2026-07-27, pinned for the old header
 * in loggerHeaderFinishIconOnly.guard.test.js): the visible word is gone, so
 * the accessibility label "Finish workout" is the whole name of the control and
 * must not be shortened. `finishBusy` swaps the glyph for a spinner and
 * disables the well while the finish is being saved.
 *
 * Layout: the tools sit on the left, a flexible gap, then Finish. The drawing shows no Cancel control; the prop and the test
 * id are required by the spec, so it takes the leftmost slot, where the old
 * header had it, as a quiet icon in the muted ink ("leave" is muted, "finish"
 * is amber: the grammar the logger already used).
 */
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

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
  onClose,
  onRest,
  onNotes,
  onHistory,
  onFinish,
  finishBusy = false,
}) {
  const t = useTheme();
  // Chromeless, the logger header the founder approved (2026-08-18): nothing
  // is drawn at rest but the glyphs; a hairline closes the bar.
  const live = useMemo(() => ({
    bar: { borderBottomColor: t.colors.borderSubtle },
    toolLabel: { ...t.type.caption, color: t.colors.textSecondary },
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
        glyphColor={t.colors.textSecondary}
        labelStyle={live.toolLabel}
      />
      <ToolButton
        testID="volyume-tool-notes"
        icon="create-outline"
        label="Notes"
        accessibilityLabel="Session notes"
        accessibilityHint="Add or edit a note for this workout"
        onPress={onNotes}
        glyphColor={t.colors.textSecondary}
        labelStyle={live.toolLabel}
      />
      {onHistory ? (
        <ToolButton
          testID="volyume-tool-history"
          icon="stats-chart-outline"
          label="History"
          accessibilityLabel="History and records"
          accessibilityHint="Previous sessions and records for the current exercise"
          onPress={onHistory}
          glyphColor={t.colors.textSecondary}
          labelStyle={live.toolLabel}
        />
      ) : null}

      <View style={styles.gap} />

      <TouchableOpacity
        testID="volyume-workout-finish"
        style={styles.finish}
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
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
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
  },
});
