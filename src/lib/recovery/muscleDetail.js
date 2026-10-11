/**
 * src/lib/recovery/muscleDetail.js -- what a muscle's detail on the Recovery
 * screen says (register D219 lanes A5 and B4; design 5.1, 5.3 and F16 of
 * docs/audit/plan-builder-science-2026-10-04/).
 *
 * Founder: "we need to make sure recovery shows that and explains why. The upper
 * tier of sets per week and things. As I did 27 sets of biceps which is upper
 * tier but it shows I have overtrained or something. We need a demonstration on
 * recovery that this muscle has been selected to be brought up or extra volume
 * and this is within that", and "biceps recover quicker than back". The detail
 * carries, for one muscle, the facts of F16 in order:
 *   - the plan's intent: for a muscle the plan raised, the reason ("Biceps are
 *     your focus this block: 27 sets, inside the focus range of 20 to 30."), for
 *     one it holds, "Maintained.", for any other nothing;
 *   - this week so far, counted the heatmap's way (a direct set 1.0, a helper set
 *     half): "27 sets counted: 20 direct and 14 indirect at half credit.";
 *   - the band, in the one judgement's words (volumeJudgement.judgeWeek, the
 *     role-aware band function), never "too much" and never "overtrained";
 *   - the most in one session against its limit, and the session note only when
 *     the session is above the cap;
 *   - the muscle's OWN recovery clock in plain words, an estimate with a range
 *     (the evidence for differences between muscles is weak, design 4.13, so it
 *     is shown, never asserted as a finding), beside one other muscle's so the
 *     difference is visible: biceps about 2 days, back about 2.5;
 *   - the estimate after the last session with its range and the hours that have
 *     passed, and the spacing of the sessions the model counted.
 *
 * Every line describes and never instructs (D204), says "estimated" for each
 * recovery claim, and carries no em dash. Nothing here changes volume, calories,
 * weight, food or notifications, and it reads none of them.
 *
 * PURE. No I/O, no clock: `nowMs` and the maps are arguments.
 */
import {
  calculateWeeklyVolume, allocateExerciseVolume, isBallisticEvidenceRow, exerciseForSet, muscleDisplayName,
} from '../algorithms';
import { volumeWindowBounds } from '../volumeWindow';
import { judgeWeek, rangeBarFor } from '../volumeJudgement';
import {
  ROLE, normaliseRole, roleLine, countedLine, formatSets, sessionVolumeFlag,
} from '../plan/bands';
import { PER_SESSION } from '../plan/science';
import { recoveryHours, recoveryBandHours, REFERENCE_SETS } from './constants';
import { muscleVerb } from './nextWorkoutRecommendation';

const HOUR_MS = 3600000;

const setsWord = (n) => (n === 1 ? 'set' : 'sets');

function setAt(set) {
  const at = Number(set?.createdAt ?? set?.created_at);
  return Number.isFinite(at) ? at : null;
}

/** Direct (primary) sets per muscle in a list of sets, by the tracker's own set rules. */
function directSets(list, exerciseMap) {
  const out = {};
  for (const s of list) {
    if ((s.setType || s.set_type || 'straight') === 'warmup') continue;
    if (isBallisticEvidenceRow(s)) continue;
    const exercise = exerciseForSet(exerciseMap, s);
    if (!exercise) continue;
    for (const a of allocateExerciseVolume(exercise)) {
      if (a.role === 'primary') out[a.muscle] = (out[a.muscle] || 0) + 1;
    }
  }
  return out;
}

/**
 * The week's figures per muscle, the Volume heatmap's own week (the Monday-anchored
 * week so far, volumeWindow.js), so the Recovery screen and the heatmap print the
 * same number: `credit` is calculateWeeklyVolume's working sets, `direct` the sets
 * where the muscle was the main mover, `indirect` the helper sets whose half credit
 * makes up the rest (direct + 0.5 x indirect = credit, always), and `sessionCredit`
 * and `sessionDirect` the most in any one session. Only muscles with credit appear.
 *
 * @param {object} args
 * @param {Array} args.sets          completed working-set rows (camelCase or snake_case)
 * @param {object} args.exerciseMap  { [id]: exercise } or the shared lookup
 * @param {number} args.nowMs
 * @returns {Object<string, { credit: number, direct: number, indirect: number, sessionCredit: number, sessionDirect: number }>}
 */
