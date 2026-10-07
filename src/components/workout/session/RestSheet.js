/**
 * RestSheet
 *
 * The full view of the rest timer, opened by the Rest tool in the session
 * toolbar (12-BUILD-SPEC section 1.7, register D220). The pinned strip
 * (RestTimer.js) stays docked and untouched: this sheet is a second, larger
 * face on the SAME store state, never a second timer.
 *
 * State. Read the way the strip reads it (RestTimer.js lines 63 to 74): one
 * selector per field, restTimerActive, restTimerRemaining and
 * restTimerDuration. The two actions are the ones the strip's own controls
 * call: addRestTime through the same clampRestDelta floor (the strip's
 * handleAdjust, lines 388 to 396, so a tap never takes a rest under five
 * seconds) and stopRestTimer (the strip's Skip, line 515).
 *
 * It does NOT tick and it never starts a rest. The strip's one-second
 * interval (lines 120 to 138) is the only clock, so opening this sheet cannot
 * double-count a second or run a second countdown.
 *
 * A closed sheet is free. The store subscription lives in RestSheetBody, which
 * the house BottomSheet mounts only while it is presented, so a closed sheet
 * never re-renders on the per-second tick.
 *
 * Layout. "Rest" overline, the remaining time at display, "of m:ss" at label,
 * then the next set line at h2 and the last session line at label (both from
 * props), then -15, +15 and Skip as 48 dp text targets, then a house primary
 * Button. With no rest running the sheet shows "No rest running" and the
 * Button only.
 *
 * Props
 *   visible    controls the sheet (the BottomSheet contract)
 *   onClose    called by the backdrop, a swipe down, hardware back and the
 *              Start next set button. That button only closes the sheet: the
 *              rest keeps running in the strip.
 *   nextLabel  the next set line, e.g. "Set 3 of 3 · 70 kg × 6 to 10"
 *   lastLabel  the last session line, optional
 *
 * Accessibility. The labels are the strip's: "Remove 15 seconds",
 * "Add 15 seconds", "Skip rest timer", and the readout label is the strip's
 * (lines 485 to 487). Like the strip the readout is not a live region, so
 * TalkBack does not speak every second (P9 audit finding 1); the strip owns
 * the spoken start and end of a rest.
 */

