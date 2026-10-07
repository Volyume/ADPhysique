/**
 * ExerciseSection
 *
 * One exercise as a full-bleed section of the session sheet (12-BUILD-SPEC
 * sections 1.3, 2, 2a and 3, register D220). Three states:
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
 * countdown  { active, ms, reduceMotion } | null. While active, a 2 dp amber
 *             line runs along the top edge of the footer and fills left to
 *             right over `ms` (the auto-advance track that lived on the bottom
 *             bar); reduceMotion draws it full at once. Decorative: hidden
 *             from the accessibility tree, and nothing is drawn when idle
 *
 * The section carries its own 10 dp band of page colour ABOVE it (spec section
 * 2: bands between sections), so the screen just stacks sections.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, radius, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

// Spec section 2: band 10, section header 56, footer 52, chevron 16, and the
// square rest-length button is a 40 dp well (grown to 48 by its hit slop).
const BAND = 10;
const HEADER_MIN_HEIGHT = 56;
const FOOTER_MIN_HEIGHT = 52;
const CHEVRON = 16;
const COUNTDOWN_HEIGHT = 2;
const REST_SQUARE = 40;
const SQUARE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };
// Header chevron: a 16 dp glyph, taken to a 48 dp target by its slop.
const CHEVRON_HIT_SLOP = { top: 16, bottom: 16, left: 16, right: 16 };
const ACTION_HIT_SLOP = { top: 0, bottom: 0, left: spacing.sm, right: spacing.sm };

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

function FooterAction({ icon, label, accessibilityLabel, onPress, glyphColor, labelStyle, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.action}
      onPress={onPress}
      hitSlop={ACTION_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={iconSize.md} color={glyphColor} />
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
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
  children,
}) {
  const t = useTheme();
  const live = useMemo(() => ({
    section: { backgroundColor: t.colors.surface },
    index: { ...t.type.num('title'), color: t.colors.textSecondary },
    name: { ...t.type.w(t.type.title, 'semibold'), color: t.colors.primary },
    square: { backgroundColor: t.colors.background, borderColor: t.colors.borderSubtle },
    doneText: { ...t.type.label, color: t.colors.textSecondary },
    bests: { ...t.type.label, color: t.colors.textSecondary },
    bestsNum: { ...t.type.num('label'), color: t.colors.textPrimary },
    action: { ...t.type.w(t.type.label, 'semibold'), color: t.colors.textPrimary },
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
          accessibilityRole="button"
          accessibilityLabel={`Exercise ${index}, ${name}${groupLabel ? `, ${groupLabel.toLowerCase()}` : ''}${skipped ? ', left out for time' : ''}`}
          accessibilityHint={isActive ? undefined : 'Makes this the current exercise'}
          accessibilityState={{ expanded: isActive }}
        >
          <Text style={[styles.index, live.index]}>{index}</Text>
          <View style={styles.nameBlock}>
            <Text style={[styles.name, live.name, skipped && live.nameSkipped]} numberOfLines={1}>{name}</Text>
            {groupLabel ? <Text style={live.group} numberOfLines={1}>{groupLabel}</Text> : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chevron}
          onPress={onDetails}
          hitSlop={CHEVRON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`Details for ${name}`}
        >
          <Ionicons name="chevron-forward" size={CHEVRON} color={t.colors.primary} />
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
            <Ionicons name="checkmark" size={CHEVRON} color={t.colors.success} />
            <Text style={live.doneText}>{`${doneCount} ${setWord(doneCount)}`}</Text>
          </View>
        ) : skipped ? (
          <Text style={live.doneText} accessible accessibilityLabel="Left out for time">Left out</Text>
        ) : (
          <View style={styles.squares}>
            {onHistory ? (
              <TouchableOpacity
                style={[styles.square, live.square]}
                onPress={onHistory}
                hitSlop={SQUARE_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={`History and records for ${name}`}
              >
                <Ionicons name="stats-chart-outline" size={iconSize.md} color={t.colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
            {onRestLength ? (
              <TouchableOpacity
                style={[styles.square, live.square]}
                onPress={onRestLength}
                hitSlop={SQUARE_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={`Rest length for ${name}`}
              >
                <Ionicons name="timer-outline" size={iconSize.md} color={t.colors.textPrimary} />
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
          <FooterAction
            testID="volyume-btn-extra-set"
            icon="add-circle-outline"
            label="Add set"
            accessibilityLabel="Add set"
            onPress={onAddSet}
            glyphColor={t.colors.textPrimary}
            labelStyle={live.action}
          />
          <FooterAction
            icon="swap-horizontal"
            label="Swap"
            accessibilityLabel="Swap exercise"
            onPress={onSwap}
            glyphColor={t.colors.textPrimary}
            labelStyle={live.action}
          />
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
  section: { marginTop: BAND },
  header: {
    minHeight: HEADER_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  titleTap: {
    flexShrink: 1,
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  index: { minWidth: spacing.lg },
  nameBlock: { flexShrink: 1 },
  name: { flexShrink: 1 },
  chevron: { marginLeft: spacing.xs },
  headerFill: { flex: 1, alignSelf: 'stretch' },
  squares: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  square: {
    width: REST_SQUARE,
    height: REST_SQUARE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
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
    gap: spacing.xl,
    paddingLeft: spacing.lg,
    // The overflow glyph sits in a 48 dp target; this much trailing padding
    // lands the glyph's right edge on the same 16 dp margin as the rows above.
    paddingRight: spacing.xxs,
  },
  countdown: { position: 'absolute', top: 0, left: 0, right: 0, height: COUNTDOWN_HEIGHT },
  countdownFill: { height: COUNTDOWN_HEIGHT },
  countdownFull: { width: '100%' },
  action: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
