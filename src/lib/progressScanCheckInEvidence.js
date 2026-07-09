/**
 * ProgressScanCheckInEvidence v2 (`.volyume-audit/progress-scan-coach-worldclass/
 * integration-plan.md` §2-§4, §7).
 *
 * A pure evidence/receipt layer composed AROUND the deterministic coaching
 * engine, never inside it. `runWeeklyCoach`, `coachApply`, `nutritionEngine`
 * and `planEngine` stay scan-free (the byte-identical engine guard --
 * `progressScanSafetyFloorIsolation.test.js`, "runWeeklyCoach output is
 * identical with and without scan evidence present in the inputs" -- remains
 * valid and untouched). This module reads the engine's OWN outputs
 * (`weightTrend`, `goalPhase`, `heldDecisions`) and the existing v1
 * `ProgressScanCoachEvidence` object (`progressScanCoachEvidence.js`) and
 * produces a deterministic classification + calm receipt describing how the
 * scan sat alongside the week's decision. It never sets, reads or implies a
 * calorie, macro or target value; `affectsTargets` is a hard-coded literal
 * `false`, never a variable or expression (source-guard-pinned, mirroring
 * the v1 module's own convention).
 *
 * No I/O, no store access, no engine imports, no `Date.now()` -- every
 * timestamp is an explicit parameter (`nowMs`). Pure function in, pure
 * object out.
 *
 * ── Real vocabularies this module was built against (inspected, not
 * guessed; see integration-plan.md §2 "read the source" discipline) ──
 *
 * v1 evidence (`progressScanCoachEvidence.js`, `validityStatusFor`):
 * `validityStatus` resolves to 'scored' | 'baseline' | 'not_comparable', or
 * the whole evidence object is `null` (a suppressed, absent, or
 * `confidence: 'not_enough'` scan collapses to null note upstream, so v1
 * evidence is null too -- see that module's header, "Known gaps"). A
 * `'withheld'` validityStatus is therefore NOT reachable via the real
 * producer chain today; this module still checks for it (rule b below) so a
 * future v1 wave that preserves withheld evidence does not silently fall
 * through -- documented as defensive/unreached, exercised only via a
 * constructed test fixture, exactly like the v1 module documents its own
 * unreachable states rather than inventing them.
 *
 * `confidenceTier` (`progressScanAnalysis.js` `SCAN_CONFIDENCE_RANK`): the
 * real vocabulary is 'high' (3) | 'moderate' (2) | 'low' (1) | 'not_enough'
 * (0) | 'unknown' (0). Only 'high' and 'moderate' are eligible tiers per the
 * integration plan ("scored, High/Moderate tier"); everything else --
 * 'low', 'not_enough', 'unknown', or missing -- fails closed into
 * `low_confidence`.
 *
 * `trendWindow.direction` (v1 evidence, sourced from
 * `resolveProgressScanCoachNote`'s `note.trendDirection`, itself
 * `scan.trendDirection`): the real vocabulary is 'down' (leaner/positive
 * visual change) | 'up' (softer/drift to watch) | 'steady' | 'uncertain'
 * (see `progressScanAnalysis.js` around the `visualTrendDirection` ->
 * `trendDirection` mapping: 'leaner' -> 'down', 'softer' -> 'up').
 *
 * `goalPhase` (`weeklyCoach.js` JSDoc + `PHASE_LANDMARKS`): the real
 * vocabulary is 'mild_cut' | 'recomp' | 'maint' | 'mild_bulk' | 'mod_bulk',
 * plus a 'bulk' alias for 'mod_bulk' (`PHASE_ALIASES`). This module cannot
 * import `weeklyCoach.js` (source-guarded), so it mirrors the alias and the
 * SIGN of each phase's `goalRatePct` locally, with the real numbers cited in
 * `GOAL_PHASE_WEIGHT_DIRECTION` below rather than re-derived.
 *
 * `weightTrend` (`runWeeklyCoach` output `trend` field): shape
 * `{ ewma7, delta, deltaLabel, onTarget, rateLabel }`; `delta` is the
 * week-over-week EWMA change in kg (or null when there is not enough
 * morning-weight data yet).
 *
 * `loadSignal` (`runWeeklyCoach` top-level output): the real vocabulary is
 * 'reduce' | 'hold' | 'progress' (a training-load-progression signal, not a
 * body-composition reading). See the "performance conflictSource" note
 * below `classifyAgainstWeightAndGoal` for why this module accepts but does
 * not use it for classification.
 *
 * `heldDecisions` (`runWeeklyCoach` output): an array of
 * `{ type, reason }`; a `type: 'calories'` entry means the calorie target
 * was held (not changed) this run.
 */

