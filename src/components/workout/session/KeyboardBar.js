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
 *   doneLabel   what the last action does: 'Done' (default), 'Log' (spoken
 *               "Log set"), or the row's own action ('Finish' mid-cluster,
 *               'Other side' mid-pair, 'Start' for a cluster type). On the
 *               next set the last action LOGS the set (founder, 2026-10-09:
 *               "too many clicks"), so typing the reps and pressing it is
 *               the whole set; on an edit of a logged set it stays Done
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
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

const TIME_STEP = 5;

function spokenUnit(unit) {
  if (unit === 'kg') return 'kilograms';
  if (unit === 'lb' || unit === 'lbs') return 'pounds';
  if (unit === 'm') return 'metres';
  if (unit === 'yd') return 'yards';
  return unit || '';
}

function Action({ testID, icon, label, spoken, onPress, glyphColor, labelStyle }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.action}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
    >
      <Ionicons name={icon} size={iconSize.md} color={glyphColor} />
      <Text style={labelStyle} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function KeyboardBar({ step = 1, unit = 'kg', mode = 'number', onStep, onNext, onDone, doneLabel = 'Done', safeBottom = 0 }) {
  const t = useTheme();
  const live = useMemo(() => ({
    bar: { backgroundColor: t.colors.background, borderTopColor: t.colors.borderSubtle },
    label: { ...t.type.w(t.type.num('label'), 'semibold'), color: t.colors.textPrimary },
  }), [t]);
  const isTime = mode === 'time';
  const delta = isTime ? TIME_STEP : step;
  const stepText = isTime ? `${TIME_STEP} s` : String(step);
  const stepSpoken = isTime ? `${TIME_STEP} seconds` : `${step} ${spokenUnit(unit)}`;
  const ink = t.colors.textPrimary;

  return (
    <View style={[styles.bar, live.bar, { paddingBottom: Math.max(0, safeBottom) }]}>
      {onStep ? (
        <Action
          testID="volyume-bar-step-down"
          icon="remove"
          label={stepText}
          spoken={`Remove ${stepSpoken}`}
          onPress={() => onStep(-delta)}
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
      <Action
        testID="volyume-bar-done"
        icon="checkmark"
        label={doneLabel}
        spoken={doneLabel === 'Log' ? 'Log set' : doneLabel}
        onPress={onDone}
        glyphColor={ink}
        labelStyle={live.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The rest strip's row: 48 dp, a hairline above, the page's 16 dp left
  // margin and the 8 dp right inset that puts the last word on the margin.
  bar: {
    flexDirection: 'row',
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