import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import BottomSheet from '../../BottomSheet';
import Button from '../../Button';
import useAppStore from '../../../store/useAppStore';
import useTheme from '../../../hooks/useTheme';
import { spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';
import { clampRestDelta } from '../../../lib/restTimerMath';
import { formatSeconds } from '../../../lib/workoutHelpers';
import { selection as hapticSelection } from '../../../lib/haptics';

// The strip's two deltas (RestTimer.js lines 51 to 56): holding repeats.
// The glyph is U+2212, the same minus the strip draws.
const ADJUSTMENTS = [
  {
    delta: -15,
    label: '−15',
    accessibilityLabel: 'Remove 15 seconds',
    testID: 'volyume-rest-sheet-remove',
  },
  {
    delta: 15,
    label: '+15',
    accessibilityLabel: 'Add 15 seconds',
    testID: 'volyume-rest-sheet-add',
  },
];

const LONG_PRESS_DELAY_MS = 300; // the strip's delayLongPress (line 504)
const REPEAT_INTERVAL_MS = 200; // the strip's hold-to-repeat cadence (line 409)
const COUNTDOWN_SECONDS = 3; // the strip shows bare seconds from here (line 438)
const ALMOST_DONE_SECONDS = 10; // the strip's warning colour from here (line 439)

// The strip's readout label (RestTimer.js lines 485 to 487), word for word.
function readoutLabel(remaining) {
  if (remaining > 0 && remaining <= COUNTDOWN_SECONDS) {
    return `Rest, ${remaining} second${remaining === 1 ? '' : 's'} remaining`;
  }
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `Rest timer, ${mins} minute${mins === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'} remaining`;
}

function RestSheetBody({ onClose, nextLabel, lastLabel }) {
  const {
    restTimerActive, restTimerRemaining, restTimerDuration, stopRestTimer, addRestTime,
  } = useAppStore(useShallow(s => ({
    restTimerActive: s.restTimerActive,
    restTimerRemaining: s.restTimerRemaining,
    restTimerDuration: s.restTimerDuration,
    stopRestTimer: s.stopRestTimer,
    addRestTime: s.addRestTime,
  })));

  const t = useTheme();
  const live = useMemo(() => ({
    overline: { ...t.type.overline, color: t.colors.textMuted },
    time: { ...t.type.num('display'), color: t.colors.textPrimary },
    timeWarning: { color: t.colors.warning },
    of: { ...t.type.label, color: t.colors.textSecondary },
    next: { ...t.type.num('h2'), color: t.colors.textPrimary },
    last: { ...t.type.label, color: t.colors.textSecondary },
    controlText: { ...t.type.num('bodyStrong') },
    controlAdjust: { color: t.colors.primary },
    controlSkip: { color: t.colors.textSecondary },
    idle: { ...t.type.title, color: t.colors.textSecondary },
  }), [t]);

  const repeatRef = useRef(null);

  // Read remaining straight off the store, as the strip does: a hold-to-repeat
  // tick runs inside a setInterval whose closure would otherwise clamp against
  // the remaining value captured at press time.
  function handleAdjust(delta) {
    hapticSelection();
    const remaining = useAppStore.getState().restTimerRemaining;
    const safeAmount = clampRestDelta(delta, remaining);
    if (safeAmount !== 0) addRestTime(safeAmount);
  }

  function stopRepeat() {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }

  function startRepeat(delta) {
    stopRepeat();
    repeatRef.current = setInterval(() => handleAdjust(delta), REPEAT_INTERVAL_MS);
  }

  // Stop any hold when the rest ends or the sheet unmounts. A control that
  // unmounts under a held finger never receives its press-out, so without
  // this a rest that ran out mid-hold would leave the repeat running.
  useEffect(() => () => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }, [restTimerActive]);

  if (!restTimerActive) {
    return (
      <View style={styles.content}>
        <Text style={[styles.center, live.idle]} testID="volyume-rest-sheet-idle">No rest running</Text>
        <Button
          title="Start next set"
          onPress={() => onClose?.()}
          testID="volyume-rest-sheet-start"
        />
      </View>
    );
  }

  const remaining = Math.max(0, Math.round(Number(restTimerRemaining) || 0));
  const isCountdown = remaining > 0 && remaining <= COUNTDOWN_SECONDS;
  const isAlmostDone = remaining <= ALMOST_DONE_SECONDS;
  const timeText = isCountdown ? String(remaining) : formatSeconds(remaining);

  return (
    <View style={styles.content}>
      <View
        style={styles.readout}
        accessible
        accessibilityLabel={readoutLabel(remaining)}
        testID="volyume-rest-sheet-readout"
      >
        <Text style={[styles.center, live.overline]} numberOfLines={1}>Rest</Text>
        <Text style={[styles.center, live.time, isAlmostDone && live.timeWarning]}>{timeText}</Text>
        <Text style={[styles.center, live.of]}>{`of ${formatSeconds(restTimerDuration)}`}</Text>
      </View>

      {nextLabel || lastLabel ? (
        <View style={styles.next}>
          {nextLabel ? (
            <Text style={[styles.center, live.next]} testID="volyume-rest-sheet-next">{nextLabel}</Text>
          ) : null}
          {lastLabel ? (
            <Text style={[styles.center, live.last]} testID="volyume-rest-sheet-last">{lastLabel}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.controls}>
        {ADJUSTMENTS.map(({ delta, label, accessibilityLabel, testID }) => (
          <TouchableOpacity
            key={delta}
            style={styles.control}
            onPress={() => handleAdjust(delta)}
            onLongPress={() => startRepeat(delta)}
            delayLongPress={LONG_PRESS_DELAY_MS}
            onPressOut={stopRepeat}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            testID={testID}
          >
            <Text style={[live.controlText, live.controlAdjust]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.control}
          onPress={() => stopRestTimer()}
          accessibilityRole="button"
          accessibilityLabel="Skip rest timer"
          testID="volyume-rest-sheet-skip"
        >
          <Text style={[live.controlText, live.controlSkip]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Button
        title="Start next set"
        onPress={() => onClose?.()}
        testID="volyume-rest-sheet-start"
      />
    </View>
  );
}

export default function RestSheet({ visible, onClose, nextLabel, lastLabel }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} scroll accessibilityLabel="Rest timer">
      <RestSheetBody onClose={onClose} nextLabel={nextLabel} lastLabel={lastLabel} />
    </BottomSheet>
  );
}

// Layout only (theme-invariant). Type roles and colours come from the live
// theme above so the sheet follows a theme change with no restart.
const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: spacing.lg },
  readout: { alignItems: 'center', gap: spacing.xxs },
  next: { alignItems: 'center', gap: spacing.xs },
  center: { textAlign: 'center' },
  controls: { flexDirection: 'row', alignSelf: 'stretch' },
  control: {
    flex: 1,
    minHeight: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
