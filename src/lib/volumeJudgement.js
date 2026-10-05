/**
 * volumeJudgement.js -- D219 lane A5: the ONE judgement every surface that
 * judges a muscle's weekly sets reads (design 5.3, register D219).
 *
 * The founder's case: "As I did 27 sets of biceps which is upper tier but it
 * shows I have overtrained or something. We need a demonstration on recovery
 * that this muscle has been selected to be brought up or extra volume and this
 * is within that." Before D219 the Volume heatmap, the Progress strip, the
 * Workout Summary and the check-in review each called getVolumeStatus(), which
 * compared the number with a landmark table that knew nothing of the plan, so a
 * focus muscle above its ceiling read "Too much". They now all call
 * judgeWeek(): the role-aware band function (src/lib/plan/bands.js, the
 * evidence in 03-SCIENCE.md Q3b and F16) with the muscle's role from the
 * active plan's facts (focus, raised, standard, maintenance; a plan with no
 * facts reads the standard bands).
 *
 * This module is the adapter between that function and the screens. It adds
 * what a screen needs and the band function does not carry: the group a row
 * sorts into (a band, with the focus range split by role), the tone the figure
 * and legend paint, the one-line reason for a focus muscle, and the bar's
 * numbers. It never changes volume, calories, weight or notifications: it is
 * wording and colour only (D204: a screen describes). Nothing it returns says
 * "too much", "near the limit", "overtrained" or "junk"; only "beyond the
 * studied range" takes a note tone, and a note is an information colour, never
 * a warning or error token.
 *
 * Units: weekly FRACTIONAL sets (a direct set 1.0, a synergist set 0.5), the
 * tracker's own unit, exactly what calculateWeeklyVolume returns.
 *
 * Pure: no I/O, no clock, no randomness.
 */
import {
  BAND, ROLE, volumeBand, formatSets, normaliseRole,
} from './plan/bands';
import { WEEKLY_BANDS } from './plan/science';
import { MUSCLE_DISPLAY_NAMES } from './algorithms';
import { muscleVerb } from './recovery/nextWorkoutRecommendation';
import { VOLUME_BAND_LABELS, VOLUME_TONE_LABELS } from './volumeBandLabels';

/** The eight groups a list sorts into: a band, with the focus range split by role. */
export const GROUP = Object.freeze({
  BELOW: 'below_maintenance',
  MAINTENANCE: 'maintenance',
  BETWEEN: 'between',
  NORMAL: 'normal_growth',
  FOCUS: 'focus_range',
  ABOVE_NORMAL: 'above_normal',
  TOP: 'top_of_studied',
  BEYOND: 'beyond_studied',
});

/** The groups from the lowest band up (the order a list reads them). */
export const GROUP_ORDER = Object.freeze([
  GROUP.BELOW, GROUP.MAINTENANCE, GROUP.BETWEEN, GROUP.NORMAL,
  GROUP.FOCUS, GROUP.ABOVE_NORMAL, GROUP.TOP, GROUP.BEYOND,
]);

/** The four tones the figure, its legend and the Progress strip paint. */
export const TONE = Object.freeze({
  BELOW: 'below',
  BUILDING: 'building',
  GROWTH: 'growth',
  BEYOND: 'beyond',
});

const FOCUS_LIKE = new Set([ROLE.FOCUS, ROLE.RAISED]);

/** A role read from the plan facts' `roles` map; anything unknown reads as standard. */
export function roleFor(roles, muscle) {
  if (!roles || typeof roles !== 'object') return ROLE.STANDARD;
  return normaliseRole(roles[muscle]);
}

/**
 * The group a band sorts into for a role. Above the normal growth range a
 * focus (or raised) muscle is in its focus range, while any other muscle is
 * simply above normal growth: the same number, an honest difference of intent.
 */
export function groupFor(band, role) {
  if (band === BAND.FOCUS_RANGE) return FOCUS_LIKE.has(normaliseRole(role)) ? GROUP.FOCUS : GROUP.ABOVE_NORMAL;
  return band;
}

/** The tone a band paints: below, building (maintenance to growth), growth or beyond. */
export function toneFor(band) {
  switch (band) {
    case BAND.BELOW_MAINTENANCE: return TONE.BELOW;
    case BAND.MAINTENANCE:
    case BAND.BETWEEN: return TONE.BUILDING;
    case BAND.BEYOND_STUDIED: return TONE.BEYOND;
    default: return TONE.GROWTH;
  }
}

/** The tone a group paints (a group is a band with the focus range split by role). */
export function toneForGroup(group) {
  switch (group) {
    case GROUP.BELOW: return TONE.BELOW;
    case GROUP.MAINTENANCE:
    case GROUP.BETWEEN: return TONE.BUILDING;
    case GROUP.BEYOND: return TONE.BEYOND;
    default: return TONE.GROWTH;
  }
}

