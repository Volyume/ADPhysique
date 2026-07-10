/**
 * CoachOutputScreen v2 assessment receipt
 * (`.volyume-audit/progress-scan-coach-worldclass/integration-plan.md` §6, §7).
 *
 * The existing "Progress photo context" card grows the v2 assessment
 * receipt (headline/detail/usedSentence) built by `composeScanEvidencePacket`
 * (`progressScanCheckInEvidence.js`), anchored to the run's own moment
 * (`Date.now()`): the screen re-runs `runWeeklyCoach` fresh on every load,
 * so the decision and the receipt always move together from the same live
 * inputs. Anchoring to `weekStart` (Monday) would wrongly exclude a scan
 * taken just before a mid-week check-in; the evidence layer itself rejects
 * any `capturedAt` after `nowMs` (negative-age test in
 * `progressScanCheckInEvidence.test.js`).
 *
 * This screen cannot be safely `require`'d in Jest (it pulls in
 * expo-notifications, Reanimated and the live zustand store with no existing
 * mock scaffold for this file -- see progressScanCoachIsolation.guard.test.js
 * and CoachOutputScreen.profileMerge.guard.test.js, which are both
 * source-guard-only for the same reason). This suite follows the same
 * established house convention: fs.readFileSync + regex against the real
 * source, extending guard 6/7/8 from progressScanCoachIsolation.guard.test.js
 * rather than duplicating them.
 *
 * Pins:
 *  1. The packet is composed at the same resolution site as
 *     progressScanCoachContext, from the engine's OWN result fields
 *     (result.trend/goalPhase/heldDecisions/loadSignal), anchored to the
 *     run's own moment (Date.now()), never weekStart.
 *  2. targetsChanged is derived from the calorie adjustment already on the
 *     card (result.adjustments.calories.change), never invented separately.
 *  3. The card renders the receipt headline/detail and the deduped
 *     usedSentence (dedupeUsedSentence), computed once outside JSX so it is
 *     never recomputed per re-render or duplicated inline.
 *  4. dedupeUsedSentence's own body: returns null when the card body already
 *     contains the sentence verbatim, or when there is no sentence; the
 *     sentence otherwise. Pinned as a literal-source check (the function is
 *     pure and three lines; pinning the source is equivalent to pinning its
 *     behaviour here, matching this screen's existing source-guard style).
 *  5. scanAssessmentAccessibilityLabel: carries the headline always, the
 *     confidence tier only for a 'valid' packet.
 *  6. Persistence stays scan-free: no packet/assessment token reaches any
 *     saveCoachOutput call, and runWeeklyCoach's own inputs stay untouched
 *     (the packet is built AFTER the engine runs, from its output).
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

function matchingParenSlice(source, openParenIndex) {
  let depth = 0;
  let i = openParenIndex;
  for (; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) break;
    }
  }
  expect(depth).toBe(0);
  return source.slice(openParenIndex, i + 1);
}

function callBlocks(source, callName) {
  const blocks = [];
  let offset = 0;
  while (offset < source.length) {
    const start = source.indexOf(`${callName}(`, offset);
    if (start === -1) break;
    const block = matchingParenSlice(source, start + callName.length);
    blocks.push(block);
    offset = start + block.length + callName.length;
  }
  return blocks;
}

describe('CoachOutputScreen v2 assessment receipt: packet composition', () => {
  test('imports composeScanEvidencePacket from the shared evidence layer', () => {
    // D18 (2026-07-09): this import line also brings in
    // derivePhotoCorroborationSignal for the render-time confidence-caption
    // transform (see CoachOutputScreen.photoCorroborationCaption.test.js);
    // updated mechanically alongside that addition.
    expect(SCREEN).toMatch(/import \{ composeScanEvidencePacket, derivePhotoCorroborationSignal \} from '\.\.\/lib\/progressScanCheckInEvidence';/);
  });

  test('the packet is composed at the same site progressScanCoachContext is resolved, from the engine\'s own result fields', () => {
    expect(SCREEN).toMatch(/const scanNote = resolveProgressScanCoachNote\(\{/);
    expect(SCREEN).toMatch(/const scanEvidencePacket = scanNote \? composeScanEvidencePacket\(\{/);
    expect(SCREEN).toMatch(/scan: scanCoachSummary,\s*\n\s*note: scanNote,\s*\n\s*weightTrend: result\.trend,\s*\n\s*goalPhase: result\.goalPhase,/);
    expect(SCREEN).toMatch(/heldDecisions: result\.heldDecisions,\s*\n\s*loadSignal: result\.loadSignal,/);
  });

  test('anchored to the run\'s own moment (Date.now()), never weekStart', () => {
    const start = SCREEN.indexOf('composeScanEvidencePacket({');
    expect(start).toBeGreaterThan(-1);
    const body = matchingParenSlice(SCREEN, start + 'composeScanEvidencePacket'.length);
    expect(body).toMatch(/nowMs: Date\.now\(\),/);
    expect(body).not.toMatch(/nowMs: weekStart/);
  });

  test('targetsChanged is derived from the calorie adjustment already on the card, never a separate invented value', () => {
    expect(SCREEN).toMatch(/const scanCalorieChange = result\.adjustments\?\.calories\?\.change;/);
    expect(SCREEN).toMatch(/const scanTargetsChanged = Number\.isFinite\(scanCalorieChange\) && scanCalorieChange !== 0;/);
    expect(SCREEN).toMatch(/targetsChanged: scanTargetsChanged,/);
  });

  test('progressScanCoachContext state carries the packet alongside the existing note fields, nothing replaced', () => {
    expect(SCREEN).toMatch(/setProgressScanCoachContext\(scanNote \? \{ \.\.\.scanNote, packet: scanEvidencePacket \} : null\);/);
  });
});

describe('CoachOutputScreen v2 assessment receipt: card render', () => {
  test('the deduped packet/usedSentence are computed once outside JSX, alongside canShowProgressScanCoachContext', () => {
    expect(SCREEN).toMatch(/const scanAssessmentPacket = canShowProgressScanCoachContext \? \(progressScanCoachContext\.packet \?\? null\) : null;/);
    expect(SCREEN).toMatch(/const scanAssessmentUsedSentence = scanAssessmentPacket\s*\n\s*\? dedupeUsedSentence\(progressScanCoachContext\.body, scanAssessmentPacket\.receipt\.usedSentence\)\s*\n\s*: null;/);
  });

  test('the card renders the receipt headline, optional detail, and the deduped usedSentence, gated on scanAssessmentPacket', () => {
    const cardStart = SCREEN.indexOf('{canShowProgressScanCoachContext ? (');
    expect(cardStart).toBeGreaterThan(-1);
    // Window widened 1200 -> 1400 (dynamic-type codemod sweep, campaign item
    // 6 / D30, 2026-07-10): the inserted maxFontSizeMultiplier attributes
    // pushed {scanAssessmentUsedSentence} to offset 1304 within this block.
    // Assertions unchanged.
    const cardBlock = SCREEN.slice(cardStart, cardStart + 1400);
    expect(cardBlock).toMatch(/\{scanAssessmentPacket \? \(/);
    expect(cardBlock).toMatch(/\{scanAssessmentPacket\.receipt\.headline\}/);
    expect(cardBlock).toMatch(/scanAssessmentPacket\.receipt\.detail \? \(/);
    expect(cardBlock).toMatch(/\{scanAssessmentPacket\.receipt\.detail\}/);
    expect(cardBlock).toMatch(/scanAssessmentUsedSentence \? \(/);
    expect(cardBlock).toMatch(/\{scanAssessmentUsedSentence\}/);
    expect(cardBlock).toMatch(/accessibilityLabel=\{scanAssessmentAccessibilityLabel\(scanAssessmentPacket\)\}/);
  });
});

describe('dedupeUsedSentence (pure helper, pinned by source since the screen cannot be imported in this test environment)', () => {
  const fnSource = SCREEN.slice(
    SCREEN.indexOf('export function dedupeUsedSentence'),
    SCREEN.indexOf('export function scanAssessmentAccessibilityLabel'),
  );

  test('function body: null when there is no sentence, null when the body already carries it verbatim, else the sentence', () => {
    expect(fnSource).toMatch(/if \(!usedSentence\) return null;/);
    expect(fnSource).toMatch(/if \(typeof bodyText === 'string' && bodyText\.includes\(usedSentence\)\) return null;/);
    expect(fnSource).toMatch(/return usedSentence;/);
  });

  test('is exported so a future full-render test environment can exercise it directly', () => {
    expect(SCREEN).toMatch(/^export function dedupeUsedSentence\(bodyText, usedSentence\) \{/m);
  });
});

describe('scanAssessmentAccessibilityLabel (pure helper, pinned by source)', () => {
  const fnSource = SCREEN.slice(
    SCREEN.indexOf('export function scanAssessmentAccessibilityLabel'),
    SCREEN.indexOf('// ─── Main screen'),
  );

  test('function body: empty string when absent, confidence tier only when status is valid', () => {
    expect(fnSource).toMatch(/if \(!packet\?\.receipt\) return '';/);
    expect(fnSource).toMatch(/packet\.status === 'valid' \? `, \$\{confidenceChipLabel\(packet\.confidenceTier\)\}` : '';/);
    expect(fnSource).toMatch(/return `Progress scan assessment: \$\{packet\.receipt\.headline\}\$\{confidence\}`;/);
  });
});

describe('persistence and engine isolation stay untouched by the v2 packet (extends progressScanCoachIsolation.guard.test.js)', () => {
  test('no packet/assessment token reaches any saveCoachOutput call', () => {
    const bodies = callBlocks(SCREEN, 'saveCoachOutput');
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/progressScan|photo_scan|scanEvidencePacket|scanAssessment/i);
    }
  });

  test('runWeeklyCoach\'s own inputs carry no scan-context or packet tokens (the packet is built AFTER the engine runs, from its output)', () => {
    const start = SCREEN.indexOf('runWeeklyCoach(');
    expect(start).toBeGreaterThan(-1);
    const body = matchingParenSlice(SCREEN, start + 'runWeeklyCoach'.length);
    expect(body).not.toMatch(/progressScan|photo_scan|scanEvidencePacket|scanAssessment/i);
  });
});
