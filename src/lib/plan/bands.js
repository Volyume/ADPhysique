/**
 * bands.js -- D219: one band function and one wording table for every
 * surface that judges a muscle's weekly sets (design 5.3; evidence
 * 03-SCIENCE.md Q3b and F16).
 *
 * Founder addition (register D219): "As I did 27 sets of biceps which is
 * upper tier but it shows I have overtrained or something. We need a
 * demonstration on recovery that this muscle has been selected to be brought
 * up or extra volume and this is within that". So the wording knows the
 * muscle's role in the plan: a focus muscle at 27 reads as inside its focus
 * range, a standard muscle at 24 reads as focus-level volume, and nothing
 * reads "Too much", "overtrained" or "junk". A set count cannot diagnose
 * overtraining (Meeusen 2013, S Q3b), so no line implies it.
 *
 * Every line describes and none instructs (D204). No band up to the top of
 * the studied range carries a notable tone; only "beyond the studied range"
 * and a session over its cap are marked 'note', and a 'note' is never a
 * warning colour (the surfaces map it to a neutral information token).
 *
 * Units: weekly FRACTIONAL sets (a direct set 1.0, a synergist set 0.5), the
 * tracker's unit. Pure: no I/O, no clock, no randomness.
 */
import { WEEKLY_BANDS, PER_SESSION } from './science';

export const BAND = Object.freeze({
  BELOW_MAINTENANCE: 'below_maintenance',
  MAINTENANCE: 'maintenance',
  BETWEEN: 'between',
  NORMAL_GROWTH: 'normal_growth',
  FOCUS_RANGE: 'focus_range',
  TOP_OF_STUDIED: 'top_of_studied',
  BEYOND_STUDIED: 'beyond_studied',
});

export const ROLE = Object.freeze({
  FOCUS: 'focus',
  RAISED: 'raised',
  STANDARD: 'standard',
  MAINTENANCE: 'maintenance',
});

const KNOWN_ROLES = new Set(Object.values(ROLE));

/** A role the wording understands; anything unknown reads as standard. */
export function normaliseRole(role) {
  return KNOWN_ROLES.has(role) ? role : ROLE.STANDARD;
}

/**
 * The band a weekly fractional total sits in. Boundaries: under 2 below
 * maintenance; 2 to 6 maintenance; above 6 and under 10 between; 10 to 20
 * normal growth; above 20 to 30 focus range; above 30 to 42 top of the
 * studied range; above 42 beyond it. A missing or negative total reads as 0.
 */
export function bandFor(weeklyFractionalSets) {
  const w = Number.isFinite(weeklyFractionalSets) && weeklyFractionalSets > 0 ? weeklyFractionalSets : 0;
  if (w < WEEKLY_BANDS.maintenanceFrom) return BAND.BELOW_MAINTENANCE;
  if (w <= WEEKLY_BANDS.maintenanceTop) return BAND.MAINTENANCE;
  if (w < WEEKLY_BANDS.normalFrom) return BAND.BETWEEN;
  if (w <= WEEKLY_BANDS.normalTop) return BAND.NORMAL_GROWTH;
  if (w <= WEEKLY_BANDS.focusTop) return BAND.FOCUS_RANGE;
  if (w <= WEEKLY_BANDS.studiedTop) return BAND.TOP_OF_STUDIED;
  return BAND.BEYOND_STUDIED;
}

