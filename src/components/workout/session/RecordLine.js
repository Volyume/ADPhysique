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
 * D229 addendum 9 (share one PR set with its video): the same row carries
 * the PR moment's two video actions, so there is one row and one place.
 * Before the set, when the numbers already in the next row's box would be a
 * record (the screen judges it with detectPR over the log's own history), the
 * row reads "A PR if you hit it" with the text action "Record it". After the
 * set, an earned record whose set has a saved video gains the text action
 * "Share". Each action is plain text in the primary ink after a middle dot,
 * a button with a 48 dp hit area; at the largest text sizes it wraps under
 * the text rather than clipping. The offer never animates (the enter is for
 * an earned record only). With an action on it the row is no longer one
 * accessible element: the words and the action are read and reached apart.
 * The screen decides whether an action is offered at all (calm mode and an
 * open ED flag hide both, fail closed); this row only draws what it is given.
 *
 * Props
 *   record     detectPR's record ({ type, weight, reps, value, label }) plus
 *              units, or { type: 'first_lift', weight, reps, units } for the
 *              honest starting point.
 *   celebrate  true on the render that first shows this record: animates in.
 *   reduceMotion  the accessibility preference.
 *   offer      the pre-set form, { text, actionLabel, a11y, onAction }: shown
 *              only when there is no record. Null (and no record) renders
 *              nothing.
 *   action     the earned record's action, { label, a11y, onPress }: shown
 *              only with a real record, never with the first lift.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, AccessibilityInfo, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Text from '../../Text';
import useTheme from '../../../hooks/useTheme';
import { spacing, motion, iconSize, fontScaleCaps } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';
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

export default function RecordLine({
  record, celebrate = false, reduceMotion = false, offer = null, action = null,
}) {
  const t = useTheme();
  const isFirstLift = record?.type === 'first_lift';
  // The pre-set form needs its words and a way to take it; it never stands
  // in for a record.
  const offerShown = !record && !!offer && !!offer.text && !!offer.actionLabel
    && typeof offer.onAction === 'function';
  const recordAction = record && !isFirstLift && action && action.label && typeof action.onPress === 'function'
    ? action : null;
  const rowAction = offerShown
    ? { label: offer.actionLabel, a11y: offer.a11y || offer.actionLabel, onPress: offer.onAction }
    : recordAction;
  const animates = !!record && celebrate;
  const opacity = useRef(new Animated.Value(animates ? 0 : 1)).current;
  const shift = useRef(new Animated.Value(animates && !reduceMotion ? -SETTLE : 0)).current;
  const text = record ? recordText(record) : (offerShown ? offer.text : '');
  const key = record ? `${record.type}|${text}` : null;

  useEffect(() => {
    if (!record) {
      // The offer never animates, and a record's enter stopped part-way (its
      // set deleted mid-fade) never leaves the offer half faded.
      opacity.setValue(1);
      shift.setValue(0);
      return undefined;
    }
    if (!celebrate) return undefined;
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

  if (!record && !offerShown) return null;

  const quiet = isFirstLift || !record;
  const live = {
    band: { borderBottomColor: t.colors.borderSubtle },
    text: { ...t.type.bodySm, color: quiet ? t.colors.textSecondary : t.colors.textPrimary },
    glyph: quiet ? t.colors.textMuted : t.colors.gold,
    dot: { ...t.type.bodySm, color: t.colors.textMuted },
    // Text ink, not amber: on the logger amber is the set you are on, a
    // record, Finish and the drain line, nothing else (D220 addendum 30).
    action: { ...t.type.label, color: t.colors.textPrimary },
  };
  const glyph = record ? recordGlyph(record.type) : 'flag-outline';
  const label = record && !isFirstLift ? `Personal record. ${text}` : text;
  const hasAction = !!rowAction;

  return (
    <Animated.View
      style={[styles.band, hasAction && styles.bandWithAction, live.band, { opacity, transform: [{ translateY: shift }] }]}
      accessible={!hasAction}
      accessibilityRole={hasAction ? undefined : 'text'}
      accessibilityLabel={hasAction ? undefined : label}
      testID="volyume-record-line"
    >
      <View
        style={[styles.fact, hasAction && styles.factWithAction]}
        accessible={hasAction}
        accessibilityRole={hasAction ? 'text' : undefined}
        accessibilityLabel={hasAction ? label : undefined}
      >
        <Ionicons name={glyph} size={iconSize.sm} color={live.glyph} />
        <Text style={[styles.text, live.text]} maxFontSizeMultiplier={fontScaleCaps.reading}>
          {text}
        </Text>
      </View>
      {hasAction ? (
        <View style={styles.actionGroup}>
          <Text
            style={live.dot}
            maxFontSizeMultiplier={fontScaleCaps.reading}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {MIDDLE_DOT}
          </Text>
          <Pressable
            style={styles.action}
            onPress={rowAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={rowAction.a11y}
            testID="volyume-record-line-action"
          >
            <Text style={live.action} maxFontSizeMultiplier={fontScaleCaps.reading}>
              {rowAction.label}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
  // With an action the band is exactly the action's 48 dp tall, and wraps:
  // at the largest text sizes the action moves under the words, centred,
  // rather than clipping either.
  bandWithAction: { paddingVertical: 0, flexWrap: 'wrap', rowGap: 0 },
  // The glyph and the words, centred as a pair.
  fact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexShrink: 1 },
  factWithAction: { paddingVertical: spacing.xs },
  // Centred as a pair with the glyph; wraps when it must and never truncates.
  text: { flexShrink: 1, textAlign: 'center' },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // A text action, a full thumb tall: the label sits in a 48 dp hit area.
  action: {
    minHeight: touchTarget.minimum,
    minWidth: touchTarget.minimum,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
