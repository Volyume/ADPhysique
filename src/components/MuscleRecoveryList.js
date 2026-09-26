/**
 * MuscleRecoveryList (D201 addendum 9, founder order 2026-09-26: "I said
 * this wall of text looks horrible it looks like raw text with no styles
 * no interactivity no format at all. Investigate how JeFit does this and
 * so on as this looks amateur.")
 *
 * The per-muscle list under the body figure in ReadinessCards' "Recovery
 * by muscle" card (spec `docs/recovery-programme-2026-09-25/00-SPEC.md`
 * section 6). Built from the patterns the research lane found across
 * JeFit and Fitbod (register D201 addendum 9): a percent always paired
 * with a status word, never bare; rows that open a breakdown when tapped;
 * a body map whose muscle tap does something. So:
 *
 *  - rows are grouped under the same three words the figure's legend
 *    uses (Recovering, Nearly recovered, Recovered), in the spec's order,
 *    each group headed by its band dot, its label and its count;
 *  - one row is the band dot, the muscle name, the estimated percent in
 *    tabular figures, a chevron, a full-width bar filled to that percent
 *    in the band colour, and one muted line with the ready-by and
 *    trained-ago facts;
 *  - tapping a row (or its muscle on the figure) opens the breakdown
 *    behind the estimate: the last session's counted sets and date, the
 *    sessions and sets inside the 14-day window, what the estimate is
 *    based on, and how it has been adjusted to this person from their own
 *    lifts (D210). One row is open at a time; the parent holds which.
 *
 * The recency FACT on the meta line is the same reading the Training
 * recency chip has always shown (getLastTrainedPerMuscle's latest start
 * for the muscle as a primary mover, through trainingRecency's unchanged
 * label; Opus review finding 13); the model's own instant is the fallback
 * only when that source has no reading. The spoken label per row is the
 * spec's four facts as one sentence, with "percent" spelled out. D204: the
 * list describes; nothing here tells anyone to train or rest. No amber
 * anywhere: this is a status surface, and the band colours are the
 * figure's own three tokens (D201 addendum 5, ruling 8).
 *
 * Pure presentation: no I/O, never imports `../lib/database`.
 *
 * Props:
 *   rows            entries from muscleRecoveryModel (status never
 *                   'no_recent_session'), already in the spec's order
 *   nowMs           the loader's own "now", so every clause agrees
 *   freshness       { [muscle]: lastTrainedAtMs } from
 *                   getLastTrainedPerMuscle (the chip source)
 *   selectedMuscle  the muscle whose breakdown is open, or null
 *   onSelect        (muscle|null) => void
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, spacing, radius, type, iconSize, circle,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { trainingRecency } from '../lib/trainingRecency';
import { safeFormatDate } from '../lib/safeFormat';
import { RECOVERY_ESTIMATE_LABEL } from '../lib/recovery/constants';
import { readyClause } from '../lib/recovery/nextWorkoutRecommendation';
import { personalDirection } from '../lib/recovery/personalRecovery';

/** Group order and labels: the figure legend's own three words, in the
 * spec's row order (recovering first, then nearly, then recovered). */
export const RECOVERY_GROUPS = Object.freeze([
  { status: 'recovering', label: 'Recovering' },
  { status: 'nearly', label: 'Nearly recovered' },
  { status: 'recovered', label: 'Recovered' },
]);

const DOT = spacing.sm;

/** The band colour for a status: the same three tokens the body figure
 * uses (D201 addendum 5, ruling 8). */
export function muscleRecoveryBandColour(status, c) {
  if (status === 'recovered') return c.success;
  if (status === 'nearly') return c.warning;
  return c.error;
}

/** "ready by Thursday", "ready later today", or "ready now" for a muscle
 * already at or above the recovered threshold (status 'recovered',
 * readyAtMs null by the model's own contract): one authority,
 * nextWorkoutRecommendation's readyClause. */
export function muscleReadyClause(entry, nowMs) {
  if (entry.status === 'recovered' || !Number.isFinite(entry.readyAtMs)) return 'ready now';
  return readyClause(entry.readyAtMs, nowMs);
}

/** The row's one muted line: "Ready by Thursday · Trained 2 days ago". */
export function muscleRecoveryRowMeta(entry, nowMs, lastTrainedAt) {
  const recency = trainingRecency(lastTrainedAt ?? entry.lastSessionEndMs, nowMs);
  const ready = muscleReadyClause(entry, nowMs);
  return `${ready.charAt(0).toUpperCase()}${ready.slice(1)} · ${recency.label}`;
}

