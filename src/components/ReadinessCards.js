/**
 * ReadinessCards
 *
 * The readiness half of the old Athlete Hub dashboard, now shown inline
 * on the Progress tab: training milestones, recovery signals, muscle
 * readiness and the recovery-capacity trend. Self-loading from local
 * SQLite given the signed-in user and tier. Coaching management (check-in,
 * nutrition, body metrics) lives in Coach and the Athlete Profile and is not duplicated here.
 *
 * D214 (Progress, the recovery heatmap and Consistency elevation, lane 2,
 * plan `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.2, founder rulings Q1 = A, Q3 = A, Q7 =
 * A): the Recovery screen's first block now LEADS with the answer ("4
 * muscles still recovering, 8 recovered." and the next-workout sentence),
 * then the sessions still to do this plan week, then the figure and the list;
 * the ratings read on their true scales in the scale's own words; the
 * fatigue trend moved in from Consistency; a failed read is said and
 * logged, never swallowed.
 *
 * D219 (lane B4, design 5.1 and 5.2): the block now leads with the "Next in
 * your plan" card (NextInPlanCard, built by lib/recovery/nextInPlan.js): the
 * plan's own next session, each of its muscles' estimated readiness by a part of
 * the day, and when every muscle in it is estimated recovered (the latest
 * muscle's ready time); with the plan week complete it names next week's first
 * session. It replaces the next-workout sentence. The muscle rows and the card's
 * muscle detail also say what the plan intends for a muscle and where this
 * week's sets sit against the evidence bands (lib/recovery/muscleDetail.js and
 * lib/volumeJudgement.js), so a muscle raised to bring up reads inside its focus
 * range with the reason. Nothing recommends another session.
 *
 * Voice rules: CLAUDE.md. No em dashes. D204: this screen describes, it
 * never tells the athlete to train, rest or monitor themselves. Facts are
 * ink: no amber and no status colour on a fact (plan 7.0 rule 3). Nothing
 * on this screen reads calm mode or an ED flag itself, and the recovery
 * model reads no weight or food data. The one thing that answers to either
 * is the personal learner's reading: while calm mode is on or an ED flag is
 * open, loadMuscleRecovery HOLDS it (D219, founder answer 2026-10-05, "Pause
 * it then"), so the learning card and the learned speed the rows use stay as
 * they were last shown, across a restart too, and nothing new is learned
 * until the pause lifts (src/lib/recovery/load.js, THE PAUSE). Nothing else
 * on this screen changes under either.
 */
import {
  useState, useCallback, useEffect, useMemo, useRef,
} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import AnimatedEntrance from './AnimatedEntrance';
import InfoTooltip from './InfoTooltip';
import SectionLabel from './SectionLabel';
import Button from './Button';
import BodyDiagramHeatmap from './BodyDiagramHeatmap';
import MuscleRecoveryList, { buildMuscleSessionSplits } from './MuscleRecoveryList';
import NextInPlanCard from './NextInPlanCard';
import RecoveryLearningCard from './RecoveryLearningCard';
import FatigueTrendCard from './FatigueTrendCard';
import { SkeletonCard } from './Skeleton';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getPlanRoles } from '../lib/effectiveLandmarks';
import { sessionSummaryParams } from '../lib/sessionReport';
import {
  getAllWorkouts, getCompletedWorkoutSets,
  getLastTrainedPerMuscle, getRecentCheckins,
  getRecentCompletedWorkouts,
  getWorkoutSetsForWorkout, getExerciseLookup,
} from '../lib/database';
import { parseDecimalInput } from '../lib/parseDecimalInput';
import { fatigueWord } from '../lib/recovery/ratingWords';
// D214 addendum 9 (census 6.11): the milestone's own rule (a completed workout
// with a cached set count above zero or with set rows) is the ONE session
// definition now, shared with the Progress root's Recaps count and the Training
// row's gate (src/lib/progress/sessionCount.js).
import { loggedSessionWorkouts } from '../lib/progress/sessionCount';
import { safeFormatDate } from '../lib/safeFormat';
import { logError } from '../lib/errorLog';
// D201 (per-muscle recovery, spec docs/recovery-programme-2026-09-25/
// 00-SPEC.md section 6): the "Recovery by muscle" section below. load.js is
// the domain's ONLY I/O (mirrors HomeScreen.loadRecoveryRecommendation's
// exact call chain: loadMuscleRecovery -> resolveProgrammePosition ->
// loadPlannedSetsByRoutine -> nextLikelyTrainingTime -> recommendNextWorkout);
// everything else here is pure derivation over their results.
import { resolveProgrammePosition } from '../lib/programmePosition';
import { SESSION_STATE } from '../lib/blockProgression';
import { loadMuscleRecovery, loadPlannedSetsByRoutine } from '../lib/recovery/load';
import { servedSetsResolver } from '../lib/sessionAdjustments';
import { nextLikelyTrainingTime } from '../lib/recovery/nextLikelyTrainingTime';
// The "ready now / later today / by Thursday / in N days" wording is
// nextWorkoutRecommendation.js's readyClause, read by MuscleRecoveryList.js for
// the rows; this file needs only the still-to-do list from it (D219: it describes
// the plan's sessions, it never recommends another).
import { recommendNextWorkout } from '../lib/recovery/nextWorkoutRecommendation';
// D219 (lane B4): the "Next in your plan" card's model and the week's sets per muscle.
import { buildNextInPlanCard } from '../lib/recovery/nextInPlan';
import { weekFigures as buildWeekFigures } from '../lib/recovery/muscleDetail';

const DAY_MS = 86400000;

// D214 (Consistency elevation, lane 4; plan section 7.3 item 3, CS-2, CS-14):
// the ladder is the same seven rungs, but a rung is a number now. The card that
// drew a trophy, a medal and a ribbon in `gold` is gone (a progress surface
// does not hand out medals), and so is the label that named the LAST rung
// reached ("50 sessions" to a person with 53, CS-2): the sentence prints the
// true count and only the next rung.
const MILESTONES = [
  { sessions: 1 },
  { sessions: 10 },
  { sessions: 25 },
  { sessions: 50 },
  { sessions: 100 },
  { sessions: 250 },
  { sessions: 500 },
];

