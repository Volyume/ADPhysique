// progressScanResultsContract.js — progress-photos wave 3 (results-ui-and-copy
// blueprint, governing; scoring-accuracy-and-validation-blueprint.md §5/§9).
//
// Presentation-only pure view-model. Reads the engine's already-computed
// tier/reason/setup-finding codes (progressScanAnalysis.js) and turns them
// into the RENDERED CONTRACT the results blueprint requires: what a caller is
// ALLOWED to show for a confidence tier, plus the calm receipt sentence + Why?
// lines built from existing reason codes. No maths, no thresholds, no new
// reason codes; zero engine changes. Every UI surface that renders a score
// (the timeline "score row", the compare summary, the trend view) is meant to
// build its rendered strings through this module and progressScanTrendViewModel.js,
// so the tier contract is enforced in exactly one place.
import {
  scanSetupStability,
} from './progressScanAnalysis';
import {
  formatVolyumeScore,
  progressScanAssessmentForDisplay,
} from './progressScanDisplay';

// Fixed chip label set (results-ui-and-copy-blueprint.md §2). An unknown or
// missing tier renders as "Not enough confidence" (scoring blueprint §5: "A
// score with an unknown tier renders as the Not-enough state").
export const CONFIDENCE_CHIP_LABEL = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
  not_enough: 'Not enough confidence',
};

const KNOWN_TIERS = new Set(['high', 'moderate', 'low', 'not_enough']);

export function confidenceChipLabel(tier) {
  return CONFIDENCE_CHIP_LABEL[tier] || CONFIDENCE_CHIP_LABEL.not_enough;
}

// Resolves the tier the engine computed, folding any unrecognised/missing
// value down to 'not_enough' (never rendered as if it were a real tier).
export function resolveConfidenceTier(scan) {
  const assessment = progressScanAssessmentForDisplay(scan);
  const tier = assessment?.scanConfidenceTier;
  return KNOWN_TIERS.has(tier) ? tier : 'not_enough';
}

// The rendered contract for a single scan's score (scoring-accuracy-and-
// validation-blueprint.md §5 table), reflected here as booleans a caller
// checks before rendering, plus the accessibility label that always carries
// the tier alongside the score (results blueprint §8).
//
// `revealed` is caller-owned state (per-scan "Show score anyway" toggle for
// the Low tier); this function never persists it.
export function buildScoreTierContract(scan, { suppressed = false, revealed = false } = {}) {
  const assessment = progressScanAssessmentForDisplay(scan);
  const hasNumericScore = assessment?.visualLeannessScore != null;
  const bandLabel = assessment?.leannessBandLabel || null;
  const scoreText = hasNumericScore ? formatVolyumeScore(assessment.visualLeannessScore) : null;

  if (suppressed) {
    return {
      tier: null,
      chipLabel: null,
      hasNumericScore,
      bandLabel: null,
      scoreText: null,
      showScore: false,
      showBand: false,
      showTrendDirection: false,
      showTrendSize: false,
      requiresRevealAffordance: false,
      revealed: false,
      caveatText: null,
      accessibilityLabel: 'Score hidden.',
    };
  }

  if (!hasNumericScore) {
    const chipLabel = confidenceChipLabel('not_enough');
    return {
      tier: 'not_enough',
      chipLabel,
      hasNumericScore: false,
      bandLabel: null,
      scoreText: null,
      showScore: false,
      showBand: false,
      showTrendDirection: false,
      showTrendSize: false,
      requiresRevealAffordance: false,
      revealed: false,
      caveatText: null,
      accessibilityLabel: `${chipLabel}. No score available.`,
    };
  }

  const tier = resolveConfidenceTier(scan);

  if (tier === 'not_enough') {
    const chipLabel = confidenceChipLabel('not_enough');
    return {
      tier,
      chipLabel,
      hasNumericScore: true,
      bandLabel,
      scoreText: null,
      showScore: false,
      showBand: false,
      showTrendDirection: false,
      showTrendSize: false,
      requiresRevealAffordance: false,
      revealed: false,
      caveatText: null,
      accessibilityLabel: `${chipLabel}. No score available.`,
    };
  }

  if (tier === 'low') {
    const chipLabel = confidenceChipLabel('low');
    const show = !!revealed;
    return {
      tier,
      chipLabel,
      hasNumericScore: true,
      bandLabel,
      scoreText,
      showScore: show,
      showBand: true,
      showTrendDirection: false,
      showTrendSize: false,
      requiresRevealAffordance: true,
      revealed: show,
      caveatText: show
        ? 'This score has low confidence. The band and reasons above are the steadier read.'
        : null,
      accessibilityLabel: show
        ? `Volyume Score ${scoreText}, ${chipLabel}.`
        : `${bandLabel ? `${bandLabel} band. ` : ''}${chipLabel}. Score available behind a show-anyway control.`,
    };
  }

  const chipLabel = confidenceChipLabel(tier);
  const showTrendSize = tier === 'high';
  return {
    tier,
    chipLabel,
    hasNumericScore: true,
    bandLabel,
    scoreText,
    showScore: true,
    showBand: true,
    showTrendDirection: true,
    showTrendSize,
    requiresRevealAffordance: false,
    revealed: true,
    caveatText: null,
    accessibilityLabel: `Volyume Score ${scoreText}, ${chipLabel}.`,
  };
}

