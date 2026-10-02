import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import InfoTooltip from './InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';
import { formatNumber, formatWithUnit } from '../lib/format';
import { workloadTakeaway } from '../lib/chartWindows';
import { LOAD_IN_LINE_MIN, LOAD_ABOVE_MIN } from '../lib/trainingLoad';
import { localDayKey, localDayKeysEndingAt } from '../lib/dayKey';
import TrainingDaysGrid from './TrainingDaysGrid';

// Shared section cards for the Consistency surface: the twelve-week grid with
// its caption, the block card and the load card, plus the one sessions line.
// They were lifted out of AnalyticsScreen so the landing and the Consistency
// surface drew the same cards from one place.
//
// D214 (Progress, the recovery heatmap and Consistency elevation, lane 4;
// `docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 00-AUDIT-AND-PLAN.md` section 7.3): the plan card, the "Weekly load" ratio
// card, the session length chart, the training frequency table and the old
// amber calendar are gone from here.
//   - TrainingDaysSection is the twelve-week grid (TrainingDaysGrid: Monday to
//     Sunday columns, weekday and month labels, "Trained" and "No session", never
//     "Rest", CS-13, CS-21, D166) with its one-line caption.
//   - BlockCard is the ONE "Your block" card (the plan card, the block shape and
//     the effort line collapsed): one total weeks for the line and the bar, no
//     percent (CS-5), effort as "3 of 5" with its (i) (CS-7).
//   - LoadCard is the ONE load card (CS-1, CS-6): the person's units, four
//     labelled bars, a like-for-like comparison sentence (D204) and the average
//     of the full weeks.
//   - typicalSessionsLine is the one sessions line (CS-11); the bars and the
//     fatigue inference went with the chart.
// Every card sits on the shared `Card` (the live twin of the local clones CS-19
// found), facts are ink (plan rule 3), and no card instructs (D204).

// The load bars' own geometry: a fixed plot height, so a bar's height is its
// share of the biggest week and a column never jumps between renders.
const LOAD_BAR_AREA = 56;
const LOAD_BAR_MIN = spacing.xs;
const BLOCK_BAR_HEIGHT = spacing.xs;

// The two bounds the comparison words are cut at, as the percentages the (i)
// quotes: built from trainingLoad's own constants so the sentence cannot drift.
const LOAD_UNDER_PCT = Math.round((1 - LOAD_IN_LINE_MIN) * 100);
const LOAD_OVER_PCT = Math.round((LOAD_ABOVE_MIN - 1) * 100);

// useProgressData labels its bars "-3w" ... "Now"; the card says it in words.
const LOAD_BAR_WORDS = { '-3w': '3 weeks ago', '-2w': '2 weeks ago', '-1w': 'Last week', Now: 'This week' };

/** The effort the block's rep target asks of a set, on the 0 to 5 scale ("3 of 5"). */
export function blockEffort(rirTarget) {
  if (rirTarget === null || rirTarget === undefined || rirTarget === '') return null;
  const n = Number(rirTarget);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(0, 5 - n));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const GRID_DAYS = 84;

/**
 * The grid's caption: "51 days trained in the last 12 weeks · about 4 days a week"
 * (D214 addendum 9, census 0.22: the rate names its unit; a rate of 1 reads
 * "about 1 day a week").
 * The rate divides by the weeks the person actually has: a person whose first
 * session was three weeks ago has not had twelve, so a rate over twelve weeks
 * would understate their pace. With under four weeks of history, or under one
 * day a week, the rate is left out; between four and twelve weeks it says
 * "since your first session" (a number states what it is, plan rule 4).
 *
 * @param {{ trainedDays: number, firstSessionAt?: number|null, now?: number }} input
 * @returns {string}
 */
