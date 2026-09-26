/**
 * RecoveryLearningCard (register D210). Founder, 2026-09-26: "We had
 * recovery intelligence that learns people's recovery and adjusts as it goes
 * along based on performance from a start", and, of the rebuild: "we need an
 * elegant way to show and demonstrate this intelligence too."
 *
 * The personal recovery learner (src/lib/recovery/personalRecovery.js) is
 * shown here as one thing a person can see move: a scale from faster to
 * slower, with the first estimate (their own recovery answer) marked on it
 * and, once the lifts show a clear difference, where they actually are. One
 * plain sentence says what changed and why, one example puts it in days for
 * the muscle the learning rests on most, and one line says how much it is
 * based on. Before it can say anything, the card says why not, and how far
 * along it is (spec section 6: every "not adjusted" state carries its
 * reason; the count shown is only of comparisons that carry information).
 *
 * Words (D207 plain English; D204 describes, never instructs): no "factor",
 * "pairs" or "calibrated"; nothing tells anyone to train, rest or change
 * their schedule; every figure is an estimate and says so. No em dash.
 *
 * Pure presentation: no I/O, never imports `../lib/database`. The reading
 * arrives from loadMuscleRecovery (via ReadinessCards) as `personal`.
 *
 * Props:
 *   personal   { factor, prior, pairs, reason, pairsByMuscle } or null
 *              (null renders nothing)
 */
