/**
 * ExerciseSection
 *
 * One exercise as a house card on the session page (12-BUILD-SPEC sections
 * 1.3, 2, 2a and 3, register D220; restyled to the app's own visual language
 * on the founder's device verdict, D220 addendum 7; the header redrawn on the
 * render verdicts, addenda 9 and 10). Three states:
 *   active    the 56 dp header, the children (the set table and any banners
 *             the screen passes), then the 52 dp footer: Add set, Swap and
 *             the overflow
 *   done      the header with the green check; nothing else
 *   upcoming  the header alone (with "{done} of {total}" once partly done)
 * Only the active section mounts its children, so a session of six exercises
 * is one table and five headers. The header is a 24 dp order badge and the
 * name on ONE line across the whole width, at the label role semibold (the
 * founder's 2026-08-18 size for the logger name); the longest names in the
 * library (45 characters) scale down a little rather than wrap or clip.
 * Nothing sits after the name but the state. The exercise's tools live
 * elsewhere (addendum 10): History on the session toolbar, the guide behind
 * the name tap, the rest length on the overflow sheet.
 *
 * One callback: the whole header is onPressHeader. On a collapsed section the
 * screen makes that exercise current; on the active section it opens the
 * exercise guide. The hint says which.
 *
 * The bests line of section 2a (last session, heaviest, best at today's
 * weight) is gone (founder render verdict 2026-10-08: "looks stupid out of
 * place"); the history button in the header opens the same history and
 * records sheet, one tap.
 *
 * Three more header facts the outline used to carry (stage A wiring, lead):
 *   groupLabel  "Superset", "Giant set" or "Circuit", a caption after the name
 *   skipped     a time-crunch skip: the name in muted ink and "Left out" in
 *               the count slot, still tappable so the skip can be reverted
 *   moreHint    a one-word cue beside the overflow glyph while the first-use
 *               logging help has never been opened (C5-P13-03)
 * A square well renders only when its callback is given, so a stage that has
 * not wired a sheet yet shows no dead control.
 *
 * totalSetCount  the exercise's served set count; with doneSetCount above
 *             zero on an upcoming (partly done) section, the header shows
 *             "{done} of {total} sets" under the name
 * countdown  { active, ms, reduceMotion } | null. While active, a 2 dp amber
 *             line runs along the top edge of the footer and fills left to
 *             right over `ms` (the auto-advance track that lived on the bottom
 *             bar); reduceMotion draws it full at once. Decorative: hidden
 *             from the accessibility tree, and nothing is drawn when idle
 *
 * The card carries no band of its own: the screen's page padding and gap
 * space the cards, as on every other list in the app.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { circle, iconSize, radius, spacing, fontScaleCaps } from '../../../styles/theme';
import { SET_COLUMNS } from './SetRow';
import { touchTarget } from '../../../styles/layout';

// Section header 56, footer 52; the done mark 16 (the list's small glyph);
// the order badge is the set table's 24 dp marker.
const HEADER_MIN_HEIGHT = 56;
const FOOTER_MIN_HEIGHT = 52;
const DONE_GLYPH = 16;
// The longest library name is 45 characters; the name shrinks this far
// before it would wrap or clip, never into a neighbour.
const NAME_MIN_SCALE = 0.75;
const COUNTDOWN_HEIGHT = 2;
const ORDER_BADGE = 24;
const MORE_HIT_SLOP = { top: 0, bottom: 0, left: 6, right: 6 };


function setWord(count) {
  return count === 1 ? 'set' : 'sets';
}

// A footer action is a label and a glyph, never a boxed button (D8: never a
// second primary; the founder's ruling against pill buttons, D220 addendum
// 15): 20 dp glyph, semibold label, a 48 dp target.
function FooterAction({ icon, label, accessibilityLabel, onPress, glyphColor, labelStyle, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.action}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={iconSize.md} color={glyphColor} />
      <Text style={labelStyle} maxFontSizeMultiplier={fontScaleCaps.chrome}>{label}</Text>
    </TouchableOpacity>
  );
}

function CountdownLine({ ms, reduceMotion, color }) {
  const progress = useRef(new Animated.Value(0)).current;
  // Mounted only while active, so each arming restarts the fill from empty.
  // Reduce motion skips the animation and the line is drawn full below.
  useEffect(() => {
    if (reduceMotion) return undefined;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: ms, useNativeDriver: false }).start();
    return () => progress.stopAnimation();
  }, [ms, reduceMotion, progress]);
  return (
    <View
      testID="volyume-countdown-line"
      style={styles.countdown}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {reduceMotion ? (
        <View style={[styles.countdownFill, styles.countdownFull, { backgroundColor: color }]} />
      ) : (
        <Animated.View
          style={[
            styles.countdownFill,
            { backgroundColor: color, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      )}
    </View>
  );
}


export default function ExerciseSection({
  index,
  name,
  state = 'upcoming',
  doneSetCount = 0,
  onPressHeader,
  onAddSet,
  onSwap,
  onMore,
  groupLabel = null,
  skipped = false,
  moreHint = null,
  countdown = null,
  totalSetCount = null,
  children,
}) {
  const t = useTheme();
  // The house card (Card.js geometry: surface, radius.lg, 1 px borderSubtle)
  // with the plan detail's exercise row inside it (RoutineDetailScreen's
  // exerciseCard: a 32 dp surface2 order badge, bodyStrong name in primary
  // ink). Amber is spent on nothing in the header; the set you are on and a
  // record carry it inside.
  const live = useMemo(() => ({
    section: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    indexBadge: { backgroundColor: t.colors.surface2 },
    index: { ...t.type.w(t.type.num('label'), 'bold'), color: t.colors.textSecondary },
    name: { ...t.type.w(t.type.label, 'semibold'), color: t.colors.textPrimary },
    doneText: { ...t.type.caption, color: t.colors.textSecondary },
    action: { ...t.type.w(t.type.label, 'semibold'), color: t.colors.textPrimary },
    nameSkipped: { color: t.colors.textMuted },
    group: { ...t.type.caption, color: t.colors.textMuted },
    hint: { ...t.type.w(t.type.caption, 'semibold'), color: t.colors.textSecondary },
  }), [t]);

  const isActive = state === 'active';
  const isDone = state === 'done';
  const doneCount = Number.isFinite(doneSetCount) ? doneSetCount : 0;

  return (
    <View style={[styles.section, live.section]}>
      <TouchableOpacity
        style={styles.header}
        onPress={onPressHeader}
        disabled={!onPressHeader}
        accessibilityRole={onPressHeader ? 'button' : 'header'}
        accessibilityLabel={`Exercise ${index}, ${name}${groupLabel ? `, ${groupLabel.toLowerCase()}` : ''}${skipped ? ', left out for time' : ''}${!isActive && !isDone && doneCount > 0 && totalSetCount ? `, ${doneCount} of ${totalSetCount} sets done` : ''}`}
        accessibilityHint={isActive ? (onPressHeader ? 'Opens the exercise guide' : undefined) : 'Makes this the current exercise'}
        accessibilityState={{ expanded: isActive }}
      >
        <View style={[styles.indexBadge, live.indexBadge]}>
          <Text style={live.index} maxFontSizeMultiplier={fontScaleCaps.chrome}>{index}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text
            style={[styles.name, live.name, skipped && live.nameSkipped]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={NAME_MIN_SCALE}
            maxFontSizeMultiplier={fontScaleCaps.chrome}
            >
            {name}
          </Text>
          {groupLabel ? <Text style={live.group} numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.chrome}>{groupLabel}</Text> : null}
        </View>
        {isDone ? (
          <View style={styles.state} accessible accessibilityLabel={`${doneCount} ${setWord(doneCount)} done`}>
            <Ionicons name="checkmark-circle" size={DONE_GLYPH} color={t.colors.success} />
          </View>
        ) : skipped ? (
          <View style={styles.state}>
            <Text style={live.doneText} accessible accessibilityLabel="Left out for time" maxFontSizeMultiplier={fontScaleCaps.chrome}>Left out</Text>
          </View>
        ) : !isActive && doneCount > 0 && totalSetCount ? (
          <View style={styles.state}>
            <Text style={live.doneText} numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.chrome}>{`${doneCount} of ${totalSetCount}`}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {isActive ? children : null}

      {isActive ? (
        <View style={styles.footer}>
          {countdown && countdown.active ? (
            <CountdownLine ms={countdown.ms} reduceMotion={!!countdown.reduceMotion} color={t.colors.primary} />
          ) : null}
          <FooterAction
            testID="volyume-btn-extra-set"
            icon="add"
            label="Add set"
            accessibilityLabel="Add set"
            onPress={onAddSet}
            glyphColor={t.colors.textPrimary}
            labelStyle={live.action}
          />
          {onSwap ? (
            <FooterAction
              icon="swap-horizontal"
              label="Swap"
              accessibilityLabel="Swap exercise"
              onPress={onSwap}
              glyphColor={t.colors.textPrimary}
              labelStyle={live.action}
            />
          ) : null}
          <View style={styles.footerFill} />
          <TouchableOpacity
            testID="volyume-section-more"
            style={[styles.more, moreHint ? styles.moreHinted : null]}
            onPress={onMore}
            hitSlop={MORE_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={moreHint ? 'More options for this exercise, including how logging works' : 'More options for this exercise'}
          >
            {moreHint ? <Text style={live.hint} maxFontSizeMultiplier={fontScaleCaps.chrome}>{moreHint}</Text> : null}
            <Ionicons name="ellipsis-horizontal" size={iconSize.md} color={moreHint ? t.colors.textPrimary : t.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  // The card grid (D220 addendum 13, the alignment pass): the header, the
  // table and the footer share one left edge (12 dp in) and one right-hand
  // column (the 36 dp check column, 8 dp in), so the order badge sits on the
  // set numbers' axis, the name starts where LAST starts, and the done check,
  // the row checks and the overflow glyph share one centre line.
  header: {
    minHeight: HEADER_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  state: { minWidth: SET_COLUMNS.check, alignItems: 'center', justifyContent: 'center' },
  indexBadge: {
    width: ORDER_BADGE,
    height: ORDER_BADGE,
    borderRadius: circle(ORDER_BADGE),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: { flex: 1, minWidth: 0 },
  name: { flexShrink: 1 },
  footer: {
    minHeight: FOOTER_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  action: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  countdown: { position: 'absolute', top: 0, left: 0, right: 0, height: COUNTDOWN_HEIGHT },
  countdownFill: { height: COUNTDOWN_HEIGHT },
  countdownFull: { width: '100%' },
  footerFill: { flex: 1 },
  // The overflow sits in the check column's 36 dp, taken to 48 by its slop.
  more: {
    minWidth: SET_COLUMNS.check,
    height: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  moreHinted: { paddingHorizontal: spacing.sm },
});
