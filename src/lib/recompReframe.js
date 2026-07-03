// Recomposition reframe (ULTIMATE-RECOMP-01). A pure, deterministic derivation
// that reframes flat scale-weight as recomposition from data already on the
// Body-metrics screen — no new capture, no schema change. It answers one honest
// question: has the user's weight held steady while their shape and/or strength
// kept moving? If so it returns the numbers to say exactly that; if not it
// returns { render: false } and the screen shows nothing.
//
// Founder decisions baked in (2026-06-14):
//  - NA-coaching-2: include the strength delta now, sourced via
//    buildLiftProgressRows over the SAME recent window as the composition read.
//  - NA-coaching-3: "weight broadly flat" reuses the screen's phase rule
//    (|slope| <= 0.15 kg per entry over the last <=8 weight entries, mirroring
//    BodyMetricsScreen.js:105-128); "composition moved" = body-fat changed
//    >= 0.5 percentage points OR any single site changed >= 1.0 cm; the strength
//    stream counts when a tracked lift's estimated-1RM rose >= 2.5 kg (the
//    smallest standard plate-pair increment) over the window.
//  - NA-coaching-6: the calling screen suppresses the card under calm mode or an
//    open ED-pattern flag; `deriveRecomp` honours a `suppressed` flag so a
//    "weight flat, fat down" read can never reinforce restriction.
//
// All deltas are Class-B body data: direction carries NO valence (a waist down
// or arms up is neither "good" nor "bad"). The numbers are the message.

import { buildLiftProgressRows } from './liftProgress';

// Mirrors BodyMetricsScreen.js:105-128 (detectPhase). Kept here as a pure helper
// rather than importing a screen into a lib; the 0.15 kg/entry threshold and the
// last-<=8-entries window match the phase chip exactly.
const FLAT_SLOPE_KG_PER_ENTRY = 0.15;
const WEIGHT_WINDOW = 8;

// NA-coaching-3 movement thresholds.
const BODY_FAT_MOVED_PP = 0.5;     // percentage points
const MEASUREMENT_MOVED_CM = 1.0;  // centimetres
const STRENGTH_MOVED_KG = 2.5;     // estimated-1RM gain, smallest plate-pair step

// The nine measurement sites, keyed as on each history entry
// (BodyMetricsScreen.js:78-86), with the labels the reframe line uses.
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

// Least-squares slope of body weight over entry index (kg per entry), oldest
// first. Returns null when there are too few points to mean anything.
function weightSlope(entries) {
  const sorted = entries
    .filter(e => e && isNum(e.body_weight) && e.metric_date)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .slice(-WEIGHT_WINDOW);
  if (sorted.length < 3) return null;
  const n = sorted.length;
  const xMean = (n - 1) / 2;
  const yMean = sorted.reduce((s, e) => s + e.body_weight, 0) / n;
  let num = 0, den = 0;
  sorted.forEach((e, i) => {
    num += (i - xMean) * (e.body_weight - yMean);
    den += (i - xMean) ** 2;
  });
  return {
    slope: den === 0 ? 0 : num / den,
    startKey: sorted[0].metric_date,
    endKey: sorted[sorted.length - 1].metric_date,
  };
}

// Earliest and latest non-null value of `field` among entries whose metric_date
// falls inside [startKey, endKey]. Returns null unless there are two distinct
// readings to compare.
function fieldDelta(entries, field, startKey, endKey) {
  const points = entries
    .filter(e => e && isNum(e[field]) && e.metric_date
      && e.metric_date >= startKey && e.metric_date <= endKey)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  if (points.length < 2) return null;
  return points[points.length - 1][field] - points[0][field];
}

// Convert a local day key (YYYY-MM-DD) to a local-time ms range so workout sets
// (createdAt epoch) can be windowed to the same span the composition read uses.
const dayStartMs = (key) => new Date(`${key}T00:00:00`).getTime();
const dayEndMs = (key) => new Date(`${key}T23:59:59.999`).getTime();

/**
 * Derive the recomposition reframe view-model.
 *
 * @param {Array} history   body-metric entries (weight, body_fat, the nine sites)
 * @param {Array} sets      completed workout sets (camel or snake case)
 * @param {Array} exercises exercise records (id, name)
 * @param {{ suppressed?: boolean }} [opts] suppressed = calm mode / open ED flag
 * @returns {{ render: false } | {
 *   render: true,
 *   bodyFat: null | { deltaPP: number },     // signed, 1dp
 *   measurement: null | { label, deltaCm },  // most-changed site, signed, 1dp
 *   lift: null | { name, deltaKg },          // strongest e1RM gain, rounded kg
 * }}
 */
export function deriveRecomp(history, sets, exercises, opts = {}) {
  if (opts.suppressed) return { render: false };
  if (!Array.isArray(history) || history.length === 0) return { render: false };

  // 1. Weight must be broadly flat over the recent window.
  const win = weightSlope(history);
  if (!win || Math.abs(win.slope) > FLAT_SLOPE_KG_PER_ENTRY) return { render: false };
  const { startKey, endKey } = win;

  // 2. Composition deltas within the same window.
  const bfRaw = fieldDelta(history, 'body_fat', startKey, endKey);
  const bodyFat = (bfRaw != null && Math.abs(bfRaw) >= BODY_FAT_MOVED_PP)
    ? { deltaPP: Math.round(bfRaw * 10) / 10 }
    : null;

  let measurement = null;
  for (const key of Object.keys(MEASUREMENT_LABELS)) {
    const raw = fieldDelta(history, key, startKey, endKey);
    if (raw == null || Math.abs(raw) < MEASUREMENT_MOVED_CM) continue;
    if (!measurement || Math.abs(raw) > Math.abs(measurement.deltaCm)) {
      measurement = { label: MEASUREMENT_LABELS[key], deltaCm: Math.round(raw * 10) / 10 };
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
        lift = { name: r.name, deltaKg: Math.round(gain), _gain: gain };
      }
    }
    if (lift) delete lift._gain;
  }

  // 4. Warranted only when weight held AND at least one stream moved.
  if (!bodyFat && !measurement && !lift) return { render: false };

  return { render: true, bodyFat, measurement, lift };
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
    heroValue: String(vm.lift.deltaKg),
    heroUnit: `${units} strength gained`,
    caption: 'Your weight has held while your strength kept moving.',
    stats: [],
    date: Date.now(),
  };
}
