/**
 * MuscleRecoveryList (D201 addendum 9, founder order 2026-09-26: "I said
 * this wall of text looks horrible it looks like raw text with no styles
 * no interactivity no format at all. Investigate how JeFit does this and
 * so on as this looks amateur."; elevated under D214, lane 2, 2026-10-01,
 * plan `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.2 d)
 *
 * The per-muscle list under the body figure in ReadinessCards' "Recovery
 * by muscle" section (spec `docs/recovery-programme-2026-09-25/00-SPEC.md`
 * section 6). A percent always sits beside its status word, never bare;
 * rows open a breakdown when tapped; the body map's muscle tap does
 * something. So:
 *
 *  - rows are grouped under "Still recovering · 4" and "Nearly recovered ·
 *    2" (the group's label, a middle dot, its count), in the spec's order;
 *  - "Recovered · 8" is ONE line of plain names, not tappable, with a "Show
 *    details" link that expands the compact rows (D214, RC-19: eight
 *    identical full bars buried the four rows that matter);
 *  - one row is the muscle name, the estimated percent with "recovered"
 *    after it ("60% recovered"), a chevron, a full-width bar filled to that
 *    percent in the row's OWN intensity (D214 Q1 = A: the `recovery` token,
 *    solid under 50, half strength to 74, edge strength from 75, never a
 *    traffic light), and one muted line with the ready-by and trained-ago
 *    facts; the name and the meta line wrap under larger text (RC-32);
 *  - under the list, "No session in the last 14 days: Forearms (16 days
 *    ago), Abs, Adductors, Neck and Tibialis (none in the last 90 days)."
 *    names EVERY muscle that has no row, with the recency read's true
 *    window (RC-17, RC-36); it replaces the Training-recency chips that
 *    sat two cards away in the ratings card;
 *  - tapping a row (or its muscle on the figure) opens the breakdown behind
 *    the estimate: the muscle's plain word ("Adductors, inner thigh",
 *    RC-11), each counted session with its sets named as "main mover" or
 *    "helped" and the half credit explained in one line (RC-9, RC-10), what
 *    the estimate is based on, and where the "How's your recovery?" answer
 *    lives (RC-23). One row is open at a time; the parent holds which.
 *
 * The recency FACT on the meta line is the same reading the old Training
 * recency chip showed (getLastTrainedPerMuscle's latest start for the muscle
 * as a primary mover, through trainingRecency's unchanged label; Opus review
 * finding 13); the model's own instant is the fallback only when that source
 * has no reading. The spoken label per row is the spec's four facts as one
 * sentence, with "percent" spelled out. D204: the list describes; nothing
 * here tells anyone to train or rest. Facts are ink and the bar is the
 * `recovery` token: no amber and no traffic-light status colour anywhere.
 *
 * Pure presentation: no I/O, never imports `../lib/database`.
 *
 * Props:
 *   rows            entries from muscleRecoveryModel (status never
 *                   'no_recent_session'), already in the spec's order
 *   nowMs           the loader's own "now", so every clause agrees
 *   freshness       { [muscle]: lastTrainedAtMs } from
 *                   getLastTrainedPerMuscle (the 90-day recency source)
 *   selectedMuscle  the muscle whose breakdown is open, or null
 *   onSelect        (muscle|null) => void
 *   learnedSpeed    true when the recovery speed learned from the lifts is
 *                   in use (D210), so "Based on" names it
 *   sessionSplits   { [muscle]: { [workoutId]: { main, helped } } } from
 *                   buildMuscleSessionSplits; absent, a session's sets read
 *                   as the model's own credit
 *   registerRow     (muscle, node) => void, so the screen can scroll to a row
 *   registerNames   (node) => void, the same for the names line
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  spacing, radius, iconSize, withAlpha, alpha,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { MUSCLE_DISPLAY_NAMES, allocateExerciseVolume, calculateWeeklyVolume } from '../lib/algorithms';
import { trainingRecency } from '../lib/trainingRecency';
import { safeFormatDate } from '../lib/safeFormat';
import { RECOVERY_ESTIMATE_LABEL, LOOKBACK_DAYS } from '../lib/recovery/constants';
import { readyClause } from '../lib/recovery/nextWorkoutRecommendation';

/** Group order and labels: the figure legend's own words, in the spec's row
 * order (recovering first, then nearly, then recovered). */