/** "12", "13.5": one decimal at most, never a trailing ".0". */
export function formatSets(n) {
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function setsWord(n) {
  return n === 1 ? 'set' : 'sets';
}

/**
 * The band sentence for a muscle (S Q3b's wording table, with a line for a
 * muscle the check-ins raised). `muscleLabel` is the muscle as it reads
 * inside a sentence ("biceps", "side delts"); the caller supplies it.
 */
export function bandLine(band, role, muscleLabel) {
  const r = normaliseRole(role);
  const muscle = muscleLabel || 'this muscle';
  switch (band) {
    case BAND.BELOW_MAINTENANCE:
      return 'Below maintenance for this muscle.';
    case BAND.MAINTENANCE:
      return 'Maintenance range: studies find this holds the size you have.';
    case BAND.BETWEEN:
      return 'Between maintenance and the normal growth range.';
    case BAND.NORMAL_GROWTH:
      return r === ROLE.FOCUS
        ? `Normal growth range. Your plan is building ${muscle} towards its focus range.`
        : 'Normal growth range.';
    case BAND.FOCUS_RANGE:
      if (r === ROLE.FOCUS) {
        return `Within your focus range for ${muscle}: you picked it to bring up. Studies have found small extra gains at weekly totals like this.`;
      }
      if (r === ROLE.RAISED) {
        return `Within the focus range for ${muscle}: your check-ins raised it. Studies have found small extra gains at weekly totals like this.`;
      }
      return 'Above the normal growth range. This is focus-level volume for a muscle that is not a focus in your plan.';
    case BAND.TOP_OF_STUDIED:
      return r === ROLE.FOCUS
        ? 'Top of your focus range. This is near the most that studies have tested, and each extra set adds little.'
        : 'Near the top of what studies have tested. Each extra set adds little.';
    case BAND.BEYOND_STUDIED:
      return 'Beyond the range studies have tested, so the research cannot say what extra sets add.';
    default:
      return '';
  }
}

/** The role line (S F16): focus, raised and maintenance say so; standard says nothing. */
export function roleLine(role, muscleLabel) {
  const r = normaliseRole(role);
  if (r === ROLE.FOCUS) return `Focus: you picked ${muscleLabel || 'this muscle'} to bring up.`;
  if (r === ROLE.RAISED) return 'Raised at your check-in.';
  if (r === ROLE.MAINTENANCE) return 'Maintained.';
  return null;
}

/**
 * The target line (S F16): only when the weekly total is above the plan's
 * target for the week. `target` is a number or { low, high }.
 */
export function targetLine(weeklyFractionalSets, target) {
  if (!Number.isFinite(weeklyFractionalSets) || target == null) return null;
  const low = typeof target === 'number' ? target : target.low;
  const high = typeof target === 'number' ? target : (target.high ?? target.low);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  if (weeklyFractionalSets <= high) return null;
  return low === high
    ? `Your plan targets ${formatSets(low)} a week.`
    : `Your plan targets ${formatSets(low)} to ${formatSets(high)} a week.`;
}

/**
 * How a weekly total was counted (S F16): "12 sets counted: 6 direct and
 * 12 indirect at half credit." `indirect` is the number of synergist sets,
 * each counted as half.
 */
export function countedLine(direct, indirect) {
  const d = Number.isFinite(direct) && direct > 0 ? direct : 0;
  const i = Number.isFinite(indirect) && indirect > 0 ? indirect : 0;
  const total = d + 0.5 * i;
  return `${formatSets(total)} ${setsWord(total)} counted: ${formatSets(d)} direct and ${formatSets(i)} indirect at half credit.`;
}

/**
 * The whole judgement of one muscle's week: its band, the tone a surface may
 * give it, and the lines that explain it. Never changes volume, calories,
 * weight or notifications: it is wording only.
 *
 * @param {number} weeklyFractionalSets
 * @param {string} role       focus | raised | standard | maintenance
 * @param {object} [opts]
 * @param {string} [opts.muscleLabel]   the muscle inside a sentence
 * @param {number|{low:number, high:number}} [opts.target]  the plan's target for the week
 * @returns {{ band: string, role: string, tone: 'neutral'|'note', line: string, roleLine: string|null, targetLine: string|null }}
 */
export function volumeBand(weeklyFractionalSets, role, opts = {}) {
  const r = normaliseRole(role);
  const band = bandFor(weeklyFractionalSets);
  return {
    band,
    role: r,
    tone: band === BAND.BEYOND_STUDIED ? 'note' : 'neutral',
    line: bandLine(band, r, opts.muscleLabel),
    roleLine: roleLine(r, opts.muscleLabel),
    targetLine: targetLine(weeklyFractionalSets, opts.target),
  };
}

/**
 * One session's sets for one muscle against its session cap (design 4.3):
 * 8 direct or 11 fractional, or 10 and 12 where the plan allows a focus
 * muscle more (`focusCap`). Returns null when the session is inside its cap.
 */
export function sessionVolumeFlag({ direct = 0, fractional = 0, focusCap = false } = {}) {
  const directCap = focusCap ? PER_SESSION.focusDirectCap : PER_SESSION.directCap;
  const fractionalCap = focusCap ? PER_SESSION.focusFractionalCap : PER_SESSION.fractionalCap;
  if (!(direct > directCap) && !(fractional > fractionalCap)) return null;
  return {
    tone: 'note',
    line: `More than most studies have tested in one session (about ${fractionalCap} sets). The same sets spread over more sessions are counted the same in the weekly total.`,
  };
}
