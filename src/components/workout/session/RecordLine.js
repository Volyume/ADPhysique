/**
 * RecordLine
 *
 * The in-session record, as a line of the exercise card (D220 addendum 36,
 * founder device verdict 2026-10-09: "The PR pop up is a mess ... needs
 * totally rethought redesigned and redone in a better way"; then "A
 * completely different way of doing it that fits in with the logger now!
 * Not moving it to be ON TOP of other data").
 *
 * No floating surface of any kind. A record is a fact about a set, so it
 * lives where the set lives: one row of the card, directly under the set
 * table's last row and above the footer, drawn as a row of the table (the
 * same hairline under it, a 48 dp band) with the glyph and the text
 * centred in it, horizontally and vertically (founder render verdict
 * 2026-10-09: "it's not central vertically ... Central horizontal and
 * vertical might be worth a try"). It stays for as long as the exercise is
 * open, covers nothing, and the card grows by the one row. The row that
 * earned it carries its small amber PR under the set number (SetRow); this
 * row names the record.
 *
 * Enter: the line fades in and settles down 4 dp on the house decelerate
 * curve (fade only under reduce-motion), ONCE, on the first render of that
 * record on its own exercise (`celebrate`), never again on a remount or a
 * jump back. The record haptic ladder and the screen-reader announcement
 * are `celebrateRecord` below, which the screen calls the moment the record
 * is earned, whatever exercise is on screen then (a superset's log lands on
 * the partner exercise, and the feedback must not wait for the return).
 *
 * Props
 *   record     detectPR's record ({ type, weight, reps, value, label }) plus
 *              units, or { type: 'first_lift', weight, reps, units } for the
 *              honest starting point. Null renders nothing.
 *   celebrate  true on the render that first shows this record: animates in.
 *   reduceMotion  the accessibility preference.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, AccessibilityInfo } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Text from '../../Text';
import useTheme from '../../../hooks/useTheme';
import { spacing, motion, iconSize, fontScaleCaps } from '../../../styles/theme';
import * as haptics from '../../../lib/haptics';
import { getWellbeingMode, isCalm } from '../../../lib/wellbeing';

const SETTLE = 4;
const MIDDLE_DOT = '\u00B7';

// Numbers as the rows print them: no trailing zeros, one decimal at most.
function num(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return String(Math.round(Number(n) * 10) / 10);
}

/**
 * The line's text, in the logger's own grammar ("72.5 kg × 8", the row's
 * form), from the record's fields; detectPR's own label is the fallback
 * when a field is missing.
 */
export function recordText(record) {
  if (!record) return '';
  const u = record.units || 'kg';
  const w = num(record.weight);
  const r = record.reps != null ? String(record.reps) : null;
  const set = w != null && r != null ? `${w} ${u} \u00D7 ${r}` : null;
  switch (record.type) {
    case 'first_lift':
      return set ? `First lift logged ${MIDDLE_DOT} ${set}` : (record.label || 'First lift logged');
    case 'heaviest_weight':
      return set ? `New heaviest weight ${MIDDLE_DOT} ${set}` : record.label;
    case '1rm_estimate': {
      const v = num(record.value);
      return v != null ? `New estimated max ${MIDDLE_DOT} ${v} ${u}` : record.label;
    }
    case 'most_reps_at_weight':
      return w != null && r != null ? `Most reps at ${w} ${u} ${MIDDLE_DOT} ${r}` : record.label;
    case 'least_assistance':
      return set ? `Least assistance ${MIDDLE_DOT} ${set}` : record.label;
    default:
      return record.label || '';
  }
}

export function recordGlyph(type) {
  return type === 'first_lift' ? 'barbell-outline'
    : type === '1rm_estimate' ? 'trophy'
      : type === 'heaviest_weight' ? 'barbell' : 'flash';
}

/**
 * The feedback for a record the moment it is earned: the screen-reader
 * announcement (P9/E11: announced, not just shown; a first lift is never
 * announced as a record) and the haptic weight (calm mode, reduce-motion
 * and a first lift get the light tick; a real record keeps the PR ladder,
 * the vocabulary's). Called by the screen from the log or edit that earned
 * the record, so a superset's forward jump never swallows it.
 */
export function celebrateRecord(record, { reduceMotion = false } = {}) {
  if (!record) return;
  const isFirstLift = record.type === 'first_lift';
  const text = recordText(record);
  try {
    AccessibilityInfo.announceForAccessibility(
      isFirstLift ? `First lift logged. ${text}.` : `Personal record. ${text}.`,
    );
  } catch (_) { /* best-effort */ }
  if (isFirstLift || reduceMotion) {
    haptics.selection();
    return;
  }
  getWellbeingMode()
    .then((m) => (isCalm(m) ? haptics.selection() : haptics.prAchieved()))
    .catch(() => { haptics.selection(); }); // a failed read keeps the light tick
}

// The theme stores the curve as its four control points; Animated needs the
// function (the array threw "easing is not a function" on the native driver
// the moment the first record animated; pre-build review 2026-10-09).
const EASE_DECELERATE = Easing.bezier(...motion.easeDecelerate);

export default function RecordLine({ record, celebrate = false, reduceMotion = false }) {
  const t = useTheme();
  const isFirstLift = record?.type === 'first_lift';
  const opacity = useRef(new Animated.Value(celebrate ? 0 : 1)).current;
  const shift = useRef(new Animated.Value(celebrate && !reduceMotion ? -SETTLE : 0)).current;
  const text = recordText(record);
  const key = record ? `${record.type}|${text}` : null;

  useEffect(() => {
    if (!record || !celebrate) return undefined;
    opacity.setValue(0);
    shift.setValue(reduceMotion ? 0 : -SETTLE);
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.exit, useNativeDriver: true }),
      Animated.timing(shift, { toValue: 0, duration: motion.exit, easing: EASE_DECELERATE, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
    // Keyed on the record itself: a better record on the same exercise
    // celebrates again; the same record re-rendered (celebrate dropping back
    // to false on the next render) neither re-runs nor stops the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!record) return null;

  const live = {
    band: { borderBottomColor: t.colors.borderSubtle },
    text: { ...t.type.bodySm, color: isFirstLift ? t.colors.textSecondary : t.colors.textPrimary },
    glyph: isFirstLift ? t.colors.textMuted : t.colors.gold,
  };

  return (
    <Animated.View
      style={[styles.band, live.band, { opacity, transform: [{ translateY: shift }] }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={isFirstLift ? text : `Personal record. ${text}`}
      testID="volyume-record-line"
    >
      <Ionicons name={recordGlyph(record.type)} size={iconSize.sm} color={live.glyph} />
      <Text style={[styles.text, live.text]} maxFontSizeMultiplier={fontScaleCaps.reading}>
        {text}
      </Text>
    </Animated.View>
  );
}

// A row of the table: taller than the column labels (36), shorter than a
// set row (64), with the table's hairline under it so the footer's spacing
// below is the card's normal spacing.
const BAND_MIN_HEIGHT = 48;

const styles = StyleSheet.create({
  band: {
    minHeight: BAND_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  // Centred as a pair with the glyph; wraps when it must and never truncates.
  text: { flexShrink: 1, textAlign: 'center' },
});
