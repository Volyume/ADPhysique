/**
 * SessionToolbar
 *
 * The session's top bar (12-BUILD-SPEC sections 2 to 4, register D220; laid
 * out again on the founder's verdict of 2026-10-09, D220 addendum 15). Five
 * controls in ONE style, spaced evenly across the bar: Cancel (X), Rest,
 * Notes, History and Finish. Each is a 24 dp glyph in a 48 dp target, no
 * caption, no container; the glyphs are text ink, and Finish alone is amber
 * (the one action). The X sits on the page's left margin and Finish on its
 * right, the three tools evenly between them, so nothing crowds and nothing
 * gaps. A 2 dp amber line closes the bar, the same mark as the rest strip's
 * drain line (founder, 2026-10-09). The session name and the clock are NOT
 * here: they sit on the page's title line (SessionHeader), the founder's
 * ruling.
 *
 * Presentation only: every action is a callback the screen owns, so the
 * cancel and finish contracts (BEHAVIOURAL-CONTRACT sections 1 and 6) are
 * untouched. Test ids: volyume-workout-close, volyume-tool-rest,
 * volyume-tool-notes, volyume-tool-history, volyume-workout-finish.
 *
 * Finish stays icon only (founder order 2026-07-27): the accessibility label
 * "Finish workout" is the whole name of the control and must not be
 * shortened. `finishBusy` swaps the glyph for a spinner and disables the
 * control while the finish is being saved. The History control renders only
 * when onHistory is given.
 */
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

const BAR_MIN_HEIGHT = 56;
// The rest strip's drain line is 2 dp; the bar's closing line matches it.
const RULE_HEIGHT = 2;

function Control({ testID, icon, accessibilityLabel, accessibilityHint, onPress, color, disabled, busy, spinnerColor }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.control}
      onPress={onPress}
      disabled={!!disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={busy != null ? { busy: !!busy, disabled: !!disabled } : undefined}
    >
      {busy ? <ActivityIndicator color={spinnerColor} /> : <Ionicons name={icon} size={iconSize.lg} color={color} />}
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
  // The bar closes with a 2 dp amber line, the rest strip's drain line in
  // its full state (founder, 2026-10-09): the same mark top and bottom.
  const live = useMemo(() => ({
    bar: { borderBottomColor: t.colors.primaryFill },
  }), [t]);
  const busy = !!finishBusy;
  const ink = t.colors.textPrimary;

  return (
    <View style={[styles.bar, live.bar]}>
      <Control testID="volyume-workout-close" icon="close" accessibilityLabel="Cancel workout" onPress={onClose} color={ink} />
      <Control
        testID="volyume-tool-rest"
        icon="timer-outline"
        accessibilityLabel="Rest timer"
        accessibilityHint="Opens the full rest view"
        onPress={onRest}
        color={ink}
      />
      <Control
        testID="volyume-tool-notes"
        icon="create-outline"
        accessibilityLabel="Session notes"
        accessibilityHint="Add or edit a note for this workout"
        onPress={onNotes}
        color={ink}
      />
      {onHistory ? (
        <Control
          testID="volyume-tool-history"
          icon="stats-chart-outline"
          accessibilityLabel="History and records"
          accessibilityHint="Previous sessions and records for the current exercise"
          onPress={onHistory}
          color={ink}
        />
      ) : null}
      <Control
        testID="volyume-workout-finish"
        icon="checkmark-done"
        accessibilityLabel="Finish workout"
        onPress={onFinish}
        color={t.colors.primary}
        disabled={busy}
        busy={busy}
        spinnerColor={t.colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: BAR_MIN_HEIGHT,
    // 4 dp in, so the 24 dp glyphs of the 48 dp end targets sit on the
    // page's 16 dp margins (D220 addendum 13).
    paddingHorizontal: spacing.xs,
    borderBottomWidth: RULE_HEIGHT,
  },
  control: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