export function trainingDaysCaption({ trainedDays, firstSessionAt = null, now = Date.now() } = {}) {
  const n = Math.max(0, Math.trunc(Number(trainedDays) || 0));
  const head = `${n} ${n === 1 ? 'day' : 'days'} trained in the last 12 weeks`;
  const first = Number(firstSessionAt);
  const known = firstSessionAt !== null && firstSessionAt !== undefined && Number.isFinite(first) && first > 0 && first <= now;
  const spanDays = known ? Math.min(GRID_DAYS, Math.floor((now - first) / DAY_MS) + 1) : GRID_DAYS;
  // Under one day a week there is no "about N a week" to state (0.5 a week must
  // not round up to "about 1"); from one a week it is the nearest whole number.
  const perWeek = n / (spanDays / 7);
  if (spanDays < 28 || perWeek < 1) return head;
  const rate = Math.round(perWeek);
  const rateText = `${rate} ${rate === 1 ? 'day' : 'days'}`;
  return spanDays >= GRID_DAYS
    ? `${head} · about ${rateText} a week`
    : `${head} · about ${rateText} a week since your first session`;
}

/** The one sessions line, or null when there is no typical length to state. */
export function typicalSessionsLine(minutes) {
  const n = Math.round(Number(minutes));
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Sessions usually last about ${n} ${n === 1 ? 'minute' : 'minutes'}.`;
}

// ── Last 12 weeks ───────────────────────────────────────────────────────────

/**
 * The twelve-week training days, in one card: the labelled grid (its own legend
 * names "Trained" and "No session") and the caption under it. The window is the
 * calendar helper's, `localDayKeysEndingAt(84)`, which steps a local Date so a
 * UK clock-change week keeps all seven days (the 2026-09-15 fix, dstDayRuns).
 *
 * Props:
 *   trainedDayKeys  local day keys ('YYYY-MM-DD') with a completed workout
 *                   (useProgressData.calValues' dates); any outside the window
 *                   are ignored
 *   firstSessionAt  epoch ms of the first completed session, for the caption's
 *                   rate; null when unknown
 */
export function TrainingDaysSection({ trainedDayKeys, firstSessionAt = null }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const now = Date.now();
  const dayKeys = localDayKeysEndingAt(84);
  const inWindow = new Set(dayKeys);
  const trained = (Array.isArray(trainedDayKeys) ? trainedDayKeys : []).filter((k) => inWindow.has(k));
  return (
    <Card style={styles.gridCard}>
      <TrainingDaysGrid dayKeys={dayKeys} trainedDayKeys={trained} todayKey={localDayKey(now)} />
      <Text style={[styles.gridCaption, live.gridCaption]}>
        {trainingDaysCaption({ trainedDays: new Set(trained).size, firstSessionAt, now })}
      </Text>
    </Card>
  );
}

// ── Your block ──────────────────────────────────────────────────────────────

/**
 * "Your block", one card: the plan's name, the block's shape (the phase dots
 * and the week sentence, rendered by the screen and passed as `children`), a
 * bar labelled "Week 2 of 6" (no percent, CS-5) and "This week's effort: 3 of
 * 5" with its (i) (CS-7). The week sentence and the bar read ONE total, the
 * block's planned weeks (`plannedWeeks`), never two (CS-5).
 *
 * Props:
 *   meso          the active block row (or the active plan row, `_isPlan`),
 *                 null when no plan runs: the card then offers the plan library
 *   weekIndex     the week the programme is on (the screen passes the
 *                 programme position's, the calendar's only as the fallback)
 *   plannedWeeks  the block's own length, the one M
 *   rirTarget     the week's rep target; the effort line is 5 minus it
 *   finished      the block is over and awaits the athlete's decision: no live
 *                 week is claimed
 *   note          the adaptive adjustment's own words (recoveryState.js), or
 *                 null; an adaptive adjustment is never called a recovery week
 *   onPress       opens the block (the name row is the control)
 *   onBuild       opens the plan library (the no-plan card)
 *   children      the BlockShapeCard
 */
export function BlockCard({
  meso, weekIndex, plannedWeeks, rirTarget, finished = false, note = null, onPress, onBuild, children,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);

  if (!meso) {
    return (
      <Card onPress={onBuild} accessibilityRole="button" accessibilityLabel="Browse plans" style={styles.mesoEmpty}>
        {/* Ink (D214 addendum 6, lane 4 review S3): the card is the control and
            its pill already reads as one; a second amber beside the empty
            state broke rule 3 on day zero. */}
        <Ionicons name="layers-outline" size={32} color={t.colors.textSecondary} />
        {/* D214 addendum 9 (census K1): the door describes, it does not tell. The
            ruled text is two sentences, "No plan is running yet. Your progress
            appears here once one starts, from the plan library or the plan
            builder."; the title carries the first so it is read once, not twice. */}
        <Text style={[styles.mesoEmptyTitle, live.mesoEmptyTitle]}>No plan is running yet</Text>
        <Text style={[styles.mesoEmptySub, live.mesoEmptySub]}>Your progress appears here once one starts, from the plan library or the plan builder.</Text>
        <View style={[styles.mesoEmptyBtn, live.mesoEmptyBtn]}>
          {/* 2026-07-10 (CP-10 stage 4 batch C, theming): live-theme colour
              prop (t.colors.textSecondary); see noPlanJourneyCopy.guard.test.js
              for the mechanically-updated pin. */}
          <Ionicons name="compass-outline" size={14} color={t.colors.textSecondary} />
          <Text style={[styles.mesoEmptyBtnText, live.mesoEmptyBtnText]}>Browse plans</Text>
        </View>
      </Card>
    );
  }

  const isPlan = !!meso._isPlan;
  const total = Number.isFinite(plannedWeeks) && plannedWeeks >= 2 ? Math.round(plannedWeeks) : null;
  const reached = total == null ? null : Math.min(Math.max(Math.round(Number(weekIndex) || 1), 1), total);
  // Stage 1 (2026-08-09): a block past its recovery week is finished and
  // awaiting the athlete's next-block decision; it never claims a live week.
  const showBar = !isPlan && total != null;
  const weekText = !showBar ? null : (finished ? 'Block finished' : `Week ${reached} of ${total}`);
  const planSub = meso.splitType ? meso.splitType : 'Active plan';
  const name = meso.name ?? 'Training block';
  const effort = finished ? null : blockEffort(rirTarget);
  const fill = showBar ? (finished ? total : reached) / total : 0;

  return (
    <Card style={styles.blockCard}>
      <TouchableOpacity
        style={styles.blockTop}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${weekText ?? planSub}`}
        accessibilityHint="Opens training block"
      >
        <View style={styles.blockName}>
          {/* Founder, 2026-09-26 TestFlight screenshot: the generated name
              ("Men's Physique · Bulk · V-Taper 4×/week, 6-week block") was
              cut to "6..." on one line; two lines carry the whole name. */}
          <Text style={[styles.mesoName, live.mesoName]} numberOfLines={2}>{name}</Text>
          {isPlan ? <Text style={[styles.mesoWeek, live.mesoWeek]}>{planSub}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </TouchableOpacity>

      {children}

      {note ? <Text style={[styles.blockNote, live.blockNote]}>{note}</Text> : null}

      {showBar ? (
        <View
          style={styles.blockBarWrap}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={weekText}
          accessibilityValue={{ min: 0, max: total, now: finished ? total : reached, text: weekText }}
        >
          <Text style={[styles.blockBarLabel, live.blockBarLabel]}>{weekText}</Text>
          <View style={[styles.blockBarTrack, live.blockBarTrack]}>
            <View style={[styles.blockBarFill, live.blockBarFill, { width: `${Math.round(fill * 100)}%` }]} />
          </View>
        </View>
      ) : null}

      {effort != null ? (
        <View style={styles.blockEffortRow}>
          <Text style={[styles.blockEffort, live.blockEffort]}>This week's effort: {effort} of 5</Text>
          {/* O15 (CS-7): GLOSSARY.effort, the one definition of the term the
              app's other effort chips already use. */}
          <InfoTooltip text={GLOSSARY.effort} size={12} />
        </View>
      ) : null}
    </Card>
  );
}

