/**
 * RecoveryLearningCard (register D210). Founder, 2026-09-26: "We had
 * recovery intelligence that learns people's recovery and adjusts as it goes
 * along based on performance from a start", and, of the rebuild: "we need an
 * elegant way to show and demonstrate this intelligence too."
 *
 * The personal recovery learner (src/lib/recovery/personalRecovery.js) is
 * shown here as one thing a person can see move: a thin scale from faster to
 * slower, with a tick for the first estimate (their own recovery answer) and
 * a marker for "You", BOTH ALWAYS drawn (D214, RC-13: in the steady state
 * only the first estimate used to show, so nothing said where the person
 * sits; they read "You, at the first estimate" while the two coincide, and
 * neither is a round thumb that looks draggable). ONE plain sentence under
 * the headline says what changed, one line says how much it is based on, and
 * "How this is worked out" opens the method, the example in days for the
 * muscle the learning rests on most, and the footer (RC-21: three
 * paragraphs of method under a non-control are not the card's news). Before
 * it can say anything, the card says why not, and how far along it is (spec
 * section 6: every "not adjusted" state carries its reason; the count shown
 * is only of comparisons that carry information). Facts are ink: no amber
 * on the marker.
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
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, radius, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import {
  PERSONAL_FACTOR_MIN, PERSONAL_FACTOR_MAX, PERSONAL_MIN_PAIRS, PERSONAL_MIN_MUSCLE_PAIRS, REFERENCE_SETS, recoveryHours,
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
 * `summary` is the ONE sentence under the headline; `body` is the method
 * paragraph behind "How this is worked out".
 *
 * @returns {{ state:string, headline:string, summary:string, body:string,
 *   example:(object|null), evidence:(string|null),
 *   progress:({ done:number, needed:number }|null) }|null}
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
      // D214 addendum 9 (0.7): "your first estimate" and "the first estimate" are
      // the phrase the scale and the footer already use ("First estimate");
      // "first estimated" was a verb used as a noun.
      headline: direction === 'faster' ? 'Faster than your first estimate' : 'Slower than your first estimate',
      summary: direction === 'faster'
        ? `Your recovery is now estimated to take about ${pct}% less time than the first estimate.`
        : `Your recovery is now estimated to take about ${pct}% more time than the first estimate.`,
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
      summary: 'Your workouts so far show no clear difference from the first estimate, so it stays the same.',
      body: 'So far, how much you lift after short and long rests shows no clear difference from the first estimate, so the estimate stays the same.',
      example: null,
      evidence,
      progress: null,
    };
  }
  if (direction === 'no_spread') {
    return {
      state: 'waiting',
      headline: 'Not learning yet',
      // Addendum 9 (0.9): "rest" is the common word for the time between workouts.
      summary: 'The rest between your workouts has not varied enough to learn from yet.',
      body: 'Your recovery speed is worked out by comparing the same exercise on the same day in different weeks, after rests of different lengths. So far the rests have been too alike, or long enough to recover fully.',
      example: null,
      evidence: null,
      progress: null,
    };
  }
  if (direction === 'fixed_reps') {
    return {
      state: 'waiting',
      headline: 'Not learning yet',
      summary: 'Too few comparisons are left once exercises with the same reps every time are set aside.',
      body: 'When an exercise is logged with exactly the same reps at least half the time, that shows the plan rather than how each workout went, so it is left out. That leaves too few comparisons so far.',
      example: null,
      evidence: null,
      progress: null,
    };
  }
  return {
    state: 'learning',
    headline: 'Still learning',
    summary: `Learning starts after ${PERSONAL_MIN_PAIRS} usable comparisons.`,
    body: `Each exercise is compared with the same exercise on the same day in an earlier week. A muscle’s comparisons become usable once it has ${PERSONAL_MIN_MUSCLE_PAIRS}, and learning starts after ${PERSONAL_MIN_PAIRS} usable comparisons.`,
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

const TICK_W = spacing.xxs; // the first estimate: a long, thin hairline
const TICK_H = spacing.xxl; // 32
const TICK_ABOVE = spacing.sm + spacing.xxs; // 10: how far the tick rises above the track's centre line
const YOU_W = spacing.xs2; // "You": a short, thick block, never a round thumb
const YOU_H = spacing.lg - spacing.xxs; // 14
const TRACK_BOX_H = spacing.xxxl + spacing.xxl; // 80: room for a label above and below the track
const LABEL_WIDTH = 104;
const LABEL_WIDTH_WIDE = 156; // "You, at the first estimate" on one line
const pct = (fraction) => `${Math.round(fraction * 1000) / 10}%`;

/**
 * Where a marker label sits, by percentage of the track (no measuring, so
 * it is right on the first frame and on every renderer): centred on its
 * point, except near an end, where it starts or ends at the point so it
 * stays over the track.
 */