// ── Frozen enums (integration-plan.md §4) ──────────────────────────────────

export const PROGRESS_SCAN_EVIDENCE_STATUS = Object.freeze([
  'no_scan_ever',
  'no_recent_scan',
  'valid',
  'low_confidence',
  'withheld',
  'not_comparable',
  'baseline',
]);

export const PROGRESS_SCAN_ASSESSMENT = Object.freeze([
  'supports',
  'conflicts',
  'visual_change_weight_stable',
  'inconclusive',
  'not_used',
  'insufficient_data',
]);

const MS_PER_DAY = 86400000;

// Mirrors weightTrend.js's isDiverging() maintain-goal floor: "1.5x the
// expected magnitude, with a 0.25 kg/week absolute floor so a maintain goal
// still has a sane band" (src/lib/weightTrend.js, isDiverging()). That floor
// is the closest existing "this counts as flat, not a real move" threshold
// in the codebase, so this module reuses the same number rather than
// inventing a new one. Below this magnitude, a week's weight change reads
// as a plateau, not a gain or a loss.
const WEIGHT_FLAT_BAND_KG = 0.25;

// Mirrors weeklyCoach.js PHASE_ALIASES (source inspected, not re-imported --
// this module stays engine-import-free by source guard).
const GOAL_PHASE_ALIASES = { bulk: 'mod_bulk' };

// Mirrors the SIGN of weeklyCoach.js PHASE_LANDMARKS' goalRatePct (source
// inspected: mild_cut -0.375, recomp -0.125, maint 0, mild_bulk 0.1875,
// mod_bulk 0.375 -- all isCut/isBulk-consistent). recomp carries a real,
// smaller deficit than mild_cut, so its weight expectation is 'losing', not
// 'flat', even though recomp is deliberately not a cut (weeklyCoach.js
// comment: "recomp is deliberately NOT a cut").
const GOAL_PHASE_WEIGHT_DIRECTION = {
  mild_cut: 'losing',
  recomp: 'losing',
  maint: 'flat',
  mild_bulk: 'gaining',
  mod_bulk: 'gaining',
};

// Per integration-plan.md §3 / founder instruction: cut -> leaner,
// gain -> fuller, maintain/recomp -> stable or leaner. recomp's visual bar
// is deliberately generous (stable OR leaner) even though its weight
// expectation above is 'losing' -- a plateaued scale with visibly leaner
// photos is recomp's own defining shape, not a contradiction (see
// classifyAgainstWeightAndGoal's 'visual_change_weight_stable' branch).
const GOAL_PHASE_VISUAL_EXPECTATION = {
  mild_cut: 'leaner',
  recomp: 'stable_or_leaner',
  maint: 'stable_or_leaner',
  mild_bulk: 'fuller',
  mod_bulk: 'fuller',
};

function expectationFor(goalPhase) {
  const key = GOAL_PHASE_ALIASES[goalPhase] ?? goalPhase;
  return {
    weight: GOAL_PHASE_WEIGHT_DIRECTION[key] ?? GOAL_PHASE_WEIGHT_DIRECTION.maint,
    visual: GOAL_PHASE_VISUAL_EXPECTATION[key] ?? GOAL_PHASE_VISUAL_EXPECTATION.maint,
  };
}

function classifyWeightDirection(delta) {
  if (!Number.isFinite(delta)) return 'unknown';
  if (delta <= -WEIGHT_FLAT_BAND_KG) return 'losing';
  if (delta >= WEIGHT_FLAT_BAND_KG) return 'gaining';
  return 'flat';
}

// trendWindow.direction ('down'|'up'|'steady'|'uncertain') -> a
// body-composition-flavoured direction. 'down' means the scan's leanness
// signals moved toward leaner (progressScanAnalysis.js: visualTrendDirection
// 'leaner' -> trendDirection 'down'); 'up' means softer/fuller.
function classifyScanDirection(direction) {
  if (direction === 'down') return 'leaner';
  if (direction === 'up') return 'fuller';
  if (direction === 'steady') return 'stable';
  return 'unknown';
}

function visualMatches(scanDirection, expectedVisual) {
  if (expectedVisual === 'stable_or_leaner') return scanDirection === 'stable' || scanDirection === 'leaner';
  return scanDirection === expectedVisual;
}

const SIGN = { losing: -1, leaner: -1, flat: 0, stable: 0, gaining: 1, fuller: 1 };

