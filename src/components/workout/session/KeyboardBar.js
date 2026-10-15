/**
 * KeyboardBar
 *
 * The thin bar docked above the phone's numeric keyboard while a well is
 * being typed into (founder decision 2026-10-09, D220 addendum 18: the
 * phone's keyboard is the input; the invented keypad is gone). It carries the
 * four things the keyboard lacks, in the footer action's grammar (a 20 dp
 * glyph and a semibold label, 48 dp targets, no boxes): step down, step up,
 * Next (weight to reps) and Done. The screen owns every action; the bar is
 * stateless.
 *
 * Props
 *   step        the step size shown on the step keys ("2.5"); in time mode
 *               the keys read "5 s" whatever step says
 *   unit        the weight unit for the spoken step ("kg", "lb", "m", "yd")
 *   mode        'number' (default) | 'time'
 *   onStep      called with the signed step (-step or +step; -5 or +5 in
 *               time mode). When omitted the step keys are not drawn: the
 *               reps well has nothing to step (founder, 2026-10-09: "What's
 *               the -1 and +1? It makes no sense at all"); the weight well
 *               steps by the plate, the time well by 5 s (D220 addendum 24)
 *   onNext      when given, a Next action moves the keyboard to the next
 *               well
 *   onDone      the last action; it reads "Done" unless `doneLabel` says
 *               otherwise
 *   doneLabel   what the last action does: 'Done' (default), 'Log set', or
 *               the row's own action ('Finish' mid-cluster, 'Other side'
 *               mid-pair, 'Start' for a cluster type). On the next set the
 *               last action LOGS the set (founder, 2026-10-09: "too many
 *               clicks"), so typing the reps and pressing it is the whole
 *               set; on an edit of a logged set it stays Done. It read "Log"
 *               until the founder's 2026-10-11 order: "Change Log to Log Set"
 *   onDismiss   when given, an OK action before the last one puts the
 *               keyboard away and keeps what was typed, without logging
 *               (founder, 2026-10-11: "Maybe we need an Ok button alongside
 *               Log"). The screen gives it whenever the last action logs or
 *               finishes; an edit's Done already closes
 *   onNote      when given, a Note action before OK opens the set's note
 *               (founder, 2026-10-11: notes open from "the notes button
 *               alongside Log" and nothing else). The screen gives it on the
 *               set's last box, where the bar has room; on the weight box
 *               Next leads there
 *   safeBottom  optional bottom inset in dp (default 0) under the row, for
 *               the gesture bar when the keyboard is not covering it
 *
 * On Android the window resizes for the keyboard (the Expo default), so a
 * bar at the bottom of the screen's column sits straight above it; on iOS
 * the screen renders it inside an InputAccessoryView named by the open
 * well, so the system docks it on the keyboard (D220 addendum 23, the
 * mechanism every numeric TextField in the app uses). Nothing here measures
 * the keyboard.
 */
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, spacing, fontScaleCaps } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

const TIME_STEP = 5;

function spokenUnit(unit) {
  if (unit === 'kg') return 'kilograms';
  if (unit === 'lb' || unit === 'lbs') return 'pounds';
  if (unit === 'm') return 'metres';
  if (unit === 'yd') return 'yards';
  return unit || '';
}

function Action({ testID, icon, label, spoken, hint, onPress, glyphColor, labelStyle }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.action}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={hint}
    >
      <Ionicons name={icon} size={iconSize.md} color={glyphColor} />
      <Text style={labelStyle} numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.chrome}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function KeyboardBar({ step = 1, stepDown = null, unit = 'kg', mode = 'number', onStep, onNext, onDone, onDismiss, onNote, doneLabel = 'Done', safeBottom = 0 }) {
  const t = useTheme();
  const live = useMemo(() => ({
    bar: { backgroundColor: t.colors.background, borderTopColor: t.colors.borderSubtle },
    // Founder, 2026-10-15: the bar's words read "quite small and kind of
    // inconsequential"; one step up for every action, and the last action
    // (Log set, Done, Finish) bold so it reads as the one that matters.
    label: { ...t.type.w(t.type.num('body'), 'semibold'), color: t.colors.textPrimary },
    labelStrong: { ...t.type.w(t.type.num('body'), 'bold'), color: t.colors.textPrimary },
  }), [t]);
  const isTime = mode === 'time';
  const delta = isTime ? TIME_STEP : step;
  // The step down can differ from the step up (a bell steps down to the
  // previous bell on the shelf; D220 addendum 37); it reads as its own number.
  const downDelta = isTime ? TIME_STEP : (stepDown != null ? stepDown : step);
  const stepText = isTime ? `${TIME_STEP} s` : String(step);
  const stepDownText = isTime ? `${TIME_STEP} s` : String(downDelta);
  const stepSpoken = isTime ? `${TIME_STEP} seconds` : `${step} ${spokenUnit(unit)}`;
  const stepDownSpoken = isTime ? `${TIME_STEP} seconds` : `${downDelta} ${spokenUnit(unit)}`;
  const ink = t.colors.textPrimary;

  return (
    <View style={[styles.bar, live.bar, { paddingBottom: Math.max(0, safeBottom) }]}>
      {onStep ? (
        <Action
          testID="volyume-bar-step-down"
          icon="remove"
          label={stepDownText}
          spoken={`Remove ${stepDownSpoken}`}
          onPress={() => onStep(-downDelta)}
          glyphColor={ink}
          labelStyle={live.label}
        />
      ) : null}
      {onStep ? (
        <Action
          testID="volyume-bar-step-up"
          icon="add"
          label={stepText}
          spoken={`Add ${stepSpoken}`}
          onPress={() => onStep(delta)}
          glyphColor={ink}
          labelStyle={live.label}
        />
      ) : null}
      <View style={styles.gap} />
      {onNext ? (
        <Action
          testID="volyume-bar-next"
          icon="arrow-forward"
          label="Next"
          spoken="Next"
          onPress={onNext}
          glyphColor={ink}
          labelStyle={live.label}
        />
      ) : null}
      {onNote ? (
        <Action
          testID="volyume-bar-note"
          icon="create-outline"
          label="Note"
          spoken="Note"
          hint="Adds a note to this set"
          onPress={onNote}
          glyphColor={ink}
          labelStyle={live.label}
        />
      ) : null}
      {onDismiss ? (
        <Action
          testID="volyume-bar-ok"
          icon="chevron-down"
          label="OK"
          spoken="OK"
          hint="Puts the keyboard away and keeps what you typed"
          onPress={onDismiss}
          glyphColor={ink}
          labelStyle={live.label}
        />
      ) : null}
      <Action
        testID="volyume-bar-done"
        icon="checkmark"
        label={doneLabel}
        spoken={doneLabel}
        onPress={onDone}
        glyphColor={ink}
        labelStyle={live.labelStrong}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The rest strip's row: 48 dp, a hairline above, the page's 16 dp left
  // margin and the 8 dp right inset that puts the last word on the margin.
  // The row wraps rather than clip: with the weight well's five actions at
  // the phone's largest text the bar is wider than a phone, and a second line
  // is better than a cut-off label (the actions keep their right edge).
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: touchTarget.minimum,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
  },
  action: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  gap: { flex: 1 },
});