export function weekFigures({ sets, exerciseMap, nowMs } = {}) {
  const bounds = volumeWindowBounds({ windowWeeks: 1, nowMs });
  const list = Array.isArray(sets) ? sets : [];
  if (!bounds) return {};
  const week = list.filter((s) => {
    const at = setAt(s);
    return at !== null && at >= bounds.startMs;
  });
  const credit = calculateWeeklyVolume(week, exerciseMap || {});
  const direct = directSets(week, exerciseMap || {});

  const byWorkout = new Map();
  for (const s of week) {
    const key = s?.workoutId ?? s?.workout_id ?? 'none';
    if (!byWorkout.has(key)) byWorkout.set(key, []);
    byWorkout.get(key).push(s);
  }
  const sessionCredit = {};
  const sessionDirect = {};
  for (const group of byWorkout.values()) {
    const c = calculateWeeklyVolume(group, exerciseMap || {});
    const d = directSets(group, exerciseMap || {});
    for (const [muscle, v] of Object.entries(c)) {
      sessionCredit[muscle] = Math.max(sessionCredit[muscle] || 0, v.workingSets || 0);
    }
    for (const [muscle, n] of Object.entries(d)) {
      sessionDirect[muscle] = Math.max(sessionDirect[muscle] || 0, n);
    }
  }

  const out = {};
  for (const [muscle, v] of Object.entries(credit)) {
    const total = v.workingSets || 0;
    if (!(total > 0)) continue;
    const d = direct[muscle] || 0;
    out[muscle] = {
      credit: total,
      direct: d,
      indirect: Math.max(0, (total - d) / 0.5),
      sessionCredit: sessionCredit[muscle] || 0,
      sessionDirect: sessionDirect[muscle] || 0,
    };
  }
  return out;
}

/** Hours as days to the nearest half day: 48 is "2", 60 is "2.5", never a trailing ".0". */
function daysText(hours) {
  const d = Math.round((hours / 24) * 2) / 2;
  return Number.isInteger(d) ? String(d) : d.toFixed(1);
}

/**
 * A muscle's own recovery clock, in plain words: "about 2 days (range 1.5 to 2.5
 * days)". The base clock for a session of REFERENCE_SETS sets at a neutral effort,
 * with the model's own band of plus or minus 25%.
 */
export function clockWords(muscle) {
  const hours = recoveryHours(muscle);
  const band = recoveryBandHours(hours);
  const main = daysText(hours);
  const lo = band ? daysText(band.lowHours) : main;
  const hi = band ? daysText(band.highHours) : main;
  return {
    hours,
    text: `about ${main} ${main === '1' ? 'day' : 'days'} (range ${lo} to ${hi} days)`,
  };
}

/**
 * The clock sentence for a muscle: its own, and, when it differs, one other
 * muscle's beside it (back for any muscle but back, biceps for back), so "biceps
 * recover quicker than back" is visible as two estimates, not asserted.
 */
export function clockLine(muscle) {
  const name = muscleDisplayName(muscle);
  const own = clockWords(muscle);
  const base = `${name} ${muscleVerb(muscle)} estimated at ${own.text} after a session of about ${REFERENCE_SETS} sets.`;
  const otherKey = muscle === 'back' ? 'biceps' : 'back';
  const other = clockWords(otherKey);
  if (other.hours === own.hours) return base;
  const otherName = muscleDisplayName(otherKey).toLowerCase();
  return `${base} Muscles differ: ${otherName} ${muscleVerb(otherKey)} estimated at ${other.text}.`;
}

function sortedSessions(entry) {
  const list = Array.isArray(entry?.contributingSessions) ? entry.contributingSessions : [];
  return list.filter((cs) => Number.isFinite(cs?.endMs)).sort((a, b) => a.endMs - b.endMs);
}

/** "Sessions were 56 to 84 hours apart.": the gaps between the sessions the model counted. */
export function spacingLine(entry) {
  const sessions = sortedSessions(entry);
  if (sessions.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < sessions.length; i += 1) gaps.push(Math.round((sessions[i].endMs - sessions[i - 1].endMs) / HOUR_MS));
  const lo = Math.min(...gaps);
  const hi = Math.max(...gaps);
  return lo === hi ? `Sessions were about ${lo} hours apart.` : `Sessions were ${lo} to ${hi} hours apart.`;
}

/**
 * "Estimated recovery after the last session: about 59 hours (range 44 to 74); 60
 * hours have passed. Estimated, not measured." From the last counted session's own
 * clock (the model's `hoursT`) and the model's band. Null when there is no clock.
 */