import { View, Text, StyleSheet } from 'react-native';
import {
  colors, spacing, radius, type, fontSize, fontFamily, fontWeight, circle,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import {
  PERSONAL_FACTOR_MIN, PERSONAL_FACTOR_MAX, PERSONAL_MIN_PAIRS, REFERENCE_SETS, recoveryHours,
} from '../lib/recovery/constants';
import { personalDirection } from '../lib/recovery/personalRecovery';

export const RECOVERY_SPEED_TITLE = 'Your recovery speed';
export const RECOVERY_SPEED_FOOTER = 'It starts from your answer to ‘How’s your recovery?’ and only changes when your workouts show a clear difference. It’s an estimate, not a measurement.';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Hours the way a person says them: under a day and a half in hours,
 * otherwise days to the nearest half ("2½ days").
 */
export function spokenDuration(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return null;
  if (hours < 36) return plural(Math.round(hours), 'hour');
  const halves = Math.round((hours / 24) * 2);
  const whole = Math.floor(halves / 2);
  return halves % 2 === 1 ? `${whole}½ days` : plural(whole, 'day');
}

/** The muscle the learning rests on most (the most comparisons; ties by key). */
export function learningExampleMuscle(pairsByMuscle) {
  const entries = Object.entries(pairsByMuscle || {}).filter(([, n]) => Number(n) > 0);
  if (!entries.length) return null;
  entries.sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  return entries[0][0];
}

/**
 * The example for an adjusted reading: the muscle the learning rests on
 * most, after a standard session, at the first estimate and now. `sentence`
 * is its spoken form ("Quads after 6 sets: about 3½ days, up from 3
 * days."). Hours when the two round to the same number of days.
 * Null when there is no muscle to name.
 *
 * @returns {{ name:string, sets:number, before:string, now:string,
 *   sentence:string }|null}
 */
export function learningExample(personal) {
  const muscle = learningExampleMuscle(personal?.pairsByMuscle);
  if (!muscle) return null;
  const name = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  const yours = recoveryHours(muscle, { sets: REFERENCE_SETS, personalFactor: personal.factor });
  const first = recoveryHours(muscle, { sets: REFERENCE_SETS, personalFactor: personal.prior });
  let now = spokenDuration(yours);
  let before = spokenDuration(first);
  if (!now || !before) return null;
  if (now === before) {
    now = plural(Math.round(yours), 'hour');
    before = plural(Math.round(first), 'hour');
  }
  if (now === before) return null;
  const way = yours < first ? 'down' : 'up';
  return {
    name,
    sets: REFERENCE_SETS,
    before,
    now,
    sentence: `${name} after ${REFERENCE_SETS} sets: about ${now}, ${way} from ${before}.`,
  };
}

/**
 * Everything the card says, for a reading. `state` is 'faster' | 'slower' |
 * 'steady' | 'waiting' | 'learning'. Null when there is no reading.
 *
 * Every sentence is only as strong as the learner's evidence (D210 addendum
 * 3, from its review): the comparisons are of the same lift on the same day
 * of the week, which is what the evidence line says (effort is matched only
 * inside a plan, so it does not claim "the same effort"); the change is
 * stated for the estimate, not for "each muscle", with the estimate's own
 * bounds (a session already at the 24-hour minimum cannot get shorter, nor
 * one at the week's maximum longer: RECOVERY_HOURS_MIN and _MAX); and each
 * "not yet" names its own reason, true of the schedules that produce it.
 *
 * @returns {{ state:string, headline:string, body:string, example:(object|null),
 *   evidence:(string|null), progress:({ done:number, needed:number }|null) }|null}
 */
export function recoveryLearningCopy(personal) {
  const direction = personalDirection(personal);
  if (!direction) return null;
  const pairs = Math.max(0, Number(personal.pairs) || 0);
  const evidence = `Based on ${plural(pairs, 'comparison')} of the same exercise on the same day in different weeks.`;
  if (direction === 'faster' || direction === 'slower') {
    const pct = Math.round(Math.abs(personal.factor / personal.prior - 1) * 100);
    return {
      state: direction,
      headline: direction === 'faster' ? 'Faster than first estimated' : 'Slower than first estimated',
      body: direction === 'faster'
        ? `When you train again soon after a workout, you lift more than first expected. So your recovery is now estimated to take about ${pct}% less time, though never less than a day.`
        : `When you train again soon after a workout, you lift less than first expected. So your recovery is now estimated to take about ${pct}% longer, though never more than a week.`,
      example: learningExample(personal),
      evidence,
      progress: null,
    };
  }
  if (direction === 'not_clear') {
    return {
      state: 'steady',
      headline: 'In line with the first estimate',
      body: 'So far, how much you lift after short and long breaks shows no clear difference from the first estimate, so the estimate stays the same.',
      example: null,
      evidence,
      progress: null,
    };
  }
  if (direction === 'no_spread') {
    return {
      state: 'waiting',
      headline: 'Not learning yet',
      body: 'Your recovery speed is worked out by comparing the same exercise on the same day in different weeks, after breaks of different lengths. So far, the breaks before those workouts have been too alike, or long enough to recover fully.',
      example: null,
      evidence: null,
      progress: null,
    };
  }
  if (direction === 'fixed_reps') {
    return {
      state: 'waiting',
      headline: 'Not learning yet',
      body: 'When an exercise is logged with exactly the same reps at least half the time, that shows the plan rather than how each workout went, so it is left out. That leaves too few comparisons so far.',
      example: null,
      evidence: null,
      progress: null,
    };
  }
  return {
    state: 'learning',
    headline: 'Still learning',
    body: `Each exercise is compared with the same exercise on the same day in an earlier week. Learning starts once there are ${PERSONAL_MIN_PAIRS} of these comparisons.`,
    example: null,
    evidence: null,
    progress: { done: Math.min(pairs, PERSONAL_MIN_PAIRS), needed: PERSONAL_MIN_PAIRS },
  };
}

/** The card's subtitle: "learned" only once something has been learned. */
export function recoveryLearningSubtitle(copy) {
  return copy && (copy.state === 'faster' || copy.state === 'slower' || copy.state === 'steady')
    ? 'Learned from your workouts · estimated'
    : 'Learns from your workouts · estimated';
}

/** Where a factor sits on the scale, 0 (fastest) to 1 (slowest). */
export function scalePosition(factor) {
  const f = Number(factor);
  if (!Number.isFinite(f)) return null;
  const p = (f - PERSONAL_FACTOR_MIN) / (PERSONAL_FACTOR_MAX - PERSONAL_FACTOR_MIN);
  return Math.min(1, Math.max(0, p));
}

const MARKER = spacing.md;
const LABEL_WIDTH = 104;
const pct = (fraction) => `${Math.round(fraction * 1000) / 10}%`;

/**
 * Where a marker label sits, by percentage of the track (no measuring, so
 * it is right on the first frame and on every renderer): centred on its
 * point, except near an end, where it starts or ends at the point so it
 * stays over the track.
 */
export function pointLabelPlacement(position) {
  if (position < 0.2) return { style: { left: pct(position), marginLeft: -MARKER / 2 }, textAlign: 'left' };
  if (position > 0.8) return { style: { right: pct(1 - position), marginRight: -MARKER / 2 }, textAlign: 'right' };
  return { style: { left: pct(position), marginLeft: -LABEL_WIDTH / 2 }, textAlign: 'center' };
}

/** One marker label, positioned by a View so the text sits where the
 * marker is on every renderer. */
function PointLabel({ text, position, edge, textStyle }) {
  const placement = pointLabelPlacement(position);
  return (
    <View style={[styles.pointLabel, edge, placement.style]}>
      <Text style={[textStyle, { textAlign: placement.textAlign }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function SpeedScale({ copy, personal, live }) {
  const moved = copy.state === 'faster' || copy.state === 'slower';
  const start = scalePosition(personal.prior);
  const yours = moved ? scalePosition(personal.factor) : start;
  const from = Math.min(start, yours);
  const to = Math.max(start, yours);
  return (
    <View style={styles.scale} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={styles.scaleRow}>
        <Text style={[styles.scaleEnd, live.scaleEnd]}>Faster</Text>
        <View style={styles.trackBox}>
          {moved ? <PointLabel text="You" position={yours} edge={styles.aboveTrack} textStyle={live.youLabel} /> : null}
          <View style={[styles.track, live.track]}>
            {moved ? <View style={[styles.span, live.span, { left: pct(from), width: pct(to - from) }]} /> : null}
          </View>
          <View style={[styles.marker, styles.markerStart, live.markerStart, { left: pct(start) }]} />
          {moved ? <View style={[styles.marker, styles.markerYou, live.markerYou, { left: pct(yours) }]} /> : null}
          <PointLabel text="First estimate" position={start} edge={styles.belowTrack} textStyle={live.startLabel} />
        </View>
        <Text style={[styles.scaleEnd, live.scaleEnd]}>Slower</Text>
      </View>
    </View>
  );
}

/** The example as two tiles that mirror the scale's two markers. */
function ExampleTiles({ example, live }) {
  return (
    <View style={styles.example}>
      <Text style={[styles.exampleLabel, live.exampleLabel]}>
        {`${example.name} after ${example.sets} sets, estimated recovery time`}
      </Text>
      <View style={styles.tiles}>
        <View style={[styles.tile, live.tileFirst]} accessible accessibilityLabel={`First estimate, ${example.before}`}>
          <Text style={[styles.tileLabel, live.tileLabelFirst]}>First estimate</Text>
          <Text style={[styles.tileValue, live.tileValueFirst]}>{example.before}</Text>
        </View>
        <View style={[styles.tile, live.tileYou]} accessible accessibilityLabel={`You, ${example.now}`}>
          <Text style={[styles.tileLabel, live.tileLabelYou]}>You</Text>
          <Text style={[styles.tileValue, live.tileValueYou]}>{example.now}</Text>
        </View>
      </View>
    </View>
  );
}

export default function RecoveryLearningCard({ personal = null }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const copy = recoveryLearningCopy(personal);
  if (!copy) return null;
  const progressPct = copy.progress ? `${Math.round((copy.progress.done / copy.progress.needed) * 100)}%` : null;
  return (
    // Not one grouped node (D210 addendum 3): a screen reader reads the
    // title as a heading and every line after it, the footer's "An estimate,
    // not a measurement" included. The drawn scale is hidden from it; its
    // meaning is in the headline and the tiles.
    <View style={[styles.card, live.card]}>
      <View>
        <Text style={[styles.title, live.title]} accessibilityRole="header">{RECOVERY_SPEED_TITLE}</Text>
        <Text style={[styles.sub, live.sub]}>{recoveryLearningSubtitle(copy)}</Text>
      </View>
      <SpeedScale copy={copy} personal={personal} live={live} />
      <View style={styles.words}>
        <Text style={[styles.headline, live.headline]}>{copy.headline}</Text>
        <Text style={[styles.body, live.body]}>{copy.body}</Text>
      </View>
      {copy.example ? <ExampleTiles example={copy.example} live={live} /> : null}
      {copy.progress ? (
        <View style={styles.progress}>
          <View style={[styles.progressTrack, live.track]}>
            <View style={[styles.progressFill, live.progressFill, { width: progressPct }]} />
          </View>
          <Text style={[styles.meta, live.meta]}>
            {`${copy.progress.done} of ${copy.progress.needed} comparisons so far`}
          </Text>
        </View>
      ) : null}
      {copy.evidence ? <Text style={[styles.meta, live.meta]}>{copy.evidence}</Text> : null}
      <Text style={[styles.footer, live.footer]}>{RECOVERY_SPEED_FOOTER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.md,
  },
  title: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sub: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xxs },
  scale: { paddingVertical: spacing.xs },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scaleEnd: { ...type.captionTight, color: colors.textMuted },
  trackBox: {
    flex: 1, height: spacing.xxxl, justifyContent: 'center',
  },
  track: {
    height: spacing.xs2, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden',
  },
  span: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.primaryBg },
  marker: {
    position: 'absolute', width: MARKER, height: MARKER, borderRadius: circle(MARKER),
    marginLeft: -MARKER / 2, top: (spacing.xxxl - MARKER) / 2, borderWidth: 2,
  },
  markerStart: { borderColor: colors.textMuted, backgroundColor: colors.surface },
  markerYou: { backgroundColor: colors.primary, borderColor: colors.surface },
  pointLabel: { position: 'absolute', width: LABEL_WIDTH },
  aboveTrack: { top: 0 },
  belowTrack: { bottom: 0 },
  words: { gap: spacing.xs },
  headline: { ...type.title, color: colors.textPrimary },
  body: { ...type.caption, color: colors.textSecondary },
  example: { gap: spacing.sm },
  exampleLabel: { ...type.captionTight, color: colors.textMuted },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surface2, gap: spacing.xxs,
  },
  tileLabel: { ...type.captionTight, color: colors.textMuted },
  tileValue: { ...type.bodyStrong, color: colors.textPrimary },
  progress: { gap: spacing.xs },
  progressTrack: {
    height: spacing.xs2, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  meta: { ...type.captionTight, color: colors.textMuted },
  footer: { ...type.caption, color: colors.textMuted },
});

// Live theme override for the frozen block above (the frozen-plus-live
// `buildLiveStyles` pattern MuscleRecoveryList.js and ReadinessCards.js
// carry), so a theme change re-reads every colour and type role.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    title: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    sub: { ...t.type.captionTight, color: t.colors.textMuted },
    scaleEnd: { ...t.type.captionTight, color: t.colors.textMuted },
    track: { backgroundColor: t.colors.surface2 },
    span: { backgroundColor: t.colors.primaryBg },
    markerStart: { borderColor: t.colors.textMuted, backgroundColor: t.colors.surface },
    markerYou: { backgroundColor: t.colors.primary, borderColor: t.colors.surface },
    youLabel: { ...t.type.captionStrong, color: t.colors.primary },
    startLabel: { ...t.type.captionTight, color: t.colors.textMuted },
    headline: { ...t.type.title, color: t.colors.textPrimary },
    body: { ...t.type.caption, color: t.colors.textSecondary },
    exampleLabel: { ...t.type.captionTight, color: t.colors.textMuted },
    tileFirst: { backgroundColor: t.colors.surface2 },
    tileYou: { backgroundColor: t.colors.primaryBg },
    tileLabelFirst: { ...t.type.captionTight, color: t.colors.textMuted },
    tileLabelYou: { ...t.type.captionStrong, color: t.colors.primary },
    tileValueFirst: { ...t.type.bodyStrong, color: t.colors.textSecondary },
    tileValueYou: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    progressFill: { backgroundColor: t.colors.primary },
    meta: { ...t.type.captionTight, color: t.colors.textMuted },
    footer: { ...t.type.caption, color: t.colors.textMuted },
  };
}