export const RECOVERY_GROUPS = Object.freeze([
  { status: 'recovering', label: 'Still recovering' },
  { status: 'nearly', label: 'Nearly recovered' },
  { status: 'recovered', label: 'Recovered' },
]);

/** The window `getLastTrainedPerMuscle` reads (database.js: "limited to the
 * last 90 days"), named in the no-session line so "none" says how far back. */
export const RECENCY_READ_DAYS = 90;

/** The minimum touch target (docs/rules/styling.md: every interactive
 * element at least 48 dp). */
const TARGET = 48;

/**
 * One short plain word per engine key (D214, RC-11): what the muscle is, for
 * the person who does not know the gym name. Shown at the top of a row's
 * breakdown as "Adductors, inner thigh".
 */
export const MUSCLE_PLAIN_WORDS = Object.freeze({
  chest: 'front of the upper body',
  back: 'upper back, lats and lower back',
  front_delts: 'front of the shoulder',
  side_delts: 'side of the shoulder',
  rear_delts: 'back of the shoulder',
  biceps: 'front of the upper arm',
  triceps: 'back of the upper arm',
  forearms: 'lower arm',
  quads: 'front of the thigh',
  hamstrings: 'back of the thigh',
  glutes: 'buttocks',
  adductors: 'inner thigh',
  calves: 'back of the lower leg',
  abs: 'stomach and sides',
  traps: 'upper back and neck',
  neck: 'sides and front of the neck',
  tibialis: 'front of the shin',
});

/** "Adductors, inner thigh". */
export function musclePlainWord(muscleKey) {
  const name = MUSCLE_DISPLAY_NAMES[muscleKey] || muscleKey;
  const gloss = MUSCLE_PLAIN_WORDS[muscleKey];
  return gloss ? `${name}, ${gloss}` : name;
}

/**
 * The bar's fill for a percent (D214 Q1 = A, the figure's own intensity
 * rule): the `recovery` token solid under 50, at half strength to 74, at
 * edge strength from 75. One hue, graded by how much is left to recover.
 */
