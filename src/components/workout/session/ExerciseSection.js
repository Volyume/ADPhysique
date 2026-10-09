/**
 * ExerciseSection
 *
 * One exercise as a house card on the session page (12-BUILD-SPEC sections
 * 1.3, 2, 2a and 3, register D220; restyled to the app's own visual language
 * on the founder's device verdict, D220 addendum 7; the header redrawn on the
 * render verdict, addendum 9). Three states:
 *   active    the 56 dp header, then the tools row (Guide, History, Rest
 *             length: glyph over caption, the toolbar's own grammar), the
 *             children (the set table and any banners the screen passes),
 *             then the 52 dp footer: Add set, Swap and the overflow
 *   done      the header with a green check and "{n} sets"; nothing else
 *   upcoming  the header alone (with "{done} of {total} sets" once partly
 *             done); nothing else
 * Only the active section mounts its children, so a session of six exercises
 * is one table and five headers. The header is the order badge and the name
 * on ONE line, the whole width; nothing sits after the name but the state.
 *
 * Callbacks, one each (nothing is inferred from the state):
 *   the whole header                        onPressHeader
 *   the Guide tool (the exercise's guide)   onDetails
 *   the Rest length tool                    onRestLength
 *   the History tool                        onHistory
 * A tool renders only when its callback is given, and only on the active
 * section. onPressHeader is what makes an exercise the active one; whether
 * it does anything on the exercise that is already active is the screen's
 * call.
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
import Button from '../../Button';
import { circle, iconSize, radius, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

// Section header 56, footer 52; the done mark 16 (the list's small glyph);
// the order badge is the plan detail's 32 dp circle; a tool is the toolbar's
// 22 dp glyph over a caption, 48 dp tall.
const HEADER_MIN_HEIGHT = 56;
const FOOTER_MIN_HEIGHT = 52;
const DONE_GLYPH = 16;
const TOOL_GLYPH = 22;
const COUNTDOWN_HEIGHT = 2;
const ORDER_BADGE = 32;
const TOOL_WIDTH = 56;


function setWord(count) {
  return count === 1 ? 'set' : 'sets';
}

function Tool({ icon, label, spoken, onPress, live, glyphColor }) {
  return (
    <TouchableOpacity
      style={styles.tool}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
    >
      <Ionicons name={icon} size={TOOL_GLYPH} color={glyphColor} />
      <Text style={live.toolLabel} numberOfLines={1}>{label}</Text>
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
  onDetails,
  onRestLength,
  onHistory,
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
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    doneText: { ...t.type.label, color: t.colors.textSecondary },
    toolLabel: { ...t.type.caption, color: t.colors.textSecondary },
    nameSkipped: { color: t.colors.textMuted },
    group: { ...t.type.caption, color: t.colors.textMuted },
    hint: { ...t.type.w(t.type.caption, 'semibold'), color: t.colors.primary },
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
        accessibilityHint={isActive ? undefined : 'Makes this the current exercise'}
        accessibilityState={{ expanded: isActive }}
      >
        <View style={[styles.indexBadge, live.indexBadge]}>
          <Text style={live.index}>{index}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={[styles.name, live.name, skipped && live.nameSkipped]} numberOfLines={1}>{name}</Text>
          {groupLabel ? <Text style={live.group} numberOfLines={1}>{groupLabel}</Text> : null}
        </View>
        {isDone ? (
          <View style={styles.done} accessible accessibilityLabel={`${doneCount} ${setWord(doneCount)} done`}>
            <Ionicons name="checkmark-circle" size={DONE_GLYPH} color={t.colors.success} />
            <Text style={live.doneText}>{`${doneCount} ${setWord(doneCount)}`}</Text>
          </View>
        ) : skipped ? (
          <Text style={live.doneText} accessible accessibilityLabel="Left out for time">Left out</Text>
        ) : !isActive && doneCount > 0 && totalSetCount ? (
          <Text style={live.doneText} numberOfLines={1}>{`${doneCount} of ${totalSetCount} sets`}</Text>
        ) : null}
      </TouchableOpacity>

      {/* The tools, the toolbar's grammar (glyph over caption, chromeless):
          each says what it is, where a bare chevron did not (founder render
          verdict 2026-10-09). */}
      {isActive && (onDetails || onHistory || onRestLength) ? (
        <View style={styles.tools}>
          {onDetails ? (
            <Tool icon="information-circle-outline" label="Guide" spoken={`Guide for ${name}`} onPress={onDetails} live={live} glyphColor={t.colors.textSecondary} />
          ) : null}
          {onHistory ? (
            <Tool icon="stats-chart-outline" label="History" spoken={`History and records for ${name}`} onPress={onHistory} live={live} glyphColor={t.colors.textSecondary} />
          ) : null}
          {onRestLength ? (
            <Tool icon="timer-outline" label="Rest length" spoken={`Rest length for ${name}`} onPress={onRestLength} live={live} glyphColor={t.colors.textSecondary} />
          ) : null}
        </View>
      ) : null}

      {isActive ? children : null}

      {isActive ? (
        <View style={styles.footer}>
          {countdown && countdown.active ? (
            <CountdownLine ms={countdown.ms} reduceMotion={!!countdown.reduceMotion} color={t.colors.primary} />
          ) : null}
          <Button
            testID="volyume-btn-extra-set"
            title="Add set"
            icon="add"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={onAddSet}
            accessibilityLabel="Add set"
          />
          {onSwap ? (
            <Button
              title="Swap"
              icon="swap-horizontal"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={onSwap}
              accessibilityLabel="Swap exercise"
            />
          ) : null}
          <View style={styles.footerFill} />
          <TouchableOpacity
            testID="volyume-section-more"
            style={[styles.more, moreHint ? styles.moreHinted : null]}
            onPress={onMore}
            accessibilityRole="button"
            accessibilityLabel={moreHint ? 'More options for this exercise, including how logging works' : 'More options for this exercise'}
          >
            {moreHint ? <Text style={live.hint}>{moreHint}</Text> : null}
            <Ionicons name="ellipsis-horizontal" size={iconSize.md} color={moreHint ? t.colors.primary : t.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  header: {
    minHeight: HEADER_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  indexBadge: {
    width: ORDER_BADGE,
    height: ORDER_BADGE,
    borderRadius: circle(ORDER_BADGE),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: { flex: 1, minWidth: 0 },
  name: { flexShrink: 1 },
  // The tools row: the toolbar's tools, left-aligned under the name.
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  tool: {
    minWidth: TOOL_WIDTH,
    minHeight: touchTarget.minimum,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
  },
  footer: {
    minHeight: FOOTER_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  countdown: { position: 'absolute', top: 0, left: 0, right: 0, height: COUNTDOWN_HEIGHT },
  countdownFill: { height: COUNTDOWN_HEIGHT },
  countdownFull: { width: '100%' },
  footerFill: { flex: 1 },
  more: {
    minWidth: touchTarget.minimum,
    height: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  moreHinted: { paddingHorizontal: spacing.sm },
});