// ── Receipts (scoring-accuracy-and-validation-blueprint.md §9) ─────────────
// Condition-blaming, never person-blaming (safety-privacy-blueprint.md §2):
// every line names the PHOTO/CONDITION, never "you" or "your body".
const REASON_LINES = {
  missing_required_pose: 'Front and back photos are both needed to score a set.',
  model_unavailable: 'The photo reader was not available for these photos.',
  measured_signals_incomplete: 'The measured signals were not complete enough for a useful score.',
  no_person_detected: 'A person could not be detected clearly enough in one of the photos.',
  native_preprocess_unavailable: 'The photo outline could not be read on this device.',
  native_preprocess_shape_unusable: 'The photo outline could not be read reliably.',
  mask_shape_unusable: 'The photo outline could not be read reliably.',
  too_dark: 'One of the photos was too dark to read reliably. Even front light will fix this next time.',
  too_blurry: 'One of the photos was too blurry to read reliably.',
  whole_body_not_visible: 'The whole body was not visible in one of the photos.',
  multiple_people: 'More than one person was visible in one of the photos.',
  pose_not_clear: 'The pose was not clear enough in one of the photos.',
  estimate_out_of_range: 'The photo read fell outside a usable range.',
  duplicate_pose_content: 'Two poses used the same photo, so this set was not scored. Retake each pose separately and the set will score.',
  segmentation_low_confidence: 'The outline was less clear than usual in one of the photos.',
  clothing_or_background_uncertain: 'Clothing or background made the outline less certain.',
  camera_tilted: 'The camera was tilted more than usual.',
};

// scanSetupStability issues are pose-prefixed (e.g. "front_lighting_changed");
// strip the pose and phrase the remainder as the "Confidence is lower this
// time because..." sentence family (results blueprint §2, §6).
const SETUP_ISSUE_PHRASES = {
  lighting_changed: 'the lighting changed between sets',
  framing_changed: 'the framing changed between sets',
  outline_confidence_changed: 'the outline was less clear in one of the sets',
  camera_angle_changed: 'the camera angle changed between sets',
  camera_distance_changed: 'the camera distance changed between sets',
  body_position_changed: 'your position in frame changed between sets',
  camera_height_changed: 'the camera height changed between sets',
  camera_facing_changed: 'the camera switched between the front and rear lens between sets',
};

function reasonCodesToLines(codes = []) {
  const seen = new Set();
  const lines = [];
  for (const code of codes || []) {
    const line = REASON_LINES[code];
    if (line && !seen.has(line)) { seen.add(line); lines.push(line); }
  }
  return lines;
}

function setupIssuesToLines(issues = []) {
  const seen = new Set();
  const lines = [];
  for (const issue of issues || []) {
    const suffix = String(issue).replace(/^(front|back|side)_/, '');
    const phrase = SETUP_ISSUE_PHRASES[suffix];
    if (!phrase) continue;
    const line = `Confidence is lower this time because ${phrase}.`;
    if (!seen.has(line)) { seen.add(line); lines.push(line); }
  }
  return lines;
}

