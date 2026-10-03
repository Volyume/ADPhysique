// Recomposition reframe (ULTIMATE-RECOMP-01). A pure, deterministic derivation
// that reframes flat scale-weight as recomposition from data already on the
// Body-metrics screen — no new capture, no schema change. It answers one honest
// question: has the user's weight held steady while their shape and/or strength
// kept moving? If so it returns the numbers to say exactly that; if not it
// returns { render: false } and the screen shows nothing.
//
// Founder decisions baked in (2026-06-14), with the D214 addendum 4 change to
// the first of them (Body metrics, lane 7, 2026-10-02; spec docs/audit/
// progress-recovery-consistency-audit-2026-10-01/04-BODY-METRICS-AUDIT-AND-SPEC.md
// section 3 item 6, BM-10 and BM-11):
//  - NA-coaching-2: include the strength delta now, sourced via
//    buildLiftProgressRows over the SAME recent window as the composition read.
//  - NA-coaching-3: "weight broadly flat" is now the ONE steady rule every
//    display surface reads (weightTrend.STEADY_RATE_KG_PER_WEEK, 0.2 kg a
//    week), applied to the TREND's rate over the last six weeks. The old
//    per-entry rule (0.15 kg per entry over the last eight entries) went with
//    this change: it said "Weight steady." beside a card that said "Losing
//    weight" for someone falling 0.7 kg a week (BM-10). A reading needs the
//    same evidence as every direction word: DIRECTION_MIN_POINTS weigh-ins
//    spanning DIRECTION_MIN_SPAN_DAYS days. "Composition moved" = body fat
//    changed >= 0.5 percentage points OR any single site changed >= 1.0 cm; the
//    strength stream counts when a tracked lift's estimated-1RM rose >= 2.5 kg
//    (the smallest standard plate-pair increment) over the window.
//  - NA-coaching-6: the calling screen suppresses the card under calm mode or an
//    open ED-pattern flag; `deriveRecomp` honours a `suppressed` flag so a
//    "weight flat, fat down" read can never reinforce restriction.
//
// All deltas are Class-B body data: direction carries NO valence (a waist down
// or arms up is neither "good" nor "bad"). The numbers are the message.

import { buildLiftProgressRows } from './liftProgress';
import { computeEWMA } from './nutritionEngine';
import { kgToLbs } from './units';
import {
  isSteadyMove, DIRECTION_MIN_POINTS, DIRECTION_MIN_SPAN_DAYS,
} from './weightTrend';
import { localDayKey } from './dayKey';
import { shortDate, trimDecimals } from './bodyMetricsDisplay';

const DAY_MS = 86400000;
/** The window the steady rule reads: the last six weeks. */
export const STEADY_WINDOW_DAYS = 42;
// The smoother is seeded from the trend weight's own 90 days, so the
// six-week rate is read off the ONE trend the screen shows, never off a
// fresh smoother started at the window's first (possibly heavy) morning
// (lane 7 review N6).
export const TREND_SEED_DAYS = 90;

// NA-coaching-3 movement thresholds.
const BODY_FAT_MOVED_PP = 0.5;     // percentage points
const MEASUREMENT_MOVED_CM = 1.0;  // centimetres
const STRENGTH_MOVED_KG = 2.5;     // estimated-1RM gain, smallest plate-pair step

// The nine measurement sites, keyed as on each history entry, with the labels
// the reframe line uses.
const MEASUREMENT_LABELS = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  arms: 'Arms',
  forearms: 'Forearms',
  waist: 'Waist',
  hips: 'Hips',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Local noon of a 'YYYY-MM-DD' day key (a time no zone shift can move across a day).