export function pointLabelPlacement(position, width = LABEL_WIDTH) {
  if (position < 0.2) return { style: { left: pct(position), marginLeft: -spacing.md / 2 }, textAlign: 'left' };
  if (position > 0.8) return { style: { right: pct(1 - position), marginRight: -spacing.md / 2 }, textAlign: 'right' };
  return { style: { left: pct(position), marginLeft: -width / 2 }, textAlign: 'center' };
}

/** One marker label, positioned by a View so the text sits where the
 * marker is on every renderer. */
function PointLabel({ text, position, edge, textStyle, width = LABEL_WIDTH }) {
  const placement = pointLabelPlacement(position, width);
  return (
    <View style={[styles.pointLabel, { width }, edge, placement.style]}>
      <Text style={[textStyle, { textAlign: placement.textAlign }]}>{text}</Text>
    </View>
  );
}

/** The spoken form of the scale (it is drawn, so it is one labelled image). */
export function speedScaleSpokenLabel(copy) {
  if (copy.state === 'faster') return 'Recovery speed scale from faster to slower. You are faster than the first estimate.';
  if (copy.state === 'slower') return 'Recovery speed scale from faster to slower. You are slower than the first estimate.';
  return 'Recovery speed scale from faster to slower. You are at the first estimate.';
}

function SpeedScale({ copy, personal, live }) {
  const moved = copy.state === 'faster' || copy.state === 'slower';
  const start = scalePosition(personal.prior);
  const yours = moved ? scalePosition(personal.factor) : start;
  const from = Math.min(start, yours);
  const to = Math.max(start, yours);
  return (
    <View
      style={styles.scale}
      accessible
      accessibilityRole="image"
      accessibilityLabel={speedScaleSpokenLabel(copy)}
    >
      <View style={styles.scaleRow}>
        <Text style={live.scaleEnd}>Faster</Text>
        <View style={styles.trackBox}>
          <PointLabel
            text={moved ? 'You' : 'You, at the first estimate'}
            position={yours}
            edge={styles.aboveTrack}
            textStyle={live.youLabel}
            width={moved ? LABEL_WIDTH : LABEL_WIDTH_WIDE}
          />
          <View style={[styles.track, live.track]}>
            {moved ? <View style={[styles.span, live.span, { left: pct(from), width: pct(to - from) }]} /> : null}
          </View>
          <View style={[styles.tick, live.tick, { left: pct(start) }]} />
          <View style={[styles.youMarker, live.youMarker, { left: pct(yours) }]} />
          {moved ? <PointLabel text="First estimate" position={start} edge={styles.belowTrack} textStyle={live.startLabel} /> : null}
        </View>
        <Text style={live.scaleEnd}>Slower</Text>
      </View>
    </View>
  );
}

