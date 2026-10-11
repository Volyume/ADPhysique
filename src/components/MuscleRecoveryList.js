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
 *    RC-11), each counted session with its sets named "as the main muscle
 *    worked" or "as a helper" and the half credit explained in one line
 *    (RC-9, RC-10; the words are D214 addendum 9, 0.8), what the estimate is
 *    based on, and where the "How's your recovery?" answer lives (RC-23). One
 *    row is open at a time; the parent holds which.
 *
 * The recency FACT on the meta line is the same reading the old Training
 * recency chip showed (getLastTrainedPerMuscle's latest session start for the
 * muscle, through trainingRecency's unchanged label; Opus review finding 13);
 * since D218 a session counts when one of its working sets credited the
 * muscle as the main muscle or as a helper, the Volume heatmap's rule, read at
 * the same instant (the session's start, D215). The model's own instant is the
 * fallback only when that source has no reading. The spoken label per row is
 * the spec's four facts as one
 * sentence, with "percent" spelled out. D204: the list describes; nothing
 * here tells anyone to train or rest. Facts are ink and the bar is the
 * `recovery` token: no amber and no traffic-light status colour anywhere.
 *
 * D219 (lanes A5 and B4, design 5.1 and 5.3): with `roles` (the active plan's
 * muscle roles) and `weekFigures` (the Monday week's sets per muscle) the
 * breakdown also says what the plan intends for the muscle and where this
 * week's sets sit against the evidence bands, in the one judgement's words
 * (volumeJudgement.js), so a muscle the plan raised to bring up reads inside
 * its focus range with the reason ("Biceps are your focus this block: 27 sets,
 * inside the focus range of 20 to 30.") and never as a fault; it shows the
 * muscle's OWN recovery clock in plain words (biceps about 2 days, back about
 * 2.5, each an estimate with a range), the estimate after the last session and
 * the spacing of the sessions counted (muscleDetail.js). A muscle the plan
 * raised also carries its intent on the row's own muted line. Without the two
 * props the breakdown has no plan intent and no week section.
 *
 * D223 (founder, 2026-10-11, on the open Abs detail: "This data for muscles
 * recovery looks horrendous, redesign this areas make it understandable,
 * readable and slick."): the breakdown is no longer a column of labels beside
 * right-aligned paragraphs. The same facts are drawn in sections (MuscleDetail
 * below): the recovery estimate as a timeline with its two figures and the
 * muscle's usual clock beside back's as two bars, this week's total large with
 * its band and a bar against the plan's range, the sessions as dated rows, and
 * the fine print last under "How this is estimated".
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
 *   roles           D219: { [muscle]: role } from the active plan's facts, or null
 *   weekFigures     D219: muscleDetail.weekFigures' result, or null
 */

import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  spacing, radius, iconSize, withAlpha, alpha,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { MUSCLE_DISPLAY_NAMES, allocateExerciseVolume, calculateWeeklyVolume } from '../lib/algorithms';
import { trainingRecency } from '../lib/trainingRecency';
import { safeFormatDate } from '../lib/safeFormat';
import { RECOVERY_ESTIMATE_LABEL, LOOKBACK_DAYS, REFERENCE_SETS } from '../lib/recovery/constants';
import { readyByClause } from '../lib/recovery/nextInPlan';
import {
  muscleDetailRows, intentFor, recoveryTimeline, clockComparison, clockLine, weekPanel, spacingLine,
} from '../lib/recovery/muscleDetail';
import { roleFor } from '../lib/volumeJudgement';

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
 *
 * D214 addendum 9 (0.25): "Chest" needs no gloss (everyone knows it), so it has
 * no entry and its line reads "Chest" alone; and "lats" is gym slang, so the
 * back reads "the sides of the back".
 */
export const MUSCLE_PLAIN_WORDS = Object.freeze({
  back: 'upper back, the sides of the back and lower back',
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

/** "Adductors, inner thigh"; "Back: upper back, the sides of the back and lower
 * back" (a gloss that is itself a list follows a colon, so the muscle is not
 * read as the list's first item); "Chest" alone, which has no gloss. */
export function musclePlainWord(muscleKey) {
  const name = MUSCLE_DISPLAY_NAMES[muscleKey] || muscleKey;
  const gloss = MUSCLE_PLAIN_WORDS[muscleKey];
  if (!gloss) return name;
  return gloss.includes(',') ? `${name}: ${gloss}` : `${name}, ${gloss}`;
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

/** "ready by tomorrow afternoon", "ready by Friday morning", or "ready now"
 * for a muscle already at or above the recovered threshold (status
 * 'recovered', readyAtMs null by the model's own contract). D224 (founder
 * 2026-10-11: "Side delts ready tomorrow on Today. But different in
 * recovery."): one authority for the words, nextInPlan's readyByClause, the
 * same the "Next in your plan" card and the open detail use. */
export function muscleReadyClause(entry, nowMs) {
  if (entry.status === 'recovered' || !Number.isFinite(entry.readyAtMs)) return 'ready now';
  return `ready ${readyByClause(entry.readyAtMs, nowMs)}`;
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

/** The one line explaining the half credit (RC-10). One sentence at every site
 * that explains it (D214 addendum 9, V2). */
export const HALF_CREDIT_NOTE = 'A set counts once for the muscle it works most and half for each muscle that helps.';

/** Where the first estimate comes from and where to change it (RC-23). */
// "Adjust training" is the screen's own title (PlanUpdateScreen.js); nothing
// the person sees is called "Plan update" (lane 2 review S1).
// Addendum 9 (V1, D204): where the answer lives, said as a fact, not an order.
export const RECOVERY_ANSWER_NOTE = 'Your ‘How’s your recovery?’ answer sets the first estimate; the answer can be changed under Adjust training.';

/** One counted session's sets, in words: the split when it is known, else
 * the model's own credit, labelled as credit. */
function sessionSetsText(cs, split) {
  if (split && (split.main > 0 || split.helped > 0)) {
    const parts = [];
    if (split.main > 0) parts.push(`${plural(split.main, 'set')} as the main muscle worked`);
    if (split.helped > 0) parts.push(`${plural(split.helped, 'set')} as a helper`);
    return parts.join(', ');
  }
  const credit = Number.isFinite(cs?.sets) ? cs.sets : 0;
  return `${plural(credit, 'set')} counted (a helper set counts as half)`;
}

/**
 * The breakdown behind one row's estimate as plain label and value lines,
 * newest session first: the text form of the facts MuscleDetail draws (D223),
 * kept so its wording stays pinned in one place. D219:
 * with `extra` ({ role, week, nowMs }) the plan's intent, this week's sets and
 * their band, the muscle's own clock, the estimate with its range and the
 * spacing follow the muscle's name (muscleDetail.muscleDetailRows); without it
 * the lines are exactly what they were.
 */
export function muscleRecoveryDetailLines(entry, learnedSpeed = false, splits = null, extra = null) {
  const lines = [{ label: 'Muscle', value: musclePlainWord(entry.muscle) }];
  if (extra) {
    lines.push(...muscleDetailRows({
      muscle: entry.muscle, entry, role: extra.role, week: extra.week ?? null, nowMs: extra.nowMs,
    }));
  }
  const sessions = Array.isArray(entry.contributingSessions) ? [...entry.contributingSessions].reverse() : [];
  for (const cs of sessions) {
    const when = safeFormatDate(cs?.endMs, 'EEE d MMM', '') || 'Session';
    lines.push({ label: when, value: sessionSetsText(cs, splits?.[cs?.workoutId]) });
  }
  lines.push({ label: 'Based on', value: muscleRecoveryBasisText(entry.basis, learnedSpeed) });
  return lines;
}

/** A share of a bar as a width: "37.5%", held between 0 and 100. */
function share(part, whole) {
  if (!(whole > 0) || !Number.isFinite(part)) return '0%';
  return `${Math.max(0, Math.min(100, (part / whole) * 100))}%`;
}

/** The first letter up: "stomach and sides" reads "Stomach and sides" as a subtitle. */
function capitalise(text) {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

/** One section of the open detail: a small header, then its content. */
function DetailSection({ title, live, divided = true, children }) {
  return (
    <View style={[styles.section, divided ? [styles.sectionDivided, live.divider] : null]}>
      <Text style={live.sectionTitle} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

/** A small square of a bar's colour, so a figure's label names the part of the bar it reads. */
function Swatch({ color, edge = null }) {
  return <View style={[styles.swatch, { backgroundColor: color }, edge ? { borderWidth: 1, borderColor: edge } : null]} />;
}

/**
 * The ready estimate as a timeline (D223, D224): the solid part is the time
 * since the last session, the shaded part the range of the estimated ready
 * instant, the mark the estimate itself, the same instant the row and the
 * "Next in your plan" card state. One hue, the `recovery` token (D214 Q1 = A).
 */
function RecoveryTimeline({ timeline, live, t }) {
  const scale = timeline.scaleHours;
  const headline = `Estimated ready ${timeline.readyText}`;
  const spoken = timeline.ready
    ? `${headline}. ${capitalise(timeline.passedText)} since the last session.`
    : `${headline}, in ${timeline.toGoText}, range ${timeline.rangeText}. ${capitalise(timeline.passedText)} since the last session.`;
  const zoneColor = withAlpha(t.colors.recovery, alpha.strong);
  return (
    <View style={styles.block} accessible accessibilityLabel={spoken}>
      <Text style={live.readyHeadline}>{headline}</Text>
      <View style={[styles.track, styles.trackTall, live.track, styles.trackOpen]}>
        {!timeline.ready ? (
          <View style={[styles.zone, { left: share(timeline.lowHours, scale), width: share(timeline.highHours - timeline.lowHours, scale), backgroundColor: zoneColor }]} />
        ) : null}
        <View style={[styles.fillAbs, { width: share(timeline.passedHours, scale), backgroundColor: t.colors.recovery }]} />
        {!timeline.ready ? <View style={[styles.mark, { left: share(timeline.readyHours, scale) }, live.mark]} /> : null}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={live.statValue}>{timeline.passedText}</Text>
          <View style={styles.legendRow}>
            <Swatch color={t.colors.recovery} />
            <Text style={[styles.legendText, live.statLabel]}>Since the last session</Text>
          </View>
        </View>
        {!timeline.ready ? (
          <View style={styles.stat}>
            <Text style={live.statValue}>{timeline.toGoText}</Text>
            <View style={styles.legendRow}>
              <Swatch color={zoneColor} edge={t.colors.recovery} />
              <Text style={[styles.legendText, live.statLabel]}>{`To go, range ${timeline.rangeText}`}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** The muscle's usual clock beside one other muscle's, as two bars (D219: "biceps recover quicker than back", shown, never asserted). */
function ClockCompare({ muscle, live, t }) {
  const clocks = clockComparison(muscle);
  const top = Math.max(...clocks.map((c) => c.highHours));
  return (
    <View style={styles.block} accessible accessibilityLabel={clockLine(muscle)}>
      <Text style={live.subhead}>{`Usually estimated ready after a session of about ${REFERENCE_SETS} sets`}</Text>
      {clocks.map((c) => {
        const own = c.muscle === muscle;
        return (
          <View key={c.muscle} style={styles.compareRow}>
            <View style={styles.compareTop}>
              <Text style={[styles.compareName, own ? live.compareNameOwn : live.compareName]}>{c.name}</Text>
              <Text style={[styles.compareValue, live.compareValue]}>{`${c.text} (${c.rangeText})`}</Text>
            </View>
            <View style={[styles.track, live.track]}>
              <View style={[styles.fillAbs, { width: share(c.hours, top), backgroundColor: own ? t.colors.recovery : t.colors.textMuted }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** This week's sets: the total, its split, the band, the bar against the plan's range, and the most in one session (D219 facts, drawn, D223). */
function WeekBlock({ week, live }) {
  const split = [week.mainText];
  if (week.helperText && !week.helperText.startsWith('0 ')) split.push(week.helperText);
  const { bar } = week;
  return (
    <>
      <View style={styles.bigRow} accessible accessibilityLabel={`${week.creditText} ${week.unit}: ${split.join(', ')}. ${week.bandLabel}.`}>
        <Text style={live.bigNumber}>{week.creditText}</Text>
        <Text style={[styles.bigUnit, live.bigUnit]}>{week.unit}</Text>
        <View style={[styles.chip, live.chip]}>
          <Text style={live.chipText}>{week.bandLabel}</Text>
        </View>
      </View>
      <Text style={live.body}>{split.join(' · ')}</Text>
      <Text style={live.body}>{week.bandLine}</Text>
      <View style={styles.block} accessible accessibilityLabel={`${week.creditText} sets this week. ${week.zoneText}`}>
        <View style={[styles.track, styles.trackTall, live.track, styles.trackOpen]}>
          <View style={[styles.zone, { left: share(bar.bandStart, bar.max), width: share(bar.bandEnd - bar.bandStart, bar.max) }, live.weekZone]} />
          <View style={[styles.dot, { left: share(week.credit, bar.max) }, live.dot]} />
        </View>
        <View style={styles.scaleEnds}>
          <Text style={live.scaleText}>0</Text>
          <Text style={live.scaleText}>{`${bar.max} sets`}</Text>
        </View>
        <Text style={live.note}>{week.zoneText}</Text>
      </View>
      <View style={styles.block} accessible accessibilityLabel={`Most in one session: ${week.sessionMostText} sets. ${week.sessionCapText}.`}>
        <View style={styles.compareTop}>
          <Text style={[styles.compareName, live.compareNameOwn]}>Most in one session</Text>
          <Text style={[styles.compareValue, live.compareValue]}>{`${week.sessionMostText} ${week.sessionMost === 1 ? 'set' : 'sets'}`}</Text>
        </View>
        <View style={[styles.track, live.track]}>
          <View style={[styles.fillAbs, { width: share(week.sessionMost, week.sessionCap) }, live.meterFill]} />
        </View>
        <Text style={live.note}>{week.sessionCapText}</Text>
      </View>
      {week.flagLine ? <Text style={live.body}>{week.flagLine}</Text> : null}
    </>
  );
}

/**
 * The open detail behind one muscle's estimate (D223, founder 2026-10-11: "This
 * data for muscles recovery looks horrendous, redesign this areas make it
 * understandable, readable and slick."). The facts are D219's and RC-9 to
 * RC-23's, unchanged; they are drawn instead of listed:
 *
 *   - the muscle's plain word as a subtitle, and the plan's intent for a muscle
 *     the plan raised or holds;
 *   - "Recovery estimate": the estimated ready time (D224: the one instant the
 *     row and the "Next in your plan" card state) as a timeline from the last
 *     session (the time since it, the range shaded, the estimate marked) with
 *     the two figures under it, then the muscle's usual ready time beside one
 *     other muscle's;
 *   - "This week so far" (with `withWeek`): the counted total large with its
 *     band, the split into main and helper sets, the band's own line, a bar
 *     placing the week against the plan's range, and the most in one session
 *     against its limit;
 *   - "Sessions counted": each session's date and its sets, newest first, then
 *     their spacing;
 *   - "How this is estimated": the basis, the half credit sentence, where the
 *     recovery answer lives, and "Estimated, not measured."
 *
 * Shared by the rows below and the "Next in your plan" card, so the two read
 * the same. Describes, never instructs (D204); colour is the `recovery` token
 * and ink only (no traffic light, D214 Q1 = A); every text wraps at the largest
 * text size (nothing is clamped to one line).
 */
export function MuscleDetail({
  muscle, entry = null, role, week = null, nowMs, learnedSpeed = false, splits = null, withWeek = true,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const gloss = MUSCLE_PLAIN_WORDS[muscle];
  const intent = withWeek ? intentFor({ muscle, role, week }) : null;
  const timeline = recoveryTimeline(entry, nowMs);
  const wk = withWeek ? weekPanel({ muscle, role, week }) : null;
  const sessions = Array.isArray(entry?.contributingSessions) ? [...entry.contributingSessions].reverse() : [];
  const spacing = spacingLine(entry);
  const basis = entry ? muscleRecoveryBasisText(entry.basis, learnedSpeed) : null;
  return (
    <View style={[styles.detail, live.detail]}>
      {gloss || intent ? (
        <View style={styles.head}>
          {gloss ? <Text style={live.gloss}>{capitalise(gloss)}</Text> : null}
          {intent ? (
            <View style={[styles.intent, live.intent]} accessible accessibilityLabel={`In your plan: ${intent}`}>
              <Text style={live.intentLabel}>In your plan</Text>
              <Text style={live.body}>{intent}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <DetailSection title="Recovery estimate" live={live} divided={!!(gloss || intent)}>
        {timeline ? <RecoveryTimeline timeline={timeline} live={live} t={t} /> : null}
        <ClockCompare muscle={muscle} live={live} t={t} />
      </DetailSection>

      {withWeek ? (
        <DetailSection title="This week so far" live={live}>
          {wk ? <WeekBlock week={wk} live={live} /> : <Text style={live.body}>No sets counted yet.</Text>}
        </DetailSection>
      ) : null}

      {sessions.length ? (
        <DetailSection title="Sessions counted" live={live}>
          {sessions.map((cs, i) => {
            const when = safeFormatDate(cs?.endMs, 'EEE d MMM', '') || 'Session';
            const text = sessionSetsText(cs, splits?.[cs?.workoutId]);
            return (
              <View key={`${cs?.workoutId ?? 'session'}-${i}`} style={styles.sessionRow} accessible accessibilityLabel={`${when}: ${text}`}>
                <Text style={[styles.sessionWhen, live.sessionWhen]}>{when}</Text>
                <Text style={[styles.sessionText, live.body]}>{text}</Text>
              </View>
            );
          })}
          {spacing ? <Text style={live.note}>{spacing}</Text> : null}
        </DetailSection>
      ) : null}

      <DetailSection title="How this is estimated" live={live}>
        {basis ? (
          <View style={styles.basisRow} accessible accessibilityLabel={`Based on: ${basis}`}>
            <Text style={live.noteStrong}>Based on</Text>
            <Text style={[styles.basisText, live.note]}>{basis}</Text>
          </View>
        ) : null}
        <Text style={live.note}>{HALF_CREDIT_NOTE}</Text>
        <Text style={live.note}>{RECOVERY_ANSWER_NOTE}</Text>
        <Text style={live.note}>Estimated, not measured.</Text>
      </DetailSection>
    </View>
  );
}

function MuscleRecoveryRow({
  entry, nowMs, lastTrainedAt, expanded, onToggle, t, live, learnedSpeed, splits, registerRow, extra,
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
  // D219: a muscle the plan raised carries its intent on the row (the reason, with this week's
  // sets), so the screen shows the intent beside the recovery and never reads a focus as a fault.
  const intent = extra && (extra.role === 'focus' || extra.role === 'raised')
    ? intentFor({ muscle: entry.muscle, role: extra.role, week: extra.week ?? null })
    : null;
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
        // The intent line sits inside this control, so it is spoken with the row's label.
        accessibilityLabel={intent
          ? `${muscleRecoveryRowA11yLabel(entry, nowMs, lastTrainedAt)}. ${intent}`
          : muscleRecoveryRowA11yLabel(entry, nowMs, lastTrainedAt)}
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
        {intent ? <Text style={live.meta}>{intent}</Text> : null}
      </TouchableOpacity>
      {expanded ? (
        <MuscleDetail
          muscle={entry.muscle}
          entry={entry}
          role={extra?.role}
          week={extra?.week ?? null}
          nowMs={nowMs}
          learnedSpeed={learnedSpeed}
          splits={splits}
          withWeek={!!extra}
        />
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
  sessionSplits = null, registerRow = null, registerNames = null, roles = null, weekFigures = null,
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
      extra={roles != null || weekFigures != null
        ? { role: roleFor(roles, entry.muscle), week: weekFigures?.[entry.muscle] ?? null, nowMs }
        : null}
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
    marginTop: spacing.sm, padding: spacing.lg, borderRadius: radius.md,
  },
  head: { gap: spacing.sm, paddingBottom: spacing.md },
  intent: { padding: spacing.md, gap: spacing.xxs, borderRadius: radius.sm, borderLeftWidth: 3 },
  section: { gap: spacing.sm, paddingVertical: spacing.md },
  sectionDivided: { borderTopWidth: StyleSheet.hairlineWidth },
  block: { gap: spacing.xs, marginTop: spacing.xs },
  trackTall: { height: spacing.sm },
  // The week's bar keeps its dot whole at either end (the dot overhangs the track).
  trackOpen: { overflow: 'visible' },
  zone: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.xs },
  fillAbs: {
    position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: radius.xs,
  },
  mark: {
    position: 'absolute', top: -spacing.xxs, bottom: -spacing.xxs, width: spacing.xxs, marginLeft: -1, borderRadius: radius.hair,
  },
  dot: {
    position: 'absolute', top: -spacing.xs, width: spacing.lg, height: spacing.lg, marginLeft: -spacing.sm, borderRadius: radius.full, borderWidth: 2,
  },
  stats: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs,
  },
  stat: { flexGrow: 1, flexBasis: 140, gap: spacing.xxs },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  legendText: { flexShrink: 1 },
  swatch: {
    width: spacing.sm + spacing.xxs, height: spacing.sm + spacing.xxs, borderRadius: radius.hair, marginTop: spacing.xxs,
  },
  compareRow: { gap: spacing.xxs, marginTop: spacing.xs },
  compareTop: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: spacing.md,
  },
  compareName: { flexShrink: 1 },
  compareValue: { flexShrink: 1, textAlign: 'right' },
  bigRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.sm, rowGap: spacing.xs,
  },
  bigUnit: { flexShrink: 1 },
  chip: {
    alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.full, borderWidth: 1,
  },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  sessionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xxs,
  },
  sessionWhen: { flexShrink: 0, minWidth: 88 },
  sessionText: { flex: 1 },
  basisRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.xs },
  basisText: { flexShrink: 1 },
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
    divider: { borderTopColor: t.colors.borderSubtle },
    gloss: { ...t.type.bodySm, color: t.colors.textSecondary },
    intent: { backgroundColor: t.colors.surface, borderLeftColor: t.colors.textSecondary },
    intentLabel: { ...t.type.captionStrong, color: t.colors.textPrimary },
    sectionTitle: { ...t.type.overline, color: t.colors.textSecondary },
    subhead: { ...t.type.captionStrong, color: t.colors.textSecondary, marginTop: spacing.xs },
    body: { ...t.type.bodySm, color: t.colors.textPrimary },
    note: { ...t.type.captionTight, color: t.colors.textMuted },
    noteStrong: { ...t.type.captionStrong, color: t.colors.textSecondary },
    readyHeadline: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    statValue: { ...t.type.num('h3'), color: t.colors.textPrimary },
    statLabel: { ...t.type.captionTight, color: t.colors.textSecondary },
    mark: { backgroundColor: t.colors.textPrimary },
    compareName: { ...t.type.bodySm, color: t.colors.textSecondary },
    compareNameOwn: { ...t.type.captionStrong, color: t.colors.textPrimary },
    compareValue: { ...t.type.num('bodySm'), color: t.colors.textPrimary },
    bigNumber: { ...t.type.num('h1'), color: t.colors.textPrimary },
    bigUnit: { ...t.type.bodySm, color: t.colors.textSecondary },
    chip: { borderColor: t.colors.border },
    chipText: { ...t.type.captionStrong, color: t.colors.textPrimary },
    weekZone: { backgroundColor: withAlpha(t.colors.textPrimary, alpha.edge) },
    dot: { backgroundColor: t.colors.textPrimary, borderColor: t.colors.surface2 },
    scaleText: { ...t.type.num('captionTight'), color: t.colors.textMuted },
    meterFill: { backgroundColor: t.colors.textSecondary },
    sessionWhen: { ...t.type.captionStrong, color: t.colors.textPrimary },
    recoveredNames: { ...t.type.bodySm, color: t.colors.textSecondary },
    detailsLinkText: { ...t.type.label, color: t.colors.textSecondary, textDecorationLine: 'underline' },
    namesLine: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