/**
 * Compares the scan's trend direction against the engine's own weight trend
 * and the goal phase's expectation. Deterministic, ordered per
 * integration-plan.md §4/§7:
 *   1. Direct contradiction (scale and photos point opposite ways) ->
 *      'conflicts', conflictSource 'scale'. Weight and intake always win the
 *      decision; the scan is kept only as context.
 *   2. Both weight and the scan match what the goal phase expects ->
 *      'supports'.
 *   3. The scale has plateaued relative to what the goal expects, but the
 *      scan still moves the way the goal wants -> 'visual_change_weight_stable'
 *      (the recomposition read).
 *   4. Anything else (including either signal being unreadable) ->
 *      'inconclusive'. This never happens on thin trend-window data -- that
 *      is filtered out one level up, before this function is ever called.
 *
 * Performance conflictSource (integration-plan.md §7 pattern 3) is
 * deliberately NOT implemented. `loadSignal`'s real vocabulary
 * ('reduce'|'hold'|'progress', see weeklyCoach.js) describes training-load
 * progression, not a body-composition direction -- there is no deterministic
 * mapping from "training load was reduced" to "the scan's leaner/fuller
 * reading is strongly contradicted" that is not an invented rule. Per the
 * integration brief's own instruction not to invent semantics, this module
 * always returns conflictSource 'scale' or null, never 'performance'.
 * `buildScanEvidencePacket` still accepts `loadSignal` in its signature (for
 * forward-compatible call sites and so the parameter list matches the
 * integration plan) but does not read it.
 */
function classifyAgainstWeightAndGoal({ scanDirection, weightTrend, goalPhase }) {
  const scanDir = classifyScanDirection(scanDirection);
  const weightDir = classifyWeightDirection(weightTrend?.delta);

  if (scanDir === 'unknown' || weightDir === 'unknown') {
    return { assessment: 'inconclusive', conflictSource: null };
  }

  const weightSign = SIGN[weightDir];
  const scanSign = SIGN[scanDir];
  const directContradiction = weightSign !== 0 && scanSign !== 0 && weightSign !== scanSign;
  if (directContradiction) {
    return { assessment: 'conflicts', conflictSource: 'scale' };
  }

  const expectation = expectationFor(goalPhase);
  const weightMatchesGoal = weightDir === expectation.weight;
  const visualMatchesGoal = visualMatches(scanDir, expectation.visual);

  if (weightMatchesGoal && visualMatchesGoal) {
    return { assessment: 'supports', conflictSource: null };
  }

  if (weightDir === 'flat' && expectation.weight !== 'flat' && visualMatchesGoal) {
    return { assessment: 'visual_change_weight_stable', conflictSource: null };
  }

  return { assessment: 'inconclusive', conflictSource: null };
}

// ── Receipts (integration-plan.md §7, verbatim copy) ────────────────────────

// Reuses progressScanCoachResolver.js's decisionLine() non-authority wording
// (its calorie-adjustment branch) so the same sentence appears wherever the
// app already tells the user this scan never sets targets.
const NON_AUTHORITY_SENTENCE = 'The weekly target still comes from your logs, weight trend, training and recovery, not from this scan.';

const TARGETS_CHANGED_SENTENCE = 'Your scan was considered as context. Targets changed because of your logged trend, not the scan.';
const TARGETS_HELD_SENTENCE = 'Your scan was considered as context. Targets were held based on your logged data, for the reasons above.';

