// Wave 3 scored-surface tone contract (safety-privacy-blueprint.md §1, word
// lists are law). Extends the house banned-word-regex pattern (the existing
// ProgressPhotoCompare contract) to every calm sentence, Why? line,
// accessibility label and caveat this wave's NEW copy-generating functions can
// produce, across a wide sweep of tiers/outcomes/reason codes. Down-trend and
// low-confidence paths are exercised exactly like everything else: the safety
// blueprint requires the SAME neutral structure, never a softer or harsher one.
import {
  buildScanReceipt,
  buildScoreTierContract,
  confidenceChipLabel,
  MEANING_MOMENT_BODY,
  MEANING_MOMENT_BUTTON,
  MEANING_MOMENT_TITLE,
  RECALIBRATION_NOTE_TEXT,
} from '../progressScanResultsContract';
import { trendLadderLabel, TREND_EMPTY_STATE_TEXT } from '../progressScanTrendViewModel';

// safety-privacy-blueprint.md §1, transcribed verbatim into one regex per
// category (case-insensitive; word-boundary where the phrase is a single
// word, substring where it is a fixed multi-word phrase).
const ACCURACY_MEDICAL_OVERCLAIM = /\b(accurate|precise|validated|clinically|diagnosis|measured your body fat|body fat is|scientifically proven|lab)\b/i;
const SHAME = /\b(sloppy|flabby|letting yourself go|excuses|lazy|guilty|cheat|problem areas|fix your)\b/i;
const PANIC_URGENCY = /\b(slipping|losing your progress|don't lose|falling behind|act now|last chance|streak|don't break|keep your score|beat your score)\b/i;
const RANKING = /\b(percentile|top \d+%|better than|average user|leaderboard|rank)\b/i;
const FALSE_CERTAINTY = /\b(proves|confirms|definitely|exactly|guaranteed|your body changed by)\b/i;
const EM_DASH = /—/;

const BANNED = new RegExp(
  [ACCURACY_MEDICAL_OVERCLAIM, SHAME, PANIC_URGENCY, RANKING, FALSE_CERTAINTY, EM_DASH]
    .map((r) => r.source)
    .join('|'),
  'i',
);

function assessment(overrides = {}) {
  return {
    visualLeannessScore: 74,
    leannessBandLabel: 'Defined',
    scanConfidenceTier: 'high',
    scanConfidenceLabel: 'High',
    progressSignalLabel: 'Slight positive trend',
    ...overrides,
  };
}

function scanWith(overrides = {}) {
  return {
    id: 'scan-1',
    analysisStatus: 'complete',
    signals: { physiqueAssessment: assessment(overrides.assessment) },
    ...overrides,
  };
}

const WITHHOLD_REASON_CODES = [
  'missing_required_pose', 'model_unavailable', 'measured_signals_incomplete', 'no_person_detected',
  'native_preprocess_unavailable', 'native_preprocess_shape_unusable', 'mask_shape_unusable',
  'too_dark', 'too_blurry', 'whole_body_not_visible', 'multiple_people', 'pose_not_clear',
  'estimate_out_of_range', 'duplicate_pose_content',
];

const QUALITY_WARNING_CODES = ['segmentation_low_confidence', 'clothing_or_background_uncertain', 'camera_tilted'];

const TIERS = ['high', 'moderate', 'low', 'not_enough', 'unknown', undefined];

describe('scored-surface tone contract: tier contract strings', () => {
  test.each(TIERS)('tier %s carries no banned copy in either reveal state', (tier) => {
    const scan = scanWith({ assessment: { scanConfidenceTier: tier } });
    for (const revealed of [false, true]) {
      const c = buildScoreTierContract(scan, { revealed });
      const blob = [c.chipLabel, c.accessibilityLabel, c.caveatText].filter(Boolean).join(' ');
      expect(blob).not.toMatch(BANNED);
    }
  });

  test('the suppressed contract carries no banned copy', () => {
    const c = buildScoreTierContract(scanWith(), { suppressed: true });
    expect(c.accessibilityLabel).not.toMatch(BANNED);
  });

  test('every fixed chip label is clean', () => {
    for (const tier of ['high', 'moderate', 'low', 'not_enough']) {
      expect(confidenceChipLabel(tier)).not.toMatch(BANNED);
    }
  });
});