export default function RecoveryLearningCard({ personal = null }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [open, setOpen] = useState(false);
  const copy = recoveryLearningCopy(personal);
  if (!copy) return null;
  const progressPct = copy.progress ? `${Math.round((copy.progress.done / copy.progress.needed) * 100)}%` : null;
  return (
    // Not one grouped node (D210 addendum 3): a screen reader reads the
    // title as a heading and every line after it, the footer's "An estimate,
    // not a measurement" included. The drawn scale is ONE labelled image.
    <View style={[styles.card, live.card]}>
      <View>
        <Text style={live.title} accessibilityRole="header">{RECOVERY_SPEED_TITLE}</Text>
        <Text style={live.sub}>{recoveryLearningSubtitle(copy)}</Text>
      </View>
      <View style={styles.words}>
        <Text style={live.headline}>{copy.headline}</Text>
        <Text style={live.summary}>{copy.summary}</Text>
      </View>
      <SpeedScale copy={copy} personal={personal} live={live} />
      {copy.progress ? (
        <View style={styles.progress}>
          <View style={[styles.progressTrack, live.track]}>
            <View style={[styles.progressFill, live.progressFill, { width: progressPct }]} />
          </View>
          <Text style={live.meta}>
            {`${copy.progress.done} of ${copy.progress.needed} usable so far`}
          </Text>
        </View>
      ) : null}
      {copy.evidence ? <Text style={live.meta}>{copy.evidence}</Text> : null}
      <TouchableOpacity
        style={styles.howToggle}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="How this is worked out"
        accessibilityHint={open ? 'Hides the method' : 'Shows the method'}
      >
        <Text style={live.howText}>How this is worked out</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={t.colors.textSecondary} />
      </TouchableOpacity>
      {open ? (
        <View style={styles.method}>
          <Text style={live.body}>{copy.body}</Text>
          {copy.example ? <Text style={live.body}>{`For example, ${copy.example.sentence.charAt(0).toLowerCase()}${copy.example.sentence.slice(1)}`}</Text> : null}
          <Text style={live.footer}>{RECOVERY_SPEED_FOOTER}</Text>
        </View>
      ) : null}
    </View>
  );
}

// The frozen block holds layout, spacing and radius only; every colour and
// type role is read live (buildLiveStyles below), the frozen-plus-live
// pattern the tree carries, so a theme change re-reads every token.
const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, gap: spacing.md,
  },
  scale: { paddingVertical: spacing.xs },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trackBox: { flex: 1, height: TRACK_BOX_H, justifyContent: 'center' },
  track: { height: spacing.xs, borderRadius: radius.full, overflow: 'hidden' },
  span: { position: 'absolute', top: 0, bottom: 0 },
  tick: {
    position: 'absolute', width: TICK_W, height: TICK_H, marginLeft: -TICK_W / 2,
    top: TRACK_BOX_H / 2 - TICK_ABOVE, borderRadius: radius.hair,
  },
  youMarker: {
    position: 'absolute', width: YOU_W, height: YOU_H, marginLeft: -YOU_W / 2,
    top: (TRACK_BOX_H - YOU_H) / 2, borderRadius: radius.hair,
  },
  pointLabel: { position: 'absolute', width: LABEL_WIDTH },
  aboveTrack: { top: 0 },
  belowTrack: { bottom: 0 },
  words: { gap: spacing.xs },
  progress: { gap: spacing.xs },
  progressTrack: { height: spacing.xs2, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  howToggle: {
    minHeight: spacing.xxxl, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
  },
  method: { gap: spacing.sm },
});

function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    title: { ...t.type.title, color: t.colors.textPrimary },
    sub: { ...t.type.captionTight, color: t.colors.textMuted, marginTop: spacing.xxs },
    scaleEnd: { ...t.type.captionTight, color: t.colors.textMuted },
    track: { backgroundColor: t.colors.surface2 },
    span: { backgroundColor: t.colors.border },
    tick: { backgroundColor: t.colors.textMuted },
    youMarker: { backgroundColor: t.colors.textPrimary },
    youLabel: { ...t.type.captionStrong, color: t.colors.textPrimary },
    startLabel: { ...t.type.captionTight, color: t.colors.textMuted },
    headline: { ...t.type.title, color: t.colors.textPrimary },
    summary: { ...t.type.bodySm, color: t.colors.textSecondary },
    progressFill: { backgroundColor: t.colors.textSecondary },
    meta: { ...t.type.bodySm, color: t.colors.textMuted },
    howText: { ...t.type.label, color: t.colors.textSecondary, textDecorationLine: 'underline' },
    body: { ...t.type.bodySm, color: t.colors.textSecondary },
    footer: { ...t.type.bodySm, color: t.colors.textMuted },
  };
}