function baseReceiptFor(status, assessment) {
  if (status === 'no_scan_ever' || status === 'no_recent_scan') {
    return { headline: 'No comparable photo set this period.', detail: 'The coach worked from your logged data.' };
  }
  if (status === 'withheld') {
    return { headline: 'No usable photo read this week.', detail: 'Your plan comes from your logs as usual.' };
  }
  if (status === 'low_confidence') {
    return { headline: 'Your recent photo set could not be read with confidence, so it was not used.', detail: 'Your plan comes from your logs as usual.' };
  }
  if (status === 'not_comparable') {
    return { headline: 'This photo set was not comparable with your earlier sets, so it was kept as a record rather than evidence.', detail: null };
  }
  if (status === 'baseline') {
    // No single existing string in the results contract states this exact
    // framing (progressScanAnalysis.js has "This is your baseline scan...",
    // progressCaptureGuide.js has "These become your reference set." for the
    // capture flow) -- this blends that established "reference set" wording
    // into the fallback the integration plan specifies rather than inventing
    // new vocabulary.
    return { headline: 'This is your reference set. Future comparable sets will show change against it.', detail: null };
  }
  if (status === 'valid') {
    if (assessment === 'supports') {
      return { headline: 'Your photo trend points the same way as your weight trend.', detail: 'Targets are set from your logged data.' };
    }
    if (assessment === 'conflicts') {
      return { headline: 'Your photo trend and scale trend disagree this week.', detail: 'The coach used weight and intake for the decision and kept the scan as context.' };
    }
    if (assessment === 'visual_change_weight_stable') {
      return { headline: 'Your scale trend is steady while your photos suggest visual change. That can happen during recomposition.', detail: 'Targets are set from your logged data.' };
    }
    // assessment === 'inconclusive' (either the thin-trend-window gate one
    // level up, or classifyAgainstWeightAndGoal's own catch-all). Detail is
    // deliberately null here -- see buildScanEvidenceReceipt, which fills it
    // from targetsChanged/heldDecisions when that context is available.
    return { headline: 'The photo read was inconclusive this week, so it was set aside.', detail: null };
  }
  // Defensive fallback for an unrecognised status; reads identically to
  // "no scan this period" rather than throwing or fabricating copy.
  return { headline: 'No comparable photo set this period.', detail: 'The coach worked from your logged data.' };
}

// heldDecisions entries are { type, reason } (weeklyCoach.js). A
// type: 'calories' entry means the calorie target was held, not changed,
// this run. Used only as a fallback when the caller does not pass an
// explicit targetsChanged boolean.
function resolveTargetsChanged({ targetsChanged, heldDecisions } = {}) {
  if (typeof targetsChanged === 'boolean') return targetsChanged;
  if (Array.isArray(heldDecisions) && heldDecisions.some((d) => d && d.type === 'calories')) return false;
  return null;
}

/**
 * Builds the receipt for an already-classified packet. Exported separately
 * from `buildScanEvidencePacket` (which calls this internally to populate
 * `packet.receipt`) so a consumer that learns `targetsChanged`/
 * `heldDecisions` later -- or from a different source, e.g. CoachOutputScreen
 * reading `output.adjustments.calories.change` -- can recompute the receipt
 * for the same packet without reclassifying the scan.
 *
 * @param {object} packet - must carry at least `status` and `assessment`
 *   (the shape `buildScanEvidencePacket` returns).
 * @param {object} [context]
 * @param {boolean} [context.targetsChanged]
 * @param {Array}   [context.heldDecisions]
 * @returns {{headline: string, detail: (string|null), usedSentence: string}}
 */
export function buildScanEvidenceReceipt(packet, { targetsChanged, heldDecisions } = {}) {
  const status = packet?.status ?? null;
  const assessment = packet?.assessment ?? null;
  const { headline, detail } = baseReceiptFor(status, assessment);

  let finalDetail = detail;
  // Patterns 7 and 8 (integration-plan.md §7): whenever a valid scan was
  // considered and the caller knows whether targets changed, the detail states
  // explicitly that the change (or hold) came from Coach rules over logged
  // data, not the scan. This matters most for 'supports': a user who sees
  // targets change right after a supportive scan could otherwise infer the
  // scan drove the change. 'conflicts' keeps its mandated hierarchy sentence,
  // which already attributes the decision to weight and intake.
  if (status === 'valid' && assessment !== 'conflicts') {
    const resolved = resolveTargetsChanged({ targetsChanged, heldDecisions });
    if (resolved === true) finalDetail = TARGETS_CHANGED_SENTENCE;
    else if (resolved === false) finalDetail = TARGETS_HELD_SENTENCE;
  }

  return { headline, detail: finalDetail, usedSentence: NON_AUTHORITY_SENTENCE };
}

/**
 * Builds the v2 evidence packet (integration-plan.md §4).
 *
 * @param {object} args
 * @param {object|null} args.evidence - the v1 `ProgressScanCoachEvidence`
 *   object (`buildProgressScanCoachEvidence`), or null.
 * @param {object|null} args.weightTrend - `runWeeklyCoach` output's `trend`
 *   field, `{ ewma7, delta, deltaLabel, onTarget, rateLabel }`, or null.
 * @param {string} [args.goalPhase] - `runWeeklyCoach` output's `goalPhase`.
 * @param {boolean} [args.targetsChanged] - passed straight through to the
 *   internal receipt build; see `buildScanEvidenceReceipt`.
 * @param {Array} [args.heldDecisions] - `runWeeklyCoach` output's
 *   `heldDecisions`; see `buildScanEvidenceReceipt`.
 * @param {string} [args.loadSignal] - accepted, not used; see
 *   `classifyAgainstWeightAndGoal`'s performance-conflictSource note.
 * @param {number} args.nowMs - explicit clock read (epoch ms). This module
 *   never calls Date.now().
 * @param {number} [args.windowDays=10] - how many days back from `nowMs` a
 *   scan still counts as "this check-in period".
 * @returns {object} the v2 packet.
 */