/** The row's spoken form: the spec's four facts (muscle, estimated N
 * PERCENT recovered, the ready-by phrase, the trained-ago fact) as one
 * sentence, "percent" spelled out for a reliable screen-reader read. */
export function muscleRecoveryRowA11yLabel(entry, nowMs, lastTrainedAt) {
  const name = MUSCLE_DISPLAY_NAMES[entry.muscle] || entry.muscle;
  const percent = entry.recoveredPercent;
  const recency = trainingRecency(lastTrainedAt ?? entry.lastSessionEndMs, nowMs);
  return `${name}, ${RECOVERY_ESTIMATE_LABEL} ${percent} percent recovered, ${muscleReadyClause(entry, nowMs)}, ${recency.label}`;
}

/** What the estimate rests on, in plain words (the model's `basis`). */
export function muscleRecoveryBasisText(basis) {
  return basis === 'time_volume_and_ratings' ? 'Time, sets and your ratings' : 'Time and sets';
}

/**
 * D210: how the estimate has been adjusted to this person, in plain words,
 * or null when the loader carried no personal reading. The count is the
 * sessions the estimate was checked against (personalRecovery.js).
 */
export function muscleRecoveryPersonalText(personal) {
  if (!personal) return null;
  const compared = `${plural(personal.checked, 'session')} compared`;
  switch (personalDirection(personal)) {
    case 'sooner': return `Recovers faster than first estimated · ${compared}`;
    case 'later': return `Recovers more slowly than first estimated · ${compared}`;
    case 'same': return `No change so far · ${compared}`;
    default: return 'Not yet, too few sessions to compare';
  }
}

/** Rows bucketed under RECOVERY_GROUPS, keeping the caller's order inside
 * each group; empty groups are left out. */