/**
 * The colour of each tone, from a live colour table (`t.colors`). No warning
 * or error token: the highest band is a note, and a note is an information
 * colour. The ONE place the figure, its legend, the badges and the strip read.
 */
export function toneColors(c) {
  return {
    [TONE.BELOW]: c.textMuted,
    [TONE.BUILDING]: c.volumeMinimum,
    [TONE.GROWTH]: c.success,
    [TONE.BEYOND]: c.macroCarb,
  };
}

const setsWord = (n) => (n === 1 ? 'set' : 'sets');

/** Where a total sits against the evidence bands, in words for a sentence. */
function bandTail(band) {
  const b = WEEKLY_BANDS;
  switch (band) {
    case BAND.BELOW_MAINTENANCE: return `below maintenance, which starts at ${b.maintenanceFrom} sets`;
    case BAND.MAINTENANCE: return `in the maintenance range of ${b.maintenanceFrom} to ${b.maintenanceTop}`;
    case BAND.BETWEEN: return 'between maintenance and the normal growth range';
    case BAND.NORMAL_GROWTH: return `inside the normal growth range of ${b.normalFrom} to ${b.normalTop}`;
    case BAND.FOCUS_RANGE: return `inside the focus range of ${b.normalTop} to ${b.focusTop}`;
    case BAND.TOP_OF_STUDIED: return `at the top of the studied range of ${b.focusTop} to ${b.studiedTop}`;
    default: return `beyond the ${b.studiedTop} sets that studies have tested`;
  }
}

/**
 * The one-line reason for a muscle the plan raised: "Biceps are your focus
 * this block: 27 sets, inside the focus range of 20 to 30." Only a focus or a
 * raised muscle has one (a standard muscle's intent needs no demonstration).
 */
function reasonFor({ muscle, role, band, sets }) {
  if (!FOCUS_LIKE.has(role)) return null;
  const name = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  const n = formatSets(sets);
  const tail = `${n} ${setsWord(sets)}, ${bandTail(band)}`;
  if (role === ROLE.RAISED) return `Your check-ins raised ${name.toLowerCase()}: ${tail}.`;
  const lead = `${name} ${muscleVerb(muscle)} your focus this block: ${tail}`;
  return band === BAND.NORMAL_GROWTH || band === BAND.BETWEEN || band === BAND.MAINTENANCE || band === BAND.BELOW_MAINTENANCE
    ? `${lead}. Your plan is building towards the focus range.`
    : `${lead}.`;
}

/**
 * The whole judgement of one muscle's week, for every surface.
 *
 * @param {object} args
 * @param {string} args.muscle   a VOLUME_LANDMARKS muscle key
 * @param {number} args.sets     the week's FRACTIONAL total (calculateWeeklyVolume's workingSets)
 * @param {string} [args.role]   focus | raised | standard | maintenance (unknown reads as standard)
 * @param {number|{low:number, high:number}} [args.target]  the plan's target for the week, if known
 * @returns {{ muscle: string, role: string, sets: number, band: string, group: string, label: string,
 *   tone: string, toneLabel: string, noteTone: boolean, line: string, roleLine: string|null,
 *   targetLine: string|null, reason: string|null, why: string[] }}
 */
export function judgeWeek({ muscle, sets, role, target = null }) {
  const r = normaliseRole(role);
  const total = Number.isFinite(sets) && sets > 0 ? sets : 0;
  const name = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  const v = volumeBand(total, r, { muscleLabel: String(name).toLowerCase(), target });
  const group = groupFor(v.band, r);
  const tone = toneFor(v.band);
  const reason = reasonFor({ muscle, role: r, band: v.band, sets: total });
  // What a tap explains: the reason for a muscle the plan raised (or the role
  // line for one it holds), the evidence sentence for the band, the plan target
  // only when the week is above it.
  const why = [reason ?? (r === ROLE.MAINTENANCE ? v.roleLine : null), v.line, v.targetLine].filter(Boolean);
  return {
    muscle,
    role: r,
    sets: total,
    band: v.band,
    group,
    label: VOLUME_BAND_LABELS[group],
    tone,
    toneLabel: VOLUME_TONE_LABELS[tone],
    noteTone: v.tone === 'note',
    line: v.line,
    roleLine: v.roleLine,
    targetLine: v.targetLine,
    reason,
    why,
  };
}

/**
 * The numbers a row's range bar draws: the whole studied range (maintenance up
 * to the top of what studies have tested), with the zone the plan aims at
 * marked inside it: the focus range for a focus or raised muscle, the normal
 * growth range for any other.
 */
export function rangeBarFor(role, sets) {
  const b = WEEKLY_BANDS;
  const focus = FOCUS_LIKE.has(normaliseRole(role));
  return {
    rangeStart: b.maintenanceFrom,
    rangeEnd: b.studiedTop,
    bandStart: focus ? b.normalTop : b.normalFrom,
    bandEnd: focus ? b.focusTop : b.normalTop,
    max: Math.max(b.studiedTop, Number.isFinite(sets) ? sets : 0),
  };
}