export function muscleRecoveryBarFill(percent, c) {
  if (!(percent >= 50)) return c.recovery;
  if (percent < 75) return withAlpha(c.recovery, alpha.half);
  return withAlpha(c.recovery, alpha.edge);
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

/** What the estimate rests on, in plain words (the model's `basis`, and
 * whether the recovery speed learned from the lifts is in use, D210). */
export function muscleRecoveryBasisText(basis, learnedSpeed = false) {
  if (learnedSpeed) {
    return basis === 'time_volume_and_ratings'
      ? 'Time, sets, your ratings and your recovery speed'
      : 'Time, sets and your recovery speed';
  }
  return basis === 'time_volume_and_ratings' ? 'Time, sets and your ratings' : 'Time and sets';
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

// ASCII compare, not localeCompare: MUSCLE_DISPLAY_NAMES are plain English
// words, and Hermes' localeCompare needs full-icu to sort correctly, which
// this app does not link.
function compareNames(a, b) {
  const nameA = MUSCLE_DISPLAY_NAMES[a] || a;
  const nameB = MUSCLE_DISPLAY_NAMES[b] || b;
  if (nameA === nameB) return 0;
  return nameA < nameB ? -1 : 1;
}

function joinNames(keys) {
  const names = keys.map((k) => MUSCLE_DISPLAY_NAMES[k] || k);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function daysAgoText(days) {
  if (days <= 0) return 'today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/**
 * "No session in the last 14 days: Forearms (16 days ago), Abs, Adductors,
 * Neck and Tibialis (none in the last 90 days)." Names EVERY muscle that has
 * no row (D214, RC-17 and RC-36): the ones with a logged session older than
 * the window each with how long ago, the rest together with the recency
 * read's own window. null when every muscle has a row, and at day zero (no
 * row and no history at all), where the screen says something else.
 */
export function noSessionNamesLine(rows, freshness, nowMs) {
  const list = Array.isArray(rows) ? rows : [];
  const withRow = new Set(list.map((r) => r.muscle));
  const dated = [];
  const undated = [];
  for (const key of Object.keys(MUSCLE_DISPLAY_NAMES)) {
    if (withRow.has(key)) continue;
    const recency = trainingRecency(freshness?.[key], nowMs);
    // The recency read (primary-mover sets, 90 days) is a second source: a
    // muscle it dates INSIDE the window but which has no row (a set-type or
    // exercise-resolution difference, rare) is neither "N days ago" under a
    // "no session in 14 days" heading nor "none in 90 days"; it is left off
    // the line rather than named falsely (lane 2 review N2).
    if (recency.known && recency.daysAgo > LOOKBACK_DAYS) dated.push({ key, days: recency.daysAgo });
    else if (!recency.known) undated.push(key);
  }
  if (!dated.length && !undated.length) return null;
  if (!list.length && !dated.length) return null;
  dated.sort((a, b) => (a.days - b.days) || compareNames(a.key, b.key));
  undated.sort(compareNames);
  const parts = dated.map((d) => `${MUSCLE_DISPLAY_NAMES[d.key] || d.key} (${daysAgoText(d.days)})`);
  if (undated.length) parts.push(`${joinNames(undated)} (none in the last ${RECENCY_READ_DAYS} days)`);
  return `No session in the last 14 days: ${parts.join(', ')}.`;
}

/**
 * One counted session's sets for one muscle, split into the sets where the
 * muscle was the main mover (credited as one) and the sets where it helped
 * (credited as half), read through the SAME allocator and set rules the
 * model uses (calculateWeeklyVolume over primary-only and helper-only copies
 * of each exercise), so the split can never disagree with the credit.
 */
function splitSession(workoutSets, exerciseById, muscle) {
  const mainMap = {};
  const helpMap = {};
  for (const s of workoutSets) {
    const id = s?.exerciseId ?? s?.exercise_id;
    if (id == null || mainMap[id] || !exerciseById[id]) continue;
    const roles = allocateExerciseVolume(exerciseById[id])
      .filter((a) => a.muscle === muscle)
      .map((a) => a.role);
    const asMain = roles.includes('primary');
    const asHelper = !asMain && roles.includes('secondary');
    mainMap[id] = { primaryMuscle: asMain ? muscle : '', secondaryMuscles: [] };
    helpMap[id] = { primaryMuscle: asHelper ? muscle : '', secondaryMuscles: [] };
  }
  return {
    main: calculateWeeklyVolume(workoutSets, mainMap)[muscle]?.workingSets ?? 0,
    helped: calculateWeeklyVolume(workoutSets, helpMap)[muscle]?.workingSets ?? 0,
  };
}

/**
 * { [muscle]: { [workoutId]: { main, helped } } } for every counted session
 * in the recovery map (D214, RC-9 and RC-10). A split is kept only when it
 * reproduces the model's own credit for that session (main + half of
 * helped); an exercise that no longer resolves, or a non-default credit,
 * leaves that session out and the breakdown reads the model's own figure.
 *
 * @param {object} map  muscleRecoveryModel's map
 * @param {Array} sets  completed workout sets (camelCase rows)
 * @param {Array} exercises  the exercise library rows
 */
export function buildMuscleSessionSplits(map, sets, exercises) {
  const out = {};
  const exerciseById = Object.fromEntries((Array.isArray(exercises) ? exercises : []).map((e) => [e.id, e]));
  const byWorkout = new Map();
  for (const s of Array.isArray(sets) ? sets : []) {
    const wid = s?.workoutId ?? s?.workout_id;
    if (!wid) continue;
    if (!byWorkout.has(wid)) byWorkout.set(wid, []);
    byWorkout.get(wid).push(s);
  }
  for (const [muscle, entry] of Object.entries(map ?? {})) {
    const sessions = Array.isArray(entry?.contributingSessions) ? entry.contributingSessions : [];
    for (const cs of sessions) {
      const workoutSets = byWorkout.get(cs?.workoutId);
      if (!workoutSets) continue;
      const split = splitSession(workoutSets, exerciseById, muscle);
      if (Math.abs(split.main + split.helped * 0.5 - cs.sets) > 1e-6) continue;
      if (!out[muscle]) out[muscle] = {};
      out[muscle][cs.workoutId] = split;
    }
  }
  return out;
}

/** The one line explaining the half credit (RC-10). */
export const HALF_CREDIT_NOTE = 'A set counts as one for the muscle it mainly works, and as half for a muscle that helps.';

/** Where the first estimate comes from and where to change it (RC-23). */
// "Adjust training" is the screen's own title (PlanUpdateScreen.js); nothing
// the person sees is called "Plan update" (lane 2 review S1).
export const RECOVERY_ANSWER_NOTE = 'Your ‘How’s your recovery?’ answer sets the first estimate; change it under Adjust training.';

/** One counted session's sets, in words: the split when it is known, else
 * the model's own credit, labelled as credit. */
function sessionSetsText(cs, split) {
  if (split && (split.main > 0 || split.helped > 0)) {
    const parts = [];
    if (split.main > 0) parts.push(`${plural(split.main, 'set')} as main mover`);
    if (split.helped > 0) parts.push(`${plural(split.helped, 'set')} helped`);
    return parts.join(', ');
  }
  const credit = Number.isFinite(cs?.sets) ? cs.sets : 0;
  return `${credit} counted (a helping set counts as half)`;
}

/** The breakdown lines behind one row's estimate, newest session first. */
export function muscleRecoveryDetailLines(entry, learnedSpeed = false, splits = null) {
  const lines = [{ label: 'Muscle', value: musclePlainWord(entry.muscle) }];
  const sessions = Array.isArray(entry.contributingSessions) ? [...entry.contributingSessions].reverse() : [];
  for (const cs of sessions) {
    const when = safeFormatDate(cs?.endMs, 'EEE d MMM', '') || 'Session';
    lines.push({ label: when, value: sessionSetsText(cs, splits?.[cs?.workoutId]) });
  }
  lines.push({ label: 'Based on', value: muscleRecoveryBasisText(entry.basis, learnedSpeed) });
  return lines;
}

function MuscleRecoveryRow({
  entry, nowMs, lastTrainedAt, expanded, onToggle, t, live, learnedSpeed, splits, registerRow,
}) {
  const name = MUSCLE_DISPLAY_NAMES[entry.muscle] || entry.muscle;
  const percent = Number.isFinite(entry.recoveredPercent)
    ? Math.max(0, Math.min(100, Math.round(entry.recoveredPercent)))
    : 0;
  // The card's sub-line ("Estimated from your sessions · last 14 days") and
  // the spoken label both say estimated; these two are that same estimated
  // percent, with its status word beside it.
  const estimatedPercentText = `${percent}% recovered`; // estimated recovery
  const estimatedFillWidth = `${percent}%`; // estimated recovery, the bar's fill
  const fill = muscleRecoveryBarFill(percent, t.colors);
  const detail = expanded ? muscleRecoveryDetailLines(entry, learnedSpeed, splits) : null;
  // The breakdown is a SIBLING of the touchable, never its child: a
  // touchable with its own accessibilityLabel is one opaque node to
  // VoiceOver and TalkBack, so anything nested inside it is unreachable
  // (the same mechanism BodyDiagramHeatmap's AX-04 note records, and the
  // reason CollapsibleSection renders its body beside its toggle).
  return (
    <View
      style={styles.row}
      collapsable={false}
      ref={(node) => { if (registerRow) registerRow(entry.muscle, node); }}
    >
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
          <Text style={[styles.name, live.name]}>{name}</Text>
          <Text style={[styles.percent, live.percent]}>{estimatedPercentText}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={t.colors.textMuted} />
        </View>
        <View style={[styles.track, live.track]}>
          <View
            style={[
              styles.fill,
              { width: estimatedFillWidth, backgroundColor: fill },
              // The faintest stops keep a solid hairline of the token, the
              // same step the figure's legend names ("a faint fill held by
              // a solid outline"), so a pale bar still reads on its track.
              percent >= 75 ? { borderWidth: 1, borderColor: t.colors.recovery } : null,
            ]}
          />
        </View>
        <Text style={live.meta}>
          {muscleRecoveryRowMeta(entry, nowMs, lastTrainedAt)}
        </Text>
      </TouchableOpacity>
      {detail ? (
        <View style={[styles.detail, live.detail]}>
          {detail.map((line, i) => (
            <View key={`${line.label}-${i}`} style={styles.detailLine} accessible accessibilityLabel={`${line.label}: ${line.value}`}>
              <Text style={live.detailLabel}>{line.label}</Text>
              <Text style={[styles.detailValue, live.detailValue]}>{line.value}</Text>
            </View>
          ))}
          <Text style={[styles.detailNote, live.detailNote]}>{HALF_CREDIT_NOTE}</Text>
          <Text style={[styles.detailNote, live.detailNote]}>{RECOVERY_ANSWER_NOTE}</Text>
        </View>
      ) : null}
    </View>
  );
}

function GroupHeader({ label, count, live }) {
  return (
    <View
      style={styles.groupHeader}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${label}, ${count} muscle${count === 1 ? '' : 's'}`}
    >
      <Text style={live.groupLabel}>{`${label} · ${count}`}</Text>
    </View>
  );
}

export default function MuscleRecoveryList({
  rows, nowMs, freshness = null, selectedMuscle = null, onSelect, learnedSpeed = false,
  sessionSplits = null, registerRow = null, registerNames = null,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  // The recovered group is one line of names until the person asks for the
  // rows; a recovered muscle chosen on the figure opens it by itself.
  const [showRecovered, setShowRecovered] = useState(false);
  const list = Array.isArray(rows) ? rows : [];
  const groups = groupMuscleRecoveryRows(list);
  const namesLine = noSessionNamesLine(list, freshness, nowMs);
  if (!groups.length && !namesLine) return null;

  const renderRow = (entry) => (
    <MuscleRecoveryRow
      key={entry.muscle}
      entry={entry}
      nowMs={nowMs}
      lastTrainedAt={freshness?.[entry.muscle]}
      expanded={selectedMuscle === entry.muscle}
      onToggle={() => onSelect?.(selectedMuscle === entry.muscle ? null : entry.muscle)}
      t={t}
      live={live}
      learnedSpeed={learnedSpeed}
      splits={sessionSplits?.[entry.muscle]}
      registerRow={registerRow}
    />
  );

  return (
    <View style={styles.list}>
      {groups.map((group) => {
        if (group.status !== 'recovered') {
          return (
            <View key={group.status} style={styles.group}>
              <GroupHeader label={group.label} count={group.rows.length} live={live} />
              {group.rows.map(renderRow)}
            </View>
          );
        }
        const selectedHere = group.rows.some((r) => r.muscle === selectedMuscle);
        const open = showRecovered || selectedHere;
        return (
          <View key={group.status} style={styles.group}>
            <GroupHeader label={group.label} count={group.rows.length} live={live} />
            {open ? group.rows.map(renderRow) : (
              <Text style={live.recoveredNames}>
                {group.rows.map((r) => MUSCLE_DISPLAY_NAMES[r.muscle] || r.muscle).join(', ')}
              </Text>
            )}
            <TouchableOpacity
              style={styles.detailsLink}
              onPress={() => {
                if (open && selectedHere) onSelect?.(null);
                setShowRecovered(!open);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={open ? 'Hide details for the recovered muscles' : 'Show details for the recovered muscles'}
            >
              <Text style={live.detailsLinkText}>{open ? 'Hide details' : 'Show details'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      {namesLine ? (
        <View collapsable={false} ref={(node) => { if (registerNames) registerNames(node); }}>
          <Text style={live.namesLine}>{namesLine}</Text>
        </View>
      ) : null}
    </View>
  );
}

// The frozen block holds layout, spacing and radius only; every colour and
// type role is read live (buildLiveStyles below), the frozen-plus-live
// pattern the tree carries (the reverted redesign's "migrated-primitive"
// shape is history, docs/rules/styling.md).
const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  group: { gap: spacing.xs },
  groupHeader: { paddingBottom: spacing.xxs },
  row: { paddingVertical: spacing.sm },
  rowBody: { gap: spacing.xs },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  percent: { textAlign: 'right', flexShrink: 0 },
  track: { height: spacing.xs2, borderRadius: radius.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.xs },
  detail: {
    marginTop: spacing.xs, padding: spacing.md, gap: spacing.xs, borderRadius: radius.sm,
  },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  detailNote: { marginTop: spacing.xs },
  detailsLink: { minHeight: TARGET, justifyContent: 'center', alignSelf: 'flex-start' },
});

function buildLiveStyles(t) {
  return {
    groupLabel: { ...t.type.overline, color: t.colors.textSecondary },
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    percent: { ...t.type.num('label'), color: t.colors.textPrimary },
    track: { backgroundColor: t.colors.surface2 },
    meta: { ...t.type.captionTight, color: t.colors.textMuted },
    detail: { backgroundColor: t.colors.surface2 },
    detailLabel: { ...t.type.captionTight, color: t.colors.textMuted },
    detailValue: { ...t.type.captionStrong, color: t.colors.textPrimary },
    detailNote: { ...t.type.captionTight, color: t.colors.textMuted },
    recoveredNames: { ...t.type.bodySm, color: t.colors.textSecondary },
    detailsLinkText: { ...t.type.label, color: t.colors.textSecondary, textDecorationLine: 'underline' },
    namesLine: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
