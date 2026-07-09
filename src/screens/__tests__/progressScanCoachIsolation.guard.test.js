const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');
const PROFILE_SCREEN = fs.readFileSync(path.resolve(__dirname, '../AthleteProfileScreen.js'), 'utf8');
const NUTRITION = fs.readFileSync(path.resolve(__dirname, '../../lib/nutritionEngine.js'), 'utf8');
const DATABASE = fs.readFileSync(path.resolve(__dirname, '../../lib/database.js'), 'utf8');

// Wave 4 robustness fix (scout 7): the old `callBody`/`callBlocks` found the
// call's end with a literal delimiter search (`\n      });` or the first
// `);`). That is fragile to reformatting/refactors in two ways: (a) a
// reindent changes the exact whitespace the delimiter looks for, and (b) a
// nested call or object inside the arguments can contain its own `);`
// earlier than the real end, so the slice silently stops short (or a
// coincidental later match silently stops long) without the test ever
// failing loudly. Both are replaced with a real paren-depth walk from the
// opening `(`, which finds the true matching close regardless of formatting
// and asserts depth fully unwinds (a real syntax/extraction failure raises
// loudly instead of returning a wrong slice).
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

function callBody(source, callName) {
  const start = source.indexOf(`${callName}(`);
  expect(start).toBeGreaterThan(-1);
  return matchingParenSlice(source, start + callName.length);
}

function lineContaining(source, text) {
  return source.split(/\r?\n/).find((line) => line.includes(text)) || '';
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

describe('Progress Scan coach isolation guard', () => {
  test('runWeeklyCoach inputs do not include Progress Scan context', () => {
    const body = callBody(SCREEN, 'runWeeklyCoach');
    expect(body).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
  });

  test('local Progress Scan context is not persisted into coach_outputs', () => {
    const bodies = callBlocks(SCREEN, 'saveCoachOutput');
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
    }
  });

  test('rendered scan context is gated by current ED and calm suppression', () => {
    expect(lineContaining(SCREEN, 'canShowProgressScanCoachContext')).toMatch(/progressScanCoachContext/);
    // Wave 4: the ad hoc `!edPatternOpen && !calmMode` composition is now
    // routed through the shared isPhotoSuppressed() OR (see
    // hooks/usePhotoSuppression.js), the same function AthleteProfileScreen
    // uses, so both surfaces can't silently drift apart on this policy.
    expect(SCREEN).toMatch(/canShowProgressScanCoachContext = .*progressScanCoachContext.*!isPhotoSuppressed\(calmMode,\s*edPatternOpen\)/s);
    expect(SCREEN).toMatch(/resolveProgressScanCoachNote\(\{/);
    expect(SCREEN).toMatch(/suppressed:\s*isPhotoSuppressed\(calmNow,\s*resultEdPatternOpen\)/);
    expect(SCREEN).toMatch(/suppressed:\s*isPhotoSuppressed\(calmNow,\s*edPatternOpen\)/);
  });

  test('scan context is folded into the main coach response through the out-of-engine adapter', () => {
    expect(SCREEN).toMatch(/applyProgressScanCoachContext\(baseCoachResponse,\s*canShowProgressScanCoachContext \? progressScanCoachContext : null\)/);
    expect(callBody(SCREEN, 'runWeeklyCoach')).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
  });

  test('nutrition engine uses an explicit authoritative-source allowlist', () => {
    expect(NUTRITION).toMatch(/function isAuthoritativeBodyFatSource|export function isAuthoritativeBodyFatSource/);
    expect(NUTRITION).toMatch(/bodyFatSource === 'dexa'/);
    expect(NUTRITION).toMatch(/bodyFatSource === 'caliper'/);
    expect(NUTRITION).toMatch(/bodyFatSource === 'bia'/);
    expect(NUTRITION).not.toMatch(/bodyFatSource !== 'visual'/);
  });

  // Guard test 7 (integration blueprint §9): check-in persistence stays
  // scan-free. saveWeeklyCheckin's COLS map is the only thing that can land
  // in the weekly_checkins table; if a future edit ever adds a scan/photo
  // column here, this must fail loudly.
  test('weekly_checkins COLS map carries no scan/photo tokens', () => {
    const colsStart = DATABASE.indexOf('export async function saveWeeklyCheckin');
    expect(colsStart).toBeGreaterThan(-1);
    const colsEnd = DATABASE.indexOf('let savedId;', colsStart);
    expect(colsEnd).toBeGreaterThan(colsStart);
    const saveWeeklyCheckinBody = DATABASE.slice(colsStart, colsEnd);
    expect(saveWeeklyCheckinBody).not.toMatch(/progressScan|progress_scan|photo_scan|scanId|physique/i);
  });

  // Guard test 8 (integration blueprint §9): suppression parity. Both
  // scan-derived surfaces (the Coach card and the profile physique tile) must
  // be governed by the shared fail-closed mechanism, not independent
  // booleans that could drift.
  test('suppression parity: both scan-derived surfaces use the shared fail-closed mechanism', () => {
    expect(SCREEN).toMatch(/import\s*\{\s*isPhotoSuppressed\s*\}\s*from\s*'\.\.\/hooks\/usePhotoSuppression'/);
    expect(PROFILE_SCREEN).toMatch(/import usePhotoSuppression from '\.\.\/hooks\/usePhotoSuppression'/);
    expect(PROFILE_SCREEN).toMatch(/usePhotoSuppression\(user\?\.id\)/);
    expect(PROFILE_SCREEN).toMatch(/showPhysiqueScore = !photoSuppressed && shouldShowPhysiqueScore/);
  });
});