function collectReasonCodes(scan) {
  return [
    ...(Array.isArray(scan?.abstentionReasons) ? scan.abstentionReasons : []),
    ...(Array.isArray(scan?.signals?.abstentionReasons) ? scan.signals.abstentionReasons : []),
  ];
}

function collectQualityWarnings(scan) {
  return [
    ...(Array.isArray(scan?.qualityWarnings) ? scan.qualityWarnings : []),
    ...(Array.isArray(scan?.signals?.qualityWarnings) ? scan.signals.qualityWarnings : []),
  ];
}

// The receipt shape from scoring-accuracy-and-validation-blueprint.md §9,
// rendered as one calm sentence (reusing the engine's own already-calm
// copySummary/deltaExplanation text, tested elsewhere) plus a "Why?"
// expansion built fresh here from reason/setup-finding codes. `previousScan`
// is optional; when supplied (the chronologically preceding scan), setup
// drift codes are available for the Why? lines.
export function buildScanReceipt(scan, { previousScan = null } = {}) {
  const assessment = progressScanAssessmentForDisplay(scan);
  const hasScore = assessment?.visualLeannessScore != null;
  const comparisonStatus = scan?.deltaExplanation?.comparisonStatus ?? null;
  const abstentionReasons = collectReasonCodes(scan);
  const qualityWarnings = collectQualityWarnings(scan);

  if (!hasScore) {
    return {
      outcome: 'withheld',
      sentence: scan?.copySummary
        || 'Progress photos saved. Volyume could not create a useful score from it yet.',
      whyLines: reasonCodesToLines(abstentionReasons.length ? abstentionReasons : qualityWarnings),
    };
  }

  if (comparisonStatus === 'baseline') {
    return {
      outcome: 'baseline',
      sentence: 'Your starting set is saved. Take your next set the same way, at least a week from now, to unlock comparison.',
      whyLines: [],
    };
  }

  if (comparisonStatus === 'not_comparable') {
    const setup = previousScan ? scanSetupStability(scan, previousScan) : null;
    return {
      outcome: 'not_comparable',
      sentence: scan?.deltaExplanation?.summary
        || 'This photo set is saved, but the setup changed too much for a fair comparison.',
      whyLines: setup?.issues?.length ? setupIssuesToLines(setup.issues) : [],
    };
  }

  const tier = resolveConfidenceTier(scan);
  const downgraded = tier === 'low' || tier === 'not_enough' || assessment?.anchorEngaged === true;
  const setup = previousScan ? scanSetupStability(scan, previousScan) : null;
  const whyLines = [
    ...(setup?.issues?.length ? setupIssuesToLines(setup.issues) : []),
    ...reasonCodesToLines(qualityWarnings),
  ];

  return {
    outcome: downgraded ? 'scored_downgraded' : 'scored',
    sentence: scan?.copySummary || scan?.deltaExplanation?.summary || 'Photo set scored.',
    whyLines,
  };
}

// ── Recalibration note (results-ui-and-copy-blueprint.md §1) ───────────────
// normaliseStoredPhysiqueAssessment (progressScanAnalysis.js, wave 1) marks a
// version-migrated assessment with one of these two indexInputs flags; this
// reads that mark only, it never recomputes or alters the score.
export function isRecalibratedAssessment(assessment) {
  const inputs = assessment?.indexInputs;
  return !!(inputs && (
    inputs.displayScoreCalibratedFrom != null
    || inputs.displayScoreRecoveredFromStoredRawScore != null
  ));
}

export const RECALIBRATION_NOTE_TEXT = 'Scores were recalibrated in an update. Your photos are unchanged.';

// ── Meaning moment (results-ui-and-copy-blueprint.md §1, exact copy) ───────
export const MEANING_MOMENT_TITLE = 'Before your first score';
export const MEANING_MOMENT_BODY = 'The Volyume Score is a progress read from your own photos. '
  + 'It is not a body fat measurement, a medical assessment, or a comparison with anyone else.';
export const MEANING_MOMENT_BUTTON = 'Understood';