export function groupMuscleRecoveryRows(rows) {
  return RECOVERY_GROUPS
    .map((g) => ({ ...g, rows: rows.filter((r) => r.status === g.status) }))
    .filter((g) => g.rows.length > 0);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** The breakdown lines behind one row's estimate. */
export function muscleRecoveryDetailLines(entry) {
  const lines = [];
  if (Number.isFinite(entry.lastSessionEndMs)) {
    const when = safeFormatDate(entry.lastSessionEndMs, 'EEE d MMM', '');
    const sets = Number.isFinite(entry.lastSessionSets) ? `${plural(entry.lastSessionSets, 'set')} counted` : null;
    lines.push({ label: 'Last session', value: [sets, when].filter(Boolean).join(' · ') });
  }
  const sessions = Array.isArray(entry.contributingSessions) ? entry.contributingSessions : [];
  if (sessions.length > 0) {
    const totalSets = sessions.reduce((sum, cs) => sum + (Number.isFinite(cs?.sets) ? cs.sets : 0), 0);
    lines.push({ label: 'Last 14 days', value: `${plural(sessions.length, 'session')} · ${plural(totalSets, 'set')}` });
  }
  lines.push({ label: 'Based on', value: muscleRecoveryBasisText(entry.basis) });
  const personal = muscleRecoveryPersonalText(entry.personal);
  if (personal) lines.push({ label: 'Adjusted to you', value: personal });
  return lines;
}

function MuscleRecoveryRow({
  entry, nowMs, lastTrainedAt, expanded, onToggle, t, live,
}) {
  const name = MUSCLE_DISPLAY_NAMES[entry.muscle] || entry.muscle;
  const percent = Number.isFinite(entry.recoveredPercent)
    ? Math.max(0, Math.min(100, Math.round(entry.recoveredPercent)))
    : 0;
  // The card's sub-line ("Estimated · last 14 days") and the spoken label
  // both say estimated; these two are that same estimated percent.
  const estimatedPercentText = `${percent}%`; // estimated recovery
  const estimatedFillWidth = `${percent}%`; // estimated recovery, the bar's fill
  const band = muscleRecoveryBandColour(entry.status, t.colors);
  const detail = expanded ? muscleRecoveryDetailLines(entry) : null;
  // The breakdown is a SIBLING of the touchable, never its child: a
  // touchable with its own accessibilityLabel is one opaque node to
  // VoiceOver and TalkBack, so anything nested inside it is unreachable
  // (the same mechanism BodyDiagramHeatmap's AX-04 note records, and the
  // reason CollapsibleSection renders its body beside its toggle).
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowBody}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={muscleRecoveryRowA11yLabel(entry, nowMs, lastTrainedAt)}
        accessibilityHint={expanded ? 'Hides the sessions behind this estimate' : 'Shows the sessions behind this estimate'}
      >
        <View style={styles.rowTop}>
          <View style={[styles.dot, { backgroundColor: band }]} />
          <Text style={[styles.name, live.name]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.percent, live.percent]}>{estimatedPercentText}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={t.colors.textMuted} />
        </View>
        <View style={[styles.track, live.track]}>
          <View style={[styles.fill, { width: estimatedFillWidth, backgroundColor: band }]} />
        </View>
        <Text style={[styles.meta, live.meta]} numberOfLines={1}>
          {muscleRecoveryRowMeta(entry, nowMs, lastTrainedAt)}
        </Text>
      </TouchableOpacity>
      {detail ? (
        <View style={[styles.detail, live.detail]}>
          {detail.map((line) => (
            <View key={line.label} style={styles.detailLine} accessible accessibilityLabel={`${line.label}: ${line.value}`}>
              <Text style={[styles.detailLabel, live.detailLabel]}>{line.label}</Text>
              <Text style={[styles.detailValue, live.detailValue]}>{line.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function MuscleRecoveryList({
  rows, nowMs, freshness = null, selectedMuscle = null, onSelect,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const groups = groupMuscleRecoveryRows(Array.isArray(rows) ? rows : []);
  if (!groups.length) return null;
  return (
    <View style={styles.list}>
      {groups.map((group) => (
        <View key={group.status} style={styles.group}>
          <View
            style={styles.groupHeader}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${group.label}, ${group.rows.length} muscle${group.rows.length === 1 ? '' : 's'}`}
          >
            <View style={[styles.dot, { backgroundColor: muscleRecoveryBandColour(group.status, t.colors) }]} />
            <Text style={[styles.groupLabel, live.groupLabel]}>{group.label}</Text>
            <Text style={[styles.groupCount, live.groupCount]}>{group.rows.length}</Text>
          </View>
          {group.rows.map((entry) => (
            <MuscleRecoveryRow
              key={entry.muscle}
              entry={entry}
              nowMs={nowMs}
              lastTrainedAt={freshness?.[entry.muscle]}
              expanded={selectedMuscle === entry.muscle}
              onToggle={() => onSelect?.(selectedMuscle === entry.muscle ? null : entry.muscle)}
              t={t}
              live={live}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  group: { gap: spacing.xs },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xxs },
  groupLabel: { ...type.overline, color: colors.textSecondary },
  groupCount: { ...type.overline, color: colors.textMuted },
  row: { paddingVertical: spacing.sm },
  rowBody: { gap: spacing.xs },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: DOT, height: DOT, borderRadius: circle(DOT), flexShrink: 0 },
  name: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  percent: { color: colors.textPrimary, textAlign: 'right' },
  track: { height: spacing.xs2, borderRadius: radius.xs, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.xs },
  meta: { ...type.captionTight, color: colors.textMuted },
  detail: {
    marginTop: spacing.xs, padding: spacing.md, gap: spacing.xs,
    borderRadius: radius.sm, backgroundColor: colors.surface2,
  },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  detailLabel: { ...type.captionTight, color: colors.textMuted },
  detailValue: { ...type.captionStrong, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
});

// Live theme override for the frozen block above: the frozen-plus-live
// `buildLiveStyles` pattern the tree carries (SectionLabel.js,
// CollapsibleSection.js, ReadinessCards.js), so a theme change re-reads
// every colour and type role from useTheme() without an app restart. The
// "migrated-primitive" pattern docs/rules/styling.md once named went with
// the reverted redesign (its status note says so).
function buildLiveStyles(t) {
  return {
    groupLabel: { ...t.type.overline, color: t.colors.textSecondary },
    groupCount: { ...t.type.overline, color: t.colors.textMuted },
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    percent: { ...t.type.num('label'), color: t.colors.textPrimary },
    track: { backgroundColor: t.colors.surface2 },
    meta: { ...t.type.captionTight, color: t.colors.textMuted },
    detail: { backgroundColor: t.colors.surface2 },
    detailLabel: { ...t.type.captionTight, color: t.colors.textMuted },
    detailValue: { ...t.type.captionStrong, color: t.colors.textPrimary },
  };
}