export function estimateLine(entry, nowMs) {
  const sessions = sortedSessions(entry);
  const last = sessions[sessions.length - 1];
  const hoursT = Number(last?.hoursT);
  if (!last || !Number.isFinite(hoursT) || hoursT <= 0) return null;
  const band = recoveryBandHours(hoursT);
  const range = band ? ` (range ${Math.round(band.lowHours)} to ${Math.round(band.highHours)})` : '';
  const head = `Estimated recovery after the last session: about ${Math.round(hoursT)} hours${range}`;
  if (!Number.isFinite(nowMs)) return `${head}. Estimated, not measured.`;
  const passed = Math.max(0, Math.round((nowMs - last.endMs) / HOUR_MS));
  return `${head}; ${passed} ${passed === 1 ? 'hour has' : 'hours have'} passed. Estimated, not measured.`;
}

/**
 * The rows behind one muscle's estimate on the Recovery screen, in the order of
 * F16: the plan's intent, this week so far, the band, the most in one session (and
 * the session note when above the cap), the muscle's clock, the estimate, the
 * spacing. Each row is `{ label, value }`.
 *
 * @param {object} args
 * @param {string} args.muscle
 * @param {object|null} args.entry    muscleRecoveryModel's map entry for the muscle, if it has one
 * @param {string} [args.role]        focus | raised | standard | maintenance (unknown reads as standard)
 * @param {object|null} args.week     weekFigures()[muscle], or null when no sets this week
 * @param {number} args.nowMs
 * @returns {Array<{ label: string, value: string }>}
 */
export function muscleDetailRows({
  muscle, entry = null, role, week = null, nowMs,
} = {}) {
  const r = normaliseRole(role);
  const focusLike = r === ROLE.FOCUS || r === ROLE.RAISED;
  const name = muscleDisplayName(muscle);
  const rows = [];
  const has = !!week && week.credit > 0;
  // Judged on the figure shown (the week's credit rounded once, as the heatmap does).
  const judgement = has ? judgeWeek({ muscle, sets: Math.round(week.credit), role: r }) : null;

  const intent = judgement?.reason ?? roleLine(r, name.toLowerCase());
  if (intent && r !== ROLE.STANDARD) rows.push({ label: 'In your plan', value: intent });

  if (!has) {
    rows.push({ label: 'This week so far', value: 'No sets counted yet.' });
  } else {
    rows.push({ label: 'This week so far', value: countedLine(week.direct, week.indirect) });
    rows.push({ label: 'Band', value: judgement.line });
    const cap = focusLike ? PER_SESSION.focusFractionalCap : PER_SESSION.fractionalCap;
    rows.push({
      label: 'Most in one session',
      value: `${formatSets(week.sessionCredit)} ${setsWord(week.sessionCredit)} (limit for ${focusLike ? 'a focus muscle' : 'this muscle'}: ${cap})`,
    });
    const flag = sessionVolumeFlag({ direct: week.sessionDirect, fractional: week.sessionCredit, focusCap: focusLike });
    if (flag) rows.push({ label: 'Session', value: flag.line });
  }

  rows.push({ label: 'Recovery clock', value: clockLine(muscle) });
  const estimate = estimateLine(entry, nowMs);
  if (estimate) rows.push({ label: 'Estimate', value: estimate });
  const spacing = spacingLine(entry);
  if (spacing) rows.push({ label: 'Spacing', value: spacing });
  return rows;
}

/*
 * D223 (founder, 2026-10-11, on the screenshot of the open Abs detail: "This
 * data for muscles recovery looks horrendous, redesign this areas make it
 * understandable, readable and slick."): the same facts as muscleDetailRows,
 * as numbers and short strings a panel can DRAW, so the detail stops being a
 * column of label and paragraph pairs. Each figure below is the one the lines
 * above print (the same clock, band, judgement, cap and flag), so the drawn
 * panel and the spoken lines can never disagree. Pure, like the rest.
 */