function nextMilestone(total) {
  return MILESTONES.find(m => m.sessions > total) ?? null;
}

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "26 June", with the year only when it is not this year, so a date a year or
// more back is never ambiguous. The month names are spelled out here rather than
// asked of Intl, so the words are the same on every device.
function sinceDateText(sinceMs, now) {
  const d = new Date(sinceMs);
  if (Number.isNaN(d.getTime())) return null;
  const base = `${d.getDate()} ${MONTH_NAMES_LONG[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/**
 * The sessions milestone as one plain sentence (D214, plan 7.3 item 3):
 * "53 sessions logged since 26 June · next milestone 100". The TRUE count of
 * completed sessions (the ones with at least one set), the day the first of
 * them started, and the next rung of the ladder; no trophy, no gold, no amber,
 * no "to go" countdown. Past the last rung it names no next one. Null with no
 * completed session (the screen then says nothing rather than "0 sessions").
 *
 * @param {{ count: number, sinceMs?: number|null, now?: number }} input
 * @returns {string|null}
 */
export function sessionsMilestoneLine({ count, sinceMs = null, now = Date.now() } = {}) {
  const n = Math.trunc(Number(count));
  if (!Number.isFinite(n) || n < 1) return null;
  const since = Number.isFinite(Number(sinceMs)) && sinceMs !== null ? sinceDateText(Number(sinceMs), now) : null;
  const next = nextMilestone(n);
  return `${n} ${n === 1 ? 'session' : 'sessions'} logged${since ? ` since ${since}` : ''}${next ? ` · next milestone ${next.sessions}` : ''}`;
}

/**
 * The "Recovery by muscle" caption: what the estimate is built from. Once the
 * personal learning has moved (D210), the recovery speed learned from the
 * lifts takes the recovery answer's place, and the caption says so; until
 * then the answer is what the estimate uses.
 */
export function recoveryByMuscleCaption(personal) {
  const adjustedBy = personal?.reason === 'adjusted'
    ? 'your recovery speed (learned from your workouts) and your ratings'
    : 'your answer to ‘How’s your recovery?’ and your ratings';
  return `Estimated from how long ago each muscle was last trained and how many sets it had, adjusted for ${adjustedBy}. Not a measurement.`;
}

/** The caption's (i): the percent's referent and thresholds (RC-7) and what
 * the ratings do (RC-22). Describes; it tells nobody what to do. */
export const RECOVERY_PERCENT_NOTE = "The percent is how much of the fatigue from a muscle's last session is estimated to have cleared; 90% counts as recovered, 75% as nearly. A session you rate as exhausting, or that leaves you sore or with joint discomfort, is estimated to take longer to recover.";

/** The ratings card's (i): the true scales, and that soreness is asked
 * BEFORE a session (RC-1, RC-6). */
export const RATINGS_NOTE = 'Averages of your rated sessions in the last two weeks, with the most recent counting most. Soreness is asked before a session and is rated 1 to 3 (fresh, mild, sore). Fatigue is rated after a session, 1 to 5 (fresh, mild, moderate, high, exhausted). Joint discomfort is rated after a session, 0 to 3 (none, slight, moderate, significant). Each appears after two rated sessions.';

// Checkins arrive newest-first. Surfaces a single plain-English read on
// recovery capacity over the recent run of check-ins, or null when there
// is not enough signal to say anything useful. Reads energy, soreness and
// sleep quality; sleep is collected on the weekly check-in but, before
// this, was never read back to the user.
export function computeRecoveryTrendInsight(checkins, nowMs = Date.now()) {
  // C6 RD6-7 (D97-25): every sentence below speaks in runs and the
  // present tense ("in a row", "weeks running", "is trending"), but the
  // input was six ROWS of any age with no adjacency test - the exact
  // class D97-5 ruled for the coach counters, unapplied to this
  // surface. Two bounds, both from the standing rulings: the latest
  // check-in must be current (14-day boundary, as blockAdvisor's
  // sibling), and a run only counts across ADJACENT calendar weeks -
  // the walk stops at the first gap, so a lapse can never chain an
  // ancient week onto today's. Thresholds and wording are unchanged.
  //
  // D214 (RC-18, D204): the three sentences that told the athlete to pay
  // attention keep their FACT and lose the clause ("Energy has been low for
  // 3 weekly check-ins in a row."); they render in the neutral card with no
  // alert icon. The sleep sentence names its measure (the 1-5 sleep quality
  // rating, not the hours the check-in prints, RC-34).
  const rows = Array.isArray(checkins) ? checkins : [];
  const latestWs = Number(rows[0]?.weekStart ?? rows[0]?.week_start);
  if (!Number.isFinite(latestWs) || (nowMs - latestWs) > 14 * DAY_MS) return null;
  const adjacent = [];
  let expectedWs = latestWs;
  for (const c of rows) {
    const ws = Number(c?.weekStart ?? c?.week_start);
    if (!Number.isFinite(ws)) break;
    // 1.5-day tolerance on the 7-day step absorbs DST-length weeks.
    if (Math.abs(ws - expectedWs) > 1.5 * DAY_MS) break;
    adjacent.push(c);
    expectedWs = ws - 7 * DAY_MS;
  }
  const energies = adjacent.map(c => c.energyScore ?? null).filter(v => v !== null);
  const soreness = adjacent.map(c => c.sorenessScore ?? null).filter(v => v !== null);
  const sleep = adjacent.map(c => c.sleepQuality ?? null).filter(v => v !== null);
  if (energies.length < 3 && soreness.length < 3 && sleep.length < 3) return null;

  const recentEnergy = energies.slice(0, 4);
  const lowEnergyWeeks = recentEnergy.filter(e => e <= 2).length;
  const highEnergyWeeks = recentEnergy.filter(e => e >= 4).length;
  const recentSoreness = soreness.slice(0, 4);
  const highSorenessWeeks = recentSoreness.filter(s => s >= 4).length;
  // Sleep quality is 1 (Poor) to 5 (Excellent); 2 or below is a short night.
  const recentSleep = sleep.slice(0, 4);
  const lowSleepWeeks = recentSleep.filter(s => s <= 2).length;
  // The rule counts 3 or more of the latest 4, which need not be consecutive,
  // so the sentence says exactly that and never "in a row" or "running"
  // (lane C1 note, D214 addendum 9: the number judged is the number shown).
  const ofLast = (count, total, noun) => (count === total
    ? `in each of your last ${total} ${noun}`
    : `in ${count} of your last ${total} ${noun}`);

  if (lowEnergyWeeks >= 3) {
    return { type: 'warning', text: `Energy has been low ${ofLast(lowEnergyWeeks, recentEnergy.length, 'weekly check-ins')}.` };
  }
  if (highSorenessWeeks >= 3) {
    return { type: 'warning', text: `High soreness has been reported ${ofLast(highSorenessWeeks, recentSoreness.length, 'weekly check-ins')}.` };
  }
  // A run of poor nights is the clearest recovery signal there is. Surface
  // it in the same insight slot rather than on a card of its own, so the
  // leaned Consistency surface doesn't grow another chart.
  if (lowSleepWeeks >= 3) {
    // C6 closeout P-9 (evidence-naming law): sleepQuality is a
    // dual-source column - the workout summary writes it tier-blind
    // from the pre-workout sleep question - so calling these rows
    // "weekly check-ins" manufactured check-ins that never occurred
    // for a newly upgraded user. "Weeks running" is what the RD6-7
    // adjacency walk actually proves, whichever surface supplied the
    // rating. The energy/soreness sentences keep their noun: those
    // columns are only ever written by a real check-in.
    return { type: 'warning', text: `Sleep quality has been rated low ${ofLast(lowSleepWeeks, recentSleep.length, 'weeks')}.` };
  }
  if (highEnergyWeeks >= 3) {
    // D214 addendum 9 (V4): the fact, with no clause that judges it ("which is a
    // good sign"), the shape the low-energy sentence above already has.
    return { type: 'good', text: `Energy has been high ${ofLast(highEnergyWeeks, recentEnergy.length, 'weekly check-ins')}.` };
  }
  if (energies.length >= 4) {
    const older = energies.slice(2, 4);
    const newer = energies.slice(0, 2);
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const newerAvg = newer.reduce((a, b) => a + b, 0) / newer.length;
    if (newerAvg - olderAvg >= 1) return { type: 'good', text: 'Energy is trending upward over the last few weeks.' };
    if (olderAvg - newerAvg >= 1) return { type: 'warning', text: 'Energy has been trending lower over the last few weeks.' };
  }
  return null;
}

// P3(a) (progress-tab audit 2026-09-24, D200-2): the one-tap "Rate your
// last session" path. Builds the WorkoutSummary route params, plus
// allowRating: true. Returns null when there is no completed workout or the
// latest one already carries both post-session ratings, so the caller renders
// no button.
//
// D218 (founder order 2026-10-03, audit F-2): the params are the shared
// session report's (src/lib/sessionReport.js sessionSummaryParams), the very
// object History's "View summary" carries, over the shared exercise lookup
// (unfiltered, survivor-aware, a set's own name snapshot as the fallback). This
// used to be a hand-copied builder over the filtered library, so a session on
// a deleted custom exercise opened a summary naming fewer exercises than
// History's card for the same workout.
function buildRateLastSessionParams(workout, sets, lookup) {
  if (!workout) return null;
  if (workout.fatigueLevel != null && workout.jointDiscomfort != null) return null;
  return { ...sessionSummaryParams(workout, sets ?? [], lookup), allowRating: true };
}

// D201 (per-muscle recovery, spec section 6): row order -- "recovering
// first then nearly then recovered, then by name". A muscle with no
// session in the last 14 days never reaches this table at all (rows only
// ever hold the other three statuses; see muscleRecoveryRows below).
const RECOVERY_ROW_STATUS_RANK = Object.freeze({ recovering: 0, nearly: 1, recovered: 2 });

// ASCII compare, not localeCompare: MUSCLE_DISPLAY_NAMES are plain English
// words, and Hermes' localeCompare needs full-icu to sort correctly, which
// this app does not link -- a plain compare is exact for this alphabet and
// carries no ICU risk on-device.
function compareMuscleNames(a, b) {
  const nameA = MUSCLE_DISPLAY_NAMES[a] || a;
  const nameB = MUSCLE_DISPLAY_NAMES[b] || b;
  if (nameA === nameB) return 0;
  return nameA < nameB ? -1 : 1;
}

// The per-muscle rows (name, estimated percent with its status word, bar,
// the ready-by and trained-ago line, and the tap-to-open breakdown) and
// their helpers live in MuscleRecoveryList.js (D201 addendum 9).

/**
 * How many muscles sit in each of the model's three counted states
 * (`no_recent_session` is none of them). The counts the answer line prints
 * and the Progress row's headline are the SAME three numbers.
 */
export function recoveryCounts(map) {
  const out = { recovering: 0, nearly: 0, recovered: 0 };
  for (const entry of Object.values(map ?? {})) {
    if (entry && Object.prototype.hasOwnProperty.call(out, entry.status)) out[entry.status] += 1;
  }
  return out;
}

/**
 * The answer line (D214 Q7 = A, `t.type.h3`): "4 muscles still recovering,
 * 2 nearly recovered, 8 recovered." Only the states with a count are named;
 * every muscle recovered reads "All 8 muscles recovered."; null when no
 * muscle has a session in the window.
 */
export function recoveryAnswerLine(counts) {
  const { recovering, nearly, recovered } = counts;
  if (!recovering && !nearly && !recovered) return null;
  if (!recovering && !nearly) {
    return recovered === 1 ? '1 muscle recovered.' : `All ${recovered} muscles recovered.`;
  }
  const parts = [];
  if (recovering) parts.push(`${recovering} muscle${recovering === 1 ? '' : 's'} still recovering`);
  if (nearly) parts.push(`${nearly} nearly recovered`);
  if (recovered) parts.push(`${recovered} recovered`);
  return `${parts.join(', ')}.`;
}

/**
 * One row per OUTSTANDING session this plan week (D214 7.2 b), from
 * recommendNextWorkout().perSession, which holds outstanding sessions only,
 * in programme order: the session's name and nothing else ("Upper B").
 * D219 (design 5.2): the rows are the plan's list, with no readiness, no
 * ranking and no figure. They used to carry each session's readiness
 * ("Upper B · estimated ready by tomorrow (Back 55% recovered)"), which is
 * the information a person would use to pick a different session; the plan's
 * order is fixed when the plan is built, so the list only says what is still
 * to do, in the plan's order. An unnamed routine reads "Session".
 */
export function buildStillToDoRows(recommendation) {
  const per = Array.isArray(recommendation?.perSession) ? recommendation.perSession : [];
  const names = recommendation?.routineNamesById ?? {};
  return per.map((p) => ({ routineId: p.routineId, text: names[p.routineId] || 'Session' }));
}

/**
 * Scrolls a ScrollView so a laid-out node sits near the top: the node's
 * position inside the scroll content comes from measureLayout against the
 * ScrollView's inner view (one measurement, no nested onLayout sums). Does
 * nothing, and says so, when either side cannot measure (a test renderer).
 */
export function scrollToNode(scrollView, node, headroom = spacing.lg) {
  if (!scrollView || !node || typeof node.measureLayout !== 'function') return false;
  const inner = typeof scrollView.getInnerViewRef === 'function' ? scrollView.getInnerViewRef() : null;
  if (!inner || typeof scrollView.scrollTo !== 'function') return false;
  node.measureLayout(inner, (_x, y) => {
    scrollView.scrollTo({ y: Math.max(y - headroom, 0), animated: true });
  }, () => {});
  return true;
}

/**
 * The ratings, each on its OWN true scale and in that scale's own words
 * (D214 7.2 item 4, RC-1 to RC-3): soreness is asked before a session on 1
 * to 3 (fresh, mild, sore), fatigue after it on 1 to 5 (fresh, mild,
 * moderate, high, exhausted, the workout summary's own buttons) and joint
 * discomfort after it on 0 to 3 (none, slight, moderate, significant).
 *
 * One exception (D214 addendum 9, 0.23): the lowest soreness band reads "not
 * sore" when printed as the answer to "Soreness before sessions". "Fresh" is
 * the rating button's word, and nobody says "soreness: fresh". The buttons and
 * the (i) keep their own words.
 */
export function sorenessWord(v) {
  if (v < 1.5) return 'not sore';
  return v <= 2.5 ? 'mild' : 'sore';
}
// The fatigue words (FATIGUE_WORDS) live in lib/recovery/ratingWords.js, shared
// with the fatigue-trend card, which prints the same words for the last two
// sessions' own ratings (addendum 9, V5); one list, no second. Re-exported here
// because this is where the ratings card has always read it from.
export { fatigueWord };
export function jointWord(v) {
  if (v < 0.5) return 'none';
  if (v <= 1.5) return 'slight';
  return v <= 2.5 ? 'moderate' : 'significant';
}

// MIN_RATED_SESSIONS: a "running average" needs at least two points to be one.
// Below that the row shows the existing no-value state with an honest note,
// and no word is claimed of a single answer.
const MIN_RATED_SESSIONS = 2;

/** One rating's text: "Soreness before sessions · mild (1.4 of 3)", or why
 * there is no figure yet. */
export function ratingText({ label, value, samples = 0, word, max }) {
  // C5-P18-01: a single rated session is not an average, so it gets no number
  // and no verdict word.
  const enoughSamples = samples >= MIN_RATED_SESSIONS;
  const hasValue = value != null && !isNaN(value) && enoughSamples;
  if (!hasValue) {
    // P3(a) (F3, D200-2): honest and specific per sample count -- 0 -> no
    // session has rated anything yet; 1 -> one rated session is not enough
    // for a running average.
    return `${label} · ${samples > 0 && !enoughSamples ? 'one rated session so far' : 'not rated yet'}`;
  }
  const v = parseDecimalInput(value);
  return `${label} · ${word(v)} (${v.toFixed(1)} of ${max})`;
}

// The weekly check-in's own words (WeeklyCheckInScreen's chips).
const CHECKIN_ENERGY_WORDS = ['', 'low', 'below normal', 'normal', 'good', 'high'];
const CHECKIN_STRESS_WORDS = ['', 'low', 'mild', 'moderate', 'high', 'very high'];
const CHECKIN_SORENESS_WORDS = ['', 'none', 'mild', 'moderate', 'high', 'very high'];

/**
 * The latest weekly check-in as one line, only while it is current (within
 * 14 days of its week, the bound the trend sentences use; RC-16): its own
 * words with "of 5" after each score, and sleep in hours only (RC-34).
 * Empty string when there is nothing current to say.
 */
export function checkinSummaryLine(checkin, nowMs = Date.now()) {
  if (!checkin) return '';
  const ws = Number(checkin.weekStart ?? checkin.week_start);
  if (!Number.isFinite(ws) || (nowMs - ws) > 14 * DAY_MS) return '';
  const word = (table, n) => (table[n] ? `${table[n]} ` : '');
  const week = safeFormatDate(ws, 'd MMM', '');
  const sleep = checkin.sleepHours;
  return [
    week ? `Week of ${week}` : null,
    checkin.energyScore != null ? `Energy ${word(CHECKIN_ENERGY_WORDS, checkin.energyScore)}(${checkin.energyScore} of 5)` : null,
    checkin.stressScore != null ? `Stress ${word(CHECKIN_STRESS_WORDS, checkin.stressScore)}(${checkin.stressScore} of 5)` : null,
    checkin.sorenessScore != null ? `Soreness ${word(CHECKIN_SORENESS_WORDS, checkin.sorenessScore)}(${checkin.sorenessScore} of 5)` : null,
    sleep != null ? `Sleep ${sleep} ${Number(sleep) === 1 ? 'hour' : 'hours'}` : null,
  ].filter(Boolean).join(' · ');
}

// FOUNDER DECISION (fully free, no tier split): every reader below used to
// fork on `tier` (muscle freshness, the recovery-trend insight, and the
// learning-promise tooltip copy); the component no longer takes a tier prop
// and always runs the full behaviour.
// Founder question 2026-09-26 ("Should we have a place in Progress
// exclusively for recovery rather than it being hidden behind a button for
// consistency?"), ruled by the lead (register D208): the Recovery section
// moves to its own screen, reached from a Recovery row in the top card on
// Progress. `sections` picks what this component draws: 'all' (the old
// single block), 'milestone' (Consistency: the sessions milestone only) or
// 'recovery' (the Recovery screen: the section exactly as it was, same
// order, headed "Your ratings" because the screen itself is titled
// "Recovery"). The recovery reads are skipped when they would not be drawn.
// `scrollRef` (Recovery screen only): the screen's ScrollView, so a tap on
// the figure can scroll the list to the muscle's row (D214, RC-12).
export default function ReadinessCards({
  userId, onRateLastSession, sections = 'all', scrollRef = null,
}) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  // RC-33 (D214): `totalWorkouts` starts at 0, so the milestone read "1 to
  // go: First session" until the read landed, and for ever if it failed.
  // The milestone now waits for a read that succeeded.
  const [workoutsRead, setWorkoutsRead] = useState(false);
  // The day the first counted session started, for "logged since 26 June".
  const [firstSessionAt, setFirstSessionAt] = useState(null);
  const [ratingsFailed, setRatingsFailed] = useState(false);
  // False until the first load has finished (success or failure): the card
  // slots draw skeletons until then (RC-24).
  const [loaded, setLoaded] = useState(false);
  const [recovery, setRecovery] = useState({ soreness: null, fatigue: null, joint: null });
  const [sampleCounts, setSampleCounts] = useState({ soreness: 0, fatigue: 0, joint: 0 });
  const [muscleFreshness, setMuscleFreshness] = useState({});
  const [recoveryTrendInsight, setRecoveryTrendInsight] = useState(null);
  // The last six rated sessions, newest first, for the fatigue-trend bars
  // (D214 Q3 = A: moved here from Consistency); derived from the workouts
  // this load already reads, so no new read.
  const [fatigueSessions, setFatigueSessions] = useState([]);
  // P3(a): the latest completed session's WorkoutSummary route params, or
  // null when there is no completed session or it already carries both
  // post-session ratings -- either way, the "Rate your last session"
  // button renders nothing.
  const [rateSessionParams, setRateSessionParams] = useState(null);
  // P3(b): the latest weekly check-in row (camelCased, from
  // getRecentCheckins(userId, 1)), read independently of the >=3 gate the
  // existing trend-insight sentence below uses, so this row can show as
  // soon as a single check-in exists.
  const [latestCheckin, setLatestCheckin] = useState(null);
  // D201: loadMuscleRecovery's own result ({ map, nowMs, ... }), or null
  // when it hasn't resolved yet or the read failed. D214 (RC-24, RC-33): a
  // failed read no longer hides the section in silence; the card stays with
  // "Couldn't load the estimate just now." and the failure is logged.
  const [muscleRecovery, setMuscleRecovery] = useState(null);
  const [muscleRecoveryFailed, setMuscleRecoveryFailed] = useState(false);
  // The muscle chosen on the figure or by a row tap; its breakdown is open
  // when it has a row (D201 addendum 9).
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  // D201: recommendNextWorkout's result (per-session readiness and the plan's
  // next session; D219: no recommendation), or null when there is no active
  // block, no outstanding session to describe, or the read failed.
  const [recoveryRecommendation, setRecoveryRecommendation] = useState(null);
  // D219 (lane B4): the "Next in your plan" card's model, or null when there is no
  // active block, nothing to describe, or the read failed; the active plan's muscle
  // roles (focus, raised, standard, maintenance; empty reads every muscle standard);
  // and this week's sets per muscle, the Volume heatmap's own week.
  const [nextCard, setNextCard] = useState(null);
  const [planRoles, setPlanRoles] = useState({});
  const [weekByMuscle, setWeekByMuscle] = useState({});
  // The counted sessions' own sets and the exercise library, for the
  // breakdown's "as the main muscle worked" / "as a helper" split (RC-9, RC-10).
  const [splitData, setSplitData] = useState({ sets: [], exercises: [] });
  // Scroll plumbing (RC-12): the rows' nodes, the names line's node, and
  // the muscle a figure tap is waiting to scroll to once its row exists.
  const rowNodes = useRef({});
  const namesNode = useRef(null);
  const pendingScroll = useRef(null);

  const load = useCallback(async () => {
    if (!userId) { setLoaded(true); return; }
    try {
      let completedSets = [];
      let lookupRead = null;
      try {
        const [workouts, sets] = await Promise.all([
          getAllWorkouts(userId),
          getCompletedWorkoutSets(userId),
        ]);
        completedSets = Array.isArray(sets) ? sets : [];
        // The one session rule (sessionCount.js): a completed workout with a
        // cached set count above zero or with set rows.
        const completed = loggedSessionWorkouts(workouts, sets);
        setTotalWorkouts(completed.length);
        const startedAts = completed.map(w => Number(w.startedAt ?? w.started_at)).filter(Number.isFinite);
        setFirstSessionAt(startedAts.length ? Math.min(...startedAts) : null);
        setWorkoutsRead(true);
        setRatingsFailed(false);
        // D214 (RC-1, RC-2): soreness_24h_before is written on a 1-3 domain
        // (Fresh/Mild/Sore, the scale the adaptive engine and computeRecoveryEMAs
        // read) and is now DRAWN on that same scale: the display shift to 2-4
        // (C5-P18-02) is gone, so a person who always answers "Fresh" reads
        // "fresh" and the average is printed "of 3". No stored value changes and
        // computeRecoveryEMAs is untouched.
        // C6 RD6-12 (D97-25): the tooltip promises older sessions "fade
        // out", but emaValue normalises by the weight sum, so the OUTPUT
        // is age-invariant and the gauges were fed every completed
        // workout ever - after months away, "Fatigue - High" rendered a
        // present-tense read of ancient sessions. The gauges now read
        // only sessions inside the standing 14-day boundary (the same
        // bound R-6/RB6-4 gave the sibling readiness surfaces); with
        // nothing recent they fall to their existing waiting state. The
        // pure EMA helper is untouched.
        const gaugeRecent = completed.filter((w) => {
          const at = Number(w.endedAt ?? w.startedAt ?? w.createdAt);
          return Number.isFinite(at) && (Date.now() - at) <= 14 * DAY_MS;
        });
        setRecovery(computeRecoveryEMAs(gaugeRecent));
        // C5-P18-01 (D96): how many RATED sessions each gauge actually
        // averaged. computeRecoveryEMAs returns a value from a single point, so
        // one rated session produced "4.0 / Fatigue / High" beside a red dot,
        // under a caption calling it a weighted running average and telling the
        // user that consistently high scores mean a lighter week. Nothing had
        // been averaged and nothing was consistent. Counted here rather than in
        // recoveryEMA.js so the pure engine helper and its pinned shape stay
        // exactly as they are.
        setSampleCounts({
          soreness: gaugeRecent.filter(w => w.soreness24hBefore != null).length,
          fatigue: gaugeRecent.filter(w => w.fatigueLevel != null).length,
          joint: gaugeRecent.filter(w => (w.maxJointDiscomfort ?? w.jointDiscomfort) != null).length,
        });
        // The fatigue-trend bars: the last six completed sessions that carry
        // a fatigue rating, newest first (the order getRecentWorkoutFeedback
        // gave Consistency).
        const rated = completed
          .filter((w) => w.fatigueLevel != null)
          .sort((a, b) => Number(b.startedAt ?? 0) - Number(a.startedAt ?? 0))
          .slice(0, 6);
        setFatigueSessions(rated);
      } catch (e) {
        // RC-33 (D214): this read used to close with `catch (_) {}`, so a
        // failure left the dials at "Not rated yet" and the milestone at "1
        // to go". Logged and said now.
        logError('ReadinessCards.loadRatings', e, { userId });
        setRatingsFailed(true);
      }

      // Consistency draws only the milestone, which needs nothing below.
      if (sections === 'milestone') return;

      try {
        const data = await getLastTrainedPerMuscle(userId);
        setMuscleFreshness(data || {});
      } catch (e) {
        logError('ReadinessCards.loadLastTrained', e, { userId });
      }
      try {
        const checkins = await getRecentCheckins(userId, 6);
        if (checkins.length >= 3) setRecoveryTrendInsight(computeRecoveryTrendInsight(checkins));
      } catch (e) {
        logError('ReadinessCards.loadCheckinTrend', e, { userId });
      }

      // P3(a): the latest completed session, only when it still needs a
      // post-session rating. getRecentCompletedWorkouts(userId, 1) (not
      // getWorkoutById) so the row carries routineName from its routines
      // join -- a bare `SELECT * FROM workouts` never would, and the
      // summary's title depends on it (founder device report 2026-08-24,
      // WorkoutHistoryScreen's own route-building comment). Same ordering
      // WorkoutHistoryScreen's list uses, so "latest" agrees with it.
      try {
        const [lastWorkout] = await getRecentCompletedWorkouts(userId, 1);
        if (lastWorkout) {
          // D218 (audit F-2): the shared exercise lookup (unfiltered,
          // survivor-aware), not the filtered library.
          const [lastSets, lookupForLast] = await Promise.all([
            getWorkoutSetsForWorkout(lastWorkout.id),
            getExerciseLookup(),
          ]);
          lookupRead = lookupForLast ?? null;
          setRateSessionParams(buildRateLastSessionParams(lastWorkout, lastSets, lookupForLast));
        } else {
          setRateSessionParams(null);
        }
      } catch (e) {
        // Best-effort: a failed read here only means the button doesn't show
        // this visit, never a crash or a stale nav target. Logged (D214).
        logError('ReadinessCards.loadRateLastSession', e, { userId });
      }

      // P3(b): the latest weekly check-in, independent of the trend
      // insight's own >=3 gate above.
      try {
        const recent = await getRecentCheckins(userId, 1);
        setLatestCheckin(recent?.[0] ?? null);
      } catch (e) {
        // Best-effort: a failed read here only means the check-in row doesn't
        // show this visit, never a crash. Logged (D214).
        logError('ReadinessCards.loadLatestCheckin', e, { userId });
      }

      // D201 (per-muscle recovery, spec section 6): the ONLY new I/O this
      // component performs for the "Recovery by muscle" section, entirely
      // through src/lib/recovery/load.js -- mirrors
      // HomeScreen.loadRecoveryRecommendation's own call chain exactly, so
      // Home and this block can never disagree about what is next. A failed
      // read says so (D214, RC-24) and leaves every other reader in this file
      // untouched.
      try {
        const recoveryLoad = await loadMuscleRecovery(userId);
        // Opus review finding 10: a core read that failed is not an all-clear.
        // The section says the estimate could not load rather than showing
        // every muscle as "no recent session" off a read that never happened.
        if (recoveryLoad?.degraded) {
          logError('ReadinessCards.loadMuscleRecovery', new Error('A core recovery read failed (degraded)'), { userId });
          setMuscleRecovery(null);
          setMuscleRecoveryFailed(true);
          setRecoveryRecommendation(null);
          setNextCard(null);
          return;
        }
        setMuscleRecoveryFailed(false);
        setMuscleRecovery(recoveryLoad);
        // D219: the active plan's muscle roles (getPlanRoles never throws): the card, the
        // rows and the muscle detail say what the plan intends for each muscle.
        const roles = await getPlanRoles(userId);
        setPlanRoles(roles);
        // The breakdown's split of each counted session into main-mover and
        // helper sets: only the sets of the sessions the model counted, and
        // the exercise rows (read once; reused when the rate-last-session
        // read above already had it). D218 (audit F-2): the rows are the
        // lookup's UNFILTERED list, the same population the recovery model
        // counts (it reads the table unfiltered, recovery/load.js), so a
        // counted session on a soft-deleted custom exercise is split like any
        // other instead of falling back to the model's own figure.
        try {
          const lookup = lookupRead ?? (await getExerciseLookup());
          const exercises = lookup?.rows ?? [];
          // This week's sets per muscle: the Volume heatmap's own week, so the two
          // screens print the same number (muscleDetail.weekFigures).
          setWeekByMuscle(buildWeekFigures({ sets: completedSets, exerciseMap: lookup, nowMs: recoveryLoad.nowMs }));
          const wanted = new Set();
          for (const entry of Object.values(recoveryLoad?.map ?? {})) {
            for (const cs of entry?.contributingSessions ?? []) if (cs?.workoutId) wanted.add(cs.workoutId);
          }
          setSplitData({
            sets: completedSets.filter((s) => wanted.has(s.workoutId ?? s.workout_id)),
            exercises,
          });
        } catch (e) {
          logError('ReadinessCards.loadSessionSplits', e, { userId });
          setSplitData({ sets: [], exercises: [] });
          setWeekByMuscle({});
        }
        try {
          const position = await resolveProgrammePosition(userId);
          // Opus review finding 1: a FINISHED block awaiting the athlete's
          // decision has no "next workout" to suggest; Home's own hero says
          // "choose what comes after this block" there, and this row must not
          // contradict it. resolveProgrammePosition's gated recovery state is
          // the one authority for that reading.
          const awaitingDecision = !!position?.recoveryState?.awaitingDecision;
          if (position && !awaitingDecision && (position.nextSession || position.weekResolved === true)) {
            const sessions = position.sessions ?? [];
            const outstandingIds = sessions
              .filter((s) => s.state === SESSION_STATE.OUTSTANDING)
              .map((s) => s.routineId);
            // D219 (design 5.1): the card's own session is the plan's next one (the
            // authority Home reads, position.nextSession) or, with the plan week
            // complete, next week's first session in programme order (the session
            // Home names under "Week complete"). Its planned sets are read too.
            const firstInOrder = [...sessions].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))[0] ?? null;
            const cardRoutineId = position.nextSession?.routineId ?? firstInOrder?.routineId ?? null;
            const ids = [...new Set([...outstandingIds, ...(cardRoutineId ? [cardRoutineId] : [])])];
            const plannedSetsByRoutine = ids.length ? await loadPlannedSetsByRoutine(ids, servedSetsResolver(userId)) : {};
            const routineNamesById = Object.fromEntries(sessions.map((s) => [s.routineId, s.name]));
            setNextCard(buildNextInPlanCard({
              position,
              plannedSetsByRoutine,
              recoveryMap: recoveryLoad.map,
              nowMs: recoveryLoad.nowMs,
              routineNamesById,
              roles,
            }));
            if (position.nextSession) {
              const projectedAtMs = nextLikelyTrainingTime({
                nowMs: recoveryLoad.nowMs,
                habitualWeekdays: recoveryLoad.habitualWeekdays,
                typicalStartMinute: recoveryLoad.typicalStartMinute,
              });
              const result = recommendNextWorkout({
                sessions,
                plannedSetsByRoutine,
                recoveryMap: recoveryLoad.map,
                projectedAtMs,
                nowMs: recoveryLoad.nowMs,
                routineNamesById,
              });
              // The names label the still-to-do rows (D214); the readings the
              // result also holds are no longer shown (D219, design 5.2).
              setRecoveryRecommendation({
                ...result,
                programmeNextName: routineNamesById[result?.programmeNext?.routineId] ?? '',
                routineNamesById,
              });
            } else {
              setRecoveryRecommendation(null);
            }
          } else {
            setNextCard(null);
            setRecoveryRecommendation(null);
          }
        } catch (e) {
          logError('ReadinessCards.loadRecoveryRecommendation', e, { userId });
          setNextCard(null);
          setRecoveryRecommendation(null);
        }
      } catch (e) {
        logError('ReadinessCards.loadMuscleRecovery', e, { userId });
        setMuscleRecovery(null);
        setMuscleRecoveryFailed(true);
        setRecoveryRecommendation(null);
        setNextCard(null);
      }
    } finally {
      setLoaded(true);
    }
  }, [userId, sections]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const next = nextMilestone(totalWorkouts);
  const unlocked = MILESTONES.filter(m => m.sessions <= totalWorkouts);
  const lastUnlocked = unlocked[unlocked.length - 1] ?? null;
  const milestoneLine = sessionsMilestoneLine({ count: totalWorkouts, sinceMs: firstSessionAt });

  // D201 (spec section 6): "now" for every recovery-row/next-workout
  // derivation below, taken from the loader's own snapshot rather than a
  // fresh Date.now() -- readyByPhrase/trainingRecency then always agree
  // with whatever nextLikelyTrainingTime/recommendNextWorkout computed
  // against inside load() above, even if rendering happens moments later.
  const muscleRecoveryNowMs = muscleRecovery?.nowMs ?? Date.now();
  // Rows: one per muscle with a session in the last 14 days (status is
  // never 'no_recent_session' for these), recovering first then nearly
  // then recovered, then by name (spec section 6). Absent entirely
  // (muscleRecovery null) whenever the loader hasn't resolved or failed.
  const muscleRecoveryRows = muscleRecovery
    ? Object.values(muscleRecovery.map)
      .filter((entry) => entry.status !== 'no_recent_session')
      .sort((a, b) => (
        RECOVERY_ROW_STATUS_RANK[a.status] - RECOVERY_ROW_STATUS_RANK[b.status]
      ) || compareMuscleNames(a.muscle, b.muscle))
    : [];
  const rowMuscleKeys = new Set(muscleRecoveryRows.map((entry) => entry.muscle));
  // The open row, if its muscle still has one: a selection whose muscle
  // has since left the rows (aged out of the 14-day window across a
  // refocus reload) reads as nothing open, so the next tap on that muscle
  // opens it rather than closing a phantom (review finding, 2026-09-26).
  const openMuscle = selectedMuscle && rowMuscleKeys.has(selectedMuscle) ? selectedMuscle : null;
  const counts = recoveryCounts(muscleRecovery?.map);
  const answerLine = recoveryAnswerLine(counts);
  const hasAnyHistory = totalWorkouts > 0 || Object.keys(muscleFreshness).length > 0;
  // Day zero (RC-25) names what fills the section; a person who has trained
  // before but not in the window gets the plain fact instead.
  const emptyLine = muscleRecovery && !answerLine
    ? (hasAnyHistory
      ? 'No session in the last 14 days, so there is no estimate to show.'
      : "Each muscle's recovery shows here after your first session.")
    : null;
  const stillToDoRows = muscleRecovery ? buildStillToDoRows(recoveryRecommendation) : [];
  const sessionSplits = useMemo(
    () => (muscleRecovery ? buildMuscleSessionSplits(muscleRecovery.map, splitData.sets, splitData.exercises) : null),
    [muscleRecovery, splitData],
  );

  // A tap on the figure selects the muscle, opens its breakdown when it has
  // a row, and scrolls to it once it is on screen (RC-12). A muscle with no
  // row is selected too (its outline shows) and the scroll lands on the line
  // that names it. A second tap on the same muscle clears the selection.
  const handleFigureTap = (muscle) => {
    if (selectedMuscle === muscle) { setSelectedMuscle(null); return; }
    pendingScroll.current = muscle;
    setSelectedMuscle(muscle);
  };
  useEffect(() => {
    const target = pendingScroll.current;
    if (!target || selectedMuscle !== target) return;
    pendingScroll.current = null;
    const node = rowMuscleKeys.has(target) ? rowNodes.current[target] : namesNode.current;
    scrollToNode(scrollRef?.current, node);
  });

  // P3(a) (D200-2): true whenever AT LEAST ONE gauge is still short of
  // MIN_RATED_SESSIONS -- the shared caption explains why that gauge (or
  // those gauges) read as not rated yet, and disappears once every gauge has
  // enough.
  const gaugesIncomplete = sampleCounts.soreness < MIN_RATED_SESSIONS
    || sampleCounts.fatigue < MIN_RATED_SESSIONS
    || sampleCounts.joint < MIN_RATED_SESSIONS;
  const anyRatingShown = sampleCounts.soreness >= MIN_RATED_SESSIONS
    || sampleCounts.fatigue >= MIN_RATED_SESSIONS
    || sampleCounts.joint >= MIN_RATED_SESSIONS;
  const ratingRows = [
    { key: 'soreness', label: 'Soreness before sessions', value: recovery.soreness, samples: sampleCounts.soreness, word: sorenessWord, max: 3 },
    { key: 'fatigue', label: 'Fatigue after sessions', value: recovery.fatigue, samples: sampleCounts.fatigue, word: fatigueWord, max: 5 },
    { key: 'joint', label: 'Joint discomfort after sessions', value: recovery.joint, samples: sampleCounts.joint, word: jointWord, max: 3 },
  ];

  // P3(b): the latest weekly check-in's own words, only while current.
  // The loader's clock, so the 14-day bound never turns on the render's own
  // Date.now() (lane 2 review N3).
  const checkinValuesLine = checkinSummaryLine(latestCheckin, muscleRecoveryNowMs);

  // The ratings: the three ratings, the weekly check-in and the fatigue
  // trend's neighbours, under their own heading. On the Recovery screen they
  // sit at the bottom, below Recovery by muscle (founder, 2026-09-26: "Move
  // the ratings thing down below the recovery by muscle to the bottom"); the
  // old single block ('all') keeps them first, where they always were.
  const ratingsBlock = (
    <>
      <View style={styles.headingRow}>
        <SectionLabel>{sections === 'recovery' ? 'Your ratings' : 'Recovery'}</SectionLabel>
        <InfoTooltip text={RATINGS_NOTE} />
      </View>
      <View style={[styles.recoveryCard, live.recoveryCard]}>
        {ratingsFailed ? (
          <Text style={live.stateText}>Couldn't load your ratings just now.</Text>
        ) : (
          <View style={styles.ratingList}>
            {ratingRows.map((r) => (
              <Text key={r.key} style={live.ratingRow}>{ratingText(r)}</Text>
            ))}
          </View>
        )}
        {/* P3(a) (F3, D200-2): present only while at least one rating is
            still short of MIN_RATED_SESSIONS -- names the two inputs and
            when they start counting, so a missing figure is never
            unexplained. */}
        {!ratingsFailed && gaugesIncomplete && (
          <Text style={live.captionText}>
            These read the soreness you report before a session and the fatigue and joint discomfort you rate after it. They appear after two rated sessions in the last two weeks.
          </Text>
        )}
        {!ratingsFailed && anyRatingShown && (
          <Text style={live.captionText}>Averages of your rated sessions in the last two weeks, the most recent counting most.</Text>
        )}

        {/* P3(a): a one-tap path to the latest completed session's
            summary, rating mode. Absent once that session carries both
            post-session ratings (rateSessionParams is then null),
            independent of gaugesIncomplete above (T2's own test (b)). */}
        {rateSessionParams && (
          <Button
            title="Rate your last session"
            variant="secondary"
            size="sm"
            onPress={() => onRateLastSession?.(rateSessionParams)}
            accessibilityLabel="Rate your last session"
          />
        )}

        {/* P3(b): the latest weekly check-in's own signals, read
            independently of the trend-insight sentence below, and printed
            only while the check-in is within 14 days (D214, RC-16). */}
        {checkinValuesLine ? (
          <>
            <View style={[styles.recoveryDivider, live.recoveryDivider]} />
            <View>
              <Text style={live.checkinTitle}>From your weekly check-in</Text>
              <Text style={live.checkinValues}>{checkinValuesLine}</Text>
            </View>
          </>
        ) : null}
      </View>
      {/* D214 Q3 = A: the fatigue-trend bars moved here from Consistency,
          under the ratings they chart. */}
      {sections === 'recovery' ? <FatigueTrendCard sessions={fatigueSessions} /> : null}
    </>
  );

  const slots = !loaded && sections !== 'milestone';

  return (
    <AnimatedEntrance index={1} style={{ gap: spacing.md }}>
      {/* The sessions milestone, one plain sentence (D214, CS-2, CS-14). Waits
          for the workouts read (RC-33): before it lands, and if it fails, there
          is no "1 session logged" to claim. */}
      {sections !== 'recovery' && workoutsRead && (lastUnlocked || next) && (
        milestoneLine ? <Text style={[styles.milestoneLine, live.milestoneLine]}>{milestoneLine}</Text> : null
      )}

      {/* Recovery: the signals and muscle readiness folded into one block. */}
      {sections !== 'milestone' && (
      <View style={styles.section}>
        {sections !== 'recovery' && (slots ? <SkeletonCard height={190} /> : ratingsBlock)}

        {/* D201 (per-muscle recovery, spec section 6) and D214 (7.2): the
            estimate per muscle. It LEADS with the answer line and the
            sessions still to do (Q7 = A), then the body figure (the
            recovery palette, rendered directly so it keeps its full width:
            the figure is its own card, never nested in a second one), the
            list, and the caption with its (i). Best-effort off
            loadMuscleRecovery (see load()): a failed read keeps the heading
            and says so, so a broken estimate never sits here looking like it
            succeeded. */}
        {slots ? <SkeletonCard height={320} /> : (muscleRecovery || muscleRecoveryFailed) && (
          <View style={styles.byMuscle}>
            {/* D219 (lane B4, design 5.1): the top card, always the plan's own next
                session, with each muscle's estimated readiness and when every
                muscle in it is estimated recovered. It describes; it never
                recommends another session. */}
            {!muscleRecoveryFailed && nextCard ? (
              <NextInPlanCard card={nextCard} nowMs={muscleRecoveryNowMs} weekByMuscle={weekByMuscle} />
            ) : null}
            <View>
              <Text style={live.mfTitle} accessibilityRole="header">Recovery by muscle</Text>
              {/* The sub-line carries "Estimated" for every percent in the
                  block below it (spec section 6's percent law). */}
              <Text style={live.mfSub}>Estimated from your sessions · last 14 days</Text>
            </View>
            {muscleRecoveryFailed ? (
              <Text style={live.stateText}>Couldn't load the estimate just now.</Text>
            ) : (
              <>
                <View style={styles.answerBlock}>
                  {answerLine ? <Text style={live.answerLine}>{answerLine}</Text> : null}
                  {emptyLine ? <Text style={live.nextText}>{emptyLine}</Text> : null}
                  {stillToDoRows.length > 0 ? (
                    <View style={styles.stillToDo}>
                      <Text style={live.stillLabel}>Still to do this plan week</Text>
                      {stillToDoRows.map((row) => (
                        // D219: the plan's list, a session's name per row (no
                        // readiness line any more); the spoken text is the row.
                        <View key={row.routineId} accessible accessibilityLabel={row.text}>
                          <Text style={live.stillRow}>{row.text}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
                <BodyDiagramHeatmap
                  recoveryByMuscle={muscleRecovery.map}
                  selectedMuscle={selectedMuscle}
                  onMuscleTap={handleFigureTap}
                />
                <MuscleRecoveryList
                  rows={muscleRecoveryRows}
                  nowMs={muscleRecoveryNowMs}
                  freshness={muscleFreshness}
                  selectedMuscle={openMuscle}
                  onSelect={setSelectedMuscle}
                  learnedSpeed={muscleRecovery.personal?.reason === 'adjusted'}
                  sessionSplits={sessionSplits}
                  roles={planRoles}
                  weekFigures={weekByMuscle}
                  registerRow={(muscle, node) => { rowNodes.current[muscle] = node; }}
                  registerNames={(node) => { namesNode.current = node; }}
                />
                <View style={styles.captionRow}>
                  <Text style={[live.rbmCaption, styles.captionText]}>
                    {recoveryByMuscleCaption(muscleRecovery.personal)}
                  </Text>
                  <InfoTooltip text={RECOVERY_PERCENT_NOTE} />
                </View>
              </>
            )}
          </View>
        )}

        {/* D210: the personal recovery learning, shown as one thing that
            moves (RecoveryLearningCard). Present whenever the loader
            returned a reading, including the "still learning" states, and
            absent with the section above when the read failed. */}
        {slots ? <SkeletonCard height={150} /> : muscleRecovery?.personal ? <RecoveryLearningCard personal={muscleRecovery.personal} /> : null}

        {sections === 'recovery' && (slots ? <SkeletonCard height={190} /> : ratingsBlock)}

        {recoveryTrendInsight && !slots && (
          <View style={[styles.trendInsightCard, live.trendInsightCard]}>
            <Text style={live.trendInsightText}>{recoveryTrendInsight.text}</Text>
          </View>
        )}
      </View>
      )}
    </AnimatedEntrance>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  milestoneLine: { ...type.bodySm, color: colors.textSecondary },

  recoveryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.md,
  },
  ratingList: { gap: spacing.sm },
  recoveryDivider: {
    height: 1, backgroundColor: colors.border, marginVertical: spacing.xs,
  },

  trendInsightCard: {
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
  },

  // The Recovery by muscle block: a flat column on the screen, no card of
  // its own. The figure is its own card (BodyDiagramHeatmap's container), so
  // nesting it in a second one cost it 13 percent of its width (lane 1
  // measured 0.87 of full scale on a 412 dp phone).
  byMuscle: { gap: spacing.md },
  answerBlock: { gap: spacing.sm },
  stillToDo: { gap: spacing.xs, marginTop: spacing.xs },
  captionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  captionText: { flex: 1 },
});

// The colours and type roles of the new D214 pieces are read LIVE from the
// theme (the frozen-plus-live `buildLiveStyles` pattern the tree carries),
// shared by the function scope in this file; the frozen `styles` block above
// keeps the rating card chrome it always had. The milestone is a plain ink
// sentence now (RC-35, CS-14: no amber, no gold on a status fact).
function buildLiveStyles(t) {
  return {
    milestoneLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    recoveryCard: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    recoveryDivider: { backgroundColor: t.colors.border },
    // The card's primary facts at body size (they wrap under longer words);
    // the check-in title below them is a label, never larger (review S2).
    ratingRow: { ...t.type.body, color: t.colors.textPrimary },
    captionText: { ...t.type.bodySm, color: t.colors.textMuted },
    stateText: { ...t.type.bodySm, color: t.colors.textSecondary },
    checkinTitle: { ...t.type.label, color: t.colors.textSecondary },
    checkinValues: { ...t.type.bodySm, color: t.colors.textSecondary, marginTop: spacing.xxs },
    trendInsightCard: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    trendInsightText: { ...t.type.bodySm, color: t.colors.textSecondary },
    mfTitle: { ...t.type.title, color: t.colors.textPrimary },
    mfSub: { ...t.type.captionTight, color: t.colors.textMuted, marginTop: spacing.xxs },
    answerLine: { ...t.type.h3, color: t.colors.textPrimary },
    nextText: { ...t.type.bodySm, color: t.colors.textSecondary },
    stillLabel: { ...t.type.overline, color: t.colors.textSecondary },
    stillRow: { ...t.type.bodySm, color: t.colors.textSecondary },
    rbmCaption: { ...t.type.bodySm, color: t.colors.textMuted },
  };
}