describe('scored-surface tone contract: receipts', () => {
  test.each(WITHHOLD_REASON_CODES)('withheld receipt for reason "%s" carries no banned copy', (reason) => {
    const scan = {
      id: 'w', analysisStatus: 'abstained', abstentionReasons: [reason],
      copySummary: 'No score this time. Your photos are saved.',
      signals: { physiqueAssessment: { visualLeannessScore: null } },
    };
    const receipt = buildScanReceipt(scan);
    expect([receipt.sentence, ...receipt.whyLines].join(' ')).not.toMatch(BANNED);
  });

  test.each(QUALITY_WARNING_CODES)('a downgraded receipt with quality warning "%s" carries no banned copy', (warning) => {
    const scan = scanWith({
      assessment: { scanConfidenceTier: 'low' },
      deltaExplanation: { comparisonStatus: 'comparable' },
      qualityWarnings: [warning],
    });
    const receipt = buildScanReceipt(scan);
    expect([receipt.sentence, ...receipt.whyLines].join(' ')).not.toMatch(BANNED);
  });

  test('the baseline receipt is clean', () => {
    const receipt = buildScanReceipt(scanWith({ deltaExplanation: { comparisonStatus: 'baseline' } }));
    expect(receipt.sentence).not.toMatch(BANNED);
  });

  test('the not-comparable receipt is clean, including when the engine summary mentions setup drift', () => {
    const receipt = buildScanReceipt(scanWith({
      deltaExplanation: { comparisonStatus: 'not_comparable', summary: 'This scan is saved, but the photo setup changed too much for a fair comparison.' },
    }));
    expect(receipt.sentence).not.toMatch(BANNED);
  });

  test('a down-trend (drift) scored receipt uses the SAME neutral structure as an up-trend one: no alarm words either way', () => {
    const up = buildScanReceipt(scanWith({
      copySummary: 'Volyume Score 74/100. Defined band. Scan Confidence: High. Progress Signal: Clear positive trend. Score from photos taken in similar conditions.',
      deltaExplanation: { comparisonStatus: 'comparable' },
    }));
    const down = buildScanReceipt(scanWith({
      assessment: { progressSignalLabel: 'Clear drift' },
      copySummary: 'Volyume Score 74/100. Defined band. Scan Confidence: High. Progress Signal: Clear drift. Score from photos taken in similar conditions.',
      deltaExplanation: { comparisonStatus: 'comparable' },
    }));
    expect(up.sentence).not.toMatch(BANNED);
    expect(down.sentence).not.toMatch(BANNED);
    // Neither reads as more alarming than the other: no consolation framing,
    // no exclamation, same sentence shape.
    expect(down.sentence).not.toMatch(/!|keep pushing|don't worry/i);
  });

  test('anchor-engaged (calibration honesty) receipts stay clean and never expose internal flag names', () => {
    const receipt = buildScanReceipt(scanWith({
      assessment: { scanConfidenceTier: 'moderate', anchorEngaged: true },
      copySummary: 'Volyume Score 74/100. Defined band. Scan Confidence: Moderate. Progress Signal: Baseline set. Score from photos taken in similar conditions. '
        + 'Scoring is still being calibrated for your build, so confidence is reduced. Your comparisons over time are still meaningful.',
      deltaExplanation: { comparisonStatus: 'comparable' },
    }));
    expect(receipt.sentence).not.toMatch(BANNED);
    expect(receipt.sentence).not.toMatch(/female_overestimation_risk|darker_skin|very_muscular|large_body|stage_lean_or_prep/);
  });
});

describe('scored-surface tone contract: meaning moment, recalibration note, trend ladder', () => {
  test('the meaning moment copy is clean', () => {
    expect(`${MEANING_MOMENT_TITLE} ${MEANING_MOMENT_BODY} ${MEANING_MOMENT_BUTTON}`).not.toMatch(BANNED);
  });

  test('the recalibration note is clean', () => {
    expect(RECALIBRATION_NOTE_TEXT).not.toMatch(BANNED);
  });

  test('the trend empty state and every ladder label are clean, and the ladder never frames scan count as an achievement', () => {
    expect(TREND_EMPTY_STATE_TEXT).not.toMatch(BANNED);
    for (const [comparable, total] of [[0, 1], [1, 2], [5, 6]]) {
      const label = trendLadderLabel(comparable, total);
      expect(label).not.toMatch(BANNED);
      expect(label).not.toMatch(/streak|achievement|day \d+/i);
    }
  });
});