function noonOf(key) {
  const [y, m, d] = String(key || '').split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

/**
 * The trend's movement over the last six weeks, from the smoothed series:
 * { rate (kg a week), spanDays, weeks, startKey } when the weigh-ins in the
 * window meet the shared evidence rule, else null.
 */
function steadyWindow(entries, nowMs) {
  const from = nowMs - STEADY_WINDOW_DAYS * DAY_MS;
  const seedFrom = nowMs - TREND_SEED_DAYS * DAY_MS;
  const seeded = entries
    .filter((e) => e && isNum(e.body_weight) && e.body_weight > 0 && e.metric_date)
    .map((e) => ({ weightKg: e.body_weight, loggedAt: noonOf(e.metric_date), dayKey: e.metric_date }))
    .filter((p) => Number.isFinite(p.loggedAt) && p.loggedAt >= seedFrom && p.loggedAt <= nowMs)
    .sort((a, b) => a.loggedAt - b.loggedAt);
  // One entry per day, in order, so the smoother's points line up by index.
  const smoothedAll = computeEWMA(seeded);
  const points = seeded
    .map((p, i) => ({ ...p, ewma: Number(smoothedAll[i]?.ewma) }))
    .filter((p) => p.loggedAt >= from && Number.isFinite(p.ewma));
  if (points.length < DIRECTION_MIN_POINTS) return null;
  const spanDays = (points[points.length - 1].loggedAt - points[0].loggedAt) / DAY_MS;
  if (spanDays < DIRECTION_MIN_SPAN_DAYS) return null;
  const deltaKg = points[points.length - 1].ewma - points[0].ewma;
  const rate = (deltaKg / spanDays) * 7;
  return {
    rate,
    deltaKg,
    spanDays,
    weeks: Math.max(1, Math.round(spanDays / 7)),
    startKey: points[0].dayKey,
  };
}

// Earliest and latest non-null value of `field` among entries whose metric_date
// falls inside [startKey, endKey]. Returns null unless there are two distinct
// readings to compare; carries the earlier reading's date.
function fieldDelta(entries, field, startKey, endKey) {
  const points = entries
    .filter((e) => e && isNum(e[field]) && e.metric_date
      && e.metric_date >= startKey && e.metric_date <= endKey)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  if (points.length < 2) return null;
  return {
    delta: points[points.length - 1][field] - points[0][field],
    from: points[0][field],
    to: points[points.length - 1][field],
    fromKey: points[0].metric_date,
  };
}

// Convert a local day key (YYYY-MM-DD) to a local-time ms range so workout sets
// (createdAt epoch) can be windowed to the same span the composition read uses.
const dayStartMs = (key) => new Date(`${key}T00:00:00`).getTime();
const dayEndMs = (key) => new Date(`${key}T23:59:59.999`).getTime();

/**
 * Derive the recomposition reframe view-model.
 *
 * @param {Array} history   body-metric entries (weight, body_fat, the nine sites), one per day
 * @param {Array} sets      completed workout sets (camel or snake case)
 * @param {object|Array|null} exercises the shared exercise lookup
 *   (database.getExerciseLookup, as BodyMetricsScreen passes it since D218),
 *   or an array of exercise records (id, name); buildLiftProgressRows takes either
 * @param {{ suppressed?: boolean, nowMs?: number }} [opts] suppressed = calm mode / open ED flag
 * @returns {{ render: false } | {
 *   render: true,
 *   weeks: number,                                      // whole weeks the weigh-ins used span
 *   bodyFat: null | { deltaPP: number, fromKey: string, fromPct: number, toPct: number }, // signed, 1dp; both readings
 *   measurement: null | { label, deltaCm, fromKey: string },  // most-changed site, signed, 1dp
 *   lift: null | { name, deltaKg: number, deltaLb: number },  // strongest e1RM gain, rounded
 * }}
 */
export function deriveRecomp(history, sets, exercises, opts = {}) {
  if (opts.suppressed) return { render: false };
  if (!Array.isArray(history) || history.length === 0) return { render: false };
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();

  // 1. The trend must be steady over the last six weeks: the ONE steady rule
  //    (rate AND total, weightTrend.isSteadyMove; closing review B2), so this
  //    card never says "steady" of weeks the Trend card says moved.
  const win = steadyWindow(history, nowMs);
  if (!win || !isSteadyMove(win.rate, win.deltaKg)) return { render: false };
  const startKey = win.startKey;
  const endKey = localDayKey(nowMs);

  // 2. Composition deltas within the same window.
  const bfRaw = fieldDelta(history, 'body_fat', startKey, endKey);
  const bodyFat = (bfRaw != null && Math.abs(bfRaw.delta) >= BODY_FAT_MOVED_PP)
    ? { deltaPP: Math.round(bfRaw.delta * 10) / 10, fromKey: bfRaw.fromKey, fromPct: bfRaw.from, toPct: bfRaw.to }
    : null;

  let measurement = null;
  for (const key of Object.keys(MEASUREMENT_LABELS)) {
    const raw = fieldDelta(history, key, startKey, endKey);
    if (raw == null || Math.abs(raw.delta) < MEASUREMENT_MOVED_CM) continue;
    if (!measurement || Math.abs(raw.delta) > Math.abs(measurement.deltaCm)) {
      measurement = {
        label: MEASUREMENT_LABELS[key],
        deltaCm: Math.round(raw.delta * 10) / 10,
        fromKey: raw.fromKey,
      };
    }
  }

  // 3. Strongest lift gain over the same window (estimated-1RM up only — a
  //    strength drop is not part of a recomposition read).
  let lift = null;
  if (Array.isArray(sets) && sets.length > 0) {
    const startMs = dayStartMs(startKey);
    const endMs = dayEndMs(endKey);
    const windowed = sets.filter((s) => {
      const at = Number(s?.createdAt ?? s?.created_at) || 0;
      return at >= startMs && at <= endMs;
    });
    const rows = buildLiftProgressRows(windowed, exercises);
    for (const r of rows) {
      if (!Array.isArray(r.trend) || r.trend.length < 2) continue;
      const gain = r.trend[r.trend.length - 1] - r.trend[0];
      if (gain < STRENGTH_MOVED_KG) continue;
      if (!lift || gain > lift._gain) {
        lift = { name: r.name, deltaKg: Math.round(gain), deltaLb: Math.round(kgToLbs(gain)), _gain: gain };
      }
    }
    if (lift) delete lift._gain;
  }

  // 4. Warranted only when weight held AND at least one stream moved.
  if (!bodyFat && !measurement && !lift) return { render: false };

  return { render: true, weeks: win.weeks, bodyFat, measurement, lift };
}

/**
 * The lines the card prints, in the person's gym units for the lift (both
 * units, the person's first): "Weight steady over the last 6 weeks.
 * Estimated one-rep max on Barbell Bench Press up 6 kg (13 lbs) over the same
 * weeks. Body fat down from 19% to 18% since 3 Aug. Waist down 2 cm since
 * 3 Aug." The lift is an ESTIMATE and says so (D201); body fat reads from one
 * figure to the other (founder order 2026-10-02, plain English), never as a
 * percent change; it moves in percentage
 * POINTS, not percent (BM-30); every change names the date it is measured from.
 *
 * @param {{ render: true }} vm  a rendering deriveRecomp result
 * @param {'kg'|'lbs'} [units]   the person's gym units
 * @returns {string[]}
 */
export function recompLines(vm, units = 'kg') {
  if (!vm || !vm.render) return [];
  const lines = [`Weight steady over the last ${vm.weeks === 1 ? 'week' : `${vm.weeks} weeks`}.`];
  if (vm.lift) {
    const amount = units === 'lbs'
      ? `${vm.lift.deltaLb} lbs (${vm.lift.deltaKg} kg)`
      : `${vm.lift.deltaKg} kg (${vm.lift.deltaLb} lbs)`;
    lines.push(`Estimated one-rep max on ${vm.lift.name} up ${amount} over the same weeks.`);
  }
  if (vm.bodyFat) {
    const d = vm.bodyFat.deltaPP;
    lines.push(`Body fat ${d < 0 ? 'down' : 'up'} from ${trimDecimals(vm.bodyFat.fromPct, 1)}% to ${trimDecimals(vm.bodyFat.toPct, 1)}% since ${shortDate(vm.bodyFat.fromKey)}.`);
  }
  if (vm.measurement) {
    const d = vm.measurement.deltaCm;
    lines.push(`${vm.measurement.label} ${d < 0 ? 'down' : 'up'} ${trimDecimals(Math.abs(d), 1)} cm since ${shortDate(vm.measurement.fromKey)}.`);
  }
  return lines;
}

/**
 * Recomposition insight -> share-card params (S4, world-class audit
 * docs/world-class-audit-2026-07-03/04a-progress-surfaces.md:22-24: "Make a
 * card" extended to the recomposition insight, "the most only-Volyume
 * insight in the app, currently unshareable").
 *
 * PRIVACY (Article 9, non-negotiable): a share card can leave the device and
 * end up posted publicly, so this is deliberately narrower than the
 * on-screen reframe (BodyMetricsScreen's RecompCard, which shows bodyFat/
 * measurement/lift deltas together). This builder fires ONLY on the
 * strength signal (a lift's estimated-1RM gain), pure training data, the
 * same class of number already on every session/PR card. Body-fat % and
 * body-measurement deltas are NEVER put on a share card, even as a signed
 * delta: ShareCardScreen's own privacy note promises "bodyweight,
 * measurements ... never included" for every non-weekly card, and this
 * keeps that promise true rather than carving out an exception for it.
 *
 * @param {ReturnType<typeof deriveRecomp>} vm
 * @param {'kg'|'lbs'} [units]
 * @returns {null | { eyebrow: string, title: string, heroValue: string,
 *   heroUnit: string, caption: string, stats: [], date: number }} null when
 *   there is nothing safe to share (not warranted, or shape moved but not
 *   strength).
 */
export function buildRecompShareParams(vm, units = 'kg') {
  if (!vm || !vm.render || !vm.lift) return null;
  return {
    eyebrow: 'Recomposition',
    title: 'Weight steady.',
    // D214 addendum 4 (BM-11): the gain is held in kilograms; a pounds user's
    // card prints the pounds figure under its "lbs" label, never kilograms
    // under it. The wording is unchanged.
    heroValue: String(units === 'lbs' ? vm.lift.deltaLb : vm.lift.deltaKg),
    heroUnit: `${units} added to your estimated one-rep max`,
    caption: 'Your weight has held while your strength kept moving.',
    stats: [],
    date: Date.now(),
  };
}
