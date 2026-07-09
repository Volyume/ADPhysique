/**
 * ProgressScanCoachEvidence v1
 * (`.volyume-audit/progress-photos/blueprints/future-coach-checkin-integration-blueprint.md` §8).
 *
 * A pure reshaping of what the existing out-of-engine resolver already has
 * at hand -- the bounded scan summary (`coachSummaryFromScan`, in
 * `progressScanAnalysis.js`) and that same scan's resolved coach note
 * (`resolveProgressScanCoachNote`, in `progressScanCoachResolver.js`) -- into
 * the versioned interface the blueprint specifies for LATER, founder-gated
 * integration work (check-in context, consistency checks, trend support).
 *
 * This module adds NO new data reads, NO new consumers, and NO behaviour
 * change: nothing in the app calls `buildProgressScanCoachEvidence` yet. It
 * exists so that whenever premium-later work is founder-approved, it reads
 * from ONE named, tested shape instead of reaching back into the resolver's
 * internals.
 *
 * `affectsTargets` is a hard-coded literal `false`, never a variable and
 * never derived, so flipping it can only happen by editing this exact line
 * -- the guard test pins the literal, not just the runtime value, so that
 * edit is loud by construction. `usedFor` is restricted to the single
 * currently-approved enum value; widening it is a founder-approved event,
 * not a refactor.
 *
 * Known gaps (documented, not silently filled in): the resolver never
 * receives per-asset capture-quality data -- lighting/blur/framing/pose/
 * segmentation/tilt live on `progress_scan_assets` rows, which neither
 * `coachSummaryFromScan` nor the resolver reads -- nor a scan id (the bounded
 * summary this reshapes is deliberately id-less) nor a baseline scan id.
 * Those fields are therefore always null here; populating them would need
 * new data plumbing, which is out of this wave's guarded-groundwork scope
 * (no new integration surfaces). `validityStatus` can only resolve to
 * 'scored', 'baseline' or 'not_comparable' from what reaches this layer --
 * the blueprint's 'scored_downgraded' and 'withheld' states are not
 * reachable here because a withheld or low-confidence scan already resolves
 * to a null `note` upstream (withheld behaves identically to absent, by
 * construction, before this function ever runs), so this function returns
 * null for it too rather than inventing a withheld representation.
 */
import { PHOTO_SCAN_SOURCE } from './progressScanAnalysis';

// The only usedFor value this evidence shape may ever carry today. Widening
// this enum is a founder-approved event (integration blueprint §8), never a
// side effect of a refactor; the guard test pins this exact array.
export const PROGRESS_SCAN_COACH_EVIDENCE_USED_FOR_VALUES = Object.freeze([
  'visual_trend_context_only',
]);

// Static safety-disclaimer strings coachSummaryFromScan always prepends to
// its `limitations` array (see progressScanAnalysis.js: coachSummaryFromScan).
// Strip these off before treating the remainder as setup/stability codes
// (e.g. 'large_body', 'side_pose_missing') for the `setupFindings` field.
const STATIC_LIMITATION_LABELS = new Set([
  'photo_scan_visual_context_only',
  'not_body_fat_estimate',
  'not_dexa_equivalent',
  'not_target_setting_input',
  'never_authoritative_for_safety_floors',
]);

function validityStatusFor(scan) {
  if (!scan) return null;
  if (scan.comparisonStatus === 'not_comparable') return 'not_comparable';
  if (scan.comparisonStatus !== 'comparable') return 'baseline';
  return 'scored';
}

/**
 * @param {object} args
 * @param {object|null} args.scan - coachSummaryFromScan's bounded summary
 *   (the same object passed into resolveProgressScanCoachNote as `scan`).
 * @param {object|null} args.note - resolveProgressScanCoachNote's return
 *   value for that same scan (null when suppressed/absent/low-confidence).
 * @returns {object|null} the v1 evidence shape, or null when there is
 *   nothing to represent -- mirrors the resolver: no scan, suppressed, and
 *   low-confidence/withheld scans all produce a null note upstream, so they
 *   produce null evidence here too (never a half-filled object).
 */
export function buildProgressScanCoachEvidence({ scan = null, note = null } = {}) {
  if (!scan || !note) return null;
  return {
    source: PHOTO_SCAN_SOURCE,
    // Always null today: the bounded summary this reshapes carries no scan
    // id (see module header "Known gaps").
    scanId: scan.scanId ?? scan.id ?? null,
    capturedAt: scan.capturedAt ?? null,
    // Display fields only (blueprint §8). Honour the same trendOnly hiding
    // the note already applied: when the note nulled the band/label for the
    // user's "hide exact numbers" preference, the evidence hides them too.
    score: note.leannessBand != null ? (scan.visualLeannessScore ?? null) : null,
    band: note.leannessBandLabel ?? null,
    confidenceTier: note.confidence ?? null,
    validityStatus: validityStatusFor(scan),
    // Always empty here: non-null evidence means, by construction, the
    // resolver did NOT withhold this scan. Representing a withheld scan's
    // actual reasons would need to run before the resolver nulls it out
    // (see module header) -- out of this wave's scope.
    withholdReasons: [],
    captureQuality: {
      lighting: null,
      blur: null,
      framing: null,
      pose: null,
      segmentation: null,
      tiltDegrees: null,
    },
    baselineScanId: null,
    trendWindow: {
      count: scan.comparableCount ?? 0,
      spanDays: null,
      direction: note.trendDirection ?? 'uncertain',
      magnitudePoints: scan.trendMagnitudePctPoints ?? null,
      comparableOnly: true,
    },
    setupFindings: Array.isArray(scan.limitations)
      ? scan.limitations.filter((code) => !STATIC_LIMITATION_LABELS.has(code))
      : [],
    usedFor: note.usedFor ?? 'visual_trend_context_only',
    affectsTargets: false,
  };
}