/** "4 hours", "1 hour", "less than an hour"; from 36 hours, days to the nearest half: "2.5 days". */
export function durationText(hours) {
  if (!Number.isFinite(hours) || hours < 1) return 'less than an hour';
  if (hours < 36) {
    const h = Math.round(hours);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  const d = daysText(hours);
  return `${d} ${d === '1' ? 'day' : 'days'}`;
}

/** "18 to 30 hours", "1.5 to 2.5 days": both ends in the high end's unit. */
export function rangeText(lowHours, highHours) {
  if (highHours < 36) {
    const lo = Math.round(lowHours);
    const hi = Math.round(highHours);
    return lo === hi ? `${hi} hours` : `${lo} to ${hi} hours`;
  }
  const lo = daysText(lowHours);
  const hi = daysText(highHours);
  return lo === hi ? `${hi} days` : `${lo} to ${hi} days`;
}

/**
 * The last counted session's estimate as a timeline: the hours since it ended,
 * the model's own clock for it (`hoursT`) with its band, and the scale a bar
 * draws them on (the band's high end, or the hours passed when more). Null
 * when there is no clock to draw.
 */
export function recoveryTimeline(entry, nowMs) {
  const sessions = sortedSessions(entry);
  const last = sessions[sessions.length - 1];
  const estimateHours = Number(last?.hoursT);
  if (!last || !Number.isFinite(estimateHours) || estimateHours <= 0) return null;
  const band = recoveryBandHours(estimateHours) || { lowHours: estimateHours, highHours: estimateHours };
  const passedHours = Number.isFinite(nowMs) ? Math.max(0, (nowMs - last.endMs) / HOUR_MS) : null;
  const scaleHours = Math.max(band.highHours, passedHours ?? 0);
  return {
    passedHours,
    estimateHours,
    lowHours: band.lowHours,
    highHours: band.highHours,
    scaleHours,
    passedText: passedHours === null ? null : durationText(passedHours),
    estimateText: `about ${durationText(estimateHours)}`,
    rangeText: rangeText(band.lowHours, band.highHours),
  };
}

/**
 * The muscle's own typical clock beside one other muscle's (back, or biceps for
 * back), as the two bars of a comparison: the same clocks clockLine prints.
 * One item when the two clocks are the same.
 */
export function clockComparison(muscle) {
  const item = (key) => {
    const own = clockWords(key);
    const band = recoveryBandHours(own.hours) || { lowHours: own.hours, highHours: own.hours };
    return {
      muscle: key,
      name: muscleDisplayName(key),
      hours: own.hours,
      lowHours: band.lowHours,
      highHours: band.highHours,
      text: `about ${durationText(own.hours)}`,
      rangeText: rangeText(band.lowHours, band.highHours),
    };
  };
  const mine = item(muscle);
  const otherKey = muscle === 'back' ? 'biceps' : 'back';
  const other = item(otherKey);
  return other.hours === mine.hours ? [mine] : [mine, other];
}

/** The plan's intent for a muscle, as muscleDetailRows' "In your plan" row; null for a standard muscle. */
export function intentFor({ muscle, role, week = null } = {}) {
  return muscleDetailRows({ muscle, role, week }).find((r) => r.label === 'In your plan')?.value ?? null;
}

/**
 * This week's figures as a panel draws them: the counted total, its split, the
 * band in the one judgement's words, the bar (rangeBarFor's numbers), the most
 * in one session against its cap, and the session note when above it. Null
 * when no set counted this week.
 */
export function weekPanel({ muscle, role, week = null } = {}) {
  if (!week || !(week.credit > 0)) return null;
  const r = normaliseRole(role);
  const focusLike = r === ROLE.FOCUS || r === ROLE.RAISED;
  const shown = Math.round(week.credit);
  const judgement = judgeWeek({ muscle, sets: shown, role: r });
  const bar = rangeBarFor(r, week.credit);
  const cap = focusLike ? PER_SESSION.focusFractionalCap : PER_SESSION.fractionalCap;
  const flag = sessionVolumeFlag({ direct: week.sessionDirect, fractional: week.sessionCredit, focusCap: focusLike });
  const direct = Number.isFinite(week.direct) && week.direct > 0 ? week.direct : 0;
  const indirect = Number.isFinite(week.indirect) && week.indirect > 0 ? week.indirect : 0;
  return {
    credit: week.credit,
    creditText: formatSets(week.credit),
    unit: `${setsWord(week.credit)} counted`,
    mainText: `${formatSets(direct)} as the main muscle worked`,
    helperText: `${formatSets(indirect)} as a helper, at half credit`,
    bandLabel: judgement.label,
    bandLine: judgement.line,
    bar,
    zoneText: focusLike
      ? `The shaded part is the focus range, ${bar.bandStart} to ${bar.bandEnd} sets a week.`
      : `The shaded part is the normal growth range, ${bar.bandStart} to ${bar.bandEnd} sets a week.`,
    sessionMost: week.sessionCredit,
    sessionMostText: formatSets(week.sessionCredit),
    sessionCap: cap,
    sessionCapText: `Limit for ${focusLike ? 'a focus muscle' : 'this muscle'}: ${cap} sets in one session`,
    flagLine: flag ? flag.line : null,
  };
}
