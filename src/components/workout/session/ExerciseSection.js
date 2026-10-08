/**
 * ExerciseSection
 *
 * One exercise as a house card on the session page (12-BUILD-SPEC sections
 * 1.3, 2, 2a and 3, register D220; restyled to the app's own visual language
 * on the founder's device verdict, D220 addendum 7). Three states:
 *   active    the 56 dp header, the bests line (when `bests` is given), the
 *             children (the set table and any banners the screen passes), then
 *             the 52 dp footer: Add set, Swap and the overflow
 *   done      the header with a green check and "{n} sets"; nothing else
 *   upcoming  the header and its rest-length button; nothing else
 * Only the active section mounts its children, so a session of six exercises
 * is one table and five headers.
 *
 * Header controls, one callback each (nothing is inferred from the state):
 *   the index and name, and the empty space after the chevron  onPressHeader
 *   the chevron after the name                                  onDetails
 *   the square timer button (active and upcoming)               onRestLength
 *   the square history button beside it, and the bests line     onHistory
 * onPressHeader is what makes an exercise the active one; whether it does
 * anything on the exercise that is already active is the screen's call.
 *
 * Bests line (section 2a, the founder's "previous weights and reps and the PRs
 * on the screen"). `bests` is null or
 *   { lastDateLabel, heaviest: { weight, reps } | null,
 *     atWeight: { weight, reps } | null, unit? }
 * and renders one line under the header, parts joined by a middle dot: "Last
 * session 6 Oct", "Best 75 kg (times sign) 6", "at 70 kg: 8 reps" (label role,
 * secondary ink, the numbers in primary ink on tabular figures). A null part
 * is left out with its separator; no parts means no line. There is no
 * estimated-max figure anywhere in it. `unit` is not in the spec; it defaults
 * to "kg", the only gym unit the app has. The line wraps rather than clips at
 * larger text sizes. It shows in the active state only, like the children. The
 * line is a pressable row (48 dp tall, "History and records", trailing chevron)
 * that calls `onHistory`, as does the history button in the header.
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

// Section header 56, footer 52, chevron 16 (the app's disclosure size); the
// order badge is the plan detail's 32 dp circle.
const HEADER_MIN_HEIGHT = 56;
const FOOTER_MIN_HEIGHT = 52;
const CHEVRON = 16;
const COUNTDOWN_HEIGHT = 2;
const ORDER_BADGE = 32;
// Header chevron: a 16 dp glyph, taken to a 48 dp target by its slop.
const CHEVRON_HIT_SLOP = { top: 16, bottom: 16, left: 16, right: 16 };

const MIDDLE_DOT = '\u00B7';
const TIMES = '\u00D7';

function spokenUnit(unit) {
  if (unit === 'kg') return 'kilograms';
  if (unit === 'lb' || unit === 'lbs') return 'pounds';
  return unit;
}

function repWord(reps) {
  return Number(reps) === 1 ? 'rep' : 'reps';
}

function setWord(count) {
  return count === 1 ? 'set' : 'sets';
}

function BestsLine({ bests, onPress, live, chevronColor }) {
  const unit = bests.unit || 'kg';
  const { lastDateLabel, heaviest, atWeight } = bests;
  const parts = [];
  const spoken = [];

  if (lastDateLabel) {
    parts.push(<Text key="last">{`Last session ${lastDateLabel}`}</Text>);
    spoken.push(`Last session ${lastDateLabel}`);
  }
  if (heaviest) {
    parts.push(
      <Text key="best">
        {'Best '}
        <Text style={live.bestsNum}>{String(heaviest.weight)}</Text>
        {` ${unit} ${TIMES} `}
        <Text style={live.bestsNum}>{String(heaviest.reps)}</Text>
      </Text>,
    );
    spoken.push(`Best ${heaviest.weight} ${spokenUnit(unit)} for ${heaviest.reps} ${repWord(heaviest.reps)}`);
  }
  if (atWeight) {
    parts.push(
      <Text key="at">
        {'at '}
        <Text style={live.bestsNum}>{String(atWeight.weight)}</Text>
        {` ${unit}: `}
        <Text style={live.bestsNum}>{String(atWeight.reps)}</Text>
        {` ${repWord(atWeight.reps)}`}
      </Text>,
    );
    spoken.push(`At ${atWeight.weight} ${spokenUnit(unit)}, ${atWeight.reps} ${repWord(atWeight.reps)}`);
  }
  if (parts.length === 0) return null;

  const line = [];
  parts.forEach((part, i) => {
    if (i > 0) line.push(<Text key={`dot-${i}`}>{` ${MIDDLE_DOT} `}</Text>);
    line.push(part);
  });

  return (
    <TouchableOpacity
      style={styles.bestsRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="History and records"
      accessibilityValue={{ text: `${spoken.join('. ')}.` }}
    >
      <Text style={[styles.bests, live.bests]}>{line}</Text>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={chevronColor} />
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
  bests = null,
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
    bests: { ...t.type.label, color: t.colors.textSecondary },
    bestsNum: { ...t.type.num('label'), color: t.colors.textPrimary },
    nameSkipped: { color: t.colors.textMuted },
    group: { ...t.type.caption, color: t.colors.textMuted },
    hint: { ...t.type.w(t.type.caption, 'semibold'), color: t.colors.primary },
  }), [t]);

  const isActive = state === 'active';
  const isDone = state === 'done';
  const doneCount = Number.isFinite(doneSetCount) ? doneSetCount : 0;

  return (
    <View style={[styles.section, live.section]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.titleTap}
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
            {!isActive && !isDone && doneCount > 0 && totalSetCount ? (
              <Text style={live.group} numberOfLines={1}>{`${doneCount} of ${totalSetCount} sets`}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chevron}
          onPress={onDetails}
          hitSlop={CHEVRON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={isActive ? `Details for ${name}` : `Make ${name} current`}
        >
          <Ionicons name="chevron-forward" size={CHEVRON} color={t.colors.textMuted} />
        </TouchableOpacity>
        {/* The empty space between the chevron and the right-hand control is
            part of the header target, so the whole row activates the exercise.
            It carries no label of its own: the title button already names it. */}
        <TouchableOpacity
          style={styles.headerFill}
          onPress={onPressHeader}
          accessible={false}
          importantForAccessibility="no"
        />
        {isDone ? (
          <View
            style={styles.done}
            accessible
            accessibilityLabel={`${doneCount} ${setWord(doneCount)} done`}
          >
            <Ionicons name="checkmark-circle" size={CHEVRON} color={t.colors.success} />
            <Text style={live.doneText}>{`${doneCount} ${setWord(doneCount)}`}</Text>
          </View>
        ) : skipped ? (
          <Text style={live.doneText} accessible accessibilityLabel="Left out for time">Left out</Text>
        ) : (
          <View style={styles.squares}>
            {onHistory ? (
              <TouchableOpacity
                style={styles.square}
                onPress={onHistory}
                accessibilityRole="button"
                accessibilityLabel={`History and records for ${name}`}
              >
                <Ionicons name="stats-chart-outline" size={iconSize.md} color={t.colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
            {onRestLength ? (
              <TouchableOpacity
                style={styles.square}
                onPress={onRestLength}
                accessibilityRole="button"
                accessibilityLabel={`Rest length for ${name}`}
              >
                <Ionicons name="timer-outline" size={iconSize.md} color={t.colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {isActive && bests ? (
        <BestsLine bests={bests} onPress={onHistory} live={live} chevronColor={t.colors.textMuted} />
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
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  titleTap: {
    flexShrink: 1,
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indexBadge: {
    width: ORDER_BADGE,
    height: ORDER_BADGE,
    borderRadius: circle(ORDER_BADGE),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: { flexShrink: 1 },
  name: { flexShrink: 1 },
  chevron: { marginLeft: spacing.xs },
  headerFill: { flex: 1, alignSelf: 'stretch' },
  squares: { flexDirection: 'row', alignItems: 'center' },
  // Chromeless glyph targets, as the header's X and Finish and the "..."
  // overflow on this screen (founder order 2026-08-18).
  square: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
  },
  bestsRow: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bests: { flex: 1, minWidth: 0 },
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
