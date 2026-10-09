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
 * lives where the set lives: one line inside the card, directly under the
 * set table and above the footer, in the card's own grammar (the quiet
 * lines' left edge, the list's small glyph, the body-small role). It stays
 * for as long as the exercise is open, covers nothing, and the card grows
 * by the one line. The row that earned it carries its small amber PR under
 * the set number (SetRow); this line names the record.
 *
 * Enter: the line fades in and settles down 4 dp on the house decelerate
 * curve (fade only under reduce-motion), the record haptic ladder plays
 * (the light tick for a first lift, under reduce-motion or in calm mode)
 * and the record is announced to a screen reader. All of that happens ONCE,
 * on the log that earned it (`celebrate`), never again on a remount or a
 * jump back to the exercise.
 *
 * Props
 *   record     detectPR's record ({ type, weight, reps, value, label }) plus
 *              units, or { type: 'first_lift', weight, reps, units } for the
 *              honest starting point. Null renders nothing.
 *   celebrate  true on the render that follows the log that earned the
 *              record: plays the haptic, announces, animates in.
 *   reduceMotion  the accessibility preference.
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, AccessibilityInfo } from 'react-native';
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

export default function RecordLine({ record, celebrate = false, reduceMotion = false }) {
  const t = useTheme();
  const isFirstLift = record?.type === 'first_lift';
  const opacity = useRef(new Animated.Value(celebrate ? 0 : 1)).current;
  const shift = useRef(new Animated.Value(celebrate && !reduceMotion ? -SETTLE : 0)).current;
  const text = recordText(record);
  const key = record ? `${record.type}|${text}` : null;

  useEffect(() => {
    if (!record || !celebrate) return undefined;
    // P9/E11: announced, not just shown. A first lift is never announced as
    // a record: it is the honest first, nothing more.
    try {
      AccessibilityInfo.announceForAccessibility(
        isFirstLift ? `First lift logged. ${text}.` : `Personal record. ${text}.`,
      );
    } catch (_) { /* best-effort */ }
    // The haptic weight: calm mode, reduce-motion and a first lift get the
    // light tick; a real record keeps the PR ladder (the vocabulary's).
    if (isFirstLift || reduceMotion) {
      haptics.selection();
    } else {
      getWellbeingMode()
        .then((m) => (isCalm(m) ? haptics.selection() : haptics.prAchieved()))
        .catch(() => { haptics.selection(); }); // a failed read keeps the light tick
    }
    opacity.setValue(0);
    shift.setValue(reduceMotion ? 0 : -SETTLE);
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.exit, useNativeDriver: true }),
      Animated.timing(shift, { toValue: 0, duration: motion.exit, easing: motion.easeDecelerate, useNativeDriver: true }),
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
    text: { ...t.type.bodySm, color: isFirstLift ? t.colors.textSecondary : t.colors.textPrimary },
    glyph: isFirstLift ? t.colors.textMuted : t.colors.gold,
  };

  return (
    <Animated.View
      style={[styles.line, { opacity, transform: [{ translateY: shift }] }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={isFirstLift ? text : `Personal record. ${text}`}
      testID="volyume-record-line"
    >
      <View style={styles.glyph}>
        <Ionicons name={recordGlyph(record.type)} size={iconSize.sm} color={live.glyph} />
      </View>
      <Text style={[styles.text, live.text]} maxFontSizeMultiplier={fontScaleCaps.reading}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The quiet lines' slot: no gutter of its own (the padded active body
  // insets it to the table's left edge); the glyph sits on the first line's
  // centre, the text wraps beside it and never truncates.
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  glyph: { paddingTop: 2 },
  text: { flex: 1, minWidth: 0 },
});