// ── Load ────────────────────────────────────────────────────────────────────

// The comparison sentence. It hides rather than comparing against nothing:
// with fewer than two populated previous weeks, or nothing logged by this point
// of them, there is no ratio and so no sentence (campaign6.longTerm pins this).
function LoadComparison({ data }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!data || data.ratio === null) return null;
  const line = workloadTakeaway(data.comparison);
  if (!line) return null;
  return <Text style={[styles.loadStatus, live.loadStatus]}>{line}</Text>;
}

function loadBarLabel(label) {
  return LOAD_BAR_WORDS[label] ?? String(label ?? '');
}

/**
 * "Load", one card (D214, CS-1, CS-6): how much weight was lifted this week so
 * far, in the person's own unit, over four labelled bars (three full Monday
 * weeks and this week so far), a like-for-like comparison and the average of
 * the full weeks. The old ratio (a part week divided by full ones) and the
 * second card that repeated these figures are gone.
 *
 * Props:
 *   bars        [{ value, label }] oldest to newest, the last being this week so
 *               far (useProgressData.mesoTonnage); values are in the person's
 *               own unit, because gym weight is stored in it and never converted
 *   unit        'kg' | 'lbs', the person's unit, printed on every kilogram or
 *               pound figure (CS-1)
 *   comparison  trainingLoad.likeForLikeLoad's result, or null
 *   average     { chronic, weeksOfData } (useProgressData.workloadData), or
 *               null: the average of the full weeks, named with its true count
 */
