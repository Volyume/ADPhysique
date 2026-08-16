/**
 * livePrescription.js — Campaign 20 Phase 2, Stage 1+2: the authoritative
 * live set prescription resolver.
 *
 * Binding spec: docs/live-prescription-campaign-20-2026-08-16/
 * CAMPAIGN-20-PHASE-1-DESIGN.md (sections 8-18) and FOUNDER-RULINGS-2026-08-16.md.
 *
 * WHAT THIS MODULE OWNS: the single answer to "what should this set be?" for
 * a live workout, replacing the fragmented authorities traced in the design
 * doc's §3 (getBestAnchorSet, the ghost prefill, computeSetTargets' per-set
 * loop, stalledAdvice). It does NOT wire into any screen yet (Stage 1+2 only
 * builds the module + its tests; screen wiring is a later stage per §19).
 *
 * PURITY: `resolveSetPrescription` and every internal decision helper are
 * pure - no I/O, no Date.now(), no randomness, no React/React Native/store
 * imports. The only IO seam is `buildEvidencePacket`, which lazy-requires
 * `./database` (avoiding a static import that would pull expo-sqlite into
 * this module's graph) and does nothing but fetch + hand off to the pure
 * `assembleEvidencePacket`.
 *
 * CONFIDENCE BOUNDARIES (deterministic, see resolveConfidence()):
 *   - 'high'   SENIOR_RECOVERY_HOLD or USER_CHOICE_RESPECTED (both are known
 *              facts, not guesses); OR >=2 comparable, non-outlier-discounted
 *              history sessions whose top-load band classification
 *              (topped/in_band/missed) AGREES between the two most recent.
 *   - 'medium' exactly 1 comparable session (with or without today's
 *              evidence); OR >=2 comparable sessions whose top-load band
 *              classification DISAGREES between the two most recent
 *              ("minor conflict"); OR zero comparable sessions but today has
 *              working sets logged (today's evidence alone is real, just
 *              thin).
 *   - 'low'    FIRST_TIME_BAND, INSUFFICIENT_EVIDENCE (type-gated positions
 *              or history that failed §8 comparability), or zero comparable
 *              sessions AND no today evidence at all.
 * At 'low' confidence (outside FIRST_TIME_BAND, which has its own explicit
 * startingWeight-or-blank rule) the WEIGHT falls back to the factual
 * reference value rather than a manufactured number (Founder Ruling 1,
 * B-plus; §16).
 *
 * PROVENANCE: exactly the 13 §17 codes, exported frozen below. Every
 * prescription carries exactly one.
 *
 * BODYWEIGHT / REPS-ONLY LAW (CALC-5 / FR-C4-4, migrated here): an exercise
 * whose exerciseType is 'reps_only' NEVER receives a weight suggestion -
 * weight is forced null after every other computation, unconditionally.
 * `weight null on reps_only` is the explicit regression test's name.
 */

import { defaultIncrement, calculate1RM } from './algorithms';

// ── Provenance vocabulary (§17) — exactly 13 codes, one per prescription ──
export const PROVENANCE = Object.freeze({
  FIRST_TIME_BAND: 'FIRST_TIME_BAND',
  MATCH_LOAD_ADD_REP: 'MATCH_LOAD_ADD_REP',
  LOAD_ADVANCE_RANGE_TOPPED: 'LOAD_ADVANCE_RANGE_TOPPED',
  HOLD_BUILDING_RANGE: 'HOLD_BUILDING_RANGE',
  HOLD_EFFORT_UNKNOWN: 'HOLD_EFFORT_UNKNOWN',
  HOLD_EFFORT_VERY_HARD: 'HOLD_EFFORT_VERY_HARD',
  LOAD_DROP_CONSECUTIVE_MISS: 'LOAD_DROP_CONSECUTIVE_MISS',
  CURRENT_SESSION_STRONGER: 'CURRENT_SESSION_STRONGER',
  CURRENT_SESSION_FATIGUE_ADJUST: 'CURRENT_SESSION_FATIGUE_ADJUST',
  STABLE_BACKOFF_PATTERN: 'STABLE_BACKOFF_PATTERN',
  SENIOR_RECOVERY_HOLD: 'SENIOR_RECOVERY_HOLD',
  USER_CHOICE_RESPECTED: 'USER_CHOICE_RESPECTED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
});

// Set types that never feed evidence and are never prescribed for (§15).
const NEVER_ELIGIBLE_TYPES = new Set(['warmup', 'dropset', 'myo_reps', 'rest_pause']);
// Set types that DO carry evidence/prescription (straight, superset members
// - which are 'straight' rows on their own exercise id - and AMRAP, whose
// reps are capability-only, never structure evidence, §15).
const CAPABILITY_TYPES = new Set(['straight', 'amrap']);
const STRUCTURE_TYPES = new Set(['straight']); // AMRAP excluded from structure/expected-curve learning

const FORTY_FIVE_DAYS_MS = 45 * 24 * 60 * 60 * 1000;

// ── Small pure numeric utilities ───────────────────────────────────────────

function roundQuarter(x) {
  return Math.round(x * 4) / 4;
}

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