export function buildScanEvidencePacket({
  evidence = null,
  weightTrend = null,
  goalPhase = 'maint',
  targetsChanged,
  heldDecisions,
  loadSignal,
  nowMs,
  windowDays = 10,
} = {}) {
  // Accepted for parity with the integration plan's signature and future
  // producers; intentionally unused today (see classifyAgainstWeightAndGoal).
  void loadSignal;

  const windowMs = windowDays * MS_PER_DAY;
  const withinWindow = !!evidence
    && Number.isFinite(evidence.capturedAt)
    && Number.isFinite(nowMs)
    && (nowMs - evidence.capturedAt) <= windowMs;

  let status;
  let assessment;
  let eligibleForAssessment = false;
  let conflictSource = null;

  if (!evidence) {
    // Rule (a): the null-contract. `evidence` null carries no signal that a
    // scan was ever attempted and withheld -- absent any other information,
    // this reads as "never scanned" rather than guessing at a withheld or
    // suppressed state the caller did not report.
    status = 'no_scan_ever';
    assessment = 'insufficient_data';
  } else if (!withinWindow) {
    // Rule (a), second half: a scan exists (or its capturedAt could not be
    // read against the window) but is not recent enough for this check-in.
    status = 'no_recent_scan';
    assessment = 'not_used';
  } else if (evidence.validityStatus === 'withheld') {
    // Rule (b) -- see the module header for why this is currently
    // unreachable via the real v1 producer chain, kept for forward
    // compatibility and contract completeness.
    status = 'withheld';
    assessment = 'not_used';
  } else if (evidence.confidenceTier !== 'high' && evidence.confidenceTier !== 'moderate') {
    // Rule (c): positive allow-list (only High/Moderate are eligible tiers,
    // per integration-plan.md §4's "scored, High/Moderate tier"). Catches
    // 'low' (genuinely reachable), and 'not_enough'/'unknown'/missing
    // (defensive -- see module header on SCAN_CONFIDENCE_RANK).
    status = 'low_confidence';
    assessment = 'not_used';
  } else if (evidence.validityStatus === 'not_comparable') {
    // Rule (d), first half.
    status = 'not_comparable';
    assessment = 'not_used';
  } else if (evidence.validityStatus === 'baseline') {
    // Rule (d), second half: a first set is a reference, never evidence of
    // direction.
    status = 'baseline';
    assessment = 'inconclusive';
  } else {
    // evidence.validityStatus === 'scored', tier High/Moderate, in-window.
    status = 'valid';
    const tw = evidence.trendWindow || {};
    const thinData = !(Number(tw.count) >= 3) || tw.comparableOnly !== true || !tw.direction || tw.direction === 'uncertain';
    if (thinData) {
      // Rule (e): never declare a conflict on fewer than 3 comparable
      // points (mirrors the accuracy-gate rule: no conflict on thin data).
      assessment = 'inconclusive';
    } else {
      // Rule (f): full classification. eligibleForAssessment reflects the
      // scan's DATA-QUALITY gates only (scored, High/Moderate tier,
      // comparable, in-window, count >= 3) -- it stays true even if the
      // classification itself lands on 'inconclusive' below, because the
      // scan itself was good enough to be considered.
      eligibleForAssessment = true;
      const result = classifyAgainstWeightAndGoal({ scanDirection: tw.direction, weightTrend, goalPhase });
      assessment = result.assessment;
      conflictSource = result.conflictSource;
    }
  }

  const receipt = buildScanEvidenceReceipt({ status, assessment }, { targetsChanged, heldDecisions });

  return {
    version: 2,
    status,
    assessment,
    eligibleForAssessment,
    score: evidence?.score ?? null,
    band: evidence?.band ?? null,
    confidenceTier: evidence?.confidenceTier ?? null,
    capturedAt: evidence?.capturedAt ?? null,
    withholdReasons: evidence?.withholdReasons ?? [],
    trendWindow: evidence?.trendWindow ?? null,
    validityStatus: evidence?.validityStatus ?? null,
    conflictSource,
    receipt,
    usedFor: 'progress_assessment_context',
    affectsTargets: false,
  };
}