export function LoadCard({ bars, unit = 'kg', comparison = null, average = null }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const list = Array.isArray(bars) ? bars : [];
  if (!list.some((b) => b?.value > 0)) return null;

  const current = list[list.length - 1]?.value ?? 0;
  const top = Math.max(...list.map((b) => b?.value ?? 0), 1);
  const weeksN = Number.isFinite(average?.weeksOfData) && average.weeksOfData > 0 ? Math.round(average.weeksOfData) : null;
  const showAverage = weeksN != null && Number.isFinite(average?.chronic) && average.chronic > 0;
  const spoken = `Weight lifted each week, ${list
    .map((b, i) => `${i === list.length - 1 ? 'this week so far' : loadBarLabel(b.label).toLowerCase()} ${formatWithUnit(formatNumber(b.value), unit)}`)
    .join(', ')}.`;

  return (
    <Card style={styles.loadCard}>
      <View style={styles.rowBetween}>
        <Text style={[styles.loadHeadline, live.loadHeadline]}>
          {formatWithUnit(formatNumber(current), unit)} lifted so far this week
        </Text>
        {/* D204: the plan sets each session; this is a picture of how the load
            is moving. The comparison's words and the average are explained here
            in plain terms, with the real bounds the words are cut at. */}
        <InfoTooltip
          text={
            'The total weight you lifted over your working sets (warm-ups are not counted), for each week from Monday to Sunday. The last bar is this week so far.\n\n'
            + 'The comparison looks at the same days and the same time of day in each of your last three weeks, so a part week is never set against full ones. '
            + `In line means between ${LOAD_UNDER_PCT}% under and ${LOAD_OVER_PCT}% over the average of those weeks at this point. `
            + `Below means more than ${LOAD_UNDER_PCT}% under it, and Above means ${LOAD_OVER_PCT}% or more over it.\n\n`
            + 'The average is taken over up to your last four full weeks that have at least one logged set; this week so far is not in it.\n\n'
            + 'Your plan sets each session; this is a picture of how the load is moving across the block, not an instruction.'
          }
        />
      </View>

      <View style={styles.loadBars} accessible accessibilityRole="image" accessibilityLabel={spoken}>
        {list.map((b, i) => {
          const isNow = i === list.length - 1;
          const height = b.value > 0 ? Math.max(LOAD_BAR_MIN, Math.round((b.value / top) * LOAD_BAR_AREA)) : LOAD_BAR_MIN;
          return (
            <View key={b.label ?? i} style={styles.loadBarCol}>
              <Text style={[styles.loadBarValue, live.loadBarValue]}>{formatNumber(b.value)}</Text>
              <View style={styles.loadBarPlot}>
                <View style={[styles.loadBar, live.loadBar, { height }]} />
              </View>
              <Text style={[styles.loadBarLabel, live.loadBarLabel]}>{loadBarLabel(b.label)}</Text>
              {/* "So far" on every open-week figure (plan rule 2). */}
              <Text style={[styles.loadBarLabel, live.loadBarLabel]}>{isNow ? 'so far' : ' '}</Text>
            </View>
          );
        })}
      </View>

      {/* Census K5: the bars print bare figures ("12,430"), so one line under them
          names what they are and the person's unit. */}
      <Text style={[styles.loadUnitLine, live.loadUnitLine]}>{`Weight lifted each week, in ${unit}`}</Text>

      <LoadComparison data={comparison} />
      {showAverage ? (
        <Text style={[styles.loadAverage, live.loadAverage]}>
          {`${weeksN}-week average: ${formatWithUnit(formatNumber(average.chronic), unit)} a week`}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },

  // ── No-plan card ──
  mesoEmpty:        { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  mesoEmptyTitle:   { ...type.bodyStrong, color: colors.textPrimary },
  mesoEmptySub:     { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },
  mesoEmptyBtn:     {
    minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs,
  },
  mesoEmptyBtnText: { ...type.label, color: colors.textPrimary },

  // ── Last 12 weeks ──
  gridCard:         { gap: spacing.md },
  gridCaption:      { ...type.bodySm, color: colors.textSecondary },

  // ── Your block ──
  blockCard:        { gap: spacing.md },
  blockTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: spacing.xxxl },
  blockName:        { flex: 1 },
  mesoName:         { ...type.bodyStrong, color: colors.textPrimary },
  mesoWeek:         { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  blockNote:        { ...type.bodySm, color: colors.textSecondary },
  blockBarWrap:     { gap: spacing.xs },
  blockBarLabel:    { ...type.caption, color: colors.textSecondary },
  blockBarTrack: {
    height: BLOCK_BAR_HEIGHT, borderRadius: radius.full,
    backgroundColor: colors.surface2, overflow: 'hidden',
  },
  blockBarFill:     { height: '100%', borderRadius: radius.full, backgroundColor: colors.textSecondary },
  blockEffortRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  blockEffort:      { ...type.bodySm, color: colors.textPrimary },

  // ── Load ──
  loadCard:         { gap: spacing.md },
  loadHeadline:     { ...type.num('title'), color: colors.textPrimary, flex: 1 },
  loadBars:         { flexDirection: 'row', gap: spacing.sm },
  loadBarCol:       { flex: 1, alignItems: 'center', gap: spacing.xxs },
  loadBarPlot:      { height: LOAD_BAR_AREA, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' },
  loadBar:          { width: '60%', borderRadius: radius.xs, backgroundColor: colors.textSecondary },
  loadBarValue:     { ...type.num('caption'), color: colors.textSecondary },
  loadBarLabel:     { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  loadUnitLine:     { ...type.bodySm, color: colors.textMuted },
  loadStatus:       { ...type.bodySm, color: colors.textSecondary },
  loadAverage:      { ...type.bodySm, color: colors.textMuted },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, the "frozen base + live override" pattern the
// tree carries. Only the colour- and type-bearing keys are mirrored; layout-only
// keys (rowBetween, gridCard, blockCard, blockTop, blockName, blockBarWrap,
// blockEffortRow, loadCard, loadBars, loadBarCol, loadBarPlot) have nothing to
// unfreeze. Everything here is ink or a surface tone: no amber on a fact.
function buildLiveStyles(t) {
  return {
    gridCaption: { ...t.type.bodySm, color: t.colors.textSecondary },
    mesoEmptyTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    mesoEmptySub: { ...t.type.bodySm, color: t.colors.textSecondary },
    mesoEmptyBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    mesoEmptyBtnText: { ...t.type.label, color: t.colors.textPrimary },
    mesoName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    mesoWeek: { ...t.type.caption, color: t.colors.textSecondary },
    blockNote: { ...t.type.bodySm, color: t.colors.textSecondary },
    blockBarLabel: { ...t.type.caption, color: t.colors.textSecondary },
    blockBarTrack: { backgroundColor: t.colors.surface2 },
    blockBarFill: { backgroundColor: t.colors.textSecondary },
    blockEffort: { ...t.type.bodySm, color: t.colors.textPrimary },
    loadHeadline: { ...t.type.num('title'), color: t.colors.textPrimary },
    loadBar: { backgroundColor: t.colors.textSecondary },
    loadBarValue: { ...t.type.num('caption'), color: t.colors.textSecondary },
    loadBarLabel: { ...t.type.caption, color: t.colors.textMuted },
    loadUnitLine: { ...t.type.bodySm, color: t.colors.textMuted },
    loadStatus: { ...t.type.bodySm, color: t.colors.textSecondary },
    loadAverage: { ...t.type.bodySm, color: t.colors.textMuted },
  };
}