function median(nums) {
  const arr = (nums || []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return NaN;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function classifyReps(reps, band) {
  if (reps >= band.max) return 'topped';
  if (reps < band.min) return 'missed';
  return 'in_band';
}

// §4/§13.2: expected within-session decline per position. The design gives a
// range ("0-1 for isolation/accessory"); resolved conservatively to the
// range's lower bound (0) so the resolver never demands MORE decline than
// evidence requires for smaller-fatigue movements. Compounds keep the
// pinned 1 rep/position.
function declinePerPosition(category) {
  if (category === 'isolation' || category === 'accessory') return 0;
  return 1; // compound (default)
}

// ── §10.2/§10.4: the ONE increment source of truth ─────────────────────────
// increment = incrementKg ?? defaultIncrement(weight, units, category),
// capped at 5% of the base load, rounded to the 0.25 grid, floored at 0.25.
// computeSetTargets' existing maths (algorithms.js:488-498), kept
// byte-for-byte and promoted to the single authority (design §10.2).
export function resolveLoadIncrement(baseWeight, { incrementKg = null, units = 'kg', category = 'compound' } = {}) {
  const w = Number.isFinite(baseWeight) ? baseWeight : 0;
  const raw = incrementKg != null && Number.isFinite(Number(incrementKg))
    ? Number(incrementKg)
    : defaultIncrement(w, units, category);
  const cappedByPercent = w > 0 ? Math.min(raw, w * 0.05) : raw;
  const rounded = roundQuarter(cappedByPercent);
  return Math.max(0.25, rounded);
}

// The downward-only readiness/re-entry load trim. Deliberately NOT imported
// from sessionAdjustments.js: that module statically imports database.js
// (native modules), which would pull IO into this pure module's import
// graph purely to reuse one one-line formula. Mirrors
// sessionAdjustments.applyReadinessToLoad byte-for-byte (same floor-to-0.25
// downward-only rounding); the two are pinned to stay identical by the
// properties suite's cross-check test.
function applyDownwardLoadTrim(weight, loadFactor) {
  if (!Number.isFinite(weight) || weight <= 0) return weight;
  const trimmed = Math.floor(weight * loadFactor * 4) / 4;
  if (trimmed <= 0) return weight;
  return Math.min(weight, trimmed);
}

// ── Session-level pure readers ─────────────────────────────────────────────

// The top (heaviest) working/capability load in a session, the best reps
// demonstrated AT that load, and the set rows that sit at that load.
// Capability evidence = straight + AMRAP rows (§15); AMRAP reps are
// capability-only (still count for W/R_top) but are excluded from
// structure/expected-curve learning elsewhere (STRUCTURE_TYPES).
function topLoadAndReps(session) {
  const capability = (session?.working || []).filter((s) => CAPABILITY_TYPES.has(s.setType));
  if (!capability.length) return null;
  const W = capability.reduce((m, s) => Math.max(m, s.weight), 0);
  const atW = capability.filter((s) => s.weight === W);
  const R_top = atW.reduce((m, s) => Math.max(m, s.reps), 0);
  return { W, R_top, atW };
}

// §13.3: canonical calculate1RM over THIS module's own already-filtered
// capability rows (not isE1rmEligibleRow, which allows dropset through -
// dropset is excluded from live-prescription evidence per §15, so the two
// eligibility laws are deliberately different here).
function sessionTopE1rm(session) {
  let best = 0;
  for (const s of session?.working || []) {
    if (!CAPABILITY_TYPES.has(s.setType)) continue;
    if (!(s.weight > 0) || !(s.reps > 0)) continue;
    const est = calculate1RM(s.weight, s.reps);
    if (est > best) best = est;
  }
  return best;
}

// §13.3: a comparable session whose top e1RM sits >10% below the window
// median is discounted from LEARNING (structure, expected-curve, and -
// per scenario 45's explicit requirement that "opening resolves from
// remaining comparable sessions" - the opening-load gate too). Still shown
// as history (the caller's `history` array, unaffected by this filter,
// still contains it for the reference row). A single session can never be
// its own outlier (nothing to compare it to).
export function discountOutliers(comparableHistory) {
  const list = Array.isArray(comparableHistory) ? comparableHistory : [];
  if (list.length <= 1) return list;
  const tops = list.map(sessionTopE1rm);
  const positive = tops.filter((t) => t > 0);
  if (positive.length === 0) return list;
  const med = median(positive);
  if (!(med > 0)) return list;
  return list.filter((s, i) => tops[i] === 0 || tops[i] >= med * 0.9);
}

// ── §10: LOAD-PROGRESSION RULE — next session's opening/top-set load ──────
//
// `comparableHistory` must already be §8-comparable (assembleEvidencePacket
// does this) and newest-first. Judges the EXERCISE on its top working load,
// not per ordinal set (design's amendment to computeSetTargets' per-set
// loop, §10 preamble). Outlier-discounted internally (§13.3 / scenario 45).
export function nextSessionOpeningLoad(comparableHistory, band, opts = {}) {
  const { incrementKg = null, units = 'kg', category = 'compound' } = opts;
  const usable = discountOutliers(comparableHistory);
  if (!usable.length) {
    return { weight: null, provenance: PROVENANCE.INSUFFICIENT_EVIDENCE, sourceAt: null };
  }
  const recent = usable[0];
  const top = topLoadAndReps(recent);
  if (!top) {
    return { weight: null, provenance: PROVENANCE.INSUFFICIENT_EVIDENCE, sourceAt: recent.at ?? null };
  }
  const recentBand = recent.band || band;
  const clsTop = classifyReps(top.R_top, recentBand);
  const anyMissedAtW = top.atW.some((s) => classifyReps(s.reps, recentBand) === 'missed');

  // §10.3 DROP: even the BEST set at W missed repsMin in TWO consecutive
  // comparable (non-discounted) sessions. A single miss holds and rebuilds.
  if (clsTop === 'missed') {
    if (usable.length >= 2) {
      const prior = usable[1];
      const priorTop = topLoadAndReps(prior);
      const priorBand = prior.band || band;
      const priorMissed = priorTop && classifyReps(priorTop.R_top, priorBand) === 'missed';
      if (priorMissed && top.W > 0) {
        const dec = resolveLoadIncrement(top.W, { incrementKg, units, category });
        return {
          weight: Math.max(0, roundQuarter(top.W - dec)),
          provenance: PROVENANCE.LOAD_DROP_CONSECUTIVE_MISS,
          sourceAt: recent.at ?? null,
        };
      }
    }
    return { weight: top.W, provenance: PROVENANCE.HOLD_BUILDING_RANGE, sourceAt: recent.at ?? null };
  }

  // §10.1 ADVANCE: range mastered at W, nothing at W missed, effort (FQ-3)
  // corroborates, and W > 0 (FR-C4-4: never a load instruction on an
  // unloaded/bodyweight top set).
  if (clsTop === 'topped' && !anyMissedAtW && top.W > 0) {
    const sd = recent.difficulty == null ? NaN : Number(recent.difficulty);
    const effortSupports = Number.isFinite(sd) && sd >= 1 && sd <= 3;
    const effortVeryHard = Number.isFinite(sd) && sd >= 4;
    if (effortSupports) {
      const inc = resolveLoadIncrement(top.W, { incrementKg, units, category });
      return {
        weight: roundQuarter(top.W + inc),
        provenance: PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED,
        sourceAt: recent.at ?? null,
      };
    }
    if (effortVeryHard) {
      return { weight: top.W, provenance: PROVENANCE.HOLD_EFFORT_VERY_HARD, sourceAt: recent.at ?? null };
    }
    return { weight: top.W, provenance: PROVENANCE.HOLD_EFFORT_UNKNOWN, sourceAt: recent.at ?? null };
  }

  // In band (or topped-but-W<=0, i.e. bodyweight - CALC-5 pin: never
  // advances a zero/unloaded top regardless of reps). Ordinary continuation.
  return { weight: top.W, provenance: PROVENANCE.MATCH_LOAD_ADD_REP, sourceAt: recent.at ?? null };
}

// ── §13.1: back-off structure detection (Law E amendment) ─────────────────
//
// A stable back-off exists at position `pos` when >=2 of the last 3
// (outlier-discounted) comparable sessions show ratio_p = weight_p/topWeight
// <= 0.95, agreeing within 0.05 of each other. One session can NEVER create
// one (adversarial property, Stage 14). AMRAP rows are excluded (structure
// learning, §15) via STRUCTURE_TYPES.
export function stableBackoffRatio(comparableHistory, pos) {
  const usable = discountOutliers(comparableHistory);
  const ratios = [];
  for (const session of usable) {
    const top = topLoadAndReps(session);
    if (!top || !(top.W > 0)) continue;
    const set = (session.working || []).find((s) => s.pos === pos && STRUCTURE_TYPES.has(s.setType));
    if (!set || !(set.weight >= 0)) continue;
    ratios.push(set.weight / top.W);
  }
  if (ratios.length < 2) return null;
  const low = ratios.filter((r) => r <= 0.95);
  if (low.length < 2) return null;
  for (let i = 0; i < low.length; i++) {
    const agreeing = low.filter((r) => Math.abs(r - low[i]) <= 0.05);
    if (agreeing.length >= 2) {
      return { ratio: median(agreeing), support: agreeing.length };
    }
  }
  return null;
}

// ── §13.2/§11: expected-reps curve ─────────────────────────────────────────
//
// Mid-session: once position (pos-1) or earlier has been logged today,
// re-bases off TODAY's most recent logged position (§11's decline formula).
// Otherwise: the learned/prior value from comparable history at `pos`
// (median of however many comparable sessions logged that exact position -
// median-of-1 degrades gracefully to "that one session's value", which is
// ordinary REFERENCE evidence per the §7 hierarchy, not the stricter
// >=2-session INTENT claim that §13.4 reserves for back-off ratio /
// consecutive-miss; see module report for the full rationale). Falls back to
// the nearest lower position with data, decline-adjusted, when `pos` itself
// has never been observed (e.g. a new Set 4, scenario 22); with NO data
// anywhere, a neutral band.max-based decline chain.
function expectedRepsFromHistory(pos, comparableHistory, band, category) {
  const usable = discountOutliers(comparableHistory);
  const decline = declinePerPosition(category);
  for (let q = pos; q >= 1; q--) {
    const obs = [];
    for (const s of usable) {
      const set = (s.working || []).find((w) => w.pos === q && STRUCTURE_TYPES.has(w.setType));
      if (set && Number.isFinite(set.reps)) obs.push(set.reps);
    }
    if (obs.length > 0) {
      return clamp(median(obs) - decline * (pos - q), band.min, band.max);
    }
  }
  return clamp(band.max - decline * (pos - 1), band.min, band.max);
}

export function expectedReps({ pos, comparableHistory = [], today = { working: [] }, band, category = 'compound' }) {
  const decline = declinePerPosition(category);
  const priorToday = (today.working || [])
    .filter((s) => s.pos < pos)
    .sort((a, b) => b.pos - a.pos)[0];
  if (priorToday) {
    const gap = Math.max(1, pos - priorToday.pos);
    return clamp(priorToday.reps - decline * gap, band.min, band.max);
  }
  return expectedRepsFromHistory(pos, comparableHistory, band, category);
}

// ── §12: CURRENT-SESSION ADAPTATION RULE ───────────────────────────────────
// The ±2-rep noise floor is implicit: adjustWeaker only fires on a genuine
// below-band miss or a >=3-rep-below-expected in-band shortfall (both
// already outside any ±2 noise reading), and adjustStronger only fires on a
// >=repsMax+2 overshoot. Anything inside that leaves both `changed: false`.

// §12.2: today's LAST logged working set fell short. Below repsMin -> drop
// one increment, honest target repsMin. In-band but >=3 below the
// (history-based, NOT today-rebased - avoids self-reference) expected curve
// -> HOLD the load, target drops to that honest expected-curve value (never
// the historical peak, never a fresh +1 beat demand).
export function adjustWeaker({ today, band, comparableHistory = [], category = 'compound' }) {
  const sets = today?.working || [];
  if (!sets.length) return { changed: false };
  const last = sets[sets.length - 1];
  if (last.reps < band.min) {
    return {
      changed: true,
      drop: true,
      basisWeight: last.weight,
      repsTargetOverride: band.min,
      provenance: PROVENANCE.CURRENT_SESSION_FATIGUE_ADJUST,
    };
  }
  const expected = expectedRepsFromHistory(last.pos, comparableHistory, band, category);
  if (Number.isFinite(expected) && (expected - last.reps) >= 3) {
    const decline = declinePerPosition(category);
    const rebased = clamp(last.reps - decline, band.min, band.max);
    return {
      changed: true,
      drop: false,
      repsTargetOverride: rebased,
      provenance: PROVENANCE.CURRENT_SESSION_FATIGUE_ADJUST,
    };
  }
  return { changed: false };
}

// §12.1: overshoot ADD. Bounded to ONE step, never compounding (inferred
// from today's own logged loads: once any set today is already heavier than
// the day's first set, an add has effectively already happened/been chosen,
// so a further overshoot never re-fires it - the resolver is stateless and
// re-derives everything from the packet, so this is the only pure way to
// enforce "at most once" without hidden memory). Founder Ruling 2 (ABSOLUTE):
// disabled outright under deload/recovery, block-finished, re-entry easing,
// or an active readiness reduction - never merely trimmed.
export function adjustStronger({ today, band, senior = {} }) {
  const sets = today?.working || [];
  if (!sets.length) return { changed: false };
  const seniorBlocks = !!(senior.isDeload || senior.blockFinished
    || senior.reEntryEaseActive || senior.readinessReductionActive);
  if (seniorBlocks) return { changed: false };
  const anySubBand = sets.some((s) => s.reps < band.min);
  if (anySubBand) return { changed: false };
  const last = sets[sets.length - 1];
  const overshoot = last.reps >= band.max + 2;
  if (!overshoot) return { changed: false };
  const firstWeight = sets[0].weight;
  const alreadyAdvanced = sets.some((s) => s.weight > firstWeight);
  if (alreadyAdvanced) return { changed: false };
  return {
    changed: true,
    add: true,
    basisWeight: last.weight,
    repsTargetOverride: band.min,
    provenance: PROVENANCE.CURRENT_SESSION_STRONGER,
  };
}

// ── §9.4: user override detection (Law G) ──────────────────────────────────
// A logged weight/reps that differs from the presented prescription by more
// than half an increment / more than 2 reps counts as a deliberate choice.
// Exported for the (later) screen-wiring stage; not called internally here -
// override state is a packet INPUT (today.overrideLoad/overrideReps),
// resolved by whatever already showed the athlete a prescription.
export function detectLoadOverride(loggedWeight, prescribedWeight, opts = {}) {
  if (!Number.isFinite(loggedWeight) || !Number.isFinite(prescribedWeight)) return null;
  const basis = prescribedWeight > 0 ? prescribedWeight : loggedWeight;
  const halfInc = resolveLoadIncrement(basis, opts) / 2;
  return Math.abs(loggedWeight - prescribedWeight) > halfInc ? loggedWeight : null;
}

export function detectRepsOverride(loggedReps, prescribedReps) {
  if (!Number.isFinite(loggedReps) || !Number.isFinite(prescribedReps)) return null;
  return Math.abs(loggedReps - prescribedReps) > 2 ? loggedReps : null;
}

// ── §9.1: evidence packet assembly (pure) ──────────────────────────────────

function num(v) {
  // Number(null) is 0 and Number(undefined) is NaN — both must map to "not
  // supplied" (null), never to a fabricated 0. Explicit nullish guard first.
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Normalise one raw session's raw set rows into { pos, weight, reps, setType }
// eligible working rows, sorted by position. Tolerant of camelCase/snake_case
// DB rows and hand-built test fixtures alike. Never throws.
function normalizeWorkingRows(rowsRaw, exerciseId) {
  const rows = [];
  for (const r of Array.isArray(rowsRaw) ? rowsRaw : []) {
    if (!r || typeof r !== 'object') continue;
    if (exerciseId != null) {
      const rid = r.exerciseId ?? r.exercise_id;
      if (rid != null && rid !== exerciseId) continue;
    }
    const setType = r.setType ?? r.set_type ?? 'straight';
    if (NEVER_ELIGIBLE_TYPES.has(setType)) continue;
    if (!CAPABILITY_TYPES.has(setType)) continue; // unknown/unhandled types: conservatively ineligible
    const weight = num(r.weight);
    const reps = num(r.actualReps ?? r.actual_reps ?? r.reps);
    // Malformed-row exclusion: non-finite/negative weight, non-finite/non-positive reps.
    if (weight == null || weight < 0) continue;
    if (reps == null || reps <= 0) continue;
    const tMin = num(r.targetRepsMin ?? r.target_reps_min);
    const tMax = num(r.targetRepsMax ?? r.target_reps_max);
    const createdAt = num(r.createdAt ?? r.created_at) || 0;
    const rawPos = num(r.setNumber ?? r.set_number ?? r.pos);
    rows.push({
      pos: rawPos != null && rawPos > 0 ? rawPos : null,
      weight, reps, setType, createdAt,
      targetRepsMin: tMin, targetRepsMax: tMax,
    });
  }
  // Determinism (Stage 14): sort by createdAt so row ORDER in the raw input
  // never matters, only identity/timestamp does.
  rows.sort((a, b) => (a.createdAt - b.createdAt) || 0);
  const used = new Set(rows.filter((r) => r.pos != null).map((r) => r.pos));
  let nextAuto = 1;
  const working = rows.map((r) => {
    if (r.pos != null) return { pos: r.pos, weight: r.weight, reps: r.reps, setType: r.setType };
    while (used.has(nextAuto)) nextAuto++;
    used.add(nextAuto);
    return { pos: nextAuto++, weight: r.weight, reps: r.reps, setType: r.setType };
  }).sort((a, b) => a.pos - b.pos);
  const bandSample = rows.find((r) => r.targetRepsMin != null && r.targetRepsMax != null);
  return {
    working,
    band: bandSample ? { min: bandSample.targetRepsMin, max: bandSample.targetRepsMax } : null,
  };
}

/**
 * PURE assembler (design §9.1). Takes already-fetched raw rows and returns
 * the evidence packet. Applies §8 comparability: eligibility (row-level,
 * above), band-overlap re-basing (>=50% of today's band width), the 45-day
 * recency bound, deload-session exclusion, and malformed-row exclusion.
 * Sessions that fail band-overlap or recency stay IN `history` (marked
 * `comparable: false`) so the reference row can still show real history
 * (Law A: never fabricate, never hide) — they are only excluded from
 * progression LEARNING, which every internal helper reads via
 * `history.filter(s => s.comparable)`. Deload sessions are the one true
 * exclusion (§8.5: "excluded from progression evidence", not reference-only).
 * A session with zero raw rows for this exercise (rather than zero VALID
 * rows) is not created in the first place by the caller, so `history.length
 * === 0` reliably means "this exercise has no logged history at all" -
 * exactly the FIRST_TIME_BAND condition; a session that exists but is all
 * malformed/incomparable still counts as "history exists" (INSUFFICIENT_
 * EVIDENCE, not FIRST_TIME_BAND — scenario 44 vs scenario 1/2).
 * Never throws on garbage input.
 */
export function assembleEvidencePacket(input) {
  try {
    const {
      exercise = {},
      prescription = {},
      senior = {},
      rawHistory = [],
      rawToday = [],
      overrideLoad = null,
      overrideReps = null,
      now: nowInput,
    } = input || {};
    // Pure: never reads the clock. A caller that omits `now` gets the most
    // CONSERVATIVE fallback (effectively "infinitely far in the future"), so
    // every session reads as stale/reference-only rather than silently
    // treating unknown-age history as fresh comparable evidence.
    const now = Number.isFinite(nowInput) ? nowInput : Number.MAX_SAFE_INTEGER;

    const exerciseId = exercise?.id ?? null;
    const repsMinIn = num(prescription?.repsMin);
    const repsMaxIn = num(prescription?.repsMax);
    const repsMin = repsMinIn != null ? repsMinIn : 8;
    const repsMax = repsMaxIn != null ? Math.max(repsMaxIn, repsMin) : Math.max(12, repsMin);
    const todayBand = { min: repsMin, max: repsMax };

    // A session whose raw rows are ALL tagged for a DIFFERENT exercise id
    // never belongs to this exercise's history at all (comparability rule
    // §8.1) — it is dropped before normalisation, not merely filtered down
    // to zero working rows. That distinction matters: a session that
    // genuinely belongs here but is all malformed/ineligible still counts
    // as "this exercise has history" (INSUFFICIENT_EVIDENCE, scenario 44);
    // a session that never belonged here at all must not count as history
    // for THIS exercise (scenario 41's superset non-cross-pollination).
    const belongsToExercise = (raw) => {
      if (exerciseId == null) return true;
      const rowsRaw = Array.isArray(raw) ? raw : (Array.isArray(raw?.sets) ? raw.sets : []);
      if (!rowsRaw.length) return true; // nothing to disqualify it on
      return rowsRaw.some((r) => {
        const rid = r?.exerciseId ?? r?.exercise_id;
        return rid == null || rid === exerciseId;
      });
    };

    const normalizedSessions = (Array.isArray(rawHistory) ? rawHistory : [])
      .filter(belongsToExercise)
      .map((raw) => {
        const rowsRaw = Array.isArray(raw) ? raw : (Array.isArray(raw?.sets) ? raw.sets : []);
        const meta = Array.isArray(raw) ? {} : (raw || {});
        const { working, band } = normalizeWorkingRows(rowsRaw, exerciseId);
        const at = num(meta.at ?? meta.startedAt ?? meta.started_at)
          ?? rowsRaw.reduce((m, r) => Math.max(m, num(r?.createdAt ?? r?.created_at) || 0), 0);
        let diff = meta.difficulty ?? meta.sessionDifficulty ?? meta.session_difficulty;
        diff = diff == null ? null : Number(diff);
        if (!Number.isFinite(diff) || diff < 1 || diff > 5) diff = null;
        const isDeload = !!(meta.isDeload ?? meta.is_deload);
        return { at: at || 0, difficulty: diff, isDeload, band: band ?? todayBand, working };
      })
      .filter((s) => !s.isDeload); // §8.5: deload sessions never enter history at all

    const historySessions = normalizedSessions
      .map((s) => {
        const overlapWidth = Math.max(0, Math.min(s.band.max, todayBand.max) - Math.max(s.band.min, todayBand.min));
        const todayWidth = todayBand.max - todayBand.min;
        const bandOk = todayWidth > 0
          ? (overlapWidth / todayWidth) >= 0.5
          : (s.band.min === todayBand.min && s.band.max === todayBand.max);
        const recentOk = s.at > 0 && (now - s.at) <= FORTY_FIVE_DAYS_MS;
        return { ...s, comparable: bandOk && recentOk && s.working.length > 0 };
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 3);

    const { working: todayWorking } = normalizeWorkingRows(
      Array.isArray(rawToday) ? rawToday : [],
      exerciseId,
    );

    const readinessTweak = senior?.readinessTweak ?? null;
    const derivedReEntry = !!(readinessTweak && readinessTweak.reduces
      && readinessTweak.because === 'athlete_reentry_choice');
    const derivedReadinessCut = !!(readinessTweak && readinessTweak.reduces
      && readinessTweak.because !== 'athlete_reentry_choice');

    return {
      exercise: {
        id: exerciseId,
        exerciseType: exercise?.exerciseType ?? 'weight_reps',
        category: exercise?.category ?? 'compound',
        incrementKg: num(exercise?.incrementKg),
        units: exercise?.units === 'lbs' ? 'lbs' : 'kg',
      },
      prescription: {
        repsMin, repsMax,
        targetSets: num(prescription?.targetSets),
        startingWeight: num(prescription?.startingWeight),
        goal: prescription?.goal ?? null,
      },
      senior: {
        isDeload: !!senior?.isDeload,
        deloadTargets: Array.isArray(senior?.deloadTargets) ? senior.deloadTargets : null,
        blockFinished: !!senior?.blockFinished,
        readinessTweak,
        layoffDays: num(senior?.layoffDays),
        reEntryEaseActive: senior?.reEntryEaseActive != null ? !!senior.reEntryEaseActive : derivedReEntry,
        readinessReductionActive: senior?.readinessReductionActive != null
          ? !!senior.readinessReductionActive : derivedReadinessCut,
      },
      history: historySessions,
      today: {
        working: todayWorking,
        overrideLoad: num(overrideLoad),
        overrideReps: num(overrideReps),
      },
    };
  } catch (_e) {
    // Robustness requirement: never throw on garbage input. Fall back to a
    // minimal, valid, first-time-shaped packet.
    return {
      exercise: { id: null, exerciseType: 'weight_reps', category: 'compound', incrementKg: null, units: 'kg' },
      prescription: { repsMin: 8, repsMax: 12, targetSets: null, startingWeight: null, goal: null },
      senior: {
        isDeload: false, deloadTargets: null, blockFinished: false, readinessTweak: null,
        layoffDays: null, reEntryEaseActive: false, readinessReductionActive: false,
      },
      history: [],
      today: { working: [], overrideLoad: null, overrideReps: null },
    };
  }
}

/**
 * The thin async IO seam (design §19). Fetches getLastNWorkoutSets(N=3) and,
 * for each returned session, getWorkoutById (for its startedAt + the
 * previous session's difficulty rating) — the two calls the design names —
 * then hands off to assembleEvidencePacket for ALL decision logic. Lazy-
 * requires database.js (house convention: avoids a static import cycle and
 * keeps this pure module's own import graph free of native modules).
 *
 * History-session deload detection (§8.5) needs a mesocycle-week read that
 * is outside this function's documented two-call IO scope; sessions built
 * here always carry isDeload: false. assembleEvidencePacket's deload
 * exclusion is fully implemented and tested — a later wiring stage that
 * wants historical deload weeks excluded from the reference/history window
 * can pass `isDeload: true` per session once it resolves that lookup itself.
 */
export async function buildEvidencePacket({
  exerciseId,
  currentWorkoutId,
  exercise = {},
  prescription = {},
  senior = {},
  rawToday = [],
  overrideLoad = null,
  overrideReps = null,
  now = Date.now(),
} = {}) {
  // eslint-disable-next-line global-require
  const { getLastNWorkoutSets, getWorkoutById } = require('./database');
  let sessionsRaw = [];
  try {
    sessionsRaw = await getLastNWorkoutSets(exerciseId, currentWorkoutId, 3);
  } catch (_e) {
    sessionsRaw = [];
  }
  const rawHistory = [];
  for (const sets of sessionsRaw || []) {
    const workoutId = sets?.[0]?.workoutId ?? sets?.[0]?.workout_id ?? null;
    let workout = null;
    if (workoutId != null) {
      try {
        workout = await getWorkoutById(workoutId);
      } catch (_e) {
        workout = null;
      }
    }
    rawHistory.push({
      at: workout?.startedAt ?? workout?.started_at ?? null,
      difficulty: workout?.sessionDifficulty ?? workout?.session_difficulty ?? null,
      isDeload: false,
      sets,
    });
  }
  return assembleEvidencePacket({
    exercise: { id: exerciseId, ...exercise },
    prescription,
    senior,
    rawHistory,
    rawToday,
    overrideLoad,
    overrideReps,
    now,
  });
}

// ── resolveSetPrescription internals ───────────────────────────────────────

function normalizePosition(position) {
  if (typeof position === 'number') return { index: position, setType: 'straight' };
  const index = Number.isFinite(position?.index) ? position.index : 1;
  return { index, setType: position?.setType ?? 'straight' };
}

// Defensive re-normalisation so resolveSetPrescription is robust to
// hand-built test packets, not only ones that passed through
// assembleEvidencePacket. Does NOT re-run comparability filtering (that is
// assembleEvidencePacket's job) — only fills gaps/coerces types.
function normalizePacket(packet) {
  const p = packet || {};
  const repsMin = Number.isFinite(p.prescription?.repsMin) ? p.prescription.repsMin : 8;
  const repsMaxRaw = Number.isFinite(p.prescription?.repsMax) ? p.prescription.repsMax : Math.max(12, repsMin);
  const repsMax = Math.max(repsMaxRaw, repsMin);
  const history = (Array.isArray(p.history) ? p.history : []).map((s) => ({
    at: Number.isFinite(s?.at) ? s.at : 0,
    difficulty: Number.isFinite(s?.difficulty) ? s.difficulty : null,
    comparable: !!s?.comparable,
    band: (s?.band && Number.isFinite(s.band.min) && Number.isFinite(s.band.max))
      ? s.band : { min: repsMin, max: repsMax },
    working: (Array.isArray(s?.working) ? s.working : [])
      .filter((w) => w && Number.isFinite(w.pos) && Number.isFinite(w.weight) && Number.isFinite(w.reps))
      .map((w) => ({ pos: w.pos, weight: w.weight, reps: w.reps, setType: w.setType ?? 'straight' }))
      .sort((a, b) => a.pos - b.pos),
  }));
  return {
    exercise: {
      id: p.exercise?.id ?? null,
      exerciseType: p.exercise?.exerciseType ?? 'weight_reps',
      category: p.exercise?.category ?? 'compound',
      incrementKg: Number.isFinite(p.exercise?.incrementKg) ? p.exercise.incrementKg : null,
      units: p.exercise?.units === 'lbs' ? 'lbs' : 'kg',
    },
    prescription: {
      repsMin, repsMax,
      startingWeight: Number.isFinite(p.prescription?.startingWeight) ? p.prescription.startingWeight : null,
    },
    senior: {
      isDeload: !!p.senior?.isDeload,
      deloadTargets: Array.isArray(p.senior?.deloadTargets) ? p.senior.deloadTargets : null,
      blockFinished: !!p.senior?.blockFinished,
      readinessTweak: p.senior?.readinessTweak ?? null,
      layoffDays: Number.isFinite(p.senior?.layoffDays) ? p.senior.layoffDays : null,
      reEntryEaseActive: !!p.senior?.reEntryEaseActive,
      readinessReductionActive: !!p.senior?.readinessReductionActive,
    },
    history,
    today: {
      working: (Array.isArray(p.today?.working) ? p.today.working : [])
        .filter((w) => w && Number.isFinite(w.pos) && Number.isFinite(w.weight) && Number.isFinite(w.reps))
        .map((w) => ({ pos: w.pos, weight: w.weight, reps: w.reps, setType: w.setType ?? 'straight' }))
        .sort((a, b) => a.pos - b.pos),
      overrideLoad: Number.isFinite(p.today?.overrideLoad) ? p.today.overrideLoad : null,
      overrideReps: Number.isFinite(p.today?.overrideReps) ? p.today.overrideReps : null,
    },
  };
}

// The factual same-position value from the single most recent history
// session, REGARDLESS of comparability (Law A: the reference row is never
// fabricated and never hidden just because the session wasn't comparable).
function referenceFor(history, posIndex) {
  const list = Array.isArray(history) ? history : [];
  if (!list.length) return null;
  const set = (list[0].working || []).find((w) => w.pos === posIndex);
  return set ? { weight: set.weight, reps: set.reps } : null;
}

function resolveConfidence({ comparableHistory, today, provenance }) {
  if (provenance === PROVENANCE.SENIOR_RECOVERY_HOLD) return 'high';
  if (provenance === PROVENANCE.USER_CHOICE_RESPECTED) return 'high';
  if (provenance === PROVENANCE.FIRST_TIME_BAND) return 'low';
  if (provenance === PROVENANCE.INSUFFICIENT_EVIDENCE) return 'low';
  const usable = discountOutliers(comparableHistory || []);
  const hasToday = !!(today?.working?.length);
  if (usable.length === 0) return hasToday ? 'medium' : 'low';
  if (usable.length === 1) return 'medium';
  const a = topLoadAndReps(usable[0]);
  const b = topLoadAndReps(usable[1]);
  if (a && b) {
    const ca = classifyReps(a.R_top, usable[0].band);
    const cb = classifyReps(b.R_top, usable[1].band);
    if (ca !== cb) return 'medium';
  }
  return 'high';
}

// §9.3 step 4: the working load for TODAY, in precedence order (user
// override > today's evidence with adjustWeaker/adjustStronger >
// nextSessionOpeningLoad). `sessionDriven: true` marks that an EXPLICIT
// today-evidence event fired (weaker/stronger/layoff/blockFinished/user
// override) — structure (§13) is skipped in that case because current-
// session evidence (§7 hierarchy tier 3) outranks stable structure (tier 4).
function determineWorkingLoad({ packet, comparableHistory, band, pos }) {
  const { today, senior, exercise } = packet;
  const opts = { incrementKg: exercise.incrementKg, units: exercise.units, category: exercise.category };

  if (today.overrideLoad != null) {
    return { L: today.overrideLoad, provenance: PROVENANCE.USER_CHOICE_RESPECTED, repsOverride: null, sessionDriven: true };
  }

  if (today.working.length > 0) {
    const L0 = today.working.reduce((m, s) => Math.max(m, s.weight), 0);

    const weaker = adjustWeaker({ today, band, comparableHistory, category: exercise.category });
    if (weaker.changed) {
      const L = weaker.drop
        ? Math.max(0, roundQuarter(weaker.basisWeight - resolveLoadIncrement(weaker.basisWeight, opts)))
        : L0;
      return { L, provenance: weaker.provenance, repsOverride: weaker.repsTargetOverride, sessionDriven: true };
    }

    const stronger = adjustStronger({ today, band, senior });
    if (stronger.changed) {
      const L = roundQuarter(L0 + resolveLoadIncrement(L0, opts));
      return { L, provenance: stronger.provenance, repsOverride: stronger.repsTargetOverride, sessionDriven: true };
    }

    // Default: hold at today's demonstrated load (§12.1's HOLD rule — never
    // reverts below today's evidence). Label CURRENT_SESSION_STRONGER only
    // when today's load genuinely beats what history alone shows at this
    // position (Law B actually engaged); otherwise it is ordinary
    // continuation, MATCH_LOAD_ADD_REP (scenario 20's noise case must NOT
    // flip labels merely because today has sets logged).
    const histRef = comparableHistory[0]?.working.find((w) => w.pos === pos && w.setType === 'straight');
    const halfInc = resolveLoadIncrement(L0, opts) / 2;
    const provenance = (histRef && L0 > histRef.weight + halfInc)
      ? PROVENANCE.CURRENT_SESSION_STRONGER
      : PROVENANCE.MATCH_LOAD_ADD_REP;
    return { L: L0, provenance, repsOverride: null, sessionDriven: false };
  }

  // No today evidence yet: senior opening-time overrides (§10.5 layoff,
  // §14 block-finished) come before the ordinary next-session gate. Both
  // are resolved the SAME way: never let the ADVANCE gate fire (cap at the
  // most recent session's top load), but still respect a genuine
  // consecutive-miss DROP (a real regression is not masked by "recovery"),
  // and still let back-off STRUCTURE apply (sessionDriven: false) so a
  // senior state's own hold composes with an existing back-off exactly the
  // way the un-flagged resolve would — the only guaranteed way to satisfy
  // "a senior flag never makes the prescription MORE aggressive" (Stage 14)
  // against every history shape, not only the common case where the
  // session's heaviest set happens to sit at position 1.
  if ((Number.isFinite(senior.layoffDays) && senior.layoffDays > 7) || senior.blockFinished) {
    const usable = discountOutliers(comparableHistory);
    const top = usable.length ? topLoadAndReps(usable[0]) : null;
    if (top && top.W > 0) {
      const opening = nextSessionOpeningLoad(comparableHistory, band, opts);
      const capped = opening.weight != null ? Math.min(opening.weight, top.W) : top.W;
      const isLayoff = Number.isFinite(senior.layoffDays) && senior.layoffDays > 7;
      return {
        L: capped,
        provenance: PROVENANCE.SENIOR_RECOVERY_HOLD,
        repsOverride: band.min,
        sessionDriven: false,
        seniorMultiplier: isLayoff ? 0.9 : null, // §10.5: layoff's flat 0.9 reduction; block-finished has none
      };
    }
  }

  const opening = nextSessionOpeningLoad(comparableHistory, band, opts);
  return { L: opening.weight, provenance: opening.provenance, repsOverride: null, sessionDriven: false };
}

/**
 * PURE, deterministic. Same packet + position in, same Prescription out,
 * always. Implements the §9.3 precedence pipeline exactly: senior deload
 * gate -> type gate -> first-time -> working-load determination -> back-off
 * structure shaping -> rep target -> readiness/layoff senior trim (LAST,
 * downward only) -> confidence + provenance + prefill.
 *
 * @param {object} packet    an evidence packet (assembleEvidencePacket output,
 *                           or any object matching its shape)
 * @param {number|{index:number,setType:string}} position  1-based set
 *                           position; a bare number defaults setType to
 *                           'straight'
 * @returns {{weight:(number|null), repsTarget:(number|null),
 *   repsBand:{min:number,max:number}, provenance:string,
 *   confidence:('high'|'medium'|'low'), prefill:boolean,
 *   reference:({weight:number,reps:number}|null)}}
 */
export function resolveSetPrescription(packet, position) {
  const p = normalizePacket(packet);
  const pos = normalizePosition(position);
  const band = { min: p.prescription.repsMin, max: p.prescription.repsMax };
  const comparableHistory = p.history.filter((s) => s.comparable);
  const referenceRow = referenceFor(p.history, pos.index);

  // 1. SENIOR: deload owns its session outright (Law F).
  if (p.senior.isDeload && Array.isArray(p.senior.deloadTargets) && p.senior.deloadTargets.length) {
    const idx = Math.max(0, Math.min(pos.index - 1, p.senior.deloadTargets.length - 1));
    const row = p.senior.deloadTargets[idx] || {};
    const w = Number.isFinite(row.weight) ? row.weight : null;
    const r = Number.isFinite(row.reps) ? row.reps : band.min;
    return {
      weight: w,
      repsTarget: r,
      repsBand: { ...band },
      provenance: PROVENANCE.SENIOR_RECOVERY_HOLD,
      confidence: 'high',
      prefill: true,
      reference: referenceRow,
    };
  }

  // 2. TYPE GATE (§15): excluded constructs get history only, no intelligence.
  const excludedExerciseType = p.exercise.exerciseType === 'duration' || p.exercise.exerciseType === 'distance';
  const excludedSetType = pos.setType === 'dropset' || pos.setType === 'myo_reps'
    || pos.setType === 'rest_pause' || pos.setType === 'warmup';
  if (excludedExerciseType || excludedSetType) {
    return {
      weight: null,
      repsTarget: band.min,
      repsBand: { ...band },
      provenance: PROVENANCE.INSUFFICIENT_EVIDENCE,
      confidence: 'low',
      prefill: false,
      reference: referenceRow,
    };
  }

  const noHistoryAtAll = p.history.length === 0;
  const noTodayEvidence = p.today.working.length === 0;

  // 3. FIRST-TIME: no history at all (never logged) AND nothing today.
  if (noHistoryAtAll && noTodayEvidence) {
    const sw = p.prescription.startingWeight;
    return {
      weight: sw != null ? sw : null,
      repsTarget: band.min,
      repsBand: { ...band },
      provenance: PROVENANCE.FIRST_TIME_BAND,
      confidence: 'low',
      prefill: sw != null,
      reference: null,
    };
  }

  // 4. WORKING LOAD (Laws B, G).
  const working = determineWorkingLoad({ packet: p, comparableHistory, band, pos: pos.index });
  let L = working.L;
  let provenance = working.provenance;

  // 5. STRUCTURE (Law E, §13): skipped when an explicit today-evidence event
  // already decided the load (§7: current-session evidence outranks
  // structure) or when the user's override is in force (Law G outranks both).
  if (p.today.overrideLoad == null && !working.sessionDriven && L != null) {
    const backoff = stableBackoffRatio(comparableHistory, pos.index);
    if (backoff) {
      L = roundQuarter(L * backoff.ratio);
      provenance = PROVENANCE.STABLE_BACKOFF_PATTERN;
    }
  }

  // 6. REP TARGET (§11 beat rule + §13 expected-curve prior).
  let repsTarget;
  if (working.repsOverride != null) {
    repsTarget = working.repsOverride;
  } else if (provenance === PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED || provenance === PROVENANCE.LOAD_DROP_CONSECUTIVE_MISS) {
    repsTarget = band.min; // fresh range at the new load
  } else if (provenance === PROVENANCE.INSUFFICIENT_EVIDENCE) {
    repsTarget = band.min;
  } else {
    const E = expectedReps({ pos: pos.index, comparableHistory, today: p.today, band, category: p.exercise.category });
    repsTarget = clamp(Math.min(E + 1, band.max), band.min, band.max);
  }

  // AMRAP positions: capability/load only, never a numeric rep target (§15).
  if (pos.setType === 'amrap') {
    repsTarget = null;
  }

  // 7. SENIOR TRIM: readiness/re-entry AND the layoff 0.9 factor, applied
  // LAST, downward only. Both trims are independent mechanisms (a genuine
  // training-gap layoff and a same-day readiness answer can coexist) so
  // they compose rather than picking one — unlike readiness/re-entry
  // easing, which share one magnitude and are never stacked upstream.
  const tweak = p.senior.readinessTweak;
  if (L != null && tweak && tweak.reduces && Number.isFinite(tweak.loadFactor) && tweak.loadFactor < 1) {
    L = applyDownwardLoadTrim(L, tweak.loadFactor);
  }
  if (L != null && Number.isFinite(working.seniorMultiplier) && working.seniorMultiplier < 1) {
    L = applyDownwardLoadTrim(L, working.seniorMultiplier);
  }

  // Bodyweight / reps-only law (CALC-5 / FR-C4-4, migrated here): weight
  // suggestions are NEVER produced for unloaded work, unconditionally last.
  if (p.exercise.exerciseType === 'reps_only') {
    L = null;
  }

  const confidence = resolveConfidence({ comparableHistory, today: p.today, provenance });

  let finalWeight = (L == null || !Number.isFinite(L)) ? null : Math.max(0, roundQuarter(L));
  // Ruling 1 (B-plus): LOW confidence never manufactures a recommendation —
  // it falls back to the factual last-actual reference instead.
  if (provenance === PROVENANCE.INSUFFICIENT_EVIDENCE && referenceRow) {
    finalWeight = referenceRow.weight;
  }

  const prefill = (excludedExerciseType || excludedSetType)
    ? false
    : (provenance === PROVENANCE.FIRST_TIME_BAND ? (finalWeight != null) : true);

  return {
    weight: finalWeight,
    repsTarget: repsTarget == null ? null : Math.round(repsTarget),
    repsBand: { ...band },
    provenance,
    confidence,
    prefill,
    reference: referenceRow,
  };
}
